
// client-web/js/socketService.js

// !!! DŮLEŽITÉ: ZMĚŇ TUTO URL NA URL TVÉHO SERVERU Z RENDER.COM !!!
// Příklad: 'https://tvuj-nazev-sluzby.onrender.com'
const SOCKET_SERVER_URL = 'https://buzzer-app-t20g.onrender.com'; // <--- TADY POUŽIJ SVOU SKUTEČNOU URL!

const socket = io(SOCKET_SERVER_URL);

// Nastavení posluchačů pro obecné události socketu (pro debugování)
socket.on('connect', () => {
  console.log('Připojeno k serveru Socket.IO! ID:', socket.id);
});

socket.on('disconnect', () => {
  console.log('Odpojeno od serveru Socket.IO.');
});

socket.on('connect_error', (err) => {
  console.error('Chyba připojení Socket.IO:', err.message);
  // Zde jsme odebrali alert(). Můžeš zde případně zobrazit zprávu přímo v UI.
});


// --- Funkce pro odesílání událostí na server ---

window.buzz = () => {
  socket.emit('buzz');
  console.log('Odeslána událost: buzz');
};

window.resetBuzzer = () => {
  socket.emit('resetBuzzer');
  console.log('Odeslána událost: resetBuzzer');
};


// --- Funkce pro příjem událostí ze serveru ---

window.onBuzzerWinner = (callback) => {
  socket.on('buzzerWinner', callback);
};

window.onBuzzerReset = (callback) => {
  socket.on('buzzerReset', callback);
};

window.offBuzzerWinner = (callback) => {
  socket.off('buzzerWinner', callback);
};

window.offBuzzerReset = (callback) => {
  socket.off('buzzerReset', callback);
};