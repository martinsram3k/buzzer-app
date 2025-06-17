// server/index.js

const express = require('express');
const http = require('http'); // Modul pro HTTP server
const { Server } = require('socket.io'); // Třída Socket.IO serveru

const app = express();
const server = http.createServer(app); // Vytvoříme HTTP server z Express aplikace

// Inicializace Socket.IO serveru
// Cors nastavení jsou důležitá pro komunikaci s klientem (Expo Web / React Native)
const io = new Server(server, {
  cors: {
    origin: "*", // Povolí připojení z jakékoli domény (pro vývoj)
    methods: ["GET", "POST"] // Povolí HTTP metody
  }
});

const PORT = process.env.PORT || 3001; // Port, na kterém server poběží

// Jednoduchý testovací endpoint pro ověření, že server běží
app.get('/', (req, res) => {
  res.send('Buzzer server is running!');
});

let winner = null; // Proměnná pro uložení vítěze bzučení

// Socket.IO event handlery
io.on('connection', (socket) => {
  console.log('A user connected:', socket.id); // Vypíše ID připojeného klienta

  // Pošli novému klientovi aktuálního vítěze (pokud existuje)
  if (winner) {
    socket.emit('buzzerWinner', winner);
  }

  // Poslouchání na událost 'buzz' od klienta
  socket.on('buzz', () => {
    if (!winner) { // Pokud ještě nikdo bzučák nestiskl
      winner = { id: socket.id, time: new Date().toISOString() };
      console.log('Buzz received from:', socket.id);
      // Odešli informaci o vítězi všem připojeným klientům
      io.emit('buzzerWinner', winner);
    }
  });

  // Poslouchání na událost 'resetBuzzer' (např. od hostitele hry)
  socket.on('resetBuzzer', () => {
    winner = null; // Resetujeme vítěze
    console.log('Buzzer reset by:', socket.id);
    io.emit('buzzerReset'); // Informujeme všechny o resetu
  });

  // Když se klient odpojí
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    // Pokud se odpojí aktuální vítěz, resetujeme stav (volitelné, záleží na logice hry)
    if (winner && winner.id === socket.id) {
        winner = null;
        io.emit('buzzerReset');
    }
  });
});

// Spuštění serveru
server.listen(PORT, () => {
  console.log(`Buzzer server listening on port ${PORT}`);
});