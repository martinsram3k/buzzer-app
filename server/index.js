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
// Klíč: roomId (string), Hodnota: { winner: null, players: [], hostId: string }
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

// Socket.IO event handlery
io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  // --- NOVÉ UDÁLOSTI PRO MÍSTNOSTI S JMÉNEM ---

  // UDÁLOST: Klient chce vytvořit novou místnost
  socket.on('createRoom', (username) => { // Přijímá username
    console.log('Server: Přijata createRoom událost.');
    console.log('Server: Přijaté jméno pro createRoom:', username); // Ladící výstup

    if (username) {
        socket.username = username; // Toto je klíčové pro uložení jména k socketu
    } else {
        socket.username = 'Uživatel_' + socket.id.substring(0, 4); // Fallback
        console.warn('Server: Username NENÍ předáno pro createRoom. Používám fallback:', socket.username); // Ladící výstup
    }

    const roomId = generateRoomCode();
    rooms[roomId] = { winner: null, players: [], hostId: socket.id };
    socket.join(roomId); // Uživatel se připojí do Socket.IO místnosti
    
    // Uložíme hráče jako objekt s ID a jménem
    rooms[roomId].players.push({ id: socket.id, username: socket.username }); 
    socket.currentRoom = roomId; // Uložíme si, ve které místnosti je socket
    
    console.log(`Místnost ${roomId} vytvořena uživatelem ${socket.id} (${socket.username}) (HOST)`);
    socket.emit('roomCreated', roomId);
    
    // Pošleme aktuální stav místnosti nově připojenému hostiteli
    io.to(roomId).emit('roomState', rooms[roomId]);
  });

  // UDÁLOST: Klient se chce připojit do existující místnosti
  socket.on('joinRoom', (roomId, username) => { // Přijímá roomId a username
    console.log('Server: Přijata joinRoom událost.');
    console.log('Server: Přijatý kód místnosti pro joinRoom:', roomId); // Ladící výstup
    console.log('Server: Přijaté jméno pro joinRoom:', username); // Ladící výstup

    if (username) {
        socket.username = username; // Toto je klíčové pro uložení jména k socketu
    } else {
        socket.username = 'Uživatel_' + socket.id.substring(0, 4); // Fallback
        console.warn('Server: Username NENÍ předáno pro joinRoom. Používám fallback:', socket.username); // Ladící výstup
    }

    if (rooms[roomId]) {
      // Zabráníme duplicitnímu připojení (pokud už je v místnosti)
      if (!rooms[roomId].players.some(player => player.id === socket.id)) {
        socket.join(roomId); // Uživatel se připojí do Socket.IO místnosti
        // Uložíme hráče jako objekt s ID a jménem
        rooms[roomId].players.push({ id: socket.id, username: socket.username });
        socket.currentRoom = roomId; // Uložíme si, ve které místnosti je socket
        
        console.log(`Uživatel ${socket.id} (${socket.username}) se připojil do místnosti ${roomId}`);
        socket.emit('roomJoined', roomId);

        // Pošleme aktuální stav místnosti nově připojenému hráči A všem ostatním v místnosti
        io.to(roomId).emit('roomState', rooms[roomId]);
      } else {
        // Pokud už je uživatel v místnosti, prostě ho tam potvrdíme
        socket.emit('roomJoined', roomId);
        io.to(roomId).emit('roomState', rooms[roomId]);
      }
    } else {
      socket.emit('roomNotFound'); // Místnost neexistuje
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
      console.log(`Server: Buzz v místnosti ${roomId} od: ${socket.id} (Jméno: ${socket.username})`); // Ladící výstup
      // Odešleme informaci o vítězi POUZE klientům v této místnosti
      io.to(roomId).emit('buzzerWinner', rooms[roomId].winner);
    } else if (roomId && rooms[roomId] && rooms[roomId].winner) {
        console.log(`Server: Buzz zamítnut v místnosti ${roomId} od ${socket.username}. Vítěz už je: ${rooms[roomId].winner.username}`);
    } else {
        console.warn(`Server: Buzz od ${socket.username} v neexistující nebo neznámé místnosti.`);
    }
  });

  // UDÁLOST: Klient resetuje bzučák
  socket.on('resetBuzzer', () => {
    const roomId = socket.currentRoom;

    if (roomId && rooms[roomId] && rooms[roomId].hostId === socket.id) {
      rooms[roomId].winner = null;
      console.log(`Server: Buzzer reset v místnosti ${roomId} uživatelem: ${socket.id} (${socket.username})`); // Ladící výstup
      // Odešleme reset POUZE klientům v této místnosti
      io.to(roomId).emit('buzzerReset');
    } else {
        socket.emit('notAuthorized', 'K resetu bzučáku má oprávnění pouze hostitel místnosti.');
        console.warn(`Server: Reset zamítnut pro ${socket.username}. Není hostitel nebo není v místnosti.`);
    }
  });

  // --- UPRAVENÁ UDÁLOST disconnect ---
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    
    const roomId = socket.currentRoom; // Použijeme uložené ID místnosti

    if (roomId && rooms[roomId]) {
      // Odeber uživatele ze seznamu hráčů v místnosti
      rooms[roomId].players = rooms[roomId].players.filter(player => player.id !== socket.id);
      
      console.log(`Uživatel ${socket.id} (${socket.username || 'neznámé jméno'}) opustil místnost ${roomId}. Zbývající hráči: ${rooms[roomId].players.length}`);
      
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
          // Můžeš poslat i zprávu, kdo se odpojil, pokud to chceš zobrazit
          // io.to(roomId).emit('playerDisconnected', socket.username || socket.id); 
          
          if (rooms[roomId].winner && rooms[roomId].winner.id === socket.id) {
              rooms[roomId].winner = null;
              io.to(roomId).emit('buzzerReset');
          }
          io.to(roomId).emit('roomState', rooms[roomId]);
      }
    }
  });
});

server.listen(PORT, () => {
  console.log(`Buzzer server listening on port ${PORT}`);
});