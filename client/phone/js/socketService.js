// client-web/js/socketService.js

// Inicializace Socket.IO připojení
const socket = io('https://buzzer-app-t20g.onrender.com');

// --- Události Socket.IO připojení a odpojení ---

// Event listener pro úspěšné připojení k serveru
socket.on('connect', () => {
    console.log('socketService: Připojeno k Socket.IO serveru!');
});

// Event listener pro chybu připojení
socket.on('connect_error', (err) => {
    console.error('socketService: Chyba připojení Socket.IO:', err.message);
});

// Event listener pro odpojení od serveru
socket.on('disconnect', (reason) => {
    console.log('socketService: Odpojeno od Socket.IO serveru. Důvod:', reason);
});


// --- Funkce pro odesílání událostí na server ---
// Tyto funkce jsou volány z app.js pro zjednodušení komunikace

/**
 * Pošle požadavek na server pro vytvoření nové místnosti.
 * @param {string} playerName Jméno hráče, který vytváří místnost.
 */
function createRoom(playerName) {
    console.log('socketService: Emituji createRoom - Hráč:', playerName);
    socket.emit('createRoom', playerName);
}

/**
 * Pošle požadavek na server pro připojení do místnosti.
 * @param {string} roomCode Kód místnosti.
 * @param {string} playerName Jméno hráče.
 */
function joinRoom(roomCode, playerName) {
    console.log('socketService: Emituji joinRoom - Místnost:', roomCode, 'Hráč:', playerName);
    socket.emit('joinRoom', roomCode, playerName);
}

/**
 * Pošle požadavek na server pro aktualizaci nastavení místnosti (pouze pro hostitele).
 * @param {string} roomId ID místnosti.
 * @param {object} newSettings Nová nastavení pro hru.
 */
function updateGameSettings(roomId, newSettings) {
    console.log('socketService: Emituji updateGameSettings - Místnost:', roomId, 'Nastavení:', newSettings);
    socket.emit('updateSettings', roomId, newSettings);
}

/**
 * Pošle požadavek na server pro spuštění hry.
 * @param {string} roomId ID místnosti.
 * @param {object} gameSettings Aktuální herní nastavení.
 */
function startGame(roomId, gameSettings) {
    console.log('socketService: Emituji startGame - Místnost:', roomId, 'Nastavení:', gameSettings);
    socket.emit('startGame', roomId, gameSettings);
}

/**
 * Pošle požadavek na server pro bzučení hráče s jeho časem.
 * @param {number} buzzTime Doba, která uplynula od začátku kola.
 */
function buzz(buzzTime) {
    console.log(`socketService: Emituji buzz s časem: ${buzzTime}`);
    socket.emit('buzz', buzzTime);
}

/**
 * Pošle požadavek na server pro přesun na další kolo (pouze pro hostitele).
 * @param {string} roomId ID místnosti.
 */
function startNextRound(roomId) {
    console.log('socketService: Emituji startNextRound - Místnost:', roomId);
    socket.emit('startNextRound', roomId);
}

/**
 * Pošle požadavek na server pro zrušení hry a návrat do lobby (pouze pro hostitele).
 * @param {string} roomId ID místnosti.
 */
function cancelGame(roomId) {
    console.log('socketService: Emituji cancelGame - Místnost:', roomId);
    socket.emit('cancelGame', roomId);
}

/**
 * Pošle požadavek na server pro resetování hry do stavu lobby (pouze pro hostitele po GAME_OVER).
 * @param {string} roomId ID místnosti.
 */
function resetGame(roomId) {
    console.log('socketService: Emituji resetGame - Místnost:', roomId);
    socket.emit('resetGame', roomId);
}

/**
 * Pošle požadavek na server pro opuštění místnosti.
 * @param {string} roomId ID místnosti, kterou uživatel opouští.
 */
function leaveRoom(roomId) {
    console.log('socketService: Emituji leaveRoom - Místnost:', roomId);
    socket.emit('leaveRoom', roomId);
}

// Exportování funkcí, aby byly dostupné v app.js
window.socket = socket;
window.createRoom = createRoom;
window.joinRoom = joinRoom;
window.updateGameSettings = updateGameSettings;
window.startGame = startGame;
window.buzz = buzz;
window.startNextRound = startNextRound;
window.cancelGame = cancelGame;
window.resetGame = resetGame;
window.leaveRoom = leaveRoom;