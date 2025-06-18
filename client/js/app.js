// client-web/js/app.js

// Získání odkazů na HTML elementy pro startovací obrazovku
const startScreen = document.getElementById('startScreen');
const usernameInput = document.getElementById('usernameInput'); // NOVÉ: Input pro jméno
const createRoomButton = document.getElementById('createRoomButton');
const roomCodeInput = document.getElementById('roomCodeInput');
const joinRoomButton = document.getElementById('joinRoomButton');
const errorMessageDisplay = document.getElementById('errorMessage');

// Získání odkazů na HTML elementy pro herní obrazovku
const gameScreen = document.getElementById('gameScreen');
const currentRoomCodeDisplay = document.getElementById('currentRoomCode');
const playerCountDisplay = document.getElementById('playerCount');
const gameStatusMessage = document.getElementById('gameStatusMessage');
const leaveRoomButton = document.getElementById('leaveRoomButton');

// Získání odkazů na HTML elementy pro herní logiku (bzučák, vítěz)
const buzzerButton = document.getElementById('buzzerButton');
const resetButton = document.getElementById('resetButton');
const winnerContainer = document.getElementById('winnerContainer');
const winnerNameDisplay = document.getElementById('winnerName'); // Změněno z winnerIdDisplay
const winnerTimeDisplay = document.getElementById('winnerTime');

let currentRoomId = null;
let currentWinner = null;
let isHost = false;
let myUsername = 'Neznámý'; // NOVÉ: Uloží jméno tohoto klienta

// --- Funkce pro správu zobrazení obrazovek ---
function showStartScreen() {
    startScreen.classList.remove('hidden');
    gameScreen.classList.add('hidden');
    errorMessageDisplay.classList.add('hidden');
    roomCodeInput.value = '';
    // usernameInput.value = ''; // Můžeš vyčistit i jméno, pokud chceš, aby se pokaždé zadávalo nové
    currentRoomId = null;
    isHost = false;
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
    setTimeout(() => errorMessageDisplay.classList.add('hidden'), 5000);
}

// --- Funkce pro aktualizaci UI hry ---
function updateWinnerDisplay(winner) {
    currentWinner = winner;
    if (winner) {
        winnerNameDisplay.textContent = winner.username; // Změněno na username
        winnerTimeDisplay.textContent = `(Bzučel v: ${new Date(winner.time).toLocaleTimeString()})`;
        winnerContainer.classList.remove('hidden');
        buzzerButton.disabled = true;
        resetButton.disabled = !isHost; 
    } else {
        winnerContainer.classList.add('hidden');
        buzzerButton.disabled = false;
        resetButton.disabled = true;
    }
}

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

    updateWinnerDisplay(roomState.winner);
}


// --- Nastavení posluchačů událostí ze Socket.IO serveru ---
document.addEventListener('DOMContentLoaded', () => {
    showStartScreen();

    window.socket.on('connect_error', (err) => {
        displayError('Chyba připojení k serveru! Zkontrolujte připojení k internetu.');
        console.error('Chyba připojení:', err);
    });

    // --- POSLUCHAČE PRO MÍSTNOSTI ---
    window.socket.on('roomCreated', (roomId) => {
        currentRoomId = roomId;
        isHost = true;
        showGameScreen();
        // Server nám pošle roomState, takže inicializační volání není striktně nutné zde
        console.log(`Místnost vytvořena: ${roomId}. Jsi hostitel.`);
    });

    window.socket.on('roomJoined', (roomId) => {
        currentRoomId = roomId;
        // isHost zůstane false, pokud to nebyla roomCreated událost
        showGameScreen();
        console.log(`Připojeno do místnosti: ${roomId}.`);
    });

    window.socket.on('roomNotFound', () => {
        displayError('Místnost s tímto kódem nebyla nalezena.');
        console.warn('Místnost nebyla nalezena.');
    });

    window.socket.on('roomState', (roomState) => {
        updateGameStatus(roomState);
        console.log('Aktualizován stav místnosti:', roomState);
    });

    window.socket.on('roomClosed', (message) => {
        alert(message || 'Místnost byla zrušena.');
        showStartScreen();
        console.log('Místnost byla zrušena.');
    });

    window.socket.on('notAuthorized', (message) => {
        displayError(message);
        console.warn('Uživatel nemá oprávnění:', message);
    });
    
    // --- POSLUCHAČE PRO HERNÍ LOGIKU ---
    window.socket.on('buzzerWinner', (winner) => {
        updateWinnerDisplay(winner);
        console.log('Vítěz kola:', winner.username || winner.id); // Zobrazíme jméno nebo ID
    });

    window.socket.on('buzzerReset', () => {
        updateWinnerDisplay(null);
        console.log('Bzučák byl resetován.');
    });
});


// --- Pomocná funkce pro ověření jména ---
function isValidUsername(username) {
    return username.trim().length > 0 && username.trim().length <= 20;
}

// --- Nastavení posluchačů pro HTML tlačítka ---

createRoomButton.addEventListener('click', () => {
    const username = usernameInput.value.trim();
    if (!isValidUsername(username)) {
        displayError('Zadejte platné jméno (1-20 znaků).');
        return;
    }
    myUsername = username; // Uložíme si jméno
    window.createRoom(username); // Předáme jméno na server
});

joinRoomButton.addEventListener('click', () => {
    const username = usernameInput.value.trim();
    if (!isValidUsername(username)) {
        displayError('Zadejte platné jméno (1-20 znaků).');
        return;
    }
    myUsername = username; // Uložíme si jméno

    const roomCode = roomCodeInput.value.trim();
    if (roomCode.length === 5 && /^\d+$/.test(roomCode)) {
        window.joinRoom(roomCode, username); // Předáme jméno i kód místnosti
    } else {
        displayError('Zadejte platný 5místný číselný kód místnosti.');
        roomCodeInput.value = '';
    }
});

buzzerButton.addEventListener('click', () => {
    if (currentRoomId && !currentWinner) {
        window.buzz();
    }
});

resetButton.addEventListener('click', () => {
    if (currentRoomId && isHost) {
        window.resetBuzzer();
    } else {
        displayError('K resetu bzučáku má oprávnění pouze hostitel místnosti.');
    }
});

leaveRoomButton.addEventListener('click', () => {
    if (currentRoomId) {
        // Můžeme poslat explicitní událost, ale pro jednoduchost stačí přepnout UI
        // a spolehnout se, že server detekuje disconnect, pokud by uživatel zavřel kartu.
        // Pro explicitní opuštění můžeme zavřít socket, nebo poslat leaveRoom.
        // Prozatím jen přepneme UI zpět.
        if (confirm('Opravdu chcete opustit místnost?')) { // Jednoduché potvrzení
            showStartScreen(); 
            // window.socket.emit('leaveRoom', currentRoomId); // Volitelné: Explicitní událost
            // window.socket.disconnect(); // Pokud bys chtěl úplně odpojit socket a znovu připojit
            // location.reload(); // Nebo prostě obnovit stránku
        }
    }
});