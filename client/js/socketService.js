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
  console.log('socketService: Připojeno k serveru Socket.IO! ID:', socket.id);
});

socket.on('disconnect', () => {
  console.log('socketService: Odpojeno od serveru Socket.IO.');
});

socket.on('connect_error', (err) => {
  console.error('socketService: Chyba připojení Socket.IO:', err.message);
  // app.js může reagovat na tuto chybu zobrazením zprávy uživateli
});


// --- NOVÉ Funkce pro odesílání událostí na server (pro místnosti) ---

// Nyní přijímá jméno uživatele a posílá ho na server
window.createRoom = (username) => {
  console.log('socketService: Emituji createRoom s jménem:', username); // Ladící výstup
  socket.emit('createRoom', username);
};

// Nyní přijímá jméno uživatele a posílá ho na server
window.joinRoom = (roomId, username) => {
  console.log('socketService: Emituji joinRoom s kódem:', roomId, 'a jménem:', username); // Ladící výstup
  socket.emit('joinRoom', roomId, username);
};

// --- PŮVODNÍ Funkce pro odesílání událostí na server (pro hru) ---
window.buzz = () => {
  socket.emit('buzz');
  console.log('socketService: Odeslána událost: buzz');
};

window.resetBuzzer = () => {
  socket.emit('resetBuzzer');
  console.log('socketService: Odeslána událost: resetBuzzer');
};

// --- Funkce pro příjem událostí ze serveru ---
// app.js bude přímo registrovat posluchače na 'window.socket'