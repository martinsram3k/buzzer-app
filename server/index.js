// server/index.js

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*", // Povolí připojení z jakékoli domény
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3001;

// Datová struktura pro ukládání stavu místností
// Klíč: roomId (string), Hodnota: { winner: null, players: [], hostId: string, gameState: string, currentRound: number, gameSettings: object, roundTimer: object|null }
const rooms = {};

// Funkce pro generování unikátního 5místného kódu místnosti
function generateRoomCode() {
    let code;
    do {
        code = Math.floor(10000 + Math.random() * 90000).toString(); // 5místné číslo
    } while (rooms[code]); // Zajišťuje unikátnost kódu
    return code;
}

// Základní HTTP GET endpoint pro kontrolu, že server běží
app.get('/', (req, res) => {
  res.send('Buzzer server is running!');
});

io.on('connection', (socket) => {
  console.log('Server: A user connected:', socket.id);

  // Funkce pro odeslání aktuálního stavu místnosti všem hráčům v místnosti
  function emitRoomState(roomId) {
    if (rooms[roomId]) {
      io.to(roomId).emit('roomState', rooms[roomId]);
      console.log(`Server: Odeslán roomState pro místnost ${roomId}. Stav: ${rooms[roomId].gameState}, Kolo: ${rooms[roomId].currentRound}, Hráči: ${rooms[roomId].players.length}`);
    }
  }

  // Funkce pro reset stavu bzučáku pro nové kolo
  function resetBuzzerState(roomId) {
    if (rooms[roomId]) {
      if (rooms[roomId].roundTimer) {
        clearTimeout(rooms[roomId].roundTimer); // Zastav předchozí časovač
        rooms[roomId].roundTimer = null;
      }
      rooms[roomId].winner = null;
      io.to(roomId).emit('buzzerReset'); // Upozorni klienty, že je bzučák resetován
      console.log(`Server: Buzzer stav v místnosti ${roomId} resetován.`);
    }
  }

  // Funkce pro spuštění nového kola
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

    const { roundDuration } = rooms[roomId].gameSettings;
    const countdownTime = 3; // Odpočet před startem kola

    rooms[roomId].gameState = 'COUNTDOWN'; // Stav odpočet
    rooms[roomId].countdownTime = countdownTime; // Pro poslání na klienty
    emitRoomState(roomId); // Pošli aktuální stav s odpočtem

    // Začátek odpočtu
    io.to(roomId).emit('countdownStart', countdownTime);

    // Po odpočtu se spustí kolo
    setTimeout(() => {
        if (!rooms[roomId]) return; // Zkontroluj, zda místnost stále existuje

        rooms[roomId].gameState = 'ACTIVE_ROUND'; // Stav aktivní kolo
        emitRoomState(roomId); // Pošli aktualizovaný stav

        console.log(`Server: Kolo ${rooms[roomId].currentRound} v místnosti ${roomId} začalo.`);
        io.to(roomId).emit('roundStarted', rooms[roomId].currentRound, rooms[roomId].gameSettings);

        // Nastav časovač pro délku kola, pokud není bez omezení
        if (roundDuration > 0) {
            rooms[roomId].roundTimer = setTimeout(() => {
                if (!rooms[roomId]) return; // Zkontroluj, zda místnost stále existuje

                console.log(`Server: Kolo ${rooms[roomId].currentRound} v místnosti ${roomId} skončilo vypršením času.`);
                rooms[roomId].gameState = 'ROUND_END'; // Stav konec kola (vypršení času)
                emitRoomState(roomId); // Pošli aktualizovaný stav
                io.to(roomId).emit('roundEnded', rooms[roomId].currentRound, rooms[roomId].winner);

                // Zkontroluj, zda je konec hry
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

  // UDÁLOST: Klient chce vytvořit novou místnost
  socket.on('createRoom', (username) => {
    console.log('Server: Přijata createRoom událost.');
    console.log('Server: Přijaté jméno pro createRoom:', username);

    if (username && username.trim().length > 0) { // Ověření jména
        socket.username = username.trim();
    } else {
        socket.username = 'Uživatel_' + socket.id.substring(0, 4);
        console.warn('Server: Username NENÍ předáno pro createRoom nebo je prázdné. Používám fallback:', socket.username);
    }

    const roomId = generateRoomCode();
    // Počáteční stav místnosti pro lobby
    rooms[roomId] = {
        roomId: roomId, // Uložení ID místnosti do objektu místnosti
        winner: null,
        players: [],
        hostId: socket.id,
        gameState: 'LOBBY', // NOVÉ: Počáteční stav je lobby
        currentRound: 0, // NOVÉ: Aktuální kolo
        gameSettings: { // NOVÉ: Výchozí nastavení hry
            roundDuration: 30, // 30 sekund
            numRounds: 3,
            hostPlays: true
        },
        roundTimer: null // Pro ukládání časovače kola
    };
    socket.join(roomId); // Uživatel se připojí do Socket.IO místnosti
    
    // Uložíme hráče jako objekt s ID a jménem
    rooms[roomId].players.push({ id: socket.id, username: socket.username }); 
    socket.currentRoom = roomId; // Uložíme si, ve které místnosti je socket
    
    console.log(`Server: Místnost ${roomId} vytvořena uživatelem ${socket.id} (${socket.username}) (HOST)`);
    socket.emit('roomCreated', roomId); // Potvrzení vytvoření klientovi
    
    emitRoomState(roomId); // Pošli počáteční stav lobby
  });

  // UDÁLOST: Klient se chce připojit do existující místnosti
  socket.on('joinRoom', (roomId, username) => {
    console.log('Server: Přijata joinRoom událost.');
    console.log('Server: Přijatý kód místnosti pro joinRoom:', roomId);
    console.log('Server: Přijaté jméno pro joinRoom:', username);

    if (username && username.trim().length > 0) { // Ověření jména
        socket.username = username.trim();
    } else {
        socket.username = 'Uživatel_' + socket.id.substring(0, 4);
        console.warn('Server: Username NENÍ předáno pro joinRoom nebo je prázdné. Používám fallback:', socket.username);
    }

    if (rooms[roomId]) {
      // Zabráníme duplicitnímu připojení (pokud už je v místnosti)
      if (!rooms[roomId].players.some(player => player.id === socket.id)) {
        socket.join(roomId);
        // Uložíme hráče jako objekt s ID a jménem
        rooms[roomId].players.push({ id: socket.id, username: socket.username });
        socket.currentRoom = roomId;
        
        console.log(`Server: Uživatel ${socket.id} (${socket.username}) se připojil do místnosti ${roomId}`);
        socket.emit('roomJoined', roomId);

        emitRoomState(roomId); // Pošle stav nově připojenému hráči A všem ostatním v místnosti
      } else {
        // Pokud už je uživatel v místnosti, prostě ho tam potvrdíme a pošleme roomState
        socket.emit('roomJoined', roomId);
        emitRoomState(roomId);
      }
    } else {
      socket.emit('roomNotFound'); // Místnost neexistuje
      console.log(`Server: Uživatel ${socket.id} (${socket.username}) se pokusil připojit do neexistující místnosti ${roomId}`);
    }
  });

  // NOVÉ: Hostitel aktualizuje nastavení hry
  socket.on('updateGameSettings', (roomId, settings) => {
    if (rooms[roomId] && rooms[roomId].hostId === socket.id) {
        // Základní validace nastavení
        const newRoundDuration = parseInt(settings.roundDuration);
        const newNumRounds = parseInt(settings.numRounds);
        const newHostPlays = Boolean(settings.hostPlays); // Zajistí boolean

        if (isNaN(newRoundDuration) || (newRoundDuration < 0 && newRoundDuration !== 0) || // 0 pro bez omezení
            isNaN(newNumRounds) || newNumRounds < 1 || newNumRounds > 100 ||
            typeof newHostPlays !== 'boolean') {
            socket.emit('notAuthorized', 'Neplatné nastavení hry.');
            console.warn(`Server: Neplatné nastavení hry od ${socket.username} v místnosti ${roomId}.`);
            return;
        }
        
        rooms[roomId].gameSettings = {
            roundDuration: newRoundDuration,
            numRounds: newNumRounds,
            hostPlays: newHostPlays
        };
        console.log(`Server: Nastavení hry v místnosti ${roomId} aktualizováno hostitelem ${socket.username}:`, rooms[roomId].gameSettings);
        emitRoomState(roomId); // Informuj všechny o změně nastavení
    } else {
        socket.emit('notAuthorized', 'Pouze hostitel může měnit nastavení hry.');
        console.warn(`Server: Pokus o změnu nastavení bez oprávnění od ${socket.username} v místnosti ${roomId}.`);
    }
  });

  // NOVÉ: Hostitel vykopne hráče
  socket.on('kickPlayer', (playerIdToKick) => {
    const roomId = socket.currentRoom;
    if (rooms[roomId] && rooms[roomId].hostId === socket.id) {
        const playerToKickIndex = rooms[roomId].players.findIndex(p => p.id === playerIdToKick);
        if (playerToKickIndex !== -1) {
            const playerToKick = rooms[roomId].players[playerToKickIndex];
            rooms[roomId].players.splice(playerToKickIndex, 1); // Odeber hráče
            
            const kickedSocket = io.sockets.sockets.get(playerIdToKick);
            if (kickedSocket) {
                kickedSocket.emit('roomClosed', `Byl jsi vykopnut z místnosti ${roomId} hostitelem.`);
                kickedSocket.leave(roomId); // Odeber ho ze Socket.IO místnosti
                kickedSocket.currentRoom = null; // Vyčisti jeho stav
                console.log(`Server: Hráč ${playerToKick.username} (${playerIdToKick}) vykopnut z místnosti ${roomId}.`);
            } else {
              console.warn(`Server: Vykořeněný socket pro ID ${playerIdToKick} nebyl nalezen.`);
            }
            emitRoomState(roomId); // Aktualizuj stav pro zbývající hráče
            io.to(roomId).emit('playerKicked', playerToKick.username); // Informuj ostatní
        } else {
            console.warn(`Server: Pokus o vykopnutí neexistujícího hráče ${playerIdToKick} z místnosti ${roomId}.`);
        }
    } else {
        socket.emit('notAuthorized', 'Pouze hostitel může vykopnout hráče.');
    }
  });

  // NOVÉ: Hostitel spustí hru (z lobby)
  socket.on('startGame', (roomId) => {
    if (rooms[roomId] && rooms[roomId].hostId === socket.id && rooms[roomId].gameState === 'LOBBY') {
        const requiredPlayers = rooms[roomId].gameSettings.hostPlays ? 1 : 2;
        if (rooms[roomId].players.length < requiredPlayers) {
            socket.emit('notAuthorized', `Potřebujete alespoň ${requiredPlayers} hráče(ů) pro spuštění hry.`);
            console.warn(`Server: Hostitel ${socket.username} se pokusil spustit hru s nedostatkem hráčů.`);
            return;
        }
        console.log(`Server: Hostitel ${socket.username} spustil hru v místnosti ${roomId}.`);
        startNewRound(roomId); // Spustíme první kolo
    } else {
        socket.emit('notAuthorized', 'Hru může spustit pouze hostitel z lobby.');
    }
  });

  // NOVÉ: Hostitel spustí další kolo
  socket.on('startNextRound', (roomId) => {
    if (rooms[roomId] && rooms[roomId].hostId === socket.id && rooms[roomId].gameState === 'ROUND_END') {
        if (rooms[roomId].currentRound < rooms[roomId].gameSettings.numRounds) {
            console.log(`Server: Hostitel ${socket.username} spustil další kolo v místnosti ${roomId}.`);
            startNewRound(roomId);
        } else {
            socket.emit('notAuthorized', 'Všechna kola již byla odehrána. Spusťte novou hru.');
            console.warn(`Server: Hostitel ${socket.username} se pokusil spustit další kolo, ale všechna kola již byla odehrána.`);
        }
    } else {
        socket.emit('notAuthorized', 'Další kolo může spustit pouze hostitel na konci kola.');
    }
  });

  // NOVÉ: Hostitel ukončí hru
  socket.on('endGame', (roomId) => {
    if (rooms[roomId] && rooms[roomId].hostId === socket.id && rooms[roomId].gameState === 'ROUND_END' && rooms[roomId].currentRound >= rooms[roomId].gameSettings.numRounds) {
        console.log(`Server: Hostitel ${socket.username} ukončil hru v místnosti ${roomId}.`);
        rooms[roomId].gameState = 'GAME_OVER';
        emitRoomState(roomId);
        io.to(roomId).emit('gameOver'); // Můžeme poslat i tuto specifickou událost
    } else {
        socket.emit('notAuthorized', 'Hru může ukončit pouze hostitel na konci všech kol.');
    }
  });

  // NOVÉ: Hostitel resetuje hru (do lobby stavu)
  socket.on('resetGame', (roomId) => {
    if (rooms[roomId] && rooms[roomId].hostId === socket.id && rooms[roomId].gameState === 'GAME_OVER') {
        console.log(`Server: Hostitel ${socket.username} resetoval hru v místnosti ${roomId}.`);
        // Resetujeme stav místnosti do počátečního lobby stavu
        rooms[roomId].winner = null;
        rooms[roomId].gameState = 'LOBBY';
        rooms[roomId].currentRound = 0;
        resetBuzzerState(roomId); // Vyčisti případný časovač
        emitRoomState(roomId);
    } else {
        socket.emit('notAuthorized', 'Hru může resetovat pouze hostitel po skončení hry.');
    }
  });


  // UDÁLOST: Klient bzučí
  socket.on('buzz', () => {
    const roomId = socket.currentRoom;
    if (roomId && rooms[roomId] && rooms[roomId].gameState === 'ACTIVE_ROUND' && !rooms[roomId].winner) {
      // Kontrola, zda hostitel hraje
      if (rooms[roomId].hostId === socket.id && !rooms[roomId].gameSettings.hostPlays) {
        socket.emit('notAuthorized', 'Jako hostitel, který nehraje, nemůžete bzučet.');
        console.log(`Server: Hostitel ${socket.username} se pokusil bzučet, ale nehraje.`);
        return;
      }
      
      // Zastavíme časovač kola, jakmile někdo bzučí
      if (rooms[roomId].roundTimer) {
        clearTimeout(rooms[roomId].roundTimer);
        rooms[roomId].roundTimer = null;
        console.log(`Server: Časovač kola pro místnost ${roomId} byl zastaven.`);
      }

      rooms[roomId].winner = { id: socket.id, username: socket.username, time: new Date().toISOString() };
      rooms[roomId].gameState = 'ROUND_END'; // Kolo končí bzučením
      console.log(`Server: Buzz v místnosti ${roomId} od: ${socket.id} (Jméno: ${socket.username})`);
      io.to(roomId).emit('buzzerWinner', rooms[roomId].winner);
      emitRoomState(roomId); // Pošleme aktualizovaný stav

      // Zkontroluj, zda je konec hry po bzučení
      if (rooms[roomId].currentRound >= rooms[roomId].gameSettings.numRounds) {
        console.log(`Server: Všechna kola odehrána po bzučení v místnosti ${roomId}. Hra končí.`);
        rooms[roomId].gameState = 'GAME_OVER'; // Nastav stav na konec hry
        emitRoomState(roomId);
        io.to(roomId).emit('gameOver');
      }
    } else {
        console.warn(`Server: Buzz zamítnut v místnosti ${roomId} od ${socket.username || socket.id}. Stav: ${rooms[roomId]?.gameState}, Vítěz: ${rooms[roomId]?.winner?.username || 'žádný'}`);
        // Můžeš poslat i konkrétní chybu klientovi
        if (rooms[roomId]?.gameState !== 'ACTIVE_ROUND') {
            socket.emit('notAuthorized', 'Nemůžeš bzučet v tomto stavu hry.');
        } else if (rooms[roomId]?.winner) {
            socket.emit('notAuthorized', 'Někdo už bzučel.');
        } else if (!roomId || !rooms[roomId]) {
            socket.emit('notAuthorized', 'Nejsi v žádné místnosti.');
        }
    }
  });

  // Původní resetBuzzer, nyní volaný interně nebo pro specifické účely
  socket.on('resetBuzzer', () => { // Toto tlačítko je nyní "Nová Hra" pro hostitele
    const roomId = socket.currentRoom;
    if (roomId && rooms[roomId] && rooms[roomId].hostId === socket.id) {
        // Logika pro reset hry z game over stavu
        if (rooms[roomId].gameState === 'GAME_OVER') {
            console.log(`Server: Manuální reset bzučáku (Nová Hra) v místnosti ${roomId} hostitelem ${socket.username}.`);
            rooms[roomId].winner = null;
            rooms[roomId].gameState = 'LOBBY';
            rooms[roomId].currentRound = 0;
            resetBuzzerState(roomId);
            emitRoomState(roomId);
        } else {
            // Pokud by to bylo potřeba resetovat uprostřed kola, což teď neděláme
            socket.emit('notAuthorized', 'Tlačítko pro reset bzučáku je nyní "Nová Hra" a je aktivní pouze na konci hry pro hostitele.');
        }
    } else {
        socket.emit('notAuthorized', 'K tomuto resetu má oprávnění pouze hostitel místnosti.');
    }
  });
  
  // NOVÉ: Explicitní opuštění místnosti (pro ty, co nechtějí zavírat okno)
  socket.on('leaveRoom', (roomId) => {
    console.log(`Server: Uživatel ${socket.username} (${socket.id}) explicitně opouští místnost ${roomId}.`);
    if (roomId && rooms[roomId]) {
        // Odeber hráče ze seznamu v místnosti
        rooms[roomId].players = rooms[roomId].players.filter(player => player.id !== socket.id);
        socket.leave(roomId);
        socket.currentRoom = null;

        // Pokud je hostitel, zruš místnost
        if (rooms[roomId].hostId === socket.id) {
            console.log(`Hostitel ${socket.username} se odpojil. Místnost ${roomId} bude zrušena.`);
            io.to(roomId).emit('roomClosed', 'Hostitel opustil místnost. Místnost byla zrušena.');
            if (rooms[roomId].roundTimer) { // Zruš i časovač kola
                clearTimeout(rooms[roomId].roundTimer);
                rooms[roomId].roundTimer = null;
            }
            delete rooms[roomId];
        } else if (rooms[roomId].players.length === 0) {
            // Pokud je poslední hráč, zruš místnost
            console.log(`Místnost ${roomId} zrušena (žádní hráči nezbyli).`);
            if (rooms[roomId].roundTimer) { // Zruš i časovač kola
                clearTimeout(rooms[roomId].roundTimer);
                rooms[roomId].roundTimer = null;
            }
            delete rooms[roomId];
        } else {
            // Jinak jen aktualizuj stav místnosti pro zbývající hráče
            // Pokud odešel vítěz, resetuj vítěze
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


  // UDÁLOST: Odpojení uživatele (zavření prohlížeče, obnovení stránky atd.)
  socket.on('disconnect', () => {
    console.log('Server: User disconnected:', socket.id);
    
    const roomId = socket.currentRoom; // Použijeme uložené ID místnosti

    if (roomId && rooms[roomId]) {
      // Odeber uživatele ze seznamu hráčů v místnosti
      rooms[roomId].players = rooms[roomId].players.filter(player => player.id !== socket.id);
      
      console.log(`Server: Uživatel ${socket.username || socket.id} opustil místnost ${roomId}. Zbývající hráči: ${rooms[roomId].players.length}`);
      
      // Pokud je odpojený uživatel hostitel, zruš místnost
      if (rooms[roomId].hostId === socket.id) {
          console.log(`Server: Hostitel ${socket.username || socket.id} se odpojil. Místnost ${roomId} bude zrušena.`);
          io.to(roomId).emit('roomClosed', 'Hostitel se odpojil. Místnost byla zrušena.');
          if (rooms[roomId].roundTimer) { // Zruš i časovač kola
              clearTimeout(rooms[roomId].roundTimer);
              rooms[roomId].roundTimer = null;
          }
          delete rooms[roomId]; // Odstraní celou místnost
      } else if (rooms[roomId].players.length === 0) {
          // Pokud je odpojený poslední hráč (a není hostitel), zruš místnost
          console.log(`Server: Místnost ${roomId} zrušena (žádní hráči nezbyli).`);
          if (rooms[roomId].roundTimer) { // Zruš i časovač kola
              clearTimeout(rooms[roomId].roundTimer);
              rooms[roomId].roundTimer = null;
          }
          delete rooms[roomId];
      } else {
          // Jinak jen aktualizuj stav místnosti pro zbývající hráče
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

server.listen(PORT, () => {
  console.log(`Buzzer server listening on port ${PORT}`);
});
