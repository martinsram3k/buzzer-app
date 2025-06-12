// server/index.js

// Importování potřebných modulů
const express = require('express'); // Express.js framework pro vytváření API
const http = require('http'); // Modul pro vytváření HTTP serveru
const { Server } = require('socket.io'); // Třída Socket.IO serveru pro WebSocket komunikaci

// Vytvoření instance Express aplikace
const app = express();

// Vytvoření HTTP serveru z Express aplikace. Socket.IO se pak připojí k tomuto serveru.
const server = http.createServer(app);

// Inicializace Socket.IO serveru.
// Cors nastavení jsou klíčová pro umožnění komunikace mezi tvým frontendem (Expo aplikace)
// a tímto backendem, pokud běží na různých doménách nebo portech (což je v developmentu běžné
// a na Render.com to bude nutné).
const io = new Server(server, {
  cors: {
    origin: "*", // Povoluje připojení z jakékoli domény. Pro produkci bys mohl chtít omezit na konkrétní URL tvé aplikace.
    methods: ["GET", "POST"] // Povoluje HTTP metody, které mohou být použity pro předletové (preflight) požadavky CORS.
  }
});

// Definice portu, na kterém bude server naslouchat.
// process.env.PORT je standardní způsob, jak cloudové platformy (jako Render.com)
// sdělují aplikaci, na jakém portu má naslouchat. Pokud proměnná prostředí není nastavena,
// použije se výchozí port 3001 (pro lokální vývoj).
const PORT = process.env.PORT || 3001;

// Základní HTTP GET endpoint.
// Slouží jako jednoduchý způsob, jak ověřit, že server běží a je dostupný.
// Když navštívíš URL serveru v prohlížeči (např. http://localhost:3001), uvidíš tuto zprávu.
app.get('/', (req, res) => {
  res.send('Buzzer server is running!');
});

// Proměnná pro uložení informací o vítězi.
// null znamená, že zatím nikdo nebzučel nebo byl bzučák resetován.
let winner = null;

// Nastavení posluchače pro událost "connection" (když se nový klient připojí k Socket.IO serveru).
io.on('connection', (socket) => {
  console.log('A user connected:', socket.id); // Loguje ID nově připojeného klienta pro debugování.

  // Pokud už je nějaký vítěz z předchozího kola, pošli informaci o něm nově připojenému klientovi.
  if (winner) {
    socket.emit('buzzerWinner', winner);
  }

  // Poslouchání na událost 'buzz' od klienta.
  // Tato událost se odešle, když uživatel stiskne tlačítko bzučáku na frontendu.
  socket.on('buzz', () => {
    // Kontroluje, zda už je nějaký vítěz. Pokud ne, tento klient se stává vítězem.
    if (!winner) {
      // Uloží ID vítěze (ID socketu klienta) a čas stisknutí.
      winner = { id: socket.id, time: new Date().toISOString() };
      console.log('Buzz received from:', socket.id);
      // Odešle událost 'buzzerWinner' všem připojeným klientům (včetně toho, kdo bzučel).
      // Tím se aktualizuje stav na všech telefonech.
      io.emit('buzzerWinner', winner);
    }
  });

  // Poslouchání na událost 'resetBuzzer' od klienta.
  // Tato událost se odešle, když hostitel hry (nebo kdokoli) stiskne tlačítko reset.
  socket.on('resetBuzzer', () => {
    winner = null; // Resetuje vítěze na null.
    console.log('Buzzer reset by:', socket.id);
    // Odešle událost 'buzzerReset' všem připojeným klientům.
    // Tím se bzučáky na všech telefonech opět aktivují.
    io.emit('buzzerReset');
  });

  // Poslouchání na událost 'disconnect' (když se klient odpojí od Socket.IO serveru).
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    // Pokud se odpojí klient, který byl aktuálním vítězem, automaticky resetujeme bzučák.
    // To zabraňuje situaci, kdy by vítěz odešel a nikdo nemohl bzučet.
    if (winner && winner.id === socket.id) {
        winner = null;
        io.emit('buzzerReset'); // Informuje všechny o resetu.
    }
  });
});

// Spuštění HTTP serveru, který začne naslouchat na definovaném portu.
// Jakmile server běží, vypíše zprávu do konzole.
server.listen(PORT, () => {
  console.log(`Buzzer server listening on port ${PORT}`);
});