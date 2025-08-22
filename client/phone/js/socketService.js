// client-web/js/socketService.js

// Inicializace Socket.IO připojení
// Zde je důležité, aby URL odpovídala adrese, na které poslouchá váš Socket.IO server.
// Pokud váš server běží lokálně na portu 3001, pak 'http://localhost:3001' je správně.
// Pokud ho nasazujete jinam, budete muset URL aktualizovat.
const socket = io('https://buzzer-app-t20g.onrender.com');

// --- Události Socket.IO připojení a odpojení ---

// Event listener pro úspěšné připojení k serveru
socket.on('connect', () => {
    console.log('socketService: Připojeno k Socket.IO serveru!');
    // Můžete zde provést akce, které závisí na úspěšném připojení
});

// Event listener pro chybu připojení
socket.on('connect_error', (err) => {
    console.error('socketService: Chyba připojení Socket.IO:', err.message);
    // Zde můžete zobrazit zprávu uživateli nebo zkusit se znovu připojit
});

// Event listener pro odpojení od serveru
socket.on('disconnect', (reason) => {
    console.log('socketService: Odpojeno od Socket.IO serveru. Důvod:', reason);
    // Zde můžete informovat uživatele o odpojení
});


// --- Funkce pro odesílání událostí na server ---
// Tyto funkce budou volány z app.js, aby se zjednodušila komunikace se serverem

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
function updateSettings(roomId, newSettings) {
    console.log('socketService: Emituji updateSettings - Místnost:', roomId, 'Nastavení:', newSettings);
    socket.emit('updateSettings', roomId, newSettings);
}

/**
 * Pošle požadavek na server pro bzučení hráče.
 */
function buzz() {
    console.log('socketService: Emituji buzz.');
    socket.emit('buzz');
}

/**
 * Pošle požadavek na server pro přesun na další kolo (pouze pro hostitele).
 * @param {string} roomId ID místnosti.
 */
function nextRound(roomId) {
    console.log('socketService: Emituji nextRound - Místnost:', roomId);
    socket.emit('nextRound', roomId);
}

/**
 * Pošle požadavek na server pro ukončení hry (pouze pro hostitele).
 * @param {string} roomId ID místnosti.
 */
function endGame(roomId) {
    console.log('socketService: Emituji endGame - Místnost:', roomId);
    socket.emit('endGame', roomId);
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
 * Pošle požadavek na server pro bzučení hráče.
 */
function buzz() {
    console.log('socketService: Emituji buzz.');
    socket.emit('buzz');
}

/**
 * Pošle požadavek na server pro opuštění místnosti.
 * @param {string} roomId ID místnosti, kterou uživatel opouští.
 */
function leaveRoom(roomId) {
    console.log('socketService: Emituji leaveRoom - Místnost:', roomId);
    socket.emit('leaveRoom', roomId);
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

// Exportování socket objektu a funkcí, aby byly dostupné v jiných souborech (např. app.js)
// window je zde použito pro globální dostupnost ve webovém prohlížeči.
// V moderních JS projektech byste spíše použili ES moduly (export/import).
window.socket = socket;
window.createRoom = createRoom;
window.joinRoom = joinRoom;
window.updateSettings = updateSettings;
window.startGame = startGame; // NOVÝ EXPORT
window.buzz = buzz;
window.nextRound = nextRound;
window.endGame = endGame;
window.resetGame = resetGame;
window.leaveRoom = leaveRoom;

