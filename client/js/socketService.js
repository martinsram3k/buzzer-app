// client-web/js/socketService.js

// !!! DŮLEŽITÉ: ZMĚŇ TUTO URL NA URL TVÉHO SERVERU Z RENDER.COM !!!
// Příklad: 'https://tvuj-nazev-sluzby.onrender.com'
const SOCKET_SERVER_URL = 'https://buzzer-app-t20g.onrender.com'; // <--- TADY POUŽIJ SVOU SKUTEČNOU URL!

// Globální objekt 'io' je dostupný, protože jsme ho načetli z CDN v index.html
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
  // Můžeš zde zobrazit upozornění uživateli, že se nemůže připojit k serveru
  alert('Chyba připojení k serveru! Zkontrolujte připojení k internetu nebo URL serveru.');
});


// --- Funkce pro odesílání událostí na server ---

// Tyto funkce nyní exportujeme přes globální objekt 'window',
// aby byly dostupné v 'app.js', který se načítá později.
window.buzz = () => {
  socket.emit('buzz');
  console.log('Odeslána událost: buzz');
};

window.resetBuzzer = () => {
  socket.emit('resetBuzzer');
  console.log('Odeslána událost: resetBuzzer');
};


// --- Funkce pro příjem událostí ze serveru ---

// Tyto funkce nyní ukládáme do globálního objektu 'window',
// ale v 'app.js' se k nim přihlásíme pomocí socket.on() přímo.
// V tomto kontextu by nebylo praktické je exportovat jako callbacky.
// Místo toho 'app.js' přímo zaregistruje posluchače na objektu 'socket'.

// Funkce pro nastavení posluchačů přímo na socketu (použijeme v app.js)
// Není třeba je exportovat přes window, protože socket je přímo dostupný v app.js (pokud jsou oba skripty načteny postupně)
// Ale pro přehlednost můžeme definovat lokální funkce a ty pak použít v app.js
// Nebo lépe, app.js bude mít přímý přístup k 'socket' proměnné, pokud jsou oba soubory načteny ve správném pořadí.
// Uděláme to tak, že 'socketService.js' bude definovat 'socket' a 'app.js' k němu bude přistupovat.
// Pro jistotu je budeme exportovat přes window.
window.onBuzzerWinner = (callback) => {
  socket.on('buzzerWinner', callback);
};

window.onBuzzerReset = (callback) => {
  socket.on('buzzerReset', callback);
};

// Funkce pro čištění posluchačů (pro případ, že by bylo potřeba je odstranit)
window.offBuzzerWinner = (callback) => {
  socket.off('buzzerWinner', callback);
};

window.offBuzzerReset = (callback) => {
  socket.off('buzzerReset', callback);
};

// Důležité: 'socket' objekt sám o sobě nepotřebujeme exportovat přes window,
// protože 'app.js' se načítá až po 'socketService.js', a 'socket' je definován globálně (v rámci stejného skriptu/kontextu).
// Pokud by ale app.js byl v jiném modulu nebo se načítal jinak, museli bychom ho exportovat/importovat.
// Pro jednoduchost webu to takhle funguje.