// server/index.js

// Import modulů Express, HTTP a Socket.IO
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const qrcode = require('qrcode');
const cors = require('cors');

const app = express();
const server = http.createServer(app);

// Povolíme CORS pro Express a Socket.IO
const allowedOrigins = [
    "http://127.0.0.1:5500",
    "https://buzzer-app-t20g.onrender.com",
    "https://buzzer-app1.onrender.com"
];
if (process.env.RENDER_EXTERNAL_URL) {
    if (!allowedOrigins.includes("https://buzzer-app-t20g.onrender.com")) {
        allowedOrigins.push("https://buzzer-app-t20g.onrender.com");
    }
    if (!allowedOrigins.includes("https://buzzer-app1.onrender.com")) {
        allowedOrigins.push("https://buzzer-app1.onrender.com");
    }
}
app.use(cors()); 
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true
  }
});

const PORT = process.env.PORT || 3001;

// Datová struktura pro ukládání stavu místností
const rooms = {};

// Funkce pro generování unikátního 5místného kódu místnosti
function generateRoomCode() {
    let code;
    do {
        code = Math.floor(10000 + Math.random() * 90000).toString();
    } while (rooms[code]);
    return code;
}

// Základní HTTP GET endpoint pro kontrolu, že server běží
app.get('/', (req, res) => {
  res.send('Buzzer server is running!');
});

// NOVÝ ENDPOINT: Generování QR kódu
app.get('/generate_qr', async (req, res) => {
    const text = req.query.text;
    if (!text) {
        return res.status(400).json({ error: "Parametr 'text' je povinný." });
    }

    try {
        const qrCodeDataUrl = await qrcode.toDataURL(text, {
            errorCorrectionLevel: 'H',
            width: 200,
            margin: 1,
        });
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
   * Tato funkce je definována v rámci io.on('connection'), a proto má přístup k 'io'.
   * @param {string} roomId ID místnosti, jejíž stav se má odeslat.
   */
  function emitRoomState(roomId) {
    if (rooms[roomId]) {
      io.to(roomId).emit('roomState', rooms[roomId]);
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
      if (rooms[roomId].roundTimer) {
        clearTimeout(rooms[roomId].roundTimer);
        rooms[roomId].roundTimer = null;
      }
      rooms[roomId].winner = null;
      io.to(roomId).emit('buzzerReset');
      console.log(`Server: Buzzer stav v místnosti ${roomId} resetován.`);
    }
  }

  /**
   * Funkce pro spuštění nového kola hry.
   * @param {string} roomId ID místnosti.
   */
  function startNewRound(roomId) {
    if (!rooms[roomId]) {
      console.warn(`Server: Pokus o spuštění kola v neexistující místnosti: ${roomId}`);
      return;
    }

    resetBuzzerState(roomId);
    if (rooms[roomId].gameState !== 'LOBBY' && rooms[roomId].gameState !== 'GAME_OVER') {
        rooms[roomId].currentRound++;
    } else {
        rooms[roomId].currentRound = 1;
    }

    const { roundDuration } = rooms[roomId].gameSettings;
    const countdownTime = 3;

    rooms[roomId].gameState = 'COUNTDOWN';
    emitRoomState(roomId);

    setTimeout(() => {
        if (!rooms[roomId]) {
          console.warn(`Server: Místnost ${roomId} zrušena během odpočtu.`);
          return;
        }

        rooms[roomId].gameState = 'ACTIVE_ROUND';
        emitRoomState(roomId);

        console.log(`Server: Kolo ${rooms[roomId].currentRound} v místnosti ${roomId} začalo.`);

        if (roundDuration > 0) {
            rooms[roomId].roundTimer = setTimeout(() => {
                if (!rooms[roomId]) return;

                console.log(`Server: Kolo ${rooms[roomId].currentRound} v místnosti ${roomId} skončilo vypršením času.`);
                rooms[roomId].gameState = 'ROUND_END';
                emitRoomState(roomId);

                if (rooms[roomId].currentRound >= rooms[roomId].gameSettings.numRounds) {
                    console.log(`Server: Všechna kola v místnosti ${roomId} odehrána. Hra končí.`);
                    rooms[roomId].gameState = 'GAME_OVER';
                    emitRoomState(roomId);
                }
            }, roundDuration * 1000);
        } else {
            console.log(`Server: Kolo ${rooms[roomId].currentRound} v místnosti ${roomId} začalo (bez časového omezení).`);
        }
    }, countdownTime * 1000);
  }

  // --- UDÁLOSTI Z KLIENTA ---

  socket.on('createRoom', (username) => {
    if (username && username.trim().length > 0) {
        socket.username = username.trim();
    } else {
        socket.username = 'Uživatel_' + socket.id.substring(0, 4);
        console.warn('Server: Username NENÍ předáno pro createRoom nebo je prázdné. Používám fallback:', socket.username);
    }
    const roomId = generateRoomCode();
    rooms[roomId] = {
        roomId: roomId,
        winner: null,
        players: [],
        hostId: socket.id,
        gameState: 'LOBBY',
        currentRound: 0,
        gameSettings: {
            roundDuration: 30,
            numRounds: 3,
            hostPlays: true,
            buzzerDelay: 0,
            advanceMode: false,
            maxPlayers: 10,
            multipleBuzz: false,
            teamsEnabled: false,
            teamSize: 1,
            numTeams: 0,
            hostStartsNextRound: true,
            restTimeBetweenRounds: 5
        },
        roundTimer: null
    };
    socket.join(roomId);
    rooms[roomId].players.push({ id: socket.id, username: socket.username });
    socket.currentRoom = roomId;
    console.log(`Server: Místnost ${roomId} vytvořena uživatelem ${socket.id} (${socket.username}) (HOST)`);
    socket.emit('roomCreated', roomId);
    emitRoomState(roomId);
  });

  socket.on('joinRoom', (roomId, username) => {
    if (username && username.trim().length > 0) {
        socket.username = username.trim();
    } else {
        socket.username = 'Uživatel_' + socket.id.substring(0, 4);
        console.warn('Server: Username NENÍ předáno pro joinRoom nebo je prázdné. Používám fallback:', socket.username);
    }
    if (rooms[roomId]) {
      if (!rooms[roomId].players.some(player => player.id === socket.id)) {
        if (rooms[roomId].players.length >= rooms[roomId].gameSettings.maxPlayers) {
            socket.emit('roomFull', 'Místnost je plná. Nelze se připojit.');
            console.warn(`Server: Uživatel ${socket.username} se pokusil připojit do plné místnosti ${roomId}.`);
            return;
        }
        socket.join(roomId);
        rooms[roomId].players.push({ id: socket.id, username: socket.username });
        socket.currentRoom = roomId;
        console.log(`Server: Uživatel ${socket.id} (${socket.username}) se připojil do místnosti ${roomId}`);
        socket.emit('roomJoined', roomId);
        emitRoomState(roomId);
      } else {
        console.log(`Server: Uživatel ${socket.id} (${socket.username}) se pokusil znovu připojit do místnosti ${roomId}.`);
        socket.emit('roomJoined', roomId);
        emitRoomState(roomId);
      }
    } else {
      socket.emit('roomNotFound');
      console.log(`Server: Uživatel ${socket.id} (${socket.username}) se pokusil připojit do neexistující místnosti ${roomId}`);
    }
  });

  socket.on('updateGameSettings', (roomId, settings) => {
    if (!rooms[roomId] || rooms[roomId].hostId !== socket.id) {
        socket.emit('notAuthorized', 'Pouze hostitel může měnit nastavení hry.');
        console.warn(`Server: Pokus o změnu nastavení bez oprávnění od ${socket.username} v místnosti ${roomId}.`);
        return;
    }
    const currentSettings = rooms[roomId].gameSettings;
    let newSettings = { ...currentSettings };
    try {
        newSettings.roundDuration = parseInt(settings.roundDuration);
        newSettings.numRounds = parseInt(settings.numRounds);
        newSettings.hostPlays = Boolean(settings.hostPlays);
        newSettings.buzzerDelay = parseInt(settings.buzzerDelay || 0);
        newSettings.advanceMode = Boolean(settings.advanceMode);
        newSettings.maxPlayers = parseInt(settings.maxPlayers);
        newSettings.multipleBuzz = Boolean(settings.multipleBuzz);
        newSettings.teamsEnabled = Boolean(settings.teamsEnabled);
        newSettings.teamSize = parseInt(settings.teamSize);
        newSettings.numTeams = parseInt(settings.numTeams);
        newSettings.hostStartsNextRound = Boolean(settings.hostStartsNextRound);
        newSettings.restTimeBetweenRounds = parseInt(settings.restTimeBetweenRounds);
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
        if (newSettings.teamsEnabled) {
            if (isNaN(newSettings.teamSize) || newSettings.teamSize < 1 || newSettings.teamSize > 25) {
                throw new Error('Neplatná velikost týmu (1-25), pokud jsou týmy povoleny.');
            }
            if (isNaN(newSettings.numTeams) || newSettings.numTeams < 2 || newSettings.numTeams > 25) {
                throw new Error('Neplatný počet týmů (min. 2, max. 25), pokud jsou týmy povoleny.');
            }
            if (newSettings.teamSize > 0 && newSettings.maxPlayers % newSettings.teamSize !== 0) {
                throw new Error('Maximální počet hráčů musí být dělitelný velikostí týmu.');
            }
        } else {
            newSettings.teamSize = 1;
            newSettings.numTeams = 0;
        }
        rooms[roomId].gameSettings = newSettings;
        console.log(`Server: Nastavení hry v místnosti ${roomId} aktualizováno hostitelem ${socket.username}:`, rooms[roomId].gameSettings);
        emitRoomState(roomId);
    } catch (error) {
        console.warn(`Server: Chyba validace nastavení od ${socket.username} v místnosti ${roomId}: ${error.message}`);
        socket.emit('notAuthorized', `Neplatné nastavení hry: ${error.message}`);
    }
  });

  socket.on('kickPlayer', (playerIdToKick) => {
    const roomId = socket.currentRoom;
    if (rooms[roomId] && rooms[roomId].hostId === socket.id) {
        const playerToKickIndex = rooms[roomId].players.findIndex(p => p.id === playerIdToKick);
        if (playerToKickIndex !== -1) {
            const playerToKick = rooms[roomId].players[playerToKickIndex];
            rooms[roomId].players.splice(playerToKickIndex, 1);
            const kickedSocket = io.sockets.sockets.get(playerIdToKick);
            if (kickedSocket) {
                kickedSocket.emit('roomClosed', `Byl jsi vykopnut z místnosti ${roomId} hostitelem.`);
                kickedSocket.leave(roomId);
                kickedSocket.currentRoom = null;
                console.log(`Server: Hráč ${playerToKick.username} (${playerIdToKick}) vykopnut z místnosti ${roomId}.`);
            } else {
              console.warn(`Server: Vykořeněný socket pro ID ${playerIdToKick} nebyl nalezen.`);
            }
            emitRoomState(roomId);
            io.to(roomId).emit('playerKicked', playerToKick.username);
        } else {
            console.warn(`Server: Pokus o vykopnutí neexistujícího hráče ${playerIdToKick} z místnosti ${roomId}.`);
        }
    } else {
        socket.emit('notAuthorized', 'Pouze hostitel může vykopnout hráče.');
        console.warn(`Server: Pokus o vykopnutí hráče bez oprávnění od ${socket.username} v místnosti ${roomId}.`);
    }
  });
  
  // Opravená logika startGame
  socket.on('startGame', (roomId, gameSettings) => {
    const room = rooms[roomId];
    if (room && socket.id === room.hostId && room.gameState === 'LOBBY') {
        const requiredPlayers = room.gameSettings.hostPlays ? 1 : 2;
        if (room.players.length < requiredPlayers) {
            socket.emit('notAuthorized', `Potřebujete alespoň ${requiredPlayers} hráče(ů) pro spuštění hry.`);
            console.warn(`Server: Hostitel ${socket.username} se pokusil spustit hru s nedostatkem hráčů v místnosti ${roomId}.`);
            return;
        }
        console.log(`Server: Hostitel ${socket.username} spustil hru v místnosti ${roomId}.`);
        room.gameSettings = gameSettings;
        // NOVÁ FUNKCE: Spustíme nové kolo, které se postará o odpočet a zbytek hry.
        startNewRound(roomId);
    } else {
        socket.emit('notAuthorized', 'Hru může spustit pouze hostitel z lobby.');
        console.warn(`Server: Pokus o spuštění hry bez oprávnění nebo ve špatném stavu od ${socket.username} v místnosti ${roomId}.`);
    }
  });

  socket.on('startNextRound', (roomId) => {
    if (rooms[roomId] && rooms[roomId].hostId === socket.id && rooms[roomId].gameState === 'ROUND_END') {
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

  socket.on('resetGame', (roomId) => {
    if (rooms[roomId] && rooms[roomId].hostId === socket.id && rooms[roomId].gameState === 'GAME_OVER') {
        console.log(`Server: Hostitel ${socket.username} resetoval hru v místnosti ${roomId}.`);
        rooms[roomId].winner = null;
        rooms[roomId].gameState = 'LOBBY';
        rooms[roomId].currentRound = 0;
        resetBuzzerState(roomId);
        emitRoomState(roomId);
    } else {
        socket.emit('notAuthorized', 'Hru může resetovat pouze hostitel po skončení hry.');
        console.warn(`Server: Pokus o reset hry bez oprávnění nebo ve špatném stavu od ${socket.username} v místnosti ${roomId}.`);
    }
  });

  // Zrušení hry - navrácení do lobby
  socket.on('cancelGame', (roomId) => {
    if (rooms[roomId] && rooms[roomId].hostId === socket.id && rooms[roomId].gameState !== 'LOBBY') {
      console.log(`Server: Hra v místnosti ${roomId} zrušena hostitelem ${socket.username}.`);
      rooms[roomId].winner = null;
      rooms[roomId].gameState = 'LOBBY';
      rooms[roomId].currentRound = 0;
      resetBuzzerState(roomId);
      emitRoomState(roomId);
    } else {
      socket.emit('notAuthorized', 'Hru můžete zrušit pouze jako hostitel a pokud hra neprobíhá v lobby.');
      console.warn(`Server: Pokus o zrušení hry bez oprávnění nebo ve špatném stavu od ${socket.username} v místnosti ${roomId}.`);
    }
  });

  socket.on('buzz', () => {
    const roomId = socket.currentRoom;
    if (roomId && rooms[roomId] && rooms[roomId].gameState === 'ACTIVE_ROUND' && !rooms[roomId].winner) {
      if (rooms[roomId].hostId === socket.id && !rooms[roomId].gameSettings.hostPlays) {
        socket.emit('notAuthorized', 'Jako hostitel, který nehraje, nemůžete bzučet.');
        console.log(`Server: Hostitel ${socket.username} se pokusil bzučet, ale nehraje v místnosti ${roomId}.`);
        return;
      }
      if (rooms[roomId].roundTimer) {
        clearTimeout(rooms[roomId].roundTimer);
        rooms[roomId].roundTimer = null;
        console.log(`Server: Časovač kola pro místnost ${roomId} byl zastaven.`);
      }
      rooms[roomId].winner = { id: socket.id, username: socket.username, time: new Date().toISOString() };
      rooms[roomId].gameState = 'ROUND_END';
      console.log(`Server: Buzz v místnosti ${roomId} od: ${socket.id} (Jméno: ${socket.username})`);
      emitRoomState(roomId);
      if (rooms[roomId].currentRound >= rooms[roomId].gameSettings.numRounds) {
        console.log(`Server: Všechna kola odehrána po bzučení v místnosti ${roomId}. Hra končí.`);
        rooms[roomId].gameState = 'GAME_OVER';
        emitRoomState(roomId);
      }
    } else {
        console.warn(`Server: Buzz zamítnut v místnosti ${roomId} od ${socket.username || socket.id}. Stav: ${rooms[roomId]?.gameState}, Vítěz: ${rooms[roomId]?.winner?.username || 'žádný'}.`);
        if (rooms[roomId]?.gameState !== 'ACTIVE_ROUND') {
            socket.emit('notAuthorized', 'Nemůžeš bzučet v tomto stavu hry.');
        } else if (rooms[roomId]?.winner) {
            socket.emit('notAuthorized', 'Někdo už bzučel.');
        } else if (!roomId || !rooms[roomId]) {
            socket.emit('notAuthorized', 'Nejsi v žádné místnosti.');
        }
    }
  });

  socket.on('leaveRoom', (roomId) => {
    console.log(`Server: Uživatel ${socket.username} (${socket.id}) explicitně opouští místnost ${roomId}.`);
    if (roomId && rooms[roomId]) {
        rooms[roomId].players = rooms[roomId].players.filter(player => player.id !== socket.id);
        socket.leave(roomId);
        socket.currentRoom = null;
        if (rooms[roomId].hostId === socket.id) {
            console.log(`Hostitel ${socket.username} se odpojil. Místnost ${roomId} byla zrušena.`);
            io.to(roomId).emit('roomClosed', 'Hostitel opustil místnost. Místnost byla zrušena.');
            if (rooms[roomId].roundTimer) {
                clearTimeout(rooms[roomId].roundTimer);
                rooms[roomId].roundTimer = null;
            }
            delete rooms[roomId];
        } else if (rooms[roomId].players.length === 0) {
            console.log(`Místnost ${roomId} zrušena (žádní hráči nezbyli).`);
            if (rooms[roomId].roundTimer) {
                clearTimeout(rooms[roomId].roundTimer);
                rooms[roomId].roundTimer = null;
            }
            delete rooms[roomId];
        } else {
            if (rooms[roomId].winner && rooms[roomId].winner.id === socket.id) {
                rooms[roomId].winner = null;
                if (rooms[roomId].gameState === 'ACTIVE_ROUND') {
                    io.to(roomId).emit('buzzerReset');
                }
            }
            emitRoomState(roomId);
        }
    }
  });

  socket.on('disconnect', () => {
    console.log('Server: Uživatel odpojen:', socket.id);
    const roomId = socket.currentRoom;
    if (roomId && rooms[roomId]) {
      rooms[roomId].players = rooms[roomId].players.filter(player => player.id !== socket.id);
      console.log(`Server: Uživatel ${socket.username || socket.id} opustil místnost ${roomId}. Zbývající hráči: ${rooms[roomId].players.length}`);
      if (rooms[roomId].hostId === socket.id) {
          console.log(`Server: Hostitel ${socket.username || socket.id} se odpojil. Místnost ${roomId} bude zrušena.`);
          io.to(roomId).emit('roomClosed', 'Hostitel se odpojil. Místnost byla zrušena.');
          if (rooms[roomId].roundTimer) {
              clearTimeout(rooms[roomId].roundTimer);
              rooms[roomId].roundTimer = null;
          }
          delete rooms[roomId];
      } else if (rooms[roomId].players.length === 0) {
          console.log(`Server: Místnost ${roomId} zrušena (žádní hráči nezbyli).`);
          if (rooms[roomId].roundTimer) {
              clearTimeout(rooms[roomId].roundTimer);
              rooms[roomId].roundTimer = null;
          }
          delete rooms[roomId];
      } else {
          if (rooms[roomId].winner && rooms[roomId].winner.id === socket.id) {
              rooms[roomId].winner = null;
              if (rooms[roomId].gameState === 'ACTIVE_ROUND') {
                  io.to(roomId).emit('buzzerReset');
              }
          }
          emitRoomState(roomId);
      }
    }
  });
});


server.listen(PORT, () => {
  console.log(`Buzzer server listening on port ${PORT}`);
});