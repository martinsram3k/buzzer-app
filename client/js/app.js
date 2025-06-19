// client-web/js/app.js

// --- Reference na HTML elementy ---

// Startovací obrazovka
const startScreen = document.getElementById('startScreen');
const usernameInput = document.getElementById('usernameInput');
const createRoomButton = document.getElementById('createRoomButton');
const roomCodeInput = document.getElementById('roomCodeInput');
const joinRoomButton = document.getElementById('joinRoomButton');
const errorMessageDisplay = document.getElementById('errorMessage');

// Lobby obrazovka (NOVÉ)
const lobbyScreen = document.getElementById('lobbyScreen');
const lobbyRoomCodeDisplay = document.getElementById('lobbyRoomCode');
const lobbyTitleDisplay = document.getElementById('lobbyTitle');
const lobbyStatusMessage = document.getElementById('lobbyStatusMessage');
const hostSettingsPanel = document.getElementById('hostSettings');
const roundDurationSelect = document.getElementById('roundDuration');
const numRoundsInput = document.getElementById('numRounds');
const hostPlaysCheckbox = document.getElementById('hostPlays');
const saveSettingsButton = document.getElementById('saveSettingsButton');
const lobbyPlayerCountDisplay = document.getElementById('lobbyPlayerCount');
const playerListElement = document.getElementById('playerList');
const startGameButton = document.getElementById('startGameButton');
const leaveLobbyButton = document.getElementById('leaveLobbyButton');

// Herní obrazovka
const gameScreen = document.getElementById('gameScreen');
const currentRoomCodeDisplay = document.getElementById('currentRoomCode');
const playerCountDisplay = document.getElementById('playerCount');
const gameStatusMessage = document.getElementById('gameStatusMessage');
const buzzerButton = document.getElementById('buzzerButton');
const winnerContainer = document.getElementById('winnerContainer');
const winnerNameDisplay = document.getElementById('winnerName');
const winnerTimeDisplay = document.getElementById('winnerTime');
const countdownDisplay = document.getElementById('countdownDisplay'); // NOVÉ
const countdownValueDisplay = document.getElementById('countdownValue'); // NOVÉ
const nextRoundButton = document.getElementById('nextRoundButton'); // NOVÉ
const resetButton = document.getElementById('resetButton'); // Stávající, ale s jinou rolí/viditelností
const leaveGameButton = document.getElementById('leaveGameButton');

// --- Globální proměnné stavu ---
let currentRoomId = null;
let currentWinner = null;
let isHost = false;
let myUsername = 'Neznámý';
// Výchozí nastavení hry (lokální kopie, která se aktualizuje ze serveru)
let gameSettings = { 
    roundDuration: 30, // sekund
    numRounds: 3,
    hostPlays: true // Hostitel hraje (může bzučet)
};
let countdownInterval = null; // Pro ukládání intervalu odpočtu
window.gameRoomState = null; // Globální stav místnosti, přijatý ze serveru

// --- Pomocné funkce pro zobrazení obrazovek ---

/**
 * Skryje všechny hlavní obrazovky a zobrazí požadovanou.
 * @param {string} screenId ID elementu obrazovky, který se má zobrazit (např. 'startScreen').
 */
function showScreen(screenId) {
    // Skryje všechny hlavní obrazovky
    startScreen.classList.add('hidden');
    lobbyScreen.classList.add('hidden');
    gameScreen.classList.add('hidden');
    errorMessageDisplay.classList.add('hidden');

    // Zobrazí požadovanou obrazovku
    document.getElementById(screenId).classList.remove('hidden');
    console.log(`app.js: Zobrazena obrazovka: ${screenId}`);
    // currentGameState se aktualizuje z roomState na základě dat ze serveru
}

/**
 * Zobrazí chybovou zprávu na obrazovce.
 * @param {string} message Zpráva, která se má zobrazit.
 */
function displayError(message) {
    errorMessageDisplay.textContent = message;
    errorMessageDisplay.classList.remove('hidden');
    setTimeout(() => errorMessageDisplay.classList.add('hidden'), 5000); // Skryje po 5 sekundách
    console.error('app.js: Chyba zobrazena:', message);
}

/**
 * Aktualizuje zprávu o stavu hry na herní obrazovce.
 * @param {string} message Zpráva, která se má zobrazit.
 * @param {boolean} appendRoomCode Pokud je true, připojí se kód místnosti.
 */
function updateGameStatusMessage(message, appendRoomCode = false) {
    if (appendRoomCode && currentRoomId) {
        gameStatusMessage.textContent = `${message} (Kód: ${currentRoomId})`;
    } else {
        gameStatusMessage.textContent = message;
    }
}


// --- Funkce pro aktualizaci UI podle stavu hry ---

/**
 * Aktualizuje zobrazení vítěze kola a stav tlačítek bzučáku/dalšího kola.
 * @param {object|null} winner Objekt vítěze nebo null, pokud nikdo nebzučel.
 */
function updateWinnerDisplay(winner) {
    currentWinner = winner;
    if (winner) {
        winnerNameDisplay.textContent = winner.username;
        // Formátování času, pokud existuje
        winnerTimeDisplay.textContent = winner.time ? `(Bzučel v: ${new Date(winner.time).toLocaleTimeString()})` : '';
        winnerContainer.classList.remove('hidden');
        buzzerButton.disabled = true; // Zakáže bzučák
        
        // Tlačítko Další kolo / Konec hry je viditelné jen pro hostitele po bzučení/konci kola
        if (isHost && window.gameRoomState && window.gameRoomState.gameState === 'ROUND_END') {
            nextRoundButton.classList.remove('hidden');
            nextRoundButton.disabled = false;
             // Změna textu tlačítka, pokud je to poslední kolo
            if (window.gameRoomState.currentRound >= window.gameRoomState.gameSettings.numRounds) {
                nextRoundButton.textContent = "Konec hry";
            } else {
                nextRoundButton.textContent = "Další kolo";
            }
        } else {
            nextRoundButton.classList.add('hidden');
        }
        resetButton.classList.add('hidden'); // Skryjeme staré reset tlačítko
        
    } else {
        winnerContainer.classList.add('hidden');
        // Povolí bzučák, pokud není vítěz a je aktivní kolo
        if (window.gameRoomState && window.gameRoomState.gameState === 'ACTIVE_ROUND') {
             buzzerButton.disabled = false;
        } else {
            buzzerButton.disabled = true;
        }
       
        // Pokud hostitel nehraje a bzučák je resetovaný, zablokuje mu bzučák
        if (isHost && !gameSettings.hostPlays && window.gameRoomState && window.gameRoomState.gameState === 'ACTIVE_ROUND') {
            buzzerButton.disabled = true;
            gameStatusMessage.textContent = `Jsi hostitel a nehraješ. Bzučák pro tebe je deaktivován.`;
        }

        nextRoundButton.classList.add('hidden');
        resetButton.classList.add('hidden'); // Skryjeme staré reset tlačítko
    }
    console.log('app.js: Aktualizováno zobrazení vítěze:', winner ? winner.username : 'žádný');
}

/**
 * Spustí vizuální odpočet na UI.
 * @param {number} initialTime Počáteční hodnota odpočtu v sekundách.
 */
function startCountdownUI(initialTime) {
    let timeLeft = initialTime;
    countdownDisplay.classList.remove('hidden');
    countdownValueDisplay.textContent = timeLeft;
    buzzerButton.disabled = true; // Bzučák je zakázán během odpočtu
    winnerContainer.classList.add('hidden'); // Skryj vítěze během odpočtu

    if (countdownInterval) clearInterval(countdownInterval); // Vyčisti předchozí interval

    countdownInterval = setInterval(() => {
        timeLeft--;
        countdownValueDisplay.textContent = timeLeft;
        if (timeLeft <= 0) {
            clearInterval(countdownInterval);
            countdownDisplay.classList.add('hidden');
            // Bzučák se povolí až po události 'roundStarted' ze serveru, která se odešle po odpočtu
            console.log('app.js: Odpočet UI dokončen.');
        }
    }, 1000);
}


/**
 * Hlavní funkce pro aktualizaci celého uživatelského rozhraní na základě stavu místnosti ze serveru.
 * @param {object} roomState Objekt s kompletním stavem místnosti přijatý ze serveru.
 */
window.updateUIFromRoomState = (roomState) => {
    window.gameRoomState = roomState; // Uložíme si kompletní stav místnosti globálně
    currentRoomId = roomState.roomId;
    
    // Zobrazení kódu místnosti a počtu hráčů (pro obě obrazovky)
    lobbyRoomCodeDisplay.textContent = roomState.roomId;
    lobbyPlayerCountDisplay.textContent = roomState.players.length;
    currentRoomCodeDisplay.textContent = roomState.roomId;
    playerCountDisplay.textContent = roomState.players.length;

    // Aktualizace seznamu hráčů v lobby
    playerListElement.innerHTML = ''; // Vyčistíme starý seznam
    roomState.players.forEach(player => {
        const li = document.createElement('li');
        let playerText = `<span>${player.username}</span>`;
        if (player.id === window.socket.id) {
            playerText = `<span>${player.username} (Ty)</span>`;
        } else if (isHost && player.id === roomState.hostId) {
            playerText = `<span>${player.username} (Hostitel)</span>`;
        } else if (player.id === roomState.hostId) { // Pro ostatní hráče označí hostitele
            playerText = `<span>${player.username} (Hostitel)</span>`;
        }
        
        li.innerHTML = playerText;

        if (isHost && player.id !== window.socket.id) { // Hostitel může vykopnout kohokoli kromě sebe
            const kickButton = document.createElement('button');
            kickButton.textContent = 'Vykopnout';
            kickButton.classList.add('kick-button');
            kickButton.addEventListener('click', () => {
                if (confirm(`Opravdu chcete vykopnout hráče ${player.username}?`)) {
                    window.kickPlayer(player.id);
                }
            });
            li.appendChild(kickButton);
        }
        playerListElement.appendChild(li);
    });

    // Nastavení hostitele panelu a jeho hodnot
    if (isHost) {
        hostSettingsPanel.classList.remove('hidden');
        // Nastavíme hodnoty selectů/inputů podle aktuálních nastavení místnosti
        roundDurationSelect.value = roomState.gameSettings.roundDuration;
        numRoundsInput.value = roomState.gameSettings.numRounds;
        hostPlaysCheckbox.checked = roomState.gameSettings.hostPlays;
        // Lokální kopii nastavení aktualizujeme
        gameSettings = roomState.gameSettings;
    } else {
        hostSettingsPanel.classList.add('hidden');
    }

    // Aktualizace stavu hry a zpráv na základě gameState ze serveru
    switch (roomState.gameState) {
        case 'LOBBY':
            showScreen('lobbyScreen');
            lobbyStatusMessage.textContent = isHost ? 
                `Jsi hostitel. Kód: ${roomState.roomId}. Nastav hru a počkej na hráče.` : 
                `Jsi připojen do místnosti ${roomState.roomId}. Čekám na hostitele, aby spustil hru...`;
            startGameButton.classList.toggle('hidden', !isHost); // Jen hostitel vidí Start Game
            leaveLobbyButton.classList.remove('hidden'); // Oba vidí Opustit místnost
            buzzerButton.disabled = true; // V lobby se nebzučí
            countdownDisplay.classList.add('hidden'); // Skryj odpočet
            winnerContainer.classList.add('hidden'); // Skryj vítěze
            nextRoundButton.classList.add('hidden');
            resetButton.classList.add('hidden');
            break;
        case 'COUNTDOWN':
            showScreen('gameScreen');
            updateGameStatusMessage(`Kolo ${roomState.currentRound} začíná za...`, false);
            startCountdownUI(roomState.countdownTime); // Spustí UI odpočet
            buzzerButton.disabled = true; // Bzučák je zakázán během odpočtu
            winnerContainer.classList.add('hidden');
            nextRoundButton.classList.add('hidden');
            resetButton.classList.add('hidden');
            break;
        case 'ACTIVE_ROUND':
            showScreen('gameScreen');
            updateGameStatusMessage(`Kolo ${roomState.currentRound} v plném proudu!`, true);
            countdownDisplay.classList.add('hidden'); // Skryj odpočet
            updateWinnerDisplay(roomState.winner); // Zobrazí vítěze, pokud už byl
            // Povol bzučák, pokud není vítěz a hostitel hraje nebo nejsi hostitel
            if (!roomState.winner) {
                if (isHost && !roomState.gameSettings.hostPlays) {
                    buzzerButton.disabled = true; // Hostitel nehraje
                    updateGameStatusMessage(`Jsi hostitel a nehraješ. Bzučák pro tebe je deaktivován.`);
                } else {
                    buzzerButton.disabled = false; // Může bzučet
                }
            }
            break;
        case 'ROUND_END':
            showScreen('gameScreen');
            updateGameStatusMessage(`Kolo ${roomState.currentRound} skončilo!`, true);
            countdownDisplay.classList.add('hidden');
            updateWinnerDisplay(roomState.winner); // Zobraz vítěze
            // Tlačítko Další kolo se zobrazí jen hostiteli, pokud nejsou všechna kola odehrána
            if (isHost && roomState.currentRound < roomState.gameSettings.numRounds) {
                nextRoundButton.classList.remove('hidden');
                nextRoundButton.textContent = "Další kolo";
                nextRoundButton.disabled = false;
            } else if (isHost && roomState.currentRound >= roomState.gameSettings.numRounds) {
                // Poslední kolo, hostitel vidí tlačítko "Konec hry" nebo podobně
                nextRoundButton.textContent = "Konec hry"; // Změníme text tlačítka
                nextRoundButton.classList.remove('hidden');
                nextRoundButton.disabled = false;
                updateGameStatusMessage(`Všechna kola odehrána! Klikněte na 'Konec hry'.`, true);
            } else {
                nextRoundButton.classList.add('hidden');
            }
            break;
        case 'GAME_OVER':
            showScreen('gameScreen');
            updateGameStatusMessage(`Hra skončila!`, true);
            countdownDisplay.classList.add('hidden');
            updateWinnerDisplay(roomState.winner); // Zobraz posledního vítěze (pokud byl)
            nextRoundButton.classList.add('hidden');
            if (isHost) {
                // Hostitel může mít tlačítko pro novou hru nebo opuštění
                resetButton.classList.remove('hidden'); // Můžeme použít reset pro restart hry
                resetButton.textContent = "Nová Hra";
                resetButton.disabled = false;
            }
            break;
        default:
            console.warn('app.js: Neznámý stav hry:', roomState.gameState);
            showScreen('startScreen');
            break;
    }
}


// --- Nastavení posluchačů událostí ze Socket.IO serveru ---
document.addEventListener('DOMContentLoaded', () => {
    showScreen('startScreen'); // Inicializace - zobraz startovací obrazovku

    window.socket.on('connect_error', (err) => {
        displayError('Chyba připojení k serveru! Zkontrolujte připojení k internetu.');
        console.error('app.js: Chyba připojení:', err);
    });

    // --- POSLUCHAČE PRO MÍSTNOSTI ---
    window.socket.on('roomCreated', (roomId) => {
        currentRoomId = roomId;
        isHost = true;
        // Po vytvoření místnosti se přejde do lobby.
        // Server brzy pošle 'roomState', který aktualizuje celé UI.
        showScreen('lobbyScreen'); // Okamžitě zobrazíme lobby
        // Aktualizace lobbyStatusMessage proběhne v roomState handleru
        console.log(`app.js: Místnost vytvořena: ${roomId}. Jsi hostitel.`);
        console.log(`app.js: V roomCreated, currentRoomId je nastaveno na: ${currentRoomId}`); // LADÍCÍ ZPRÁVA
    });

    window.socket.on('roomJoined', (roomId) => {
        currentRoomId = roomId;
        isHost = false; // Pokud je to join, nejsi hostitel
        // Po připojení do místnosti se přejde do lobby.
        // Server brzy pošle 'roomState', který aktualizuje celé UI.
        showScreen('lobbyScreen'); // Okamžitě zobrazíme lobby
        // Aktualizace lobbyStatusMessage proběhne v roomState handleru
        console.log(`app.js: Připojeno do místnosti: ${roomId}.`);
        console.log(`app.js: V roomJoined, currentRoomId je nastaveno na: ${currentRoomId}`); // LADÍCÍ ZPRÁVA
    });

    window.socket.on('roomNotFound', () => {
        displayError('Místnost s tímto kódem nebyla nalezena.');
        console.warn('app.js: Místnost nebyla nalezena.');
        showScreen('startScreen'); // Vrať se na start, pokud místnost nebyla nalezena
    });

    // Hlavní událost pro aktualizaci celého UI
    window.socket.on('roomState', (roomState) => {
        console.log(`app.js: updateUIFromRoomState volána. roomState.roomId je: ${roomState.roomId}, currentRoomId je: ${currentRoomId}`); // LADÍCÍ ZPRÁVA
        updateUIFromRoomState(roomState);
        console.log('app.js: Událost roomState přijata. Aktuální stav místnosti:', roomState);
    });

    window.socket.on('roomClosed', (message) => {
        alert(message || 'Místnost byla zrušena.');
        showScreen('startScreen');
        // Reset lokálních proměnných po opuštění
        currentRoomId = null;
        isHost = false;
        myUsername = 'Neznámý';
        gameSettings = { roundDuration: 30, numRounds: 3, hostPlays: true }; // Reset na výchozí
        console.log('app.js: Místnost byla zrušena.');
    });

    window.socket.on('notAuthorized', (message) => {
        displayError(message);
        console.warn('app.js: Uživatel nemá oprávnění:', message);
    });

    window.socket.on('playerKicked', (username) => {
        alert(`${username} byl vykopnut z místnosti hostitelem.`);
        // Server nám pošle roomState, takže se UI aktualizuje samo
    });
    
    // --- POSLUCHAČE PRO HERNÍ LOGIKU ---
    window.socket.on('buzzerWinner', (winner) => {
        // updateWinnerDisplay(winner); // Toto už se volá z roomState události
        console.log('app.js: Událost buzzerWinner přijata. Vítěz kola:', winner.username || winner.id);
    });

    window.socket.on('buzzerReset', () => {
        // Toto se volá, když server resetuje bzučák (např. na začátku kola)
        // UI se aktualizuje přes roomState událost, takže zde není potřeba nic dělat s UI
        console.log('app.js: Událost buzzerReset přijata.');
    });

    // NOVÉ: Událost pro začátek odpočtu (server řekne, kdy začít)
    window.socket.on('countdownStart', (countdownTime) => {
        // UI se přepne na herní obrazovku a odpočet se spustí uvnitř updateUIFromRoomState
        console.log(`app.js: Odpočet zahájen s ${countdownTime} sekundami.`);
    });
    
    // NOVÉ: Událost pro start kola (server řekne, kdy je kolo aktivní)
    window.socket.on('roundStarted', (roundNumber, gameSettings) => {
        // UI se aktualizuje přes roomState událost, která už zpracuje zobrazení
        console.log(`app.js: Kolo ${roundNumber} začalo.`);
    });

    // NOVÉ: Událost pro konec kola (vypršení času nebo bzučení)
    window.socket.on('roundEnded', (roundNumber, winner) => {
        // UI se aktualizuje přes roomState událost, která už zpracuje zobrazení vítěze a tlačítek
        console.log(`app.js: Kolo ${roundNumber} skončilo.`);
    });

    // NOVÉ: Událost pro konec celé hry
    window.socket.on('gameOver', () => {
        // UI se aktualizuje přes roomState událost, která už zpracuje zobrazení
        console.log('app.js: Hra skončila.');
    });
});


// --- Pomocná funkce pro ověření jména ---
function isValidUsername(username) {
    const isValid = username.trim().length > 0 && username.trim().length <= 20;
    console.log(`app.js: Ověřuji jméno "${username}". Platné: ${isValid}`);
    return isValid;
}

// --- Nastavení posluchačů pro HTML tlačítka ---

createRoomButton.addEventListener('click', () => {
    const username = usernameInput.value.trim();
    if (!isValidUsername(username)) {
        displayError('Zadejte platné jméno (1-20 znaků).');
        return;
    }
    myUsername = username;
    window.createRoom(username);
});

joinRoomButton.addEventListener('click', () => {
    const username = usernameInput.value.trim();
    if (!isValidUsername(username)) {
        displayError('Zadejte platné jméno (1-20 znaků).');
        return;
    }
    myUsername = username;

    const roomCode = roomCodeInput.value.trim();
    if (roomCode.length === 5 && /^\d+$/.test(roomCode)) {
        window.joinRoom(roomCode, username);
    } else {
        displayError('Zadejte platný 5místný číselný kód místnosti.');
        roomCodeInput.value = '';
    }
});

// NOVÉ: Uložení nastavení hry (pouze hostitel)
saveSettingsButton.addEventListener('click', () => {
    if (!isHost) {
        displayError('Pouze hostitel může měnit nastavení hry.');
        return;
    }
    const newSettings = {
        roundDuration: parseInt(roundDurationSelect.value),
        numRounds: parseInt(numRoundsInput.value),
        hostPlays: hostPlaysCheckbox.checked
    };
    // Základní validace
    if (isNaN(newSettings.numRounds) || newSettings.numRounds < 1 || newSettings.numRounds > 100) {
        displayError('Počet kol musí být mezi 1 a 100.');
        numRoundsInput.value = gameSettings.numRounds; // Reset na poslední platnou hodnotu
        return;
    }
    window.updateGameSettings(currentRoomId, newSettings);
    console.log('app.js: Odesláno nové nastavení hry:', newSettings);
});

// NOVÉ: Spuštění hry/dalšího kola (pouze hostitel)
startGameButton.addEventListener('click', () => {
    if (!isHost) {
        displayError('Pouze hostitel může spustit hru.');
        return;
    }
    // Zkontroluj, zda je alespoň 1 hráč (hostitel + minimálně 1 další hráč pokud hostitel nehraje)
    const requiredPlayers = gameSettings.hostPlays ? 1 : 2; // Pokud hostitel hraje, stačí on sám. Jinak potřebujeme aspoň 1 hráče navíc.
    if (window.gameRoomState.players.length < requiredPlayers) {
        displayError(`Potřebujete alespoň ${requiredPlayers} hráče(ů) pro spuštění hry.`);
        return;
    }
    window.startGame(currentRoomId);
    console.log('app.js: Tlačítko Spustit Hru stisknuto.');
});

nextRoundButton.addEventListener('click', () => {
    if (!isHost) {
        displayError('Pouze hostitel může spustit další kolo nebo ukončit hru.');
        return;
    }
    if (!window.gameRoomState || !window.gameRoomState.gameSettings) {
        displayError('Stav hry není k dispozici.');
        return;
    }

    if (window.gameRoomState.currentRound >= window.gameRoomState.gameSettings.numRounds) {
        // Pokud jsou všechna kola odehrána, toto tlačítko funguje jako "Konec hry"
        window.endGame(currentRoomId); 
        console.log('app.js: Tlačítko Konec Hry stisknuto.');
    } else {
        window.startNextRound(currentRoomId); 
        console.log('app.js: Tlačítko Další Kolo stisknuto.');
    }
});

buzzerButton.addEventListener('click', () => {
    // Před bzučením zkontrolujeme, zda je to hostitel a nehraje
    if (isHost && window.gameRoomState && !window.gameRoomState.gameSettings.hostPlays) {
        displayError('Jako hostitel, který nehraje, nemůžete bzučet.');
        return;
    }
    
    // Dále pokračuje původní logika
    if (currentRoomId && !currentWinner && window.gameRoomState && window.gameRoomState.gameState === 'ACTIVE_ROUND') {
        window.buzz();
    } else if (!currentRoomId) {
        displayError('Nejprve se musíte připojit do místnosti.');
    } else if (currentWinner) {
        displayError(`Bzučák již byl stisknut hráčem ${currentWinner.username}.`);
    } else if (window.gameRoomState && window.gameRoomState.gameState !== 'ACTIVE_ROUND') {
        displayError('Nemůžete bzučet, hra není v aktivním kole.');
    }
});


// Reset tlačítko se nyní používá jen pro novou hru po "Game Over" pro hostitele
resetButton.addEventListener('click', () => {
    if (currentRoomId && isHost && window.gameRoomState && window.gameRoomState.gameState === 'GAME_OVER') {
        if (confirm('Opravdu chcete spustit novou hru ve stejné místnosti? Tím se resetují všechna skóre a nastavení kola.')) {
            window.resetGame(currentRoomId); 
            console.log('app.js: Tlačítko Nová Hra stisknuto.');
        }
    } else {
        displayError('K tomuto resetu má oprávnění pouze hostitel na konci hry.');
    }
});


// Tlačítko Opustit místnost pro lobby
leaveLobbyButton.addEventListener('click', () => {
    if (currentRoomId) {
        if (confirm('Opravdu chcete opustit místnost?')) {
            window.leaveRoom(currentRoomId); 
            showScreen('startScreen');
            // Reset lokálních proměnných po opuštění
            currentRoomId = null;
            isHost = false;
            myUsername = 'Neznámý';
            gameSettings = { roundDuration: 30, numRounds: 3, hostPlays: true }; // Reset na výchozí
        }
    }
});

// Tlačítko Opustit hru pro herní obrazovku
leaveGameButton.addEventListener('click', () => {
    if (currentRoomId) {
        if (confirm('Opravdu chcete opustit hru?')) {
            window.leaveRoom(currentRoomId); 
            showScreen('startScreen');
             // Reset lokálních proměnných po opuštění
            currentRoomId = null;
            isHost = false;
            myUsername = 'Neznámý';
            gameSettings = { roundDuration: 30, numRounds: 3, hostPlays: true }; // Reset na výchozí
        }
    }
});
