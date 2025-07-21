// server/index.js

// Import modulů Express, HTTP a Socket.IO
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const qrcode = require('qrcode'); // Import knihovny qrcode
const cors = require('cors'); // Import knihovny cors

// Inicializace Express aplikace a HTTP serveru
const app = express();
const server = http.createServer(app);

// Povolení CORS pro Express aplikaci (pro HTTP požadavky, jako je generování QR)
// Toto je pro REST API endpoints, jako je /generate_qr
app.use(cors()); 

// Dynamické určení povolených originů pro Socket.IO
// Toto je klíčové pro Render, kde se URL mohou lišit
const allowedOrigins = [
    "http://127.0.0.1:5500", // Povolit váš lokální frontend
    "https://buzzer-app-t20g.onrender.com", // Původní nasazená frontend URL
    "https://buzzer-app1.onrender.com" // NOVÁ nasazená frontend URL
];

// Přidáme proměnnou prostředí Renderu, pokud existuje
if (process.env.RENDER_EXTERNAL_URL) {
    // RENDER_EXTERNAL_URL je URL vašeho backendu.
    // Zde zajistíme, že všechny relevantní frontend URL jsou zahrnuty.
    // Měli byste zde přidat jakékoli další URL, ze kterých se váš frontend může připojovat.
    if (!allowedOrigins.includes("https://buzzer-app-t20g.onrender.com")) {
        allowedOrigins.push("https://buzzer-app-t20g.onrender.com");
    }
    if (!allowedOrigins.includes("https://buzzer-app1.onrender.com")) {
        allowedOrigins.push("https://buzzer-app1.onrender.com");
    }
}


// Inicializace Socket.IO serveru s rozšířenou CORS konfigurací
const io = new Server(server, {
  cors: {
    origin: allowedOrigins, // Použijeme dynamicky definované povolené originy
    methods: ["GET", "POST"], // Povolí metody pro komunikaci
    credentials: true // Důležité pro přenos cookies a autorizačních hlaviček
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

// NOVÝ ENDPOINT: Generování QR kódu
app.get('/generate_qr', async (req, res) => {
    const text = req.query.text; // Získání textu z query parametru
    if (!text) {
        return res.status(400).json({ error: "Parametr 'text' je povinný." });
    }

    try {
        // Generování QR kódu jako datového URI (base64)
        // Použijeme toDataURL, které vrací string 'data:image/png;base64,...'
        const qrCodeDataUrl = await qrcode.toDataURL(text, {
            errorCorrectionLevel: 'H', // Vysoká úroveň korekce chyb
            width: 200, // Šířka QR kódu v pixelech
            margin: 1, // Okraj kolem QR kódu
        });

        // Odešle base64 řetězec zpět klientovi
        // Odstraníme prefix 'data:image/png;base64,' protože frontend ho přidá
        const base64Image = qrCodeDataUrl.split(',')[1];
        res.json({ qr_code_image: base64Image });
    } catch (err) {
        console.error('Chyba při generování QR kódu:', err);
        res.status(500).json({ error: 'Interní chyba serveru při generování QR kódu.' });
    }
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
    
    // Počáteční stav místnosti pro lobby s výchozími pokročilými nastaveními
    rooms[roomId] = {
        roomId: roomId, // Uložení ID místnosti do objektu místnosti
        winner: null,
        players: [], // Seznam hráčů v místnosti
        hostId: socket.id, // ID hostitele (vytvořil místnost)
        gameState: 'LOBBY', // Počáteční stav je lobby
        currentRound: 0, // Aktuální kolo (0 před začátkem hry)
        gameSettings: { // Výchozí nastavení hry
            roundDuration: 30, // 30 sekund na kolo (min 5, max 300)
            numRounds: 3, // 3 kola (min 1, max 100)
            hostPlays: true, // Hostitel standardně hraje
            buzzerDelay: 0, // Zpoždění bzučáku v ms (min 0, max 5000)
            
            // Pokročilá nastavení (výchozí hodnoty)
            advanceMode: false, // Výchozí stav pokročilého režimu
            maxPlayers: 10, // Max hráčů v místnosti (min 2, max 50)
            multipleBuzz: false, // Více bzučení v kole
            teamsEnabled: false, // Týmy povoleny
            teamSize: 1, // Velikost týmu (min 1, max 25)
            numTeams: 0, // Počet týmů (min 0, max 25 - 0 pokud týmy nejsou povoleny)
            hostStartsNextRound: true, // Host spouští další kolo
            restTimeBetweenRounds: 5 // Čas odpočinku mezi koly v sekundách (min 0, max 60)
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
        // Kontrola maximálního počtu hráčů
        if (rooms[roomId].players.length >= rooms[roomId].gameSettings.maxPlayers) {
            socket.emit('roomFull', 'Místnost je plná. Nelze se připojit.');
            console.warn(`Server: Uživatel ${socket.username} se pokusil připojit do plné místnosti ${roomId}.`);
            return;
        }

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
    console.log(`Server: Přijato updateGameSettings pro místnost ${roomId}. Nastavení:`, settings);

    // Kontrola, zda místnost existuje a zda volající je hostitel
    if (!rooms[roomId] || rooms[roomId].hostId !== socket.id) {
        socket.emit('notAuthorized', 'Pouze hostitel může měnit nastavení hry.');
        console.warn(`Server: Pokus o změnu nastavení bez oprávnění od ${socket.username} v místnosti ${roomId}.`);
        return;
    }

    // --- Validace přijatých nastavení ---
    const currentSettings = rooms[roomId].gameSettings;
    let newSettings = { ...currentSettings }; // Kopie aktuálních nastavení

    try {
        // Základní nastavení
        newSettings.roundDuration = parseInt(settings.roundDuration);
        newSettings.numRounds = parseInt(settings.numRounds);
        newSettings.hostPlays = Boolean(settings.hostPlays);
        newSettings.buzzerDelay = parseInt(settings.buzzerDelay || 0); // Default 0

        // Pokročilá nastavení
        newSettings.advanceMode = Boolean(settings.advanceMode);
        newSettings.maxPlayers = parseInt(settings.maxPlayers);
        newSettings.multipleBuzz = Boolean(settings.multipleBuzz);
        newSettings.teamsEnabled = Boolean(settings.teamsEnabled);
        newSettings.teamSize = parseInt(settings.teamSize);
        newSettings.numTeams = parseInt(settings.numTeams);
        newSettings.hostStartsNextRound = Boolean(settings.hostStartsNextRound);
        newSettings.restTimeBetweenRounds = parseInt(settings.restTimeBetweenRounds);

        // --- Rozsahy a logické validace ---
        if (isNaN(newSettings.roundDuration) || newSettings.roundDuration < 5 || newSettings.roundDuration > 300) {
            throw new Error('Neplatná délka kola (5-300 sekund).');
        }
        if (isNaN(newSettings.numRounds) || newSettings.numRounds < 1 || newSettings.numRounds > 100) {
            throw new Error('Neplatný počet kol (1-100).');
        }
        if (typeof newSettings.hostPlays !== 'boolean') {
            throw new Error('Neplatná hodnota pro "Host hraje".');
        }
        if (isNaN(newSettings.buzzerDelay) || newSettings.buzzerDelay < 0 || newSettings.buzzerDelay > 5000) {
            throw new Error('Neplatné zpoždění bzučáku (0-5000 ms).');
        }
        if (typeof newSettings.advanceMode !== 'boolean') {
            throw new Error('Neplatná hodnota pro "Pokročilý režim".');
        }
        if (isNaN(newSettings.maxPlayers) || newSettings.maxPlayers < 2 || newSettings.maxPlayers > 50) {
            throw new Error('Neplatný maximální počet hráčů (2-50).');
        }
        if (typeof newSettings.multipleBuzz !== 'boolean') {
            throw new Error('Neplatná hodnota pro "Více bzučení".');
        }
        if (typeof newSettings.teamsEnabled !== 'boolean') {
            throw new Error('Neplatná hodnota pro "Týmy".');
        }
        if (isNaN(newSettings.restTimeBetweenRounds) || newSettings.restTimeBetweenRounds < 0 || newSettings.restTimeBetweenRounds > 60) {
            throw new Error('Neplatný čas odpočinku (0-60 sekund).');
        }
        if (typeof newSettings.hostStartsNextRound !== 'boolean') {
            throw new Error('Neplatná hodnota pro "Host spouští další kolo".');
        }

        // Validace pro týmy (pouze pokud jsou týmy povoleny)
        if (newSettings.teamsEnabled) {
            if (isNaN(newSettings.teamSize) || newSettings.teamSize < 1 || newSettings.teamSize > 25) {
                throw new Error('Neplatná velikost týmu (1-25), pokud jsou týmy povoleny.');
            }
            if (isNaN(newSettings.numTeams) || newSettings.numTeams < 2 || newSettings.numTeams > 25) {
                throw new Error('Neplatný počet týmů (min. 2, max. 25), pokud jsou týmy povoleny.');
            }
            // Kontrola dělitelnosti pouze pokud teamSize > 0
            if (newSettings.teamSize > 0 && newSettings.maxPlayers % newSettings.teamSize !== 0) {
                throw new Error('Maximální počet hráčů musí být dělitelný velikostí týmu.');
            }
        } else {
            // Pokud týmy nejsou povoleny, vynulujeme hodnoty, aby nedocházelo k chybám
            newSettings.teamSize = 1;
            newSettings.numTeams = 0;
        }

        // Aktualizace nastavení v objektu místnosti
        rooms[roomId].gameSettings = newSettings;
        console.log(`Server: Nastavení hry v místnosti ${roomId} aktualizováno hostitelem ${socket.username}:`, rooms[roomId].gameSettings);
        emitRoomState(roomId); // Informuj všechny o změně nastavení

    } catch (error) {
        console.warn(`Server: Chyba validace nastavení od ${socket.username} v místnosti ${roomId}: ${error.message}`);
        socket.emit('notAuthorized', `Neplatné nastavení hry: ${error.message}`);
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
            console.log(`Hostitel ${socket.username} se odpojil. Místnost ${roomId} byla zrušena.`);
            io.to(roomId).emit('roomClosed', 'Hostitel opustil místnost. Místnost byla zrušena.');
            // Zruš případný časovač kola
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
