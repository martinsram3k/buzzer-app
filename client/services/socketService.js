// client/services/socketService.js

// Import knihovny Socket.IO klienta
import io from 'socket.io-client';

// Definice URL serveru.
// Tuto konstantu MUSÍŠ nastavit podle toho, kde testuješ:
//
// 1. Pro Expo Web (v prohlížeči):
//    const SOCKET_SERVER_URL = 'http://localhost:3001';
//
// 2. Pro Android Emulátor:
//    const SOCKET_SERVER_URL = 'http://10.0.2.2:3001';
//
// 3. Pro iOS Simulátor (na macOS):
//    const SOCKET_SERVER_URL = 'http://localhost:3001';
//
// 4. Pro FYZICKÝ TELEFON (Android/iOS) ve stejné lokální síti jako tvůj PC:
//    Zde musíš zjistit lokální IP adresu tvého počítače (např. 192.168.1.105)
//    a tu sem zadat:
//    const SOCKET_SERVER_URL = 'http://TVOJE_LOKALNI_IP_ADRESA:3001';
//    Příklad: const SOCKET_SERVER_URL = 'http://192.168.1.105:3001';
//
// 5. Po nasazení na Render.com:
//    To bude URL tvého Render serveru (např. 'https://your-buzzer-server.onrender.com')
//    Příklad: const SOCKET_SERVER_URL = 'https://muj-super-server.onrender.com';
//
// Vyber tu, která odpovídá tvé aktuální testovací konfiguraci:
const SOCKET_SERVER_URL = 'https://buzzer-app-t20g.onrender.com'; // <--- ZMĚŇ TOTO PODLE POTŘEBY!

// Inicializace socketu. Toto naváže spojení se serverem.
const socket = io(SOCKET_SERVER_URL);

// Nastavení posluchačů pro obecné události socketu (volitelné, pro debug)
socket.on('connect', () => {
  console.log('Připojeno k serveru Socket.IO! ID:', socket.id);
});

socket.on('disconnect', () => {
  console.log('Odpojeno od serveru Socket.IO.');
});

socket.on('connect_error', (err) => {
  console.error('Chyba připojení Socket.IO:', err.message);
});


// --- Funkce pro odesílání událostí na server ---

/**
 * Odešle událost 'buzz' na server, indikující stisknutí bzučáku.
 */
const buzz = () => {
  socket.emit('buzz');
  console.log('Odeslána událost: buzz');
};

/**
 * Odešle událost 'resetBuzzer' na server, pro resetování stavu bzučáku.
 */
const resetBuzzer = () => {
  socket.emit('resetBuzzer');
  console.log('Odeslána událost: resetBuzzer');
};


// --- Funkce pro příjem událostí ze serveru ---

/**
 * Nastaví posluchač pro událost 'buzzerWinner'.
 * Když server odešle tuto událost, zavolá se poskytnutý callback s informacemi o vítězi.
 * @param {function} callback - Funkce, která se zavolá s objektem vítěze (např. { id: 'socketId', time: 'timestamp' }).
 */
const onBuzzerWinner = (callback) => {
  socket.on('buzzerWinner', (winner) => {
    console.log('Přijata událost: buzzerWinner', winner);
    callback(winner);
  });
};

/**
 * Nastaví posluchač pro událost 'buzzerReset'.
 * Když server odešle tuto událost, zavolá se poskytnutý callback.
 * @param {function} callback - Funkce, která se zavolá, když se bzučák resetuje.
 */
const onBuzzerReset = (callback) => {
  socket.on('buzzerReset', () => {
    console.log('Přijata událost: buzzerReset');
    callback();
  });
};


// --- Funkce pro čištění posluchačů ---
// Důležité pro správné správu paměti a zamezení úniků paměti (memory leaks)
// v React komponentách (volá se v `useEffect` cleanup funkci).

const offBuzzerWinner = () => {
  socket.off('buzzerWinner');
};

const offBuzzerReset = () => {
  socket.off('buzzerReset');
};


// Export všech funkcí, aby byly dostupné v jiných částech aplikace
export {
  socket, // Export samotného socket objektu, pokud bys potřeboval přímo s ním pracovat
  buzz,
  resetBuzzer,
  onBuzzerWinner,
  onBuzzerReset,
  offBuzzerWinner,
  offBuzzerReset
};