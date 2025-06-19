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
    errorMessageDisplay.classList.add('hidden'); // Skryj chyby při přechodu
    roomCodeInput.value = ''; // Vyčisti input
    // usernameInput.value = ''; // Můžeš vyčistit i jméno, pokud chceš, aby se pokaždé zadávalo nové
    currentRoomId = null; // Resetuj ID místnosti
    isHost = false; // Resetuj status hosta
    console.log('app.js: Zobrazena startovací obrazovka.');
}

function showGameScreen() {
    startScreen.classList.add('hidden');
    gameScreen.classList.remove('hidden');
    console.log('app.js: Zobrazena herní obrazovka.');
}

function displayError(message) {
    errorMessageDisplay.textContent = message;
    errorMessageDisplay.classList.remove('hidden');
    setTimeout(() => errorMessageDisplay.classList.add('hidden'), 5000); // Skryj po 5s
    console.error('app.js: Chyba zobrazena:', message);
}

// --- Funkce pro aktualizaci UI hry ---

// Aktualizuje zobrazení vítěze a stav tlačítek
function updateWinnerDisplay(winner) {
    currentWinner = winner;
    if (winner) {
        winnerNameDisplay.textContent = winner.username; // Změněno na username
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
    console.log('app.js: Aktualizováno zobrazení vítěze:', winner ? winner.username : 'žádný');
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
    console.log('app.js: Aktualizován stav hry. Stav místnosti:', roomState);
}


// --- Nastavení posluchačů událostí ze Socket.IO serveru ---

// document.addEventListener('DOMContentLoaded') zajistí, že JS kód poběží až po načtení HTML
document.addEventListener('DOMContentLoaded', () => {
    showStartScreen(); // Zobrazí startovací obrazovku při načtení

    // Posluchač pro chyby připojení Socket.IO
    window.socket.on('connect_error', (err) => {
        displayError('Chyba připojení k serveru! Zkontrolujte připojení k internetu.');
        console.error('app.js: Chyba připojení Socket.IO:', err);
    });

    // --- POSLUCHAČE PRO MÍSTNOSTI ---

    // Server oznámil, že místnost byla vytvořena
    window.socket.on('roomCreated', (roomId) => {
        currentRoomId = roomId;
        isHost = true; // Nastaví tohoto klienta jako hostitele
        showGameScreen();
        // Server nám pošle roomState, takže inicializační volání není striktně nutné zde, ale pro jistotu:
        // updateGameStatus({ winner: null, players: [{id: window.socket.id, username: myUsername}], hostId: window.socket.id });
        console.log(`app.js: Událost roomCreated přijata. Místnost: ${roomId}. Jsi hostitel.`);
    });

    // Server potvrdil připojení do místnosti
    window.socket.on('roomJoined', (roomId) => {
        currentRoomId = roomId;
        isHost = false; // Klient je připojen, ale není hostitel (pokud jsi chtěl být hostitel, už bys měl status z roomCreated)
        showGameScreen();
        // Počkáme na roomState, abychom dostali kompletní info
        console.log(`app.js: Událost roomJoined přijata. Připojeno do místnosti: ${roomId}.`);
    });

    // Server oznámil, že místnost nebyla nalezena
    window.socket.on('roomNotFound', () => {
        displayError('Místnost s tímto kódem nebyla nalezena.');
        console.warn('app.js: Místnost nebyla nalezena.');
    });

    // Server posílá aktualizovaný stav místnosti (počet hráčů, vítěz, atd.)
    window.socket.on('roomState', (roomState) => {
        updateGameStatus(roomState);
        console.log('app.js: Událost roomState přijata. Aktuální stav místnosti:', roomState);
    });

    // Server oznámil, že místnost byla zrušena (např. odpojením hostitele)
    window.socket.on('roomClosed', (message) => {
        alert(message || 'Místnost byla zrušena.'); // Upozornění, že místnost skončila
        showStartScreen(); // Přejdi zpět na startovací obrazovku
        console.log('app.js: Místnost byla zrušena.');
    });

    // Server oznámil, že uživatel nemá oprávnění
    window.socket.on('notAuthorized', (message) => {
        displayError(message);
        console.warn('app.js: Uživatel nemá oprávnění:', message);
    });
    
    // --- POSLUCHAČE PRO HERNÍ LOGIKU ---

    // Server oznámil vítěze kola
    window.socket.on('buzzerWinner', (winner) => {
        updateWinnerDisplay(winner);
        console.log('app.js: Událost buzzerWinner přijata. Vítěz kola:', winner.username || winner.id);
    });

    // Server oznámil reset bzučáku
    window.socket.on('buzzerReset', () => {
        updateWinnerDisplay(null); // Resetuj zobrazení vítěze
        console.log('app.js: Událost buzzerReset přijata. Bzučák byl resetován.');
    });
});


// --- Pomocná funkce pro ověření jména ---
function isValidUsername(username) {
    // Jméno musí být neprazdné a mít max 20 znaků
    const isValid = username.trim().length > 0 && username.trim().length <= 20;
    console.log(`app.js: Ověřuji jméno "${username}". Platné: ${isValid}`); // Ladící výstup
    return isValid;
}

// --- Nastavení posluchačů pro HTML tlačítka ---

createRoomButton.addEventListener('click', () => {
    const username = usernameInput.value.trim();
    console.log('app.js: Tlačítko Vytvořit místnost stisknuto. Zadané jméno:', username); // Ladící výstup
    if (!isValidUsername(username)) {
        displayError('Zadejte platné jméno (1-20 znaků).');
        return;
    }
    myUsername = username; // Uložíme si jméno pro tento klient
    window.createRoom(username); // Volá funkci z socketService.js
});

joinRoomButton.addEventListener('click', () => {
    const username = usernameInput.value.trim();
    console.log('app.js: Tlačítko Připojit se stisknuto. Zadané jméno:', username); // Ladící výstup
    if (!isValidUsername(username)) {
        displayError('Zadejte platné jméno (1-20 znaků).');
        return;
    }
    myUsername = username; // Uložíme si jméno pro tento klient

    const roomCode = roomCodeInput.value.trim();
    console.log('app.js: Zadaný kód místnosti:', roomCode); // Ladící výstup
    if (roomCode.length === 5 && /^\d+$/.test(roomCode)) {
        window.joinRoom(roomCode, username); // Volá funkci z socketService.js
    } else {
        displayError('Zadejte platný 5místný číselný kód místnosti.');
        roomCodeInput.value = ''; // Vyčisti pole
    }
});

buzzerButton.addEventListener('click', () => {
    console.log('app.js: Tlačítko BUZZ stisknuto.'); // Ladící výstup
    if (currentRoomId && !currentWinner) { // Lze bzučet jen, když je uživatel v místnosti a nikdo ještě nebzučel
        window.buzz(); // Volá funkci z socketService.js
    } else if (!currentRoomId) {
        displayError('Nejprve se musíte připojit do místnosti.');
    } else if (currentWinner) {
        displayError(`Bzučák již byl stisknut hráčem ${currentWinner.username}.`);
    }
});

resetButton.addEventListener('click', () => {
    console.log('app.js: Tlačítko RESET stisknuto.'); // Ladící výstup
    if (currentRoomId && isHost) { // Lze resetovat jen, když je uživatel v místnosti a je hostitel
        window.resetBuzzer(); // Volá funkci z socketService.js
    } else {
        displayError('K resetu bzučáku má oprávnění pouze hostitel místnosti.');
    }
});

leaveRoomButton.addEventListener('click', () => {
    console.log('app.js: Tlačítko Opustit místnost stisknuto.'); // Ladící výstup
    if (currentRoomId) {
        if (confirm('Opravdu chcete opustit místnost?')) { // Jednoduché potvrzení
            showStartScreen(); 
            // Důležité: Tlačítko "Opustit místnost" explicitně neposílá 'leaveRoom' událost na server.
            // Server se spoléhá na 'disconnect' událost, která se spustí při zavření karty/prohlížeče.
            // Pro jednodušší reset stavu klienta stačí přepnout UI na startovní obrazovku.
            // Pokud bys chtěl serveru říct, že klient odešel, přidal bys:
            // window.socket.emit('leaveRoom', currentRoomId); a server by to zpracoval.
            // Ale pro teď je toto OK.
            console.log(`app.js: Klient opustil UI místnosti ${currentRoomId}.`);
        }
    }
});