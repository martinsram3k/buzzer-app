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

app.get('/', (req, res) => {
  res.send('Buzzer server is running!');
});

let winner = null;

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  if (winner) {
    socket.emit('buzzerWinner', winner);
  }

  socket.on('buzz', () => {
    if (!winner) {
      winner = { id: socket.id, time: new Date().toISOString() };
      console.log('Buzz received from:', socket.id);
      io.emit('buzzerWinner', winner);
    }
  });

  socket.on('resetBuzzer', () => {
    winner = null;
    console.log('Buzzer reset by:', socket.id);
    io.emit('buzzerReset');
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    if (winner && winner.id === socket.id) {
        winner = null;
        io.emit('buzzerReset');
    }
  });
});

server.listen(PORT, () => {
  console.log(`Buzzer server listening on port ${PORT}`);
});