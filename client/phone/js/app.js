// client-web/js/app.js

// --- Reference na HTML elementy (Zajišťujeme, že elementy existují) ---
const homeSection = document.getElementById('homeSection');
const gameSection = document.getElementById('gameSection');
const accountSection = document.getElementById('accountSection');
const nameSection = document.getElementById('nameSection');
const lobbySection = document.getElementById('lobbySection');
const roomSettingsSection = document.getElementById('roomSettingsSection');

const loadingScreen = document.getElementById('loadingScreen');
const appContainer = document.getElementById('appContainer');
const navButtons = document.querySelectorAll('.nav-button');
const quickStartButton = document.getElementById('quickStartButton');
const quickStartAccount = document.getElementById('quickStartAccount');

const navTitle = document.querySelector('.top-nav .nav-title');
const navHome = document.querySelector('.top-nav .nav-home');
const bottomNav = document.querySelector('.bottom-nav');

const clearGameCodeButton = document.getElementById('clearGameCodeButton');

const qrCodeScanIcon = document.getElementById('qrCodeScanIcon');
const qrReaderDiv = document.getElementById('qr-reader');
const qrReaderResultsDiv = document.getElementById('qr-reader-results');
const joinGameCodeInput = document.getElementById('joinGameCode');
const qrOverlay = document.getElementById('qr-overlay');
const qrOverlayCloseButton = document.getElementById('qrOverlayCloseButton');

const joinGameButton = document.getElementById('joinGameButton');
const playerNameInput = document.getElementById('playerNameInput');
const submitNameButton = document.getElementById('submitNameButton');
const createGameButton = document.getElementById('createGameButton');

// Reference pro elementy v lobbySection
const lobbyRoomCode = document.getElementById('lobbyRoomCode');
const lobbyPlayerList = document.getElementById('lobbyPlayerList');
const leaveLobbyButton = document.getElementById('leaveLobbyButton');

// Reference pro elementy v roomSettingsSection
const settingsRoomCode = document.getElementById('settingsRoomCode');
const maxPlayersInput = document.getElementById('maxPlayers');
const roundTimeInput = document.getElementById('roundTime');
const buzzerDelayInput = document.getElementById('buzzerDelay');
const hostPlaysToggle = document.getElementById('hostPlays'); // Přidáno pro hostPlays
const updateSettingsButton = document.getElementById('updateSettingsButton'); // Přidáno
const startGameButton = document.getElementById('startGameButton');
const closeRoomButton = document.getElementById('closeRoomButton');


const darkModeToggle = document.getElementById('darkModeToggle');


// --- Globální stavové proměnné ---
let currentActiveSectionId = null; // ID aktuálně aktivní sekce
let isShifted = false; // Stav pro posun horní a dolní navigace
let html5QrCode = null; // Instance HTML5-QR kód čtečky
let gameMode = null; // Ukládá herní režim ('join' nebo 'create')
let currentRoomCode = null; // Pro uložení kódu místnosti (získaného ze serveru)

const sectionHistory = []; // Historie navštívených sekcí pro funkci zpět


// --- Funkce pro přepínání sekcí ---
/**
 * Zobrazí konkrétní sekci a skryje všechny ostatní.
 * Používá CSS třídy 'active' pro plynulé přechody.
 * @param {string} newSectionId ID HTML elementu sekce, která se má zobrazit (např. 'homeSection').
 * @param {boolean} isBackNavigation Indikuje, zda jde o navigaci zpět (výchozí hodnota false).
 */
function showSection(newSectionId, isBackNavigation = false) {
    // Pokud je sekce již aktivní, nic neděláme
    if (newSectionId === currentActiveSectionId) {
        console.log(`showSection: Sekce '${newSectionId}' je již aktivní, přeskočeno.`);
        return;
    }

    console.log(`showSection: Přepínání ze sekce '${currentActiveSectionId || 'žádná'}' na '${newSectionId}'. Je to návrat: ${isBackNavigation}`);

    // --- Správa historie sekcí ---
    if (!isBackNavigation) {
        // Přidáme aktuální sekci do historie POUZE, pokud to není stejná sekce, na které již jsme
        // a pokud to není stejná sekce jako ta poslední v historii (aby se zabránilo duplikátům při opakovaných kliknutích).
        if (currentActiveSectionId && (sectionHistory.length === 0 || sectionHistory[sectionHistory.length - 1] !== currentActiveSectionId)) {
            sectionHistory.push(currentActiveSectionId);
        }
    }

    console.log(`showSection: Aktuální historie před nastavením nové sekce: ${sectionHistory.join(' -> ')}`);

    // Získání referencí na starou a novou aktivní sekci
    const oldActiveSection = document.getElementById(currentActiveSectionId);
    const newActiveSection = document.getElementById(newSectionId);

    // Skrýt starou aktivní sekci
    if (oldActiveSection) {
        oldActiveSection.classList.remove('active');
        console.log(`showSection: Odebrána třída 'active' ze staré sekce '${currentActiveSectionId}'.`);
    }

    // Zobrazit novou sekci
    if (newActiveSection) {
        newActiveSection.classList.add('active');
        currentActiveSectionId = newSectionId; // Aktualizovat ID aktivní sekce.
        console.log(`showSection: Sekce '${newSectionId}' zobrazena. Nové currentActiveSectionId: ${currentActiveSectionId}`);
    } else {
        console.warn(`showSection: Nová sekce s ID '${newSectionId}' nebyla nalezena v DOM.`);
    }

    // --- LOGIKA PRO ANIMACE NAVIGACE (Horní a spodní navigace) ---
    // Sekce, které vyžadují posunutou navigaci (pro zobrazení tlačítka zpět a menšího titulu)
    const shouldNavBeShifted = (newSectionId === 'nameSection' || newSectionId === 'lobbySection' || newSectionId === 'roomSettingsSection');

    // Animace posunu navigace, pokud je potřeba změnit stav
    if (shouldNavBeShifted && !isShifted) {
        animateTopNav();
        if (bottomNav) bottomNav.classList.add('shifted');
        console.log(`showSection: Přepnuto na sekci vyžadující posun (${newSectionId}), navigace posunuta.`);
    } else if (!shouldNavBeShifted && isShifted) {
        animateTopNav();
        if (bottomNav) bottomNav.classList.remove('shifted');
        console.log('showSection: Přepnuto na sekci nevyžadující posun, navigace vrácena.');
    }
    // Pokud je stav již správný, nedělej nic.

    // --- LOGIKA PRO AKTIVNÍ STAV NAVIGAČNÍCH TLAČÍTEK (spodní navigace) ---
    // Deaktivujeme všechna navigační tlačítka
    navButtons.forEach(button => {
        const navText = button.querySelector('.nav-text');
        const navIcon = button.querySelector('.nav-icon');

        if (navText) navText.classList.remove('active');
        if (navIcon) navIcon.classList.remove('active');
        button.classList.remove('active');
    });

    // Aktivujeme správné navigační tlačítko, pokud se nová sekce shoduje s datovou sekcí tlačítka
    const activeButton = document.querySelector(`.nav-button[data-section="${newSectionId}"]`);
    if (activeButton) {
        const activeNavText = activeButton.querySelector('.nav-text');
        const activeNavIcon = activeButton.querySelector('.nav-icon');

        if (activeNavText) activeNavText.classList.add('active');
        if (activeNavIcon) activeNavIcon.classList.add('active');
        activeButton.classList.add('active');
    }
}

// --- Funkce pro animaci horní navigace ---
function animateTopNav() {
    if (navTitle && navHome) {
        if (!isShifted) { // Pokud není posunuto, posuneme
            navTitle.classList.add('shifted');
            navHome.classList.add('visible');
        } else { // Pokud je posunuto, vrátíme
            navTitle.classList.remove('shifted');
            navHome.classList.remove('visible');
        }
        isShifted = !isShifted; // Přepnutí stavu posunu
    } else {
        console.warn('animateTopNav: Některé elementy (navTitle nebo navHome) nebyly nalezeny pro animaci.');
    }
}

// --- Funkce pro spuštění postupné animace tlačítek spodní navigace ---
function startStaggeredNavButtonAnimation(delayBetweenButtons = 200) {
    if (navButtons.length === 0) {
        console.warn('startStaggeredNavButtonAnimation: Nebyla nalezena žádná navigační tlačítka.');
        return;
    }

    navButtons.forEach((button, index) => {
        setTimeout(() => {
            button.classList.add('nav-button-hop');
            button.addEventListener('animationend', () => {
                button.classList.remove('nav-button-hop');
            }, { once: true }); // Odebere posluchače po první animaci
        }, index * delayBetweenButtons);
    });
}

// --- Funkce pro navigaci zpět ---
/**
 * Naviguje na předchozí sekci v historii.
 * Pokud není žádná předchozí sekce (nebo jen homeSection), zůstane na homeSection.
 */
function goBack() {
    if (sectionHistory.length > 0) {
        const previousSectionId = sectionHistory.pop(); // Vezme poslední sekci z historie
        console.log(`goBack: Naviguji zpět na '${previousSectionId}'. Aktuální historie: ${sectionHistory.join(' -> ')}`);
        showSection(previousSectionId, true); // Zobrazí předchozí sekci, označeno jako návrat
    } else {
        console.log('goBack: Historie je prázdná nebo na začátku. Zůstávám na homeSection.');
        showSection('homeSection', true); // Pokud není kam jít zpět, jdi na home
    }
}


// --- Funkce pro zobrazení/skrytí QR překrytí ---
function toggleQrOverlay(show) {
    if (qrOverlay) {
        if (show) {
            qrOverlay.classList.add('active');
            // Vyčistíme výsledky a vstupní pole, když se překrytí otevře
            if (qrReaderResultsDiv) qrReaderResultsDiv.textContent = '';
            if (joinGameCodeInput) joinGameCodeInput.value = '';
        } else {
            qrOverlay.classList.remove('active');
        }
    }
}

// --- Funkce pro skrytí loading screenu a zobrazení obsahu aplikace ---
function hideLoadingScreen() {
    if (loadingScreen) {
        loadingScreen.classList.add('fade-out'); // Spustí fade-out animaci
        // Po skončení animace skryje element
        loadingScreen.addEventListener('transitionend', () => {
            loadingScreen.style.display = 'none';
        }, { once: true }); // Posluchač se spustí jen jednou
    }

    if (appContainer) {
        appContainer.classList.remove('hidden-app-content');
        appContainer.classList.add('visible-app-content');
        console.log('appContainer je viditelný.');
    }

    // Zpožděné zobrazení první sekce pro plynulejší start
    setTimeout(() => {
        showSection('homeSection');
    }, 100);

    console.log('Aplikace je načtena a připravena.');
}

// --- Centralizovaná logika pro vstup do nameSection ---
/**
 * Zpracuje vstup do nameSection, nastaví gameMode a přepne sekci.
 * @param {string} mode Režim hry ('join' nebo 'create').
 */
function handleGameModeEntry(mode) {
    gameMode = mode; // Uložíme režim hry
    console.log(`handleGameModeEntry: Režim hry nastaven na '${gameMode}'. Přepínám na nameSection.`);
    playerNameInput.value = ''; // Vyčisti pole jména při vstupu do nameSection
    showSection('nameSection');
}


// --- DOMContentLoaded Event Listener ---
// Zajišťuje, že kód se spustí až po načtení celého DOM.
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOMContentLoaded: DOM je načten.');

    // Zobrazení/skrytí loading screenu po krátké prodlevě
    setTimeout(() => {
        hideLoadingScreen();
    }, 200);

    // Spuštění postupné animace tlačítek spodní navigace
    startStaggeredNavButtonAnimation(200);

    // Posluchače pro navigační tlačítka (spodní navigace)
    if (navButtons.length > 0) {
        navButtons.forEach(button => {
            button.addEventListener('click', () => {
                const sectionId = button.dataset.section; // Získá ID sekce z data-section atributu
                if (sectionId) {
                    showSection(sectionId);
                    // Odstraní "hop" animaci, pokud klikneš na již animované tlačítko
                    navButtons.forEach(btn => btn.classList.remove('nav-button-hop'));
                }
            });
        });
    }

    // Posluchač pro tlačítko vymazání textarea (pro Game Code input)
    if (clearGameCodeButton) {
        clearGameCodeButton.addEventListener('click', () => {
            if (joinGameCodeInput) {
                joinGameCodeInput.value = '';
            }
        });
    }

    // Posluchače pro Quick Actions tlačítka (na Home sekci)
    if (quickStartButton) {
        quickStartButton.addEventListener('click', () => {
            const sectionId = quickStartButton.dataset.section;
            if (sectionId) {
                showSection(sectionId);
            }
        });
    }

    if (quickStartAccount) {
        quickStartAccount.addEventListener('click', () => {
            const sectionId = quickStartAccount.dataset.section;
            if (sectionId) {
                showSection(sectionId);
            }
        });
    }

    // Posluchač pro ikonu domů v horní navigaci (nyní funguje jako tlačítko zpět)
    if (navHome) {
        navHome.addEventListener('click', () => {
            goBack();
        });
    }

    // POSLUCHAČ PRO IKONU QR KÓDU (pro spuštění skeneru)
    if (qrCodeScanIcon) {
        qrCodeScanIcon.addEventListener('click', () => {
            console.log('Ikona QR kódu kliknuta. Spouštím překrytí QR skeneru.');
            toggleQrOverlay(true); // Zobrazí QR překrytí

            // Inicializuje HTML5 QR kód čtečku, pokud ještě nebyla
            if (!html5QrCode) {
                html5QrCode = new Html5Qrcode("qr-reader");
            }

            // Spustí QR kód čtečku
            html5QrCode.start(
                { facingMode: "environment" }, // Preferuje zadní kameru
                { fps: 10, qrbox: { width: 250, height: 250 } }, // Nastavení skenování
                (decodedText, decodedResult) => { // Callback při úspěšném naskenování
                    console.log(`QR kód naskenován: ${decodedText}`);
                    if (qrReaderResultsDiv) qrReaderResultsDiv.textContent = `Naskenováno: ${decodedText}`;
                    if (joinGameCodeInput) joinGameCodeInput.value = decodedText; // Vloží kód do inputu

                    // Zastaví čtečku a skryje překrytí po úspěšném skenování
                    html5QrCode.stop().then(() => {
                        console.log('QR čtečka zastavena po úspěšném skenování.');
                        toggleQrOverlay(false);
                    }).catch((err) => {
                        console.error('Chyba při zastavování QR čtečky po skenování:', err);
                        toggleQrOverlay(false);
                    });
                },
                (errorMessage) => { // Callback pro chyby skenování (často se opakuje)
                    // console.warn(`Chyba skenování: ${errorMessage}`); // Vypnuto pro menší spam v konzoli
                }
            ).catch((err) => { // Chyba při spouštění kamery
                console.error(`Chyba při spouštění QR čtečky: ${err}`);
                if (qrReaderResultsDiv) qrReaderResultsDiv.textContent = `Chyba: ${err.message || err}`;
                toggleQrOverlay(false); // Zavře překrytí i při chybě
            });
        });
    }

    // POSLUCHAČ PRO TLAČÍTKO ZAVŘÍT V QR PŘEKRYTÍ
    if (qrOverlayCloseButton) {
        qrOverlayCloseButton.addEventListener('click', () => {
            console.log('Tlačítko zavřít překrytí kliknuto.');
            // Zastaví QR čtečku, pokud je aktivní
            if (html5QrCode && html5QrCode.isScanning) {
                html5QrCode.stop().then(() => {
                    console.log('QR čtečka zastavena ručně.');
                    toggleQrOverlay(false);
                }).catch((err) => {
                    console.error('Chyba při ručním zastavování QR čtečky:', err);
                    toggleQrOverlay(false);
                });
            } else {
                toggleQrOverlay(false);
            }
        });
    }

    // LISTENER PRO "Join Game" TLAČÍTKO (na gameSection)
    if (joinGameButton) {
        joinGameButton.addEventListener('click', () => {
            handleGameModeEntry('join');
        });
    }

    // LISTENER PRO "Create Game" TLAČÍTKO (na gameSection)
    if (createGameButton) {
        createGameButton.addEventListener('click', () => {
            handleGameModeEntry('create');
        });
    }


    // LISTENER PRO TLAČÍTKO "Continue" (na nameSection)
    if (submitNameButton) {
        submitNameButton.addEventListener('click', () => {
            const playerName = playerNameInput.value.trim(); // Získá a ořeže jméno hráče
            if (playerName) { // Kontrola, zda jméno není prázdné
                console.log(`Zadáno jméno hráče: ${playerName}. Režim hry: ${gameMode}`);

                // --- INTEGRACE SOCKET.IO pro vytvoření/připojení k místnosti ---
                if (gameMode === 'join') {
                    const gameCode = joinGameCodeInput.value.trim(); // Získá kód místnosti pro připojení
                    if (!gameCode) {
                        alert('Prosím, zadejte kód místnosti!');
                        return;
                    }
                    console.log(`app.js: Pokus o připojení k místnosti ${gameCode} s jménem: ${playerName}`);
                    // Voláme funkci z socketService.js k odeslání události na server
                    window.joinRoom(gameCode, playerName);

                } else if (gameMode === 'create') {
                    console.log(`app.js: Pokus o vytvoření místnosti s jménem: ${playerName}`);
                    // Voláme funkci z socketService.js k odeslání události na server
                    window.createRoom(playerName);
                }

                // Jméno se vymaže až po úspěšném připojení/vytvoření, nebo po chybě
                // playerNameInput.value = ''; // Vymažeme až po úspěšném zpracování serverem
            } else {
                alert('Prosím, zadejte své jméno!');
            }
        });
    }

    // --- POSLUCHAČ PRO TLAČÍTKO "Update Settings" v roomSettingsSection ---
    if (updateSettingsButton) {
        updateSettingsButton.addEventListener('click', () => {
            console.log('app.js: Tlačítko "Update Settings" kliknuto.');
            // Získání aktuálních hodnot z inputů
            const settings = {
                roundDuration: parseInt(roundTimeInput.value) || 30, // Výchozí 30s
                numRounds: parseInt(maxPlayersInput.value) || 3, // Používáme maxPlayersInput pro numRounds (možná přejmenovat v HTML?)
                hostPlays: hostPlaysToggle.checked,
                buzzerDelay: parseInt(buzzerDelayInput.value) || 0 // Výchozí 0ms
            };
            // Základní validace
            if (settings.roundDuration < 0 || settings.numRounds < 1 || settings.buzzerDelay < 0) {
                alert('Prosím, zadejte platné hodnoty pro nastavení.');
                return;
            }
            if (currentRoomCode) {
                window.updateGameSettings(currentRoomCode, settings);
            }
        });
    }

    // --- POSLUCHAČ PRO TLAČÍTKO "Start Game" v roomSettingsSection ---
    if (startGameButton) {
        startGameButton.addEventListener('click', () => {
            console.log('app.js: Tlačítko "Start Game" kliknuto.');
            if (currentRoomCode) {
                // Pošleme serveru, že hostitel chce spustit hru.
                // Nastavení hry se již předpokládá aktualizované přes updateGameSettings.
                window.startGame(currentRoomCode); 
            }
        });
    }

    // --- POSLUCHAČ PRO TLAČÍTKO "Leave Room" v lobbySection ---
    if (leaveLobbyButton) {
        leaveLobbyButton.addEventListener('click', () => {
            console.log('app.js: Tlačítko "Leave Room" kliknuto.');
            if (currentRoomCode) {
                window.leaveRoom(currentRoomCode); // Informujeme server, že opouštíme místnost
                currentRoomCode = null; // Vyčistíme lokální kód místnosti
                showSection('gameSection'); // Vrátíme se na herní sekci (výběr join/create)
            }
        });
    }

    // --- POSLUCHAČ PRO TLAČÍTKO "Close Room" v roomSettingsSection (pro hostitele) ---
    if (closeRoomButton) {
        closeRoomButton.addEventListener('click', () => {
            console.log('app.js: Tlačítko "Close Room" kliknuto.');
            if (currentRoomCode) {
                window.leaveRoom(currentRoomCode); // Hostitel opouští, server zruší místnost
                currentRoomCode = null;
                showSection('gameSection'); // Vrátíme se na herní sekci
            }
        });
    }

    // --- DARK MODE LOGIC: Funkce a event listener ---
    function setDarkMode(isDark) {
        if (isDark) {
            document.body.classList.add('dark-mode');
            console.log('Dark Mode aktivován.');
        } else {
            document.body.classList.remove('dark-mode');
            console.log('Light Mode aktivován.');
        }
        localStorage.setItem('darkMode', isDark); // Uloží preference uživatele
    }

    // Načte preferenci dark mode z localStorage a aplikuje ji
    const savedDarkMode = localStorage.getItem('darkMode') === 'true';
    if (darkModeToggle) {
        if (savedDarkMode) {
            setDarkMode(true);
            darkModeToggle.checked = true; // Nastaví přepínač podle preference
        } else {
            setDarkMode(false);
            darkModeToggle.checked = false;
        }

        // Posluchač pro změnu stavu přepínače dark mode
        darkModeToggle.addEventListener('change', () => {
            setDarkMode(darkModeToggle.checked);
        });
        console.log('Posluchač přepínače Dark Mode nastaven.');
    } else {
        console.warn('Element přepínače Dark Mode (darkModeToggle) nenalezen.');
    }

    // --- SOCKET.IO EVENT LISTENERS ---
    // Tyto posluchače je dobré mít v DOMContentLoaded, aby byly aktivní po načtení DOM.

    // Událost od serveru po úspěšném vytvoření místnosti
    socket.on('roomCreated', (roomId) => {
        console.log(`app.js: Místnost úspěšně vytvořena! Kód: ${roomId}`);
        currentRoomCode = roomId; // Uložíme kód místnosti
        playerNameInput.value = ''; // Vyčisti jméno po odeslání

        // Zobrazíme kód místnosti a výchozí nastavení v roomSettingsSection
        if (settingsRoomCode) {
            settingsRoomCode.textContent = roomId;
            // Předvyplníme nastavení, která budou odeslána serveru přes updateGameSettings
            // Tyto hodnoty by měly odpovídat výchozím na serveru
            maxPlayersInput.value = 4; // Max Players (možná by to mělo být numRounds)
            roundTimeInput.value = 30; // Round Time
            buzzerDelayInput.value = 0; // Buzzer Delay
            hostPlaysToggle.checked = true; // Host Plays
        }
        showSection('roomSettingsSection'); // Přepneme na sekci nastavení místnosti
    });

    // Událost od serveru po úspěšném připojení k místnosti
    socket.on('roomJoined', (roomId) => {
        console.log(`app.js: Úspěšně připojeno k místnosti! Kód: ${roomId}`);
        currentRoomCode = roomId; // Uložíme kód místnosti
        playerNameInput.value = ''; // Vyčisti jméno po odeslání
        if (lobbyRoomCode) {
            lobbyRoomCode.textContent = roomId; // Zobraz kód místnosti v lobby
        }
        showSection('lobbySection'); // Přepneme na lobby sekci
    });

    // Událost od serveru, pokud místnost nebyla nalezena
    socket.on('roomNotFound', () => {
        console.error('app.js: Místnost s tímto kódem nebyla nalezena.');
        alert('Místnost s tímto kódem neexistuje. Zkontrolujte kód.');
        showSection('gameSection'); // Vrátíme se na výběr join/create
    });

    // Událost od serveru při chybě autorizace nebo jiné operace
    socket.on('notAuthorized', (message) => {
        console.error(`app.js: Chyba autorizace/operace: ${message}`);
        alert(`Chyba: ${message}`);
        // Můžeme se vrátit na předchozí sekci nebo zůstat, záleží na kontextu chyby
        // goBack(); // Příklad: vrátit se zpět, pokud uživatel nemá oprávnění
    });

    // Událost pro aktualizaci stavu místnosti (posílá server všem v místnosti)
    socket.on('roomState', (roomData) => {
        console.log('app.js: Přijat roomState aktualizace:', roomData);
        // Aktualizujeme UI podle aktuálního stavu místnosti, pokud je to pro naši aktivní místnost
        if (roomData && roomData.roomId === currentRoomCode) { 
            // Aktualizace seznamu hráčů v lobby (pro hostitele i hráče)
            if (lobbyPlayerList) {
                lobbyPlayerList.innerHTML = ''; // Vyčisti starý seznam
                if (roomData.players && roomData.players.length > 0) {
                    roomData.players.forEach(player => {
                        const li = document.createElement('li');
                        li.textContent = player.username;
                        // Přidáme indikátor hostitele
                        if (player.id === roomData.hostId) {
                            li.textContent += ' (Host)';
                            li.style.fontWeight = 'bold';
                        }
                        lobbyPlayerList.appendChild(li);
                    });
                } else {
                    const li = document.createElement('li');
                    li.textContent = 'Žádní hráči v místnosti.';
                    lobbyPlayerList.appendChild(li);
                }
            }

            // Aktualizace nastavení hry v roomSettingsSection, pokud je klient hostitelem
            // To zajišťuje, že hostitel vidí aktuální nastavení i po jejich změně nebo po připojení jiných hráčů
            if (roomData.hostId === socket.id && roomData.gameSettings) {
                maxPlayersInput.value = roomData.gameSettings.numRounds || 3; // Používáme numRounds pro maxPlayersInput
                roundTimeInput.value = roomData.gameSettings.roundDuration || 30;
                buzzerDelayInput.value = roomData.gameSettings.buzzerDelay || 0;
                hostPlaysToggle.checked = roomData.gameSettings.hostPlays;
            }

            // Zde by se mohla implementovat logika pro přepínání sekcí na základě `gameState`
            // Například: pokud je `gameState` "ACTIVE_ROUND", přepni na herní obrazovku
            // if (roomData.gameState === 'ACTIVE_ROUND' && currentActiveSectionId !== 'gameplaySection') {
            //     showSection('gameplaySection');
            // } else if (roomData.gameState === 'LOBBY' && roomData.hostId === socket.id && currentActiveSectionId !== 'roomSettingsSection') {
            //     showSection('roomSettingsSection');
            // } else if (roomData.gameState === 'LOBBY' && roomData.hostId !== socket.id && currentActiveSectionId !== 'lobbySection') {
            //     showSection('lobbySection');
            // }
        }
    });

    // Událost, když je místnost zavřena (např. hostitelem nebo když odejde poslední hráč)
    socket.on('roomClosed', (message) => {
        console.log(`app.js: Místnost uzavřena: ${message}`);
        alert(message || 'Místnost byla zrušena.');
        currentRoomCode = null; // Vyčistíme kód místnosti
        showSection('homeSection'); // Vrátíme se na domovskou obrazovku
    });

    // Zde budou další Socket.IO listenery pro herní události (buzzerWinner, roundStarted, roundEnded atd.)
    // Tyto by se implementovaly, až budeš mít rozpracovanou herní logiku a UI pro ně.
    // socket.on('buzzerWinner', (winnerData) => { console.log('Bzučel:', winnerData.username); /* Aktualizuj UI vítěze */ });
    // socket.on('roundStarted', (roundNum, settings) => { console.log(`Kolo ${roundNum} začalo!`); /* Zobraz časovač, skryj bzučák */ });
    // socket.on('roundEnded', (roundNum, winner) => { console.log(`Kolo ${roundNum} skončilo. Vítěz: ${winner?.username || 'nikdo'}`); /* Zobraz výsledky kola */ });
    // socket.on('gameOver', () => { console.log('Hra skončila!'); /* Zobraz výsledky hry, nabídni reset */ });
    // socket.on('countdownStart', (time) => { console.log(`Kolo začne za ${time} sekund...`); /* Zobraz odpočet */ });
}); // Konec DOMContentLoaded