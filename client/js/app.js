// client-web/js/app.js

// Získání odkazů na HTML elementy pro startovací obrazovku
const startScreen = document.getElementById('startScreen');
const createRoomButton = document.getElementById('createRoomButton');
const roomCodeInput = document.getElementById('roomCodeInput');
const joinRoomButton = document.getElementById('joinRoomButton');
const errorMessageDisplay = document.getElementById('errorMessage');

// Získání odkazů na HTML elementy pro herní obrazovku
const gameScreen = document.getElementById('gameScreen');
const currentRoomCodeDisplay = document.getElementById('currentRoomCode');
const playerCountDisplay = document.getElementById('playerCount'); // Nový element pro počet hráčů
const gameStatusMessage = document.getElementById('gameStatusMessage');
const leaveRoomButton = document.getElementById('leaveRoomButton');

// Získání odkazů na HTML elementy pro herní logiku (bzučák, vítěz)
const buzzerButton = document.getElementById('buzzerButton');
const resetButton = document.getElementById('resetButton');
const winnerContainer = document.getElementById('winnerContainer');
const winnerIdDisplay = document.getElementById('winnerId');
const winnerTimeDisplay = document.getElementById('winnerTime');

let currentRoomId = null; // Uloží ID místnosti, ve které je uživatel připojen
let currentWinner = null;
let isHost = false; // Bude true, pokud je tento klient hostitelem místnosti

// --- Funkce pro správu zobrazení obrazovek ---

function showStartScreen() {
    startScreen.classList.remove('hidden');
    gameScreen.classList.add('hidden');
    errorMessageDisplay.classList.add('hidden'); // Skryj chyby při přechodu
    roomCodeInput.value = ''; // Vyčisti input
    currentRoomId = null; // Resetuj ID místnosti
    isHost = false; // Resetuj status hosta
    console.log('Zobrazena startovací obrazovka.');
}

function showGameScreen() {
    startScreen.classList.add('hidden');
    gameScreen.classList.remove('hidden');
    console.log('Zobrazena herní obrazovka.');
}

function displayError(message) {
    errorMessageDisplay.textContent = message;
    errorMessageDisplay.classList.remove('hidden');
    setTimeout(() => errorMessageDisplay.classList.add('hidden'), 5000); // Skryj po 5s
}

// --- Funkce pro aktualizaci UI hry ---

// Aktualizuje zobrazení vítěze a stav tlačítek
function updateWinnerDisplay(winner) {
    currentWinner = winner;
    if (winner) {
        winnerIdDisplay.textContent = `ID: ${winner.id}`;
        winnerTimeDisplay.textContent = `(Bzučel v: ${new Date(winner.time).toLocaleTimeString()})`;
        winnerContainer.classList.remove('hidden'); // Zobrazí kontejner vítěze
        buzzerButton.disabled = true; // Zakáže bzučák
        // Reset tlačítko je povoleno jen hostiteli
        resetButton.disabled = !isHost; 
    } else {
        winnerContainer.classList.add('hidden'); // Skryje kontejner vítěze
        buzzerButton.disabled = false; // Povolí bzučák
        resetButton.disabled = true; // Zakáže reset pro všechny (povolí hostitel po bzučení)
    }
}

// Aktualizuje obecný stav hry (počet hráčů, zprávy)
function updateGameStatus(roomState) {
    playerCountDisplay.textContent = roomState.players ? roomState.players.length : 0;
    currentRoomCodeDisplay.textContent = currentRoomId;

    if (roomState.players && roomState.players.length === 1 && isHost) {
        gameStatusMessage.textContent = `Jsi hostitel! Kód: ${currentRoomId}. Čekám na hráče...`;
    } else if (roomState.players && roomState.players.length === 1 && !isHost) {
        gameStatusMessage.textContent = `Jsi připojen! Kód: ${currentRoomId}. Čekám na dalšího hráče...`;
    } else if (roomState.players && roomState.players.length > 1) {
        gameStatusMessage.textContent = `Hra v plném proudu! Počet hráčů: ${roomState.players.length}`;
    }

    // Aktualizuj vítěze a tlačítka podle aktuálního stavu místnosti
    updateWinnerDisplay(roomState.winner);
}


// --- Nastavení posluchačů událostí ze Socket.IO serveru ---

// document.addEventListener('DOMContentLoaded') zajistí, že JS kód poběží až po načtení HTML
document.addEventListener('DOMContentLoaded', () => {
    showStartScreen(); // Zobrazí startovací obrazovku při načtení

    // Posluchač pro chyby připojení Socket.IO
    window.socket.on('connect_error', (err) => {
        displayError('Chyba připojení k serveru! Zkontrolujte připojení k internetu.');
        console.error('Chyba připojení:', err);
    });

    // --- POSLUCHAČE PRO MÍSTNOSTI ---

    // Server oznámil, že místnost byla vytvořena
    window.socket.on('roomCreated', (roomId) => {
        currentRoomId = roomId;
        isHost = true; // Nastaví tohoto klienta jako hostitele
        showGameScreen();
        updateGameStatus({ winner: null, players: [window.socket.id], hostId: window.socket.id }); // Počáteční stav
        console.log(`Místnost vytvořena: ${roomId}. Jsi hostitel.`);
    });

    // Server potvrdil připojení do místnosti
    window.socket.on('roomJoined', (roomId) => {
        currentRoomId = roomId;
        isHost = false; // Klient je připojen, ale není hostitel (pokud jsi chtěl být hostitel, už bys měl status z roomCreated)
        showGameScreen();
        // Počkáme na roomState, abychom dostali kompletní info
        console.log(`Připojeno do místnosti: ${roomId}.`);
    });

    // Server oznámil, že místnost nebyla nalezena
    window.socket.on('roomNotFound', () => {
        displayError('Místnost s tímto kódem nebyla nalezena.');
        console.warn('Místnost nebyla nalezena.');
    });

    // Server posílá aktualizovaný stav místnosti (počet hráčů, vítěz, atd.)
    window.socket.on('roomState', (roomState) => {
        updateGameStatus(roomState);
        console.log('Aktualizován stav místnosti:', roomState);
    });

    // Server oznámil, že místnost byla zrušena (např. odpojením hostitele)
    window.socket.on('roomClosed', (message) => {
        alert(message || 'Místnost byla zrušena.'); // Upozornění, že místnost skončila
        showStartScreen(); // Přejdi zpět na startovací obrazovku
        console.log('Místnost byla zrušena.');
    });

    // Server oznámil, že uživatel nemá oprávnění
    window.socket.on('notAuthorized', (message) => {
        displayError(message);
        console.warn('Uživatel nemá oprávnění:', message);
    });

    // --- POSLUCHAČE PRO HERNÍ LOGIKU ---

    // Server oznámil vítěze kola
    window.socket.on('buzzerWinner', (winner) => {
        updateWinnerDisplay(winner);
        console.log('Vítěz kola:', winner.id);
    });

    // Server oznámil reset bzučáku
    window.socket.on('buzzerReset', () => {
        updateWinnerDisplay(null); // Resetuj zobrazení vítěze
        console.log('Bzučák byl resetován.');
    });
});


// --- Nastavení posluchačů pro HTML tlačítka ---

// Tlačítko "Vytvořit místnost"
createRoomButton.addEventListener('click', () => {
    window.createRoom(); // Volá funkci z socketService.js
});

// Tlačítko "Připojit se do místnosti"
joinRoomButton.addEventListener('click', () => {
    const roomCode = roomCodeInput.value.trim();
    if (roomCode.length === 5 && /^\d+$/.test(roomCode)) { // Základní ověření kódu
        window.joinRoom(roomCode); // Volá funkci z socketService.js
    } else {
        displayError('Zadejte platný 5místný číselný kód.');
        roomCodeInput.value = ''; // Vyčisti pole
    }
});

// Tlačítko BZUČÁK
buzzerButton.addEventListener('click', () => {
    // Lze bzučet jen, když je uživatel v místnosti a nikdo ještě nebzučel
    if (currentRoomId && !currentWinner) {
        window.buzz(); // Volá funkci z socketService.js
    }
});

// Tlačítko RESET
resetButton.addEventListener('click', () => {
    // Lze resetovat jen, když je uživatel v místnosti a je hostitel
    if (currentRoomId && isHost) {
        window.resetBuzzer(); // Volá funkci z socketService.js
    } else {
        displayError('K resetu bzučáku má oprávnění pouze hostitel místnosti.');
    }
});

// Tlačítko "Opustit místnost"
leaveRoomButton.addEventListener('click', () => {
    if (currentRoomId) {
        // Opustí Socket.IO místnost. Server to detekuje jako disconnect.
        // Nebo můžeš poslat explicitní událost 'leaveRoom' na server, pokud chceš jemnější logiku.
        // Prozatím se spolehneme na disconnect (zavření stránky / opuštění prohlížeče)
        // nebo refresh, ale pro explicitní tlačítko můžeme zavřít socket.
        // Elegantnější by bylo window.socket.emit('leaveRoom', currentRoomId); a server to zpracuje.
        // Ale pro teď stačí refresh, nebo prostě zpátky na start screen.
        alert('Místnost opuštěna.'); // Dočasný alert
        showStartScreen(); // Zpět na start
        if (window.socket && window.socket.connected) {
            // Volitelné: Odeslat serveru, že klient explicitně opouští místnost,
            // pokud bys nechtěl čekat na 'disconnect' událost.
            // window.socket.emit('leaveRoom', currentRoomId);
            // Nicméně pro jednoduchost, pokud zavřeme socket nebo uživatel odejde,
            // server to detekuje jako disconnect a místnost se zpracuje.
            // Pro teď jen přepneme UI.
        }
    }
});