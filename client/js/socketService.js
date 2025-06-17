// client-web/js/socketService.js

// !!! DŮLEŽITÉ: ZMĚŇ TUTO URL NA URL TVÉHO SERVERU Z RENDER.COM !!!
// Příklad: 'https://tvuj-nazev-sluzby.onrender.com'
const SOCKET_SERVER_URL = 'https://buzzer-app-t20g.onrender.com'; // <--- TADY POUŽIJ SVOU SKUTEČNOU URL!

// Vytvoříme instanci Socket.IO klienta
const socket = io(SOCKET_SERVER_URL);

// Zpřístupníme socket objekt globálně přes window, aby k němu app.js mohl přistupovat přímo
// Tímto způsobem můžeme volat metody na socketu a registrovat posluchače v app.js
window.socket = socket;

// --- Obecné události socketu (pro debugování) ---
socket.on('connect', () => {
  console.log('Připojeno k serveru Socket.IO! ID:', socket.id);
});

socket.on('disconnect', () => {
  console.log('Odpojeno od serveru Socket.IO.');
});

socket.on('connect_error', (err) => {
  console.error('Chyba připojení Socket.IO:', err.message);
  // app.js může reagovat na tuto chybu zobrazením zprávy uživateli
});

// --- NOVÉ Funkce pro odesílání událostí na server (pro místnosti) ---

// Odešle požadavek na server pro vytvoření nové místnosti
window.createRoom = () => {
  socket.emit('createRoom');
  console.log('Odeslána událost: createRoom');
};

// Odešle požadavek na server pro připojení do existující místnosti
window.joinRoom = (roomId) => {
  socket.emit('joinRoom', roomId);
  console.log('Odeslána událost: joinRoom s kódem:', roomId);
};

// --- PŮVODNÍ Funkce pro odesílání událostí na server (pro hru) ---
window.buzz = () => {
  socket.emit('buzz');
  console.log('Odeslána událost: buzz');
};

window.resetBuzzer = () => {
  socket.emit('resetBuzzer');
  console.log('Odeslána událost: resetBuzzer');
};

// --- Funkce pro příjem událostí ze serveru ---
// app.js bude přímo registrovat posluchače na 'window.socket'

// Zde už nepotřebujeme tyto funkce, protože app.js bude volat window.socket.on přímo.
// Ponechávám je zakomentované pro referenci, pokud bys je chtěl použít jinak.
/*
window.onBuzzerWinner = (callback) => {
  socket.on('buzzerWinner', callback);
};

window.onBuzzerReset = (callback) => {
  socket.on('buzzerReset', callback);
};
*/