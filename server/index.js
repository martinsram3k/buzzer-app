// server/index.js

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3001;

const rooms = {};

function generateRoomCode() {
    let code;
    do {
        code = Math.floor(10000 + Math.random() * 90000).toString();
    } while (rooms[code]);
    return code;
}

app.get('/', (req, res) => {
  res.send('Buzzer server is running!');
});

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  // Uložíme si jméno uživatele hned po připojení (pokud se ho dozvíme)
  // nebo ho nastavíme později, až vytvoří/připojí se do místnosti.
  socket.username = 'Uživatel_' + socket.id.substring(0, 4); // Výchozí jméno

  // --- NOVÉ UDÁLOSTI PRO MÍSTNOSTI S JMÉNEM ---

  // UDÁLOST: Klient chce vytvořit novou místnost
  socket.on('createRoom', (username) => { // Přijímá username
    if (username) {
        socket.username = username; // Aktualizuj jméno uživatele
    }
    const roomId = generateRoomCode();
    rooms[roomId] = { winner: null, players: [], hostId: socket.id };
    socket.join(roomId);
    
    // Uložíme hráče jako objekt s ID a jménem
    rooms[roomId].players.push({ id: socket.id, username: socket.username }); 
    socket.currentRoom = roomId; // Uložíme si, ve které místnosti je socket
    
    console.log(`Místnost ${roomId} vytvořena uživatelem ${socket.id} (${socket.username}) (HOST)`);
    socket.emit('roomCreated', roomId);
    
    io.to(roomId).emit('roomState', rooms[roomId]);
  });

  // UDÁLOST: Klient se chce připojit do existující místnosti
  socket.on('joinRoom', (roomId, username) => { // Přijímá roomId a username
    if (username) {
        socket.username = username; // Aktualizuj jméno uživatele
    }

    if (rooms[roomId]) {
      // Zabráníme duplicitnímu připojení (pokud už je v místnosti)
      if (!rooms[roomId].players.some(player => player.id === socket.id)) {
        socket.join(roomId);
        // Uložíme hráče jako objekt s ID a jménem
        rooms[roomId].players.push({ id: socket.id, username: socket.username });
        socket.currentRoom = roomId; // Uložíme si, ve které místnosti je socket
        
        console.log(`Uživatel ${socket.id} (${socket.username}) se připojil do místnosti ${roomId}`);
        socket.emit('roomJoined', roomId);

        io.to(roomId).emit('roomState', rooms[roomId]);
      } else {
        // Pokud už je uživatel v místnosti, prostě ho tam potvrdíme
        socket.emit('roomJoined', roomId);
        io.to(roomId).emit('roomState', rooms[roomId]);
      }
    } else {
      socket.emit('roomNotFound');
      console.log(`Uživatel ${socket.id} (${socket.username}) se pokusil připojit do neexistující místnosti ${roomId}`);
    }
  });

  // --- UPRAVENÉ PŮVODNÍ UDÁLOSTI (buzz, resetBuzzer) ---

  // UDÁLOST: Klient bzučí
  socket.on('buzz', () => {
    // Použijeme socket.currentRoom pro získání místnosti
    const roomId = socket.currentRoom; 
    
    if (roomId && rooms[roomId] && !rooms[roomId].winner) {
      // Uložíme jméno vítěze
      rooms[roomId].winner = { id: socket.id, username: socket.username, time: new Date().toISOString() };
      console.log(`Buzz v místnosti ${roomId} od: ${socket.id} (${socket.username})`);
      io.to(roomId).emit('buzzerWinner', rooms[roomId].winner);
    }
  });

  // UDÁLOST: Klient resetuje bzučák
  socket.on('resetBuzzer', () => {
    const roomId = socket.currentRoom;

    if (roomId && rooms[roomId] && rooms[roomId].hostId === socket.id) {
      rooms[roomId].winner = null;
      console.log(`Buzzer reset v místnosti ${roomId} uživatelem: ${socket.id} (${socket.username})`);
      io.to(roomId).emit('buzzerReset');
    } else {
        socket.emit('notAuthorized', 'K resetu bzučáku má oprávnění pouze hostitel místnosti.');
    }
  });

  // --- UPRAVENÁ UDÁLOST disconnect ---
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    
    const roomId = socket.currentRoom; // Použijeme uložené ID místnosti

    if (roomId && rooms[roomId]) {
      // Odeber uživatele ze seznamu hráčů v místnosti
      rooms[roomId].players = rooms[roomId].players.filter(player => player.id !== socket.id);
      
      console.log(`Uživatel ${socket.id} (${socket.username}) opustil místnost ${roomId}. Zbývající hráči: ${rooms[roomId].players.length}`);
      
      // Pokud je odpojený uživatel hostitel, zruš místnost
      if (rooms[roomId].hostId === socket.id) {
          console.log(`Hostitel ${socket.id} se odpojil. Místnost ${roomId} bude zrušena.`);
          io.to(roomId).emit('roomClosed', 'Hostitel se odpojil. Místnost byla zrušena.');
          delete rooms[roomId]; // Odstraní celou místnost
      } else if (rooms[roomId].players.length === 0) {
          // Pokud je odpojený poslední hráč (a není hostitel), zruš místnost
          console.log(`Místnost ${roomId} zrušena (žádní hráči nezbyli).`);
          delete rooms[roomId];
      } else {
          // Jinak jen aktualizuj stav místnosti pro zbývající hráče
          io.to(roomId).emit('playerDisconnected', socket.id); // Informuj ostatní o odpojení hráče
          
          if (rooms[roomId].winner && rooms[roomId].winner.id === socket.id) {
              rooms[roomId].winner = null;
              io.to(roomId).emit('buzzerReset');
          }
          io.to(roomId).emit('roomState', rooms[roomId]);
      }
    }
  });
});
// _

server.listen(PORT, () => {
  console.log(`Buzzer server listening on port ${PORT}`);
});