// client-web/js/app.js

// --- Reference na HTML elementy ---
const homeSection = document.getElementById('homeSection');
const gameSection = document.getElementById('gameSection');
const accountSection = document.getElementById('accountSection');
const loadingScreen = document.getElementById('loadingScreen');
const appContainer = document.getElementById('appContainer'); 
const navButtons = document.querySelectorAll('.nav-button'); 

// Nové reference pro přihlášení
const loginForm = document.getElementById('loginForm');
const usernameInput = document.getElementById('usernameInput');
const passwordInput = document.getElementById('passwordInput');
const loginMessage = document.getElementById('loginMessage');
const loggedInContent = document.getElementById('loggedInContent');
const loggedInUsernameSpan = document.getElementById('loggedInUsername');
const logoutButton = document.getElementById('logoutButton');
const showRegisterFormLink = document.getElementById('showRegisterFormLink'); // Odkaz na registraci

// --- Globální proměnné stavu ---
let socketInitialized = false; 
let currentActiveSectionId = null;
let isAuthenticated = false; // Nová proměnná pro stav přihlášení
let currentUsername = null; // Nová proměnná pro uložení jména přihlášeného uživatele

// --- Funkce pro přepínání sekcí ---
/**
 * Zobrazí konkrétní sekci a skryje všechny ostatní.
 * Používá jen CSS třídy pro plynulý přechod.
 * @param {string} newSectionId ID HTML elementu sekce, který se má zobrazit (např. 'homeSection').
 */
function showSection(newSectionId) {
    if (newSectionId === currentActiveSectionId) {
        console.log(`showSection: Sekce '${newSectionId}' je již aktivní, přeskočím.`);
        return; 
    }

    console.log(`showSection: Přepínám ze sekce '${currentActiveSectionId || 'žádná'}' na '${newSectionId}'.`);

    const oldActiveSection = document.getElementById(currentActiveSectionId);
    const newActiveSection = document.getElementById(newSectionId);

    // Odebereme 'active' třídu ze staré sekce, což ji skryje pomocí CSS přechodu
    if (oldActiveSection) {
        oldActiveSection.classList.remove('active');
        console.log(`showSection: Odebrána třída 'active' ze staré sekce '${currentActiveSectionId}'.`);
    }

    // Přidáme 'active' třídu na novou sekci, což ji zobrazí pomocí CSS přechodu
    if (newActiveSection) {
        newActiveSection.classList.add('active');
        currentActiveSectionId = newSectionId;
        console.log(`showSection: Sekce '${newSectionId}' zobrazena.`);
    } else {
        console.warn(`showSection: Nová sekce s ID '${newSectionId}' nebyla nalezena v DOMu.`);
    }

    // --- LOGIKA PRO AKTIVNÍ STAV NAVIGAČNÍCH TLAČÍTEK, TEXTŮ A IKON ---
    navButtons.forEach(button => {
        const navText = button.querySelector('.nav-text');
        const navIcon = button.querySelector('.nav-icon');
        
        // Odebereme aktivní stav ze všech tlačítek
        if (navText) {
            navText.classList.remove('active');
        }
        if (navIcon) {
            navIcon.classList.remove('active');
        }
        button.classList.remove('active'); 
    });

    // Aktivujeme správné tlačítko
    const activeButton = document.querySelector(`.nav-button[data-section="${newSectionId}"]`);
    if (activeButton) {
        const activeNavText = activeButton.querySelector('.nav-text');
        const activeNavIcon = activeButton.querySelector('.nav-icon');

        if (activeNavText) {
            activeNavText.classList.add('active');
        }
        if (activeNavIcon) {
            activeNavIcon.classList.add('active');
        }
        activeButton.classList.add('active');
    }

    // Speciální logika pro Account sekci
    if (newSectionId === 'accountSection') {
        updateAccountSectionUI(); // Zavoláme funkci pro aktualizaci UI v Account sekci
    }

    if (newSectionId === 'gameSection' && !socketInitialized) {
        console.log('app.js: První přechod na herní sekci. Inicializuji herní logiku...');
        socketInitialized = true;
    }
}

// --- Funkce pro skrytí loading screenu a zobrazení obsahu ---
function hideLoadingScreen() {
    if (loadingScreen) {
        loadingScreen.classList.add('fade-out');
        loadingScreen.addEventListener('transitionend', () => {
            loadingScreen.style.display = 'none'; 
        }, { once: true });
    }

    // Zobrazíme celý kontejner aplikace
    if (appContainer) {
        appContainer.classList.remove('hidden-app-content');
        appContainer.classList.add('visible-app-content');
        console.log('appContainer je viditelný.');
    }

    // Po načtení se automaticky zobrazí Home sekce
    setTimeout(() => {
        showSection('homeSection');
    }, 100); 
    
    console.log('Aplikace je načtena a připravena.');
}

// --- Funkce pro aktualizaci UI Account sekce podle stavu přihlášení ---
function updateAccountSectionUI() {
    if (isAuthenticated) {
        loginForm.style.display = 'none';
        showRegisterFormLink.style.display = 'none'; // Skryjeme odkaz na registraci
        loggedInContent.style.display = 'flex'; // Zobrazíme obsah pro přihlášeného
        loggedInUsernameSpan.textContent = currentUsername; // Nastavíme jméno uživatele
    } else {
        loginForm.style.display = 'flex'; // Zobrazíme formulář pro přihlášení
        showRegisterFormLink.style.display = 'block'; // Zobrazíme odkaz na registraci
        loggedInContent.style.display = 'none'; // Skryjeme obsah pro přihlášeného
        loginMessage.textContent = ''; // Vymažeme případné chybové zprávy
        usernameInput.value = ''; // Vyčistíme pole
        passwordInput.value = ''; // Vyčistíme pole
    }
}

// --- Funkce pro přihlášení ---
function loginUser(username, password) {
    loginMessage.textContent = 'Přihlašování...';
    socket.emit('login', { username, password }); // Odesíláme data na server
    console.log(`Odesílám přihlašovací data pro uživatele: ${username}`);
}

// --- Funkce pro odhlášení ---
function logoutUser() {
    isAuthenticated = false;
    currentUsername = null;
    localStorage.removeItem('isAuthenticated'); // Odstraníme stav z localStorage
    localStorage.removeItem('username'); // Odstraníme jméno z localStorage
    updateAccountSectionUI(); // Aktualizujeme UI
    displayMessage('Úspěšně odhlášeno.'); // Volitelná zpráva
    showSection('homeSection'); // Přesměrujeme na Home po odhlášení
    console.log('Uživatel odhlášen.');
}


// --- Nastavení posluchačů událostí ---
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOMContentLoaded: DOM je načten.');

    // Kontrola stavu přihlášení z localStorage při načtení
    if (localStorage.getItem('isAuthenticated') === 'true' && localStorage.getItem('username')) {
        isAuthenticated = true;
        currentUsername = localStorage.getItem('username');
        console.log(`Uživatel ${currentUsername} je již přihlášen (z localStorage).`);
    }

    // Při načtení DOMu spustíme simulaci loading screenu
    // A po něm se zobrazí appContainer a Home sekce
    setTimeout(() => {
        hideLoadingScreen();
    }, 200); 

    // Přidání posluchačů pro navigační tlačítka
    if (navButtons.length > 0) {
        navButtons.forEach(button => {
            button.addEventListener('click', (event) => {
                const sectionId = button.dataset.section;
                if (sectionId) {
                    showSection(sectionId);
                }
            });
        });
    }

    // Posluchač pro odeslání přihlašovacího formuláře
    if (loginForm) {
        loginForm.addEventListener('submit', (event) => {
            event.preventDefault(); // Zabrání výchozímu odeslání formuláře
            const username = usernameInput.value.trim();
            const password = passwordInput.value.trim();

            if (username && password) {
                loginUser(username, password);
            } else {
                loginMessage.textContent = 'Prosím, vyplňte obě pole.';
            }
        });
    }

    // Posluchač pro tlačítko odhlášení
    if (logoutButton) {
        logoutButton.addEventListener('click', logoutUser);
    }

    // Posluchač pro odkaz na registraci (prozatím jen placeholder)
    if (showRegisterFormLink) {
        showRegisterFormLink.addEventListener('click', (event) => {
            event.preventDefault();
            displayMessage('Funkce registrace zatím není k dispozici.');
            console.log('Uživatel chce zobrazit registrační formulář.');
            // Zde by se v budoucnu zobrazoval registrační formulář
        });
    }
});

// --- Příklad globálních pomocných funkcí ---
function displayMessage(message) {
    console.log('Zpráva pro uživatele:', message);
    loginMessage.textContent = message; // Použijeme loginMessage pro zobrazení zpráv
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
    });

    window.socket.on('roomJoined', (roomId) => {
        currentRoomId = roomId;
        isHost = false; // Pokud je to join, nejsi hostitel
        // Po připojení do místnosti se přejde do lobby.
        // Server brzy pošle 'roomState', který aktualizuje celé UI.
        showScreen('lobbyScreen'); // Okamžitě zobrazíme lobby
        // Aktualizace lobbyStatusMessage proběhne v roomState handleru
        console.log(`app.js: Připojeno do místnosti: ${roomId}.`);
    });

    window.socket.on('roomNotFound', () => {
        displayError('Místnost s tímto kódem nebyla nalezena.');
        console.warn('app.js: Místnost nebyla nalezena.');
        showScreen('startScreen'); // Vrať se na start, pokud místnost nebyla nalezena
    });

    // Hlavní událost pro aktualizaci celého UI
    window.socket.on('roomState', (roomState) => {
        updateUIFromRoomState(roomState);
        console.log('app.js: Událost roomState přijata. Aktuální stav místnosti:', roomState);
    });

    window.socket.on('roomClosed', (message) => {
        alert(message || 'Místnost byla zrušena.');
        showScreen('startScreen');
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
