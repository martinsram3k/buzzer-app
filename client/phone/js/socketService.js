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
 * @param {string} username Jméno uživatele, který vytváří místnost (bude hostitelem).
 */
function createRoom(username) {
    console.log('socketService: Emituji createRoom s jménem:', username);
    socket.emit('createRoom', username);
}

/**
 * Pošle požadavek na server pro připojení do existující místnosti.
 * @param {string} roomId Kód místnosti, do které se uživatel chce připojit.
 * @param {string} username Jméno uživatele, který se připojuje.
 */
function joinRoom(roomId, username) {
    console.log('socketService: Emituji joinRoom - Kód:', roomId, 'Jméno:', username);
    socket.emit('joinRoom', roomId, username);
}

/**
 * Pošle požadavek na server pro aktualizaci nastavení hry (pouze pro hostitele).
 * @param {string} roomId ID místnosti.
 * @param {object} settings Objekt s nastavením hry (např. { roundDuration: 30, numRounds: 3, hostPlays: true, buzzerDelay: 0 }).
 */
function updateGameSettings(roomId, settings) {
    console.log('socketService: Emituji updateGameSettings - Místnost:', roomId, 'Nastavení:', settings);
    socket.emit('updateGameSettings', roomId, settings);
}

/**
 * Pošle požadavek na server pro vykopnutí hráče z místnosti (pouze pro hostitele).
 * @param {string} playerIdToKick ID hráče, který má být vykopnut.
 */
function kickPlayer(playerIdToKick) {
    console.log('socketService: Emituji kickPlayer - ID hráče:', playerIdToKick);
    socket.emit('kickPlayer', playerIdToKick);
}

/**
 * Pošle požadavek na server pro spuštění hry (pouze pro hostitele).
 * @param {string} roomId ID místnosti.
 */
function startGame(roomId) {
    console.log('socketService: Emituji startGame - Místnost:', roomId);
    socket.emit('startGame', roomId);
}

/**
 * Pošle požadavek na server pro spuštění dalšího kola (pouze pro hostitele).
 * @param {string} roomId ID místnosti.
 */
function startNextRound(roomId) {
    console.log('socketService: Emituji startNextRound - Místnost:', roomId);
    socket.emit('startNextRound', roomId);
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


// Exportování socket objektu a funkcí, aby byly dostupné v jiných souborech (např. app.js)
// window je zde použito pro globální dostupnost ve webovém prohlížeči.
// V moderních JS projektech byste spíše použili ES moduly (export/import).
window.socket = socket;
window.createRoom = createRoom;
window.joinRoom = joinRoom;
window.updateGameSettings = updateGameSettings;
window.kickPlayer = kickPlayer;
window.startGame = startGame;
window.startNextRound = startNextRound;
window.endGame = endGame;
window.resetGame = resetGame;
window.buzz = buzz;
window.leaveRoom = leaveRoom;