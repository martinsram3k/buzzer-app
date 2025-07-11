// server/index.js

// Import modulů Express a Socket.IO
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

// Inicializace Express aplikace a HTTP serveru
const app = express();
const server = http.createServer(app);

// Inicializace Socket.IO serveru s CORS konfigurací
const io = new Server(server, {
  cors: {
    origin: "*", // Povolí připojení z jakékoli domény (pro vývoj/testování)
    methods: ["GET", "POST"] // Povolí metody pro komunikaci
  }
});

// Nastavení portu serveru, s fallbackem na 3001
const PORT = process.env.PORT || 3001;

// Datová struktura pro ukládání stavu místností
// Klíč: roomId (string), Hodnota: { winner: null, players: [], hostId: string, gameState: string, currentRound: number, gameSettings: object, roundTimer: object|null }
// gameState: 'LOBBY', 'COUNTDOWN', 'ACTIVE_ROUND', 'ROUND_END', 'GAME_OVER'
const rooms = {};

// Funkce pro generování unikátního 5místného kódu místnosti
function generateRoomCode() {
    let code;
    do {
        // Generuje 5místné číslo (10000 až 99999) a převede ho na string
        code = Math.floor(10000 + Math.random() * 90000).toString(); 
    } while (rooms[code]); // Zajišťuje unikátnost kódu - opakuje, dokud nenajde volný kód
    return code;
}

// Základní HTTP GET endpoint pro kontrolu, že server běží
app.get('/', (req, res) => {
  res.send('Buzzer server is running!');
});

// --- Socket.IO logika ---
io.on('connection', (socket) => {
  console.log('Server: Uživatel připojen:', socket.id);

  /**
   * Funkce pro odeslání aktuálního stavu místnosti všem hráčům v dané místnosti.
   * @param {string} roomId ID místnosti, jejíž stav se má odeslat.
   */
  function emitRoomState(roomId) {
    if (rooms[roomId]) { // Kontrola, zda místnost existuje
      io.to(roomId).emit('roomState', rooms[roomId]); // Odešle 'roomState' všem socketům v místnosti
      console.log(`Server: Odeslán roomState pro místnost ${roomId}. Stav: ${rooms[roomId].gameState}, Kolo: ${rooms[roomId].currentRound}, Hráči: ${rooms[roomId].players.length}`);
    } else {
      console.warn(`Server: Pokus o emitování roomState pro neexistující místnost ${roomId}.`);
    }
  }

  /**
   * Funkce pro reset stavu bzučáku a časovače pro nové kolo.
   * @param {string} roomId ID místnosti.
   */
  function resetBuzzerState(roomId) {
    if (rooms[roomId]) {
      // Zruší předchozí časovač kola, pokud existuje
      if (rooms[roomId].roundTimer) {
        clearTimeout(rooms[roomId].roundTimer); 
        rooms[roomId].roundTimer = null;
      }
      rooms[roomId].winner = null; // Vymaže vítěze bzučení
      io.to(roomId).emit('buzzerReset'); // Upozorní klienty, že je bzučák resetován
      console.log(`Server: Buzzer stav v místnosti ${roomId} resetován.`);
    }
  }

  /**
   * Funkce pro spuštění nového kola hry.
   * Obsahuje odpočet a nastavení časovače kola.
   * @param {string} roomId ID místnosti.
   */
  function startNewRound(roomId) {
    if (!rooms[roomId]) {
      console.warn(`Server: Pokus o spuštění kola v neexistující místnosti: ${roomId}`);
      return;
    }

    resetBuzzerState(roomId); // Resetujeme stav bzučáku před novým kolem

    // Zvýšíme číslo kola, pokud už nejsme v lobby nebo je to první kolo
    if (rooms[roomId].gameState !== 'LOBBY' && rooms[roomId].gameState !== 'GAME_OVER') {
        rooms[roomId].currentRound++;
    } else {
        rooms[roomId].currentRound = 1; // Začínáme první kolo
    }

    const { roundDuration } = rooms[roomId].gameSettings; // Získání délky kola z nastavení
    const countdownTime = 3; // Odpočet před startem kola v sekundách

    rooms[roomId].gameState = 'COUNTDOWN'; // Nastaví stav na odpočet
    rooms[roomId].countdownTime = countdownTime; // Uloží čas odpočtu pro klienta
    emitRoomState(roomId); // Pošle aktuální stav s odpočtem klientům

    // Spustí odpočet událost pro klienty
    io.to(roomId).emit('countdownStart', countdownTime);

    // Po odpočtu se spustí kolo
    setTimeout(() => {
        // Znovu zkontroluj, zda místnost stále existuje, mohla být mezitím zrušena
        if (!rooms[roomId]) {
          console.warn(`Server: Místnost ${roomId} zrušena během odpočtu.`);
          return;
        }

        rooms[roomId].gameState = 'ACTIVE_ROUND'; // Nastaví stav na aktivní kolo
        emitRoomState(roomId); // Pošle aktualizovaný stav

        console.log(`Server: Kolo ${rooms[roomId].currentRound} v místnosti ${roomId} začalo.`);
        io.to(roomId).emit('roundStarted', rooms[roomId].currentRound, rooms[roomId].gameSettings);

        // Nastav časovač pro délku kola, pokud není bez omezení (roundDuration > 0)
        if (roundDuration > 0) {
            rooms[roomId].roundTimer = setTimeout(() => {
                // Zkontroluj, zda místnost stále existuje
                if (!rooms[roomId]) return; 

                console.log(`Server: Kolo ${rooms[roomId].currentRound} v místnosti ${roomId} skončilo vypršením času.`);
                rooms[roomId].gameState = 'ROUND_END'; // Stav konec kola (vypršení času)
                emitRoomState(roomId); // Pošle aktualizovaný stav
                io.to(roomId).emit('roundEnded', rooms[roomId].currentRound, rooms[roomId].winner);

                // Zkontroluj, zda je konec hry po vypršení času
                if (rooms[roomId].currentRound >= rooms[roomId].gameSettings.numRounds) {
                    console.log(`Server: Všechna kola v místnosti ${roomId} odehrána. Hra končí.`);
                    rooms[roomId].gameState = 'GAME_OVER'; // Nastav stav na konec hry
                    emitRoomState(roomId);
                    io.to(roomId).emit('gameOver');
                }
            }, roundDuration * 1000); // Převeď sekundy na milisekundy
        } else {
            console.log(`Server: Kolo ${rooms[roomId].currentRound} v místnosti ${roomId} začalo (bez časového omezení).`);
        }
    }, countdownTime * 1000); // Počkej na dokončení odpočtu
  }

  // --- UDÁLOSTI Z KLIENTA ---

  /**
   * Klient chce vytvořit novou místnost.
   * Hostitel je uživatel, který událost vytvořil.
   */
  socket.on('createRoom', (username) => {
    console.log('Server: Přijata createRoom událost.');
    console.log('Server: Přijaté jméno pro createRoom:', username);

    // Ověření a nastavení uživatelského jména, s fallbackem
    if (username && username.trim().length > 0) { 
        socket.username = username.trim();
    } else {
        socket.username = 'Uživatel_' + socket.id.substring(0, 4);
        console.warn('Server: Username NENÍ předáno pro createRoom nebo je prázdné. Používám fallback:', socket.username);
    }

    const roomId = generateRoomCode(); // Generování unikátního kódu místnosti
    
    // Počáteční stav místnosti pro lobby
    rooms[roomId] = {
        roomId: roomId, // Uložení ID místnosti do objektu místnosti
        winner: null,
        players: [], // Seznam hráčů v místnosti
        hostId: socket.id, // ID hostitele (vytvořil místnost)
        gameState: 'LOBBY', // Počáteční stav je lobby
        currentRound: 0, // Aktuální kolo (0 před začátkem hry)
        gameSettings: { // Výchozí nastavení hry
            roundDuration: 30, // 30 sekund na kolo
            numRounds: 3, // 3 kola
            hostPlays: true, // Hostitel standardně hraje
            buzzerDelay: 0 // Zpoždění bzučáku v ms
        },
        roundTimer: null // Pro ukládání časovače kola
    };
    socket.join(roomId); // Uživatel se připojí do Socket.IO místnosti (broadcast skupina)
    
    // Uložíme hráče jako objekt s ID a jménem
    rooms[roomId].players.push({ id: socket.id, username: socket.username }); 
    socket.currentRoom = roomId; // Uložíme si, ve které místnosti je socket pro snadný přístup

    console.log(`Server: Místnost ${roomId} vytvořena uživatelem ${socket.id} (${socket.username}) (HOST)`);
    socket.emit('roomCreated', roomId); // Potvrzení vytvoření klientovi
    
    emitRoomState(roomId); // Pošli počáteční stav lobby všem v místnosti
  });

  /**
   * Klient se chce připojit do existující místnosti.
   */
  socket.on('joinRoom', (roomId, username) => {
    console.log('Server: Přijata joinRoom událost.');
    console.log('Server: Přijatý kód místnosti pro joinRoom:', roomId);
    console.log('Server: Přijaté jméno pro joinRoom:', username);

    // Ověření a nastavení uživatelského jména, s fallbackem
    if (username && username.trim().length > 0) { 
        socket.username = username.trim();
    } else {
        socket.username = 'Uživatel_' + socket.id.substring(0, 4);
        console.warn('Server: Username NENÍ předáno pro joinRoom nebo je prázdné. Používám fallback:', socket.username);
    }

    if (rooms[roomId]) { // Kontrola, zda místnost existuje
      // Zabráníme duplicitnímu připojení (pokud už je uživatel v místnosti)
      if (!rooms[roomId].players.some(player => player.id === socket.id)) {
        socket.join(roomId); // Uživatel se připojí do Socket.IO místnosti
        // Uložíme hráče jako objekt s ID a jménem
        rooms[roomId].players.push({ id: socket.id, username: socket.username });
        socket.currentRoom = roomId; // Uložíme si, ve které místnosti je socket
        
        console.log(`Server: Uživatel ${socket.id} (${socket.username}) se připojil do místnosti ${roomId}`);
        socket.emit('roomJoined', roomId); // Potvrdí klientovi, že se připojil

        emitRoomState(roomId); // Pošle stav nově připojenému hráči A všem ostatním v místnosti
      } else {
        // Pokud už je uživatel v místnosti, prostě ho tam potvrdíme a pošleme roomState
        console.log(`Server: Uživatel ${socket.id} (${socket.username}) se pokusil znovu připojit do místnosti ${roomId}.`);
        socket.emit('roomJoined', roomId);
        emitRoomState(roomId);
      }
    } else {
      socket.emit('roomNotFound'); // Místnost neexistuje
      console.log(`Server: Uživatel ${socket.id} (${socket.username}) se pokusil připojit do neexistující místnosti ${roomId}`);
    }
  });

  /**
   * Hostitel aktualizuje nastavení hry.
   */
  socket.on('updateGameSettings', (roomId, settings) => {
    // Kontrola, zda místnost existuje a zda volající je hostitel
    if (rooms[roomId] && rooms[roomId].hostId === socket.id) {
        // Základní validace přijatých nastavení
        const newRoundDuration = parseInt(settings.roundDuration);
        const newNumRounds = parseInt(settings.numRounds);
        const newHostPlays = Boolean(settings.hostPlays); // Zajistí boolean typ
        const newBuzzerDelay = parseInt(settings.buzzerDelay); // Získání buzzerDelay

        // Rozšířená validace hodnot
        if (isNaN(newRoundDuration) || (newRoundDuration < 0 && newRoundDuration !== 0) || // 0 pro bez omezení
            isNaN(newNumRounds) || newNumRounds < 1 || newNumRounds > 100 || // Min 1 kolo, Max 100 kol
            typeof newHostPlays !== 'boolean' ||
            isNaN(newBuzzerDelay) || newBuzzerDelay < 0 || newBuzzerDelay > 5000) { // Zpoždění bzučáku 0-5000 ms
            socket.emit('notAuthorized', 'Neplatné nastavení hry. Zkontrolujte zadané hodnoty.');
            console.warn(`Server: Neplatné nastavení hry od ${socket.username} v místnosti ${roomId}.`);
            return;
        }
        
        // Aktualizace nastavení v objektu místnosti
        rooms[roomId].gameSettings = {
            roundDuration: newRoundDuration,
            numRounds: newNumRounds,
            hostPlays: newHostPlays,
            buzzerDelay: newBuzzerDelay 
        };
        console.log(`Server: Nastavení hry v místnosti ${roomId} aktualizováno hostitelem ${socket.username}:`, rooms[roomId].gameSettings);
        emitRoomState(roomId); // Informuj všechny o změně nastavení
    } else {
        socket.emit('notAuthorized', 'Pouze hostitel může měnit nastavení hry.');
        console.warn(`Server: Pokus o změnu nastavení bez oprávnění od ${socket.username} v místnosti ${roomId}.`);
    }
  });

  /**
   * Hostitel vykopne hráče z místnosti.
   */
  socket.on('kickPlayer', (playerIdToKick) => {
    const roomId = socket.currentRoom; // Získá ID aktuální místnosti volajícího
    // Kontrola oprávnění hostitele
    if (rooms[roomId] && rooms[roomId].hostId === socket.id) {
        const playerToKickIndex = rooms[roomId].players.findIndex(p => p.id === playerIdToKick);
        if (playerToKickIndex !== -1) {
            const playerToKick = rooms[roomId].players[playerToKickIndex];
            rooms[roomId].players.splice(playerToKickIndex, 1); // Odeber hráče ze seznamu
            
            // Najde socket vykopnutého hráče a odpojí ho/odebere z místnosti
            const kickedSocket = io.sockets.sockets.get(playerIdToKick);
            if (kickedSocket) {
                kickedSocket.emit('roomClosed', `Byl jsi vykopnut z místnosti ${roomId} hostitelem.`); // Informuje vykopnutého
                kickedSocket.leave(roomId); // Odeber ho ze Socket.IO místnosti
                kickedSocket.currentRoom = null; // Vyčisti jeho stav
                console.log(`Server: Hráč ${playerToKick.username} (${playerIdToKick}) vykopnut z místnosti ${roomId}.`);
            } else {
              console.warn(`Server: Vykořeněný socket pro ID ${playerIdToKick} nebyl nalezen.`);
            }
            emitRoomState(roomId); // Aktualizuj stav pro zbývající hráče
            io.to(roomId).emit('playerKicked', playerToKick.username); // Informuj ostatní v místnosti
        } else {
            console.warn(`Server: Pokus o vykopnutí neexistujícího hráče ${playerIdToKick} z místnosti ${roomId}.`);
        }
    } else {
        socket.emit('notAuthorized', 'Pouze hostitel může vykopnout hráče.');
        console.warn(`Server: Pokus o vykopnutí hráče bez oprávnění od ${socket.username} v místnosti ${roomId}.`);
    }
  });

  /**
   * Hostitel spustí hru z lobby.
   */
  socket.on('startGame', (roomId) => {
    // Kontrola oprávnění hostitele a stavu hry (musí být v LOBBY)
    if (rooms[roomId] && rooms[roomId].hostId === socket.id && rooms[roomId].gameState === 'LOBBY') {
        // Zde by měla být herní nastavení již aktualizována z `updateGameSettings`.
        // Získáme nastavení hostPlays pro kontrolu počtu hráčů
        const { hostPlays } = rooms[roomId].gameSettings || { hostPlays: true }; 
        // Požadovaný počet hráčů: 1 pokud hostitel hraje, 2 pokud ne (hostitel + 1 hráč)
        const requiredPlayers = hostPlays ? 1 : 2; 

        if (rooms[roomId].players.length < requiredPlayers) {
            socket.emit('notAuthorized', `Potřebujete alespoň ${requiredPlayers} hráče(ů) pro spuštění hry.`);
            console.warn(`Server: Hostitel ${socket.username} se pokusil spustit hru s nedostatkem hráčů v místnosti ${roomId}.`);
            return;
        }
        console.log(`Server: Hostitel ${socket.username} spustil hru v místnosti ${roomId}.`);
        startNewRound(roomId); // Spustíme první kolo
    } else {
        socket.emit('notAuthorized', 'Hru může spustit pouze hostitel z lobby.');
        console.warn(`Server: Pokus o spuštění hry bez oprávnění nebo ve špatném stavu od ${socket.username} v místnosti ${roomId}.`);
    }
  });

  /**
   * Hostitel spustí další kolo.
   */
  socket.on('startNextRound', (roomId) => {
    // Kontrola oprávnění hostitele a stavu hry (musí být na konci kola)
    if (rooms[roomId] && rooms[roomId].hostId === socket.id && rooms[roomId].gameState === 'ROUND_END') {
        // Kontrola, zda nejsou odehrána všechna kola
        if (rooms[roomId].currentRound < rooms[roomId].gameSettings.numRounds) {
            console.log(`Server: Hostitel ${socket.username} spustil další kolo v místnosti ${roomId}.`);
            startNewRound(roomId);
        } else {
            socket.emit('notAuthorized', 'Všechna kola již byla odehrána. Spusťte novou hru.');
            console.warn(`Server: Hostitel ${socket.username} se pokusil spustit další kolo, ale všechna kola již byla odehrána v místnosti ${roomId}.`);
        }
    } else {
        socket.emit('notAuthorized', 'Další kolo může spustit pouze hostitel na konci kola.');
        console.warn(`Server: Pokus o spuštění dalšího kola bez oprávnění nebo ve špatném stavu od ${socket.username} v místnosti ${roomId}.`);
    }
  });

  /**
   * Hostitel ukončí hru.
   */
  socket.on('endGame', (roomId) => {
    // Hostitel může ukončit hru, pokud je na konci kola a všechna kola odehrána, nebo i dříve, dle potřeby
    // Tato logika předpokládá, že hra je na konci všech kol
    if (rooms[roomId] && rooms[roomId].hostId === socket.id && rooms[roomId].gameState === 'ROUND_END' && rooms[roomId].currentRound >= rooms[roomId].gameSettings.numRounds) {
        console.log(`Server: Hostitel ${socket.username} ukončil hru v místnosti ${roomId}.`);
        rooms[roomId].gameState = 'GAME_OVER'; // Nastaví stav na konec hry
        emitRoomState(roomId);
        io.to(roomId).emit('gameOver'); // Může poslat i tuto specifickou událost
    } else {
        socket.emit('notAuthorized', 'Hru může ukončit pouze hostitel na konci všech kol.');
        console.warn(`Server: Pokus o ukončení hry bez oprávnění nebo ve špatném stavu od ${socket.username} v místnosti ${roomId}.`);
    }
  });

  /**
   * Hostitel resetuje hru do stavu lobby.
   */
  socket.on('resetGame', (roomId) => {
    // Kontrola oprávnění hostitele a stavu hry (musí být GAME_OVER)
    if (rooms[roomId] && rooms[roomId].hostId === socket.id && rooms[roomId].gameState === 'GAME_OVER') {
        console.log(`Server: Hostitel ${socket.username} resetoval hru v místnosti ${roomId}.`);
        // Resetujeme stav místnosti do počátečního lobby stavu
        rooms[roomId].winner = null;
        rooms[roomId].gameState = 'LOBBY';
        rooms[roomId].currentRound = 0; // Reset kola
        resetBuzzerState(roomId); // Vyčisti případný časovač
        emitRoomState(roomId); // Informuj všechny o resetu
    } else {
        socket.emit('notAuthorized', 'Hru může resetovat pouze hostitel po skončení hry.');
        console.warn(`Server: Pokus o reset hry bez oprávnění nebo ve špatném stavu od ${socket.username} v místnosti ${roomId}.`);
    }
  });


  /**
   * Klient bzučí.
   */
  socket.on('buzz', () => {
    const roomId = socket.currentRoom; // Získá aktuální místnost uživatele
    // Kontrola, zda je uživatel v místnosti, zda místnost existuje, zda je aktivní kolo a zda už není vítěz
    if (roomId && rooms[roomId] && rooms[roomId].gameState === 'ACTIVE_ROUND' && !rooms[roomId].winner) {
      // Kontrola, zda hostitel hraje (pokud je volající hostitel a gameSettings.hostPlays je false)
      if (rooms[roomId].hostId === socket.id && !rooms[roomId].gameSettings.hostPlays) {
        socket.emit('notAuthorized', 'Jako hostitel, který nehraje, nemůžete bzučet.');
        console.log(`Server: Hostitel ${socket.username} se pokusil bzučet, ale nehraje v místnosti ${roomId}.`);
        return;
      }
      
      // Zastavíme časovač kola, jakmile někdo bzučí
      if (rooms[roomId].roundTimer) {
        clearTimeout(rooms[roomId].roundTimer);
        rooms[roomId].roundTimer = null;
        console.log(`Server: Časovač kola pro místnost ${roomId} byl zastaven.`);
      }

      // Nastavení vítěze bzučení
      rooms[roomId].winner = { id: socket.id, username: socket.username, time: new Date().toISOString() };
      rooms[roomId].gameState = 'ROUND_END'; // Kolo končí bzučením
      console.log(`Server: Buzz v místnosti ${roomId} od: ${socket.id} (Jméno: ${socket.username})`);
      io.to(roomId).emit('buzzerWinner', rooms[roomId].winner); // Informuje všechny o vítězi
      emitRoomState(roomId); // Pošleme aktualizovaný stav

      // Zkontroluj, zda je konec hry po bzučení (pokud je aktuální kolo poslední)
      if (rooms[roomId].currentRound >= rooms[roomId].gameSettings.numRounds) {
        console.log(`Server: Všechna kola odehrána po bzučení v místnosti ${roomId}. Hra končí.`);
        rooms[roomId].gameState = 'GAME_OVER'; // Nastav stav na konec hry
        emitRoomState(roomId);
        io.to(roomId).emit('gameOver');
      }
    } else {
        console.warn(`Server: Buzz zamítnut v místnosti ${roomId} od ${socket.username || socket.id}. Stav: ${rooms[roomId]?.gameState}, Vítěz: ${rooms[roomId]?.winner?.username || 'žádný'}.`);
        // Odeslání konkrétních chybových zpráv klientovi
        if (rooms[roomId]?.gameState !== 'ACTIVE_ROUND') {
            socket.emit('notAuthorized', 'Nemůžeš bzučet v tomto stavu hry.');
        } else if (rooms[roomId]?.winner) {
            socket.emit('notAuthorized', 'Někdo už bzučel.');
        } else if (!roomId || !rooms[roomId]) {
            socket.emit('notAuthorized', 'Nejsi v žádné místnosti.');
        }
    }
  });

  /**
   * Původní resetBuzzer událost, nyní použitelná pro hostitele k resetování hry z GAME_OVER.
   */
  socket.on('resetBuzzer', () => { 
    const roomId = socket.currentRoom;
    // Povolí reset pouze hostiteli, pokud je hra ve stavu GAME_OVER
    if (roomId && rooms[roomId] && rooms[roomId].hostId === socket.id) {
        if (rooms[roomId].gameState === 'GAME_OVER') {
            console.log(`Server: Manuální reset bzučáku (Nová Hra) v místnosti ${roomId} hostitelem ${socket.username}.`);
            rooms[roomId].winner = null;
            rooms[roomId].gameState = 'LOBBY';
            rooms[roomId].currentRound = 0;
            resetBuzzerState(roomId); // Vyčisti případný časovač
            emitRoomState(roomId);
        } else {
            socket.emit('notAuthorized', 'Toto tlačítko je nyní "Nová Hra" a je aktivní pouze na konci hry pro hostitele.');
        }
    } else {
        socket.emit('notAuthorized', 'K tomuto resetu má oprávnění pouze hostitel místnosti.');
    }
  });
  
  /**
   * Uživatel explicitně opouští místnost.
   */
  socket.on('leaveRoom', (roomId) => {
    console.log(`Server: Uživatel ${socket.username} (${socket.id}) explicitně opouští místnost ${roomId}.`);
    if (roomId && rooms[roomId]) {
        // Odeber hráče ze seznamu v místnosti
        rooms[roomId].players = rooms[roomId].players.filter(player => player.id !== socket.id);
        socket.leave(roomId); // Opustí Socket.IO místnost
        socket.currentRoom = null; // Vymaže uložené ID místnosti pro socket

        // Pokud odešel hostitel, zruš celou místnost
        if (rooms[roomId].hostId === socket.id) {
            console.log(`Hostitel ${socket.username} se odpojil. Místnost ${roomId} bude zrušena.`);
            io.to(roomId).emit('roomClosed', 'Hostitel opustil místnost. Místnost byla zrušena.');
            // Zruš případný časovač kola, pokud existuje
            if (rooms[roomId].roundTimer) { 
                clearTimeout(rooms[roomId].roundTimer);
                rooms[roomId].roundTimer = null;
            }
            delete rooms[roomId]; // Odstraní místnost z paměti
        } else if (rooms[roomId].players.length === 0) {
            // Pokud odešel poslední hráč (a není hostitel), zruš místnost
            console.log(`Místnost ${roomId} zrušena (žádní hráči nezbyli).`);
            if (rooms[roomId].roundTimer) { 
                clearTimeout(rooms[roomId].roundTimer);
                rooms[roomId].roundTimer = null;
            }
            delete rooms[roomId];
        } else {
            // Jinak jen aktualizuj stav místnosti pro zbývající hráče
            // Pokud odešel vítěz aktuálního kola, resetuj vítěze
            if (rooms[roomId].winner && rooms[roomId].winner.id === socket.id) {
                rooms[roomId].winner = null;
                // Pokud je hra aktivní, resetuj bzučák
                if (rooms[roomId].gameState === 'ACTIVE_ROUND') {
                    io.to(roomId).emit('buzzerReset');
                }
            }
            emitRoomState(roomId); // Pošle aktualizovaný stav
        }
    }
  });


  /**
   * UDÁLOST: Odpojení uživatele (zavření prohlížeče, obnovení stránky atd.)
   */
  socket.on('disconnect', () => {
    console.log('Server: Uživatel odpojen:', socket.id);
    
    // Získáme ID místnosti, ve které byl odpojený uživatel
    const roomId = socket.currentRoom; 

    if (roomId && rooms[roomId]) { // Kontrola, zda místnost existuje a uživatel v ní byl
      // Odeber uživatele ze seznamu hráčů v místnosti
      rooms[roomId].players = rooms[roomId].players.filter(player => player.id !== socket.id);
      
      console.log(`Server: Uživatel ${socket.username || socket.id} opustil místnost ${roomId}. Zbývající hráči: ${rooms[roomId].players.length}`);
      
      // Pokud je odpojený uživatel hostitel, zruš místnost
      if (rooms[roomId].hostId === socket.id) {
          console.log(`Server: Hostitel ${socket.username || socket.id} se odpojil. Místnost ${roomId} bude zrušena.`);
          io.to(roomId).emit('roomClosed', 'Hostitel se odpojil. Místnost byla zrušena.');
          // Zruš případný časovač kola
          if (rooms[roomId].roundTimer) { 
              clearTimeout(rooms[roomId].roundTimer);
              rooms[roomId].roundTimer = null;
          }
          delete rooms[roomId]; // Odstraní celou místnost z paměti
      } else if (rooms[roomId].players.length === 0) {
          // Pokud je odpojený poslední hráč (a není hostitel), zruš místnost
          console.log(`Server: Místnost ${roomId} zrušena (žádní hráči nezbyli).`);
          if (rooms[roomId].roundTimer) { 
              clearTimeout(rooms[roomId].roundTimer);
              rooms[roomId].roundTimer = null;
          }
          delete rooms[roomId];
      } else {
          // Jinak jen aktualizuj stav místnosti pro zbývající hráče
          // Pokud odešel vítěz aktuálního kola, resetuj vítěze
          if (rooms[roomId].winner && rooms[roomId].winner.id === socket.id) {
              rooms[roomId].winner = null;
              // Pokud je hra aktivní, resetuj bzučák
              if (rooms[roomId].gameState === 'ACTIVE_ROUND') {
                  io.to(roomId).emit('buzzerReset'); // Upozorni klienty
              }
          }
          emitRoomState(roomId); // Pošle aktualizovaný stav
      }
    }
  });
});


// Spuštění HTTP serveru na definovaném portu
server.listen(PORT, () => {
  console.log(`Buzzer server listening on port ${PORT}`);
});