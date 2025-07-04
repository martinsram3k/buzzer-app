// client-web/js/socketService.js

// Konstanta pro URL Socket.IO serveru. ZKONTROLUJ A POUŽIJ SVOU SKUTEČNOU URL!
const SOCKET_SERVER_URL = 'https://buzzer-app-t20g.onrender.com';

// Inicializace Socket.IO klienta a připojení k serveru.
const socket = io(SOCKET_SERVER_URL);
// Zpřístupníme socket objekt globálně pro snadný přístup z `app.js`.
window.socket = socket; 

// --- Obecné události socketu (pro debugování a informování uživatele) ---
socket.on('connect', () => {
  console.log('socketService: Připojeno k serveru Socket.IO! ID:', socket.id);
});

socket.on('disconnect', () => {
  console.log('socketService: Odpojeno od serveru Socket.IO.');
});

socket.on('connect_error', (err) => {
  console.error('socketService: Chyba připojení Socket.IO:', err.message);
});

// --- Funkce pro odesílání událostí na server ---

/**
 * Pošle událost 'createRoom' na server. Používá se pro vytvoření nové herní místnosti.
 * @param {string} username Jméno uživatele, který místnost vytváří (bude hostitelem).
 */
window.createRoom = (username) => {
  console.log('socketService: Emituji createRoom s jménem:', username);
  socket.emit('createRoom', username);
};

/**
 * Pošle událost 'joinRoom' na server. Používá se pro připojení do existující herní místnosti.
 * @param {string} roomId Kód místnosti, ke které se uživatel chce připojit.
 * @param {string} username Jméno uživatele, který se připojuje.
 */
window.joinRoom = (roomId, username) => {
  console.log('socketService: Emituji joinRoom s kódem:', roomId, 'a jménem:', username);
  socket.emit('joinRoom', roomId, username);
};

/**
 * Pošle událost 'updateGameSettings' na server. Používá hostitel pro změnu nastavení hry.
 * @param {string} roomId Kód místnosti.
 * @param {object} settings Objekt s herními nastaveními (např. { roundDuration: 30, numRounds: 3, hostPlays: true, buzzerDelay: 0 }).
 */
window.updateGameSettings = (roomId, settings) => {
    console.log('socketService: Emituji updateGameSettings pro místnost:', roomId, 'nastavení:', settings);
    socket.emit('updateGameSettings', roomId, settings);
};

/**
 * Pošle událost 'kickPlayer' na server. Používá hostitel pro vykopnutí hráče z místnosti.
 * @param {string} playerId ID hráče (socket.id), který má být vykopnut.
 */
window.kickPlayer = (playerId) => {
    console.log('socketService: Emituji kickPlayer pro ID:', playerId);
    socket.emit('kickPlayer', playerId);
};

/**
 * Pošle událost 'startGame' na server. Používá hostitel pro spuštění hry z lobby.
 * Nastavení hry by měla být již předtím nastavena pomocí `updateGameSettings`.
 * @param {string} roomId Kód místnosti, ve které se hra spouští.
 */
window.startGame = (roomId) => {
    console.log('socketService: Emituji startGame pro místnost:', roomId);
    socket.emit('startGame', roomId);
};

/**
 * Pošle událost 'startNextRound' na server. Používá hostitel pro spuštění dalšího kola.
 * @param {string} roomId Kód místnosti.
 */
window.startNextRound = (roomId) => {
    console.log('socketService: Emituji startNextRound pro místnost:', roomId);
    socket.emit('startNextRound', roomId);
};

/**
 * Pošle událost 'endGame' na server. Používá hostitel pro předčasné ukončení hry.
 * @param {string} roomId Kód místnosti.
 */
window.endGame = (roomId) => {
    console.log('socketService: Emituji endGame pro místnost:', roomId);
    socket.emit('endGame', roomId);
};

/**
 * Pošle událost 'resetGame' na server. Používá hostitel pro resetování hry do stavu lobby po 'GAME_OVER'.
 * @param {string} roomId Kód místnosti.
 */
window.resetGame = (roomId) => {
    console.log('socketService: Emituji resetGame pro místnost:', roomId);
    socket.emit('resetGame', roomId);
};

/**
 * Pošle událost 'buzz' na server. Používá hráč, když chce "bzučet".
 */
window.buzz = () => {
  socket.emit('buzz');
  console.log('socketService: Odeslána událost: buzz');
};

/**
 * Pošle událost 'resetBuzzer' na server. Původně pro reset bzučáku, nyní spíše pro "Nová hra" od hostitele.
 * Může být voláno i serverem.
 */
window.resetBuzzer = () => {
  socket.emit('resetBuzzer');
  console.log('socketService: Odeslána událost: resetBuzzer');
};

/**
 * Pošle událost 'leaveRoom' na server. Uživatel explicitně opouští místnost.
 * @param {string} roomId Kód místnosti, kterou uživatel opouští.
 */
window.leaveRoom = (roomId) => {
    console.log('socketService: Emituji leaveRoom pro místnost:', roomId);
    socket.emit('leaveRoom', roomId);
    // Většinou není potřeba disconnect/connect, pokud se uživatel má hned připojit jinam.
    // Ponecháme spojení aktivní pro plynulejší přechody.
};