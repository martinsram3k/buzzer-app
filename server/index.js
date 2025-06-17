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

  // --- NOVÉ UDÁLOSTI PRO MÍSTNOSTI ---

  // UDÁLOST: Klient chce vytvořit novou místnost
  socket.on('createRoom', () => {
    const roomId = generateRoomCode();
    rooms[roomId] = { winner: null, players: [], hostId: socket.id }; // Uložíme i hosta
    socket.join(roomId); // Uživatel se připojí do Socket.IO místnosti
    rooms[roomId].players.push(socket.id); // Přidáme hráče do seznamu
    
    console.log(`Místnost ${roomId} vytvořena uživatelem ${socket.id} (HOST)`);
    socket.emit('roomCreated', roomId); // Pošleme kód místnosti hostiteli
    
    // Pošleme aktuální stav místnosti nově připojenému hostiteli
    io.to(roomId).emit('roomState', rooms[roomId]);
  });

  // UDÁLOST: Klient se chce připojit do existující místnosti
  socket.on('joinRoom', (roomId) => {
    // Ověříme, zda místnost existuje
    if (rooms[roomId]) {
      // Zabráníme duplicitnímu připojení (pokud už je v místnosti)
      if (!rooms[roomId].players.includes(socket.id)) {
        socket.join(roomId); // Uživatel se připojí do Socket.IO místnosti
        rooms[roomId].players.push(socket.id); // Přidáme hráče do seznamu
        console.log(`Uživatel ${socket.id} se připojil do místnosti ${roomId}`);
        socket.emit('roomJoined', roomId); // Potvrdíme připojení klientovi

        // Pošleme aktuální stav místnosti nově připojenému hráči A všem ostatním v místnosti
        io.to(roomId).emit('roomState', rooms[roomId]);
      } else {
        // Pokud už je uživatel v místnosti, prostě ho tam potvrdíme
        socket.emit('roomJoined', roomId);
        io.to(roomId).emit('roomState', rooms[roomId]); // Pošleme mu stav
      }
    } else {
      socket.emit('roomNotFound'); // Místnost neexistuje
      console.log(`Uživatel ${socket.id} se pokusil připojit do neexistující místnosti ${roomId}`);
    }
  });

  // --- UPRAVENÉ PŮVODNÍ UDÁLOSTI (buzz, resetBuzzer) ---

  // UDÁLOST: Klient bzučí
  socket.on('buzz', () => {
    // Získáme ID místnosti, ve které je uživatel připojen (první, která není jeho vlastní ID)
    const roomId = Array.from(socket.rooms).find(room => room !== socket.id);
    
    // Zkontrolujeme, zda je v místnosti a zda v ní ještě není vítěz
    if (roomId && rooms[roomId] && !rooms[roomId].winner) {
      rooms[roomId].winner = { id: socket.id, time: new Date().toISOString() };
      console.log(`Buzz v místnosti ${roomId} od: ${socket.id}`);
      // Odešleme informaci o vítězi POUZE klientům v této místnosti
      io.to(roomId).emit('buzzerWinner', rooms[roomId].winner);
    }
  });

  // UDÁLOST: Klient resetuje bzučák
  socket.on('resetBuzzer', () => {
    const roomId = Array.from(socket.rooms).find(room => room !== socket.id);

    // Resetovat může pouze hostitel místnosti
    if (roomId && rooms[roomId] && rooms[roomId].hostId === socket.id) {
      rooms[roomId].winner = null;
      console.log(`Buzzer reset v místnosti ${roomId} uživatelem: ${socket.id}`);
      // Odešleme reset POUZE klientům v této místnosti
      io.to(roomId).emit('buzzerReset');
    } else {
        // Volitelné: Poslat zprávu, že nemají oprávnění resetovat
        socket.emit('notAuthorized', 'K resetu bzučáku má oprávnění pouze hostitel místnosti.');
    }
  });

  // --- UPRAVENÁ UDÁLOST disconnect ---

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    
    const roomId = Array.from(socket.rooms).find(room => room !== socket.id);

    if (roomId && rooms[roomId]) {
      // Odeber uživatele ze seznamu hráčů v místnosti
      rooms[roomId].players = rooms[roomId].players.filter(id => id !== socket.id);
      
      console.log(`Uživatel ${socket.id} opustil místnost ${roomId}. Zbývající hráči: ${rooms[roomId].players.length}`);
      
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
          
          // Pokud se odpojí aktuální vítěz, a místnost nebyla zrušena hostitelem
          if (rooms[roomId].winner && rooms[roomId].winner.id === socket.id) {
              rooms[roomId].winner = null;
              io.to(roomId).emit('buzzerReset'); // Informuje ostatní o resetu
          }
          // Posílej aktuální stav místnosti zbývajícím hráčům (např. pro aktualizaci počtu hráčů)
          io.to(roomId).emit('roomState', rooms[roomId]);
      }
    }
  });
});

// Spuštění serveru
server.listen(PORT, () => {
  console.log(`Buzzer server listening on port ${PORT}`);
});