// client-web/js/app.js

// --- Reference na HTML elementy (Zajišťujeme, že elementy existují) ---
// Hlavní sekce aplikace
const homeSection = document.getElementById('homeSection');
const gameSection = document.getElementById('gameSection');
const accountSection = document.getElementById('accountSection');
const nameSection = document.getElementById('nameSection');
const lobbySection = document.getElementById('lobbySection');
const roomSettingsSection = document.getElementById('roomSettingsSection');
const gameplaySection = document.getElementById('gameplaySection'); // Nová sekce pro aktivní hru

// Speciální elementy pro načítání a navigaci
const loadingScreen = document.getElementById('loadingScreen');
const appContainer = document.getElementById('appContainer');
const navButtons = document.querySelectorAll('.nav-button');
const quickStartButton = document.getElementById('quickStartButton');
const quickStartAccount = document.getElementById('quickStartAccount');

const navTitle = document.querySelector('.top-nav .nav-title');
const navHome = document.querySelector('.top-nav .nav-home');
const bottomNav = document.querySelector('.bottom-nav');

// Elementy pro vstup a akce
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

// Reference pro elementy v lobbySection (pro hráče)
const lobbyRoomCode = document.getElementById('lobbyRoomCode');
const lobbyPlayerList = document.getElementById('lobbyPlayerList');
const leaveLobbyButton = document.getElementById('leaveLobbyButton');
const waitingForHostText = document.getElementById('waitingForHostText'); // Přidáno

// Reference pro elementy v roomSettingsSection (pro hostitele)
const settingsRoomCode = document.getElementById('settingsRoomCode');
const maxPlayersInput = document.getElementById('maxPlayers'); // Předpokládá se pro numRounds
const roundTimeInput = document.getElementById('roundTime');
const buzzerDelayInput = document.getElementById('buzzerDelay');
const hostPlaysToggle = document.getElementById('hostPlays'); // Změněno z hostPlays na hostPlaysToggle pro konzistenci
const updateSettingsButton = document.getElementById('updateSettingsButton');
const startGameButton = document.getElementById('startGameButton');
const closeRoomButton = document.getElementById('closeRoomButton');
const hostPlayerList = document.getElementById('hostPlayerList'); // Seznam hráčů pro hostitele (NOVÝ ELEMENT)
const qrCodeContainer = document.getElementById('qrCodeContainer'); // OPRAVENO: ID elementu pro QR kód

// Reference pro elementy v gameplaySection
const currentRoundDisplay = document.getElementById('currentRoundDisplay');
const gameStateMessage = document.getElementById('gameStateMessage');
const countdownDisplay = document.getElementById('countdownDisplay');
const buzzButton = document.getElementById('buzzButton');
const winnerDisplay = document.getElementById('winnerDisplay');
const nextRoundButton = document.getElementById('nextRoundButton');
const newGameButton = document.getElementById('newGameButton');
const leaveGameButton = document.getElementById('leaveGameButton'); // Tlačítko pro opuštění hry během aktivní fáze

const darkModeToggle = document.getElementById('darkModeToggle');


// --- Globální stavové proměnné ---
let currentActiveSectionId = null; // ID aktuálně aktivní sekce
let isShifted = false; // Stav pro posun horní a dolní navigace
let html5QrCode = null; // Instance HTML5-QR kód čtečky
let gameMode = null; // Ukládá herní režim ('join' nebo 'create')
let currentRoomCode = null; // Pro uložení kódu místnosti (získaného ze serveru)
let currentRoomState = null; // Ukládá aktuální stav místnosti ze serveru (z roomState události)
// let qrCodeInstance = null; // Tato proměnná již není potřeba pro klientské generování QR kódu

const sectionHistory = []; // Historie navštívených sekcí pro funkci zpět

// URL vašeho backend serveru pro generování QR kódů
// ZMĚŇTE TUTO URL na skutečnou URL vašeho Render serveru!
const QR_BACKEND_URL = 'https://buzzer-app-t20g.onrender.com/generate_qr'; // PŘÍKLAD! AKTUALIZUJTE TOTO!


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
    const shouldNavBeShifted = (newSectionId === 'nameSection' || newSectionId === 'lobbySection' || newSectionId === 'roomSettingsSection' || newSectionId === 'gameplaySection');

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

    // Vyčištění QR kódu, pokud opouštíme roomSettingsSection
    if (newSectionId !== 'roomSettingsSection') { // Není potřeba kontrolovat qrCodeInstance, stačí vyčistit
        if (qrCodeContainer) qrCodeContainer.innerHTML = ''; 
        qrCodeContainer.classList.add('hidden'); 
        console.log('QR kód vyčištěn, protože jsme opustili roomSettingsSection.');
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


// --- Funkce pro generování QR kódu z backendu ---
/**
 * Generuje QR kód voláním backendu a zobrazí ho v určeném kontejneru.
 * @param {string} dataText Data, která mají být zakódována do QR kódu (např. kód místnosti).
 */
async function generateQRCode(dataText) {
    console.log('generateQRCode called with data:', dataText);
    console.log('qrCodeContainer element:', qrCodeContainer);

    // Nejdříve vyčistíme předchozí obsah kontejneru
    if (qrCodeContainer) {
        qrCodeContainer.innerHTML = '';
        qrCodeContainer.classList.add('hidden'); // Skryjeme kontejner, dokud se obrázek nenačte
        qrCodeContainer.style.display = 'flex'; // Zajištění flex display pro centrování
    } else {
        console.error('Nelze generovat QR kód: Kontejner (qrCodeContainer) nebyl nalezen v DOM.');
        return;
    }

    // Vytvoříme element pro obrázek, který bude obsahovat QR kód
    const qrImage = document.createElement('img');
    qrImage.alt = 'QR Code';
    qrImage.style.maxWidth = '100%'; // Zajistí, že obrázek nepřeteče kontejner
    qrImage.style.height = 'auto';

    // Přidáme loading spinner
    const spinner = document.createElement('div');
    spinner.className = 'spinner'; // Použijte existující styl spinneru
    qrCodeContainer.appendChild(spinner);
    qrCodeContainer.classList.remove('hidden'); // Zobrazíme kontejner se spinnerem

    try {
        const response = await fetch(`${QR_BACKEND_URL}?text=${encodeURIComponent(dataText)}`);
        if (!response.ok) {
            throw new Error(`HTTP chyba! Status: ${response.status}`);
        }
        const data = await response.json();

        if (data.qr_code_image) {
            qrImage.src = `data:image/png;base64,${data.qr_code_image}`;
            qrImage.onload = () => {
                // Po načtení obrázku odstraníme spinner a zobrazíme obrázek
                qrCodeContainer.innerHTML = ''; // Vyčistíme spinner
                qrCodeContainer.appendChild(qrImage);
                qrCodeContainer.classList.remove('hidden'); // Zobrazíme kontejner s QR kódem
                console.log('QR kód z backendu úspěšně zobrazen.');
            };
            qrImage.onerror = () => {
                console.error('Chyba při načítání QR kódu z base64 dat.');
                qrCodeContainer.innerHTML = '<p style="color: red;">Chyba: Nelze načíst QR kód.</p>';
            };
        } else {
            console.error('Odpověď z backendu neobsahuje qr_code_image.');
            qrCodeContainer.innerHTML = '<p style="color: red;">Chyba: QR kód nebyl vygenerován.</p>';
        }
    } catch (error) {
        console.error('Chyba při volání backendu pro QR kód:', error);
        qrCodeContainer.innerHTML = `<p style="color: red;">Chyba generování QR kódu: ${error.message}</p>`;
    } finally {
        // Ujistíme se, že spinner je odstraněn i v případě chyby
        if (spinner.parentNode === qrCodeContainer) {
            spinner.remove();
        }
    }
}


// --- Funkce pro aktualizaci UI lobby sekce (pro hostitele i hráče) ---
/**
 * Aktualizuje seznam hráčů a další informace v lobby UI.
 * @param {object} roomData Objekt s daty místnosti ze serveru.
 */
function updateLobbyUI(roomData) {
    if (!roomData) return;

    // Aktualizace pro hostitele (roomSettingsSection)
    // Zde by se měl aktualizovat seznam hráčů a nastavení v roomSettingsSection
    if (roomData.hostId === socket.id) {
        if (hostPlayerList) {
            hostPlayerList.innerHTML = ''; // Vyčistíme seznam hráčů
            roomData.players.forEach(player => {
                const li = document.createElement('li');
                li.classList.add('player-item'); // Přidáme třídu pro styling

                // Jméno hráče
                const playerNameSpan = document.createElement('span');
                playerNameSpan.textContent = player.username;
                if (player.id === roomData.hostId) {
                    playerNameSpan.textContent += ' (Host)';
                    playerNameSpan.classList.add('player-host');
                }
                li.appendChild(playerNameSpan);

                // Tlačítko pro vyhození hráče (pouze pokud to není hostitel)
                if (player.id !== roomData.hostId) {
                    const kickButton = document.createElement('button');
                    kickButton.textContent = 'Vykopnout';
                    kickButton.classList.add('kick-button');
                    kickButton.addEventListener('click', () => {
                        // Potvrzení před vykopnutím
                        if (confirm(`Opravdu chcete vykopnout hráče ${player.username}?`)) {
                            window.kickPlayer(player.id); // Voláme funkci z socketService.js
                        }
                    });
                    li.appendChild(kickButton);
                }
                hostPlayerList.appendChild(li);
            });
        }
        if (settingsRoomCode) {
            settingsRoomCode.textContent = roomData.roomId;
        }

        // Aktualizuj nastavení UI podle dat ze serveru (pro případ, že je hostitel znovu načte)
        if (roomData.gameSettings) {
            maxPlayersInput.value = roomData.gameSettings.numRounds; // Předpokládá se, že maxPlayers je pro numRounds
            roundTimeInput.value = roomData.gameSettings.roundDuration;
            buzzerDelayInput.value = roomData.gameSettings.buzzerDelay;
            hostPlaysToggle.checked = roomData.gameSettings.hostPlays;
        }

        // Zobraz nebo skryj tlačítko "Start Game" na základě počtu hráčů
        // Pokud hostitel nehraje, potřebuje alespoň 2 hráče (hostitel + 1 další)
        // Pokud hostitel hraje, potřebuje alespoň 1 hráče (sám sebe)
        const requiredPlayers = roomData.gameSettings.hostPlays ? 1 : 2;
        if (startGameButton) {
             if (roomData.players.length >= requiredPlayers) {
                startGameButton.disabled = false;
                startGameButton.classList.remove('disabled');
            } else {
                startGameButton.disabled = true;
                startGameButton.classList.add('disabled');
            }
        }
        // Zobrazíme QR kód, pokud je hostitel a je v roomSettingsSection
        if (currentActiveSectionId === 'roomSettingsSection') {
            generateQRCode(roomData.roomId);
        } else {
            qrCodeContainer.classList.add('hidden'); // Skryjeme QR kód, pokud nejsme v roomSettingsSection
        }

    } 
    // Aktualizace pro hráče (lobbySection)
    else { // if (roomData.hostId !== socket.id)
        if (lobbyPlayerList) {
            lobbyPlayerList.innerHTML = '';
            roomData.players.forEach(player => {
                const li = document.createElement('li');
                li.textContent = player.username;
                if (player.id === roomData.hostId) {
                    li.textContent += ' (Host)';
                    li.classList.add('player-host');
                }
                lobbyPlayerList.appendChild(li);
            });
        }
        if (lobbyRoomCode) {
            lobbyRoomCode.textContent = roomData.roomId;
        }

        // Skrýt text "Čekání na hostitele", pokud hra začala
        if (waitingForHostText) {
            if (roomData.gameState === 'LOBBY') {
                waitingForHostText.classList.remove('hidden');
            } else {
                waitingForHostText.classList.add('hidden');
            }
        }
        qrCodeContainer.classList.add('hidden'); // Skryjeme QR kód pro hráče
    }
}

// --- Funkce pro aktualizaci UI herní sekce ---
function updateGameplayUI(roomData) {
    if (!roomData) return;

    currentRoundDisplay.textContent = `Kolo ${roomData.currentRound} / ${roomData.gameSettings.numRounds}`;

    // Skryj všechna akční tlačítka a texty, pak zobraz ty relevantní
    countdownDisplay.classList.add('hidden');
    buzzButton.classList.add('hidden');
    winnerDisplay.classList.add('hidden');
    nextRoundButton.classList.add('hidden');
    newGameButton.classList.add('hidden');
    leaveGameButton.classList.remove('hidden'); // Leave Game je vždy viditelné v herní sekci

    buzzButton.disabled = true; // Výchozí stav je vypnuto

    switch (roomData.gameState) {
        case 'COUNTDOWN':
            gameStateMessage.textContent = `Hra začíná za...`;
            countdownDisplay.textContent = roomData.countdownTime;
            countdownDisplay.classList.remove('hidden');
            break;
        case 'ACTIVE_ROUND':
            gameStateMessage.textContent = 'Bzučte!';
            buzzButton.classList.remove('hidden');
            buzzButton.disabled = false; // Povolí bzučák
            // Pokud hostitel nehraje, vypne bzučák pro něj
            if (roomData.hostId === socket.id && !roomData.gameSettings.hostPlays) {
                buzzButton.disabled = true;
                buzzButton.classList.add('disabled');
            } else {
                buzzButton.classList.remove('disabled');
            }

            break;
        case 'ROUND_END':
            if (roomData.winner) {
                gameStateMessage.textContent = `Kolo skončilo! Vítěz: ${roomData.winner.username}`;
                winnerDisplay.textContent = `První bzučel: ${roomData.winner.username}`;
                winnerDisplay.classList.remove('hidden');
            } else {
                gameStateMessage.textContent = 'Kolo skončilo (čas vypršel).';
                winnerDisplay.textContent = 'Nikdo nebzučel.';
                winnerDisplay.classList.remove('hidden');
            }
            buzzButton.disabled = true; // Zakaž bzučák po konci kola

            // Tlačítko pro další kolo pro hostitele
            if (currentRoomState && currentRoomState.hostId === socket.id && currentRoomState.currentRound < currentRoomState.gameSettings.numRounds) {
                nextRoundButton.classList.remove('hidden');
            }
            break;
        case 'GAME_OVER':
            gameStateMessage.textContent = 'Hra skončila!';
            winnerDisplay.textContent = 'Děkujeme za hru!'; // Můžeš přidat celkové skóre
            winnerDisplay.classList.remove('hidden');
            buzzButton.disabled = true;

            // Tlačítko pro novou hru pro hostitele
            if (currentRoomState && currentRoomState.hostId === socket.id) {
                newGameButton.classList.remove('hidden');
            }
            break;
        default:
            gameStateMessage.textContent = 'Čekání na hru...';
            buzzButton.disabled = true;
            break;
    }
}


// --- window.onload Event Listener (Změněno z DOMContentLoaded) ---
// Zajišťuje, že kód se spustí až po načtení celého DOM a všech zdrojů.
window.onload = () => {
    console.log('window.onload: Všechny zdroje načteny, DOM je připraven.');

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
                numRounds: parseInt(maxPlayersInput.value) || 3, // Používáme maxPlayersInput pro numRounds
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

    // --- POSLUCHAČ PRO TLAČÍTKO "Leave Room" v lobbySection (pro hráče) ---
    if (leaveLobbyButton) {
        leaveLobbyButton.addEventListener('click', () => {
            console.log('app.js: Tlačítko "Leave Room" kliknuto.');
            if (currentRoomCode) {
                window.leaveRoom(currentRoomCode); // Informujeme server, že opouštíme místnost
                currentRoomCode = null; // Vyčistíme lokální kód místnosti
                // showSection('gameSection'); // Vrátíme se na herní sekci (výběr join/create)
                // Pošle nás to na home, pokud to server neresetuje
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
                // showSection('gameSection'); // Vrátíme se na herní sekci
                // Pošle nás to na home, pokud to server neresetuje
            }
        });
    }

    // --- POSLUCHAČ PRO TLAČÍTKO "Buzz" v gameplaySection ---
    if (buzzButton) {
        buzzButton.addEventListener('click', () => {
            console.log('app.js: Tlačítko "Bzučet!" kliknuto.');
            window.buzz();
        });
    }

    // --- POSLUCHAČ PRO TLAČÍTKO "Next Round" v gameplaySection (pro hostitele) ---
    if (nextRoundButton) {
        nextRoundButton.addEventListener('click', () => {
            console.log('app.js: Tlačítko "Další Kolo" kliknuto.');
            if (currentRoomCode) {
                window.startNextRound(currentRoomCode);
            }
        });
    }

    // --- POSLUCHAČ PRO TLAČÍTKO "New Game" v gameplaySection (pro hostitele) ---
    if (newGameButton) {
        newGameButton.addEventListener('click', () => {
            console.log('app.js: Tlačítko "Nová Hra" kliknuto.');
            if (currentRoomCode) {
                window.resetGame(currentRoomCode); // Resetuje hru do lobby
            }
        });
    }

    // --- POSLUCHAČ PRO TLAČÍTKO "Leave Game" v gameplaySection ---
    if (leaveGameButton) {
        leaveGameButton.addEventListener('click', () => {
            console.log('app.js: Tlačítko "Opustit Hru" kliknuto.');
            if (currentRoomCode) {
                window.leaveRoom(currentRoomCode);
                currentRoomCode = null;
                // UI se resetuje přes roomClosed nebo disconnect event
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
        // generateQRCode(roomId); // Původní volání, které bylo přesunuto do updateLobbyUI
    });

    // Událost od serveru po úspěšném připojení k místnosti
    socket.on('roomJoined', (roomId) => {
        console.log(`app.js: Úspěšně připojeno k místnosti! Kód: ${roomId}`);
        currentRoomCode = roomId; // Uložíme kód místnosti
        playerNameInput.value = ''; // Vyčisti jméno po odeslání
        if (lobbyRoomCode) {
            lobbyRoomCode.textContent = roomId; // Zobraz kód místnosti v lobby
        }
        // Rozhodni, zda jsi hostitel, pro správnou sekci
        // (Serverová událost 'roomState' nám řekne, kdo je hostitel)
        // Prozatím přepni na lobby, a roomState to upřesní
        showSection('lobbySection');
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
        currentRoomState = roomData; // Uložíme si aktuální stav místnosti

        // Aktualizujeme UI podle aktuálního stavu místnosti, pokud je to pro naši aktivní místnost
        if (roomData && roomData.roomId === currentRoomCode) { 
            // Zkontrolujeme, zda je uživatel hostitel nebo hráč
            const isCurrentUserHost = roomData.hostId === socket.id;

            // Logika pro přepínání sekcí na základě `gameState`
            if (roomData.gameState === 'LOBBY') {
                if (isCurrentUserHost && currentActiveSectionId !== 'roomSettingsSection') {
                    showSection('roomSettingsSection');
                } else if (!isCurrentUserHost && currentActiveSectionId !== 'lobbySection') {
                    showSection('lobbySection');
                }
                updateLobbyUI(roomData); // Aktualizuje UI lobby (seznam hráčů, nastavení pro hostitele)
            } else if (roomData.gameState === 'COUNTDOWN' || roomData.gameState === 'ACTIVE_ROUND' || roomData.gameState === 'ROUND_END' || roomData.gameState === 'GAME_OVER') {
                // Přepne na herní obrazovku, pokud se hra aktivně hraje nebo skončila
                if (currentActiveSectionId !== 'gameplaySection') {
                    showSection('gameplaySection');
                }
                updateGameplayUI(roomData); // Aktualizuje UI herní obrazovky
            }
        }
    });

    // Událost, když je místnost zavřena (např. hostitelem nebo když odejde poslední hráč)
    socket.on('roomClosed', (message) => {
        console.log(`app.js: Místnost uzavřena: ${message}`);
        alert(message || 'Místnost byla zrušena.');
        currentRoomCode = null; // Vyčistíme kód místnosti
        currentRoomState = null; // Vyčistíme stav místnosti
        showSection('homeSection'); // Vrátíme se na domovskou obrazovku
        if (qrCodeContainer) { // Vyčistíme QR kód
            qrCodeContainer.innerHTML = ''; 
            qrCodeContainer.classList.add('hidden'); // Skryjeme kontejner
        }
    });

    // Událost, když je vykopnut hráč
    socket.on('playerKicked', (username) => {
        console.log(`app.js: Hráč ${username} byl vykopnut.`);
        alert(`${username} byl vykopnut z místnosti.`);
        // UI by se mělo aktualizovat přes roomState
    });

    // Událost, když začne odpočet před kolem
    socket.on('countdownStart', (time) => {
        console.log(`app.js: Kolo začne za ${time} sekund...`);
        // Aktualizuje odpočet na obrazovce
        countdownDisplay.textContent = time;
        countdownDisplay.classList.remove('hidden');
        gameStateMessage.textContent = 'Hra začíná za...';
        buzzButton.disabled = true; // Zakaž bzučák během odpočtu
        buzzButton.classList.add('disabled');
    });

    // Událost, když začne kolo
    socket.on('roundStarted', (roundNum, settings) => {
        console.log(`app.js: Kolo ${roundNum} začalo!`);
        currentRoundDisplay.textContent = `Kolo ${roundNum} / ${settings.numRounds}`;
        gameStateMessage.textContent = 'Bzučte!';
        countdownDisplay.classList.add('hidden');
        buzzButton.classList.remove('hidden');
        // Povol bzučák, pokud hostitel hraje nebo jsi hráč
        if (currentRoomState.hostId === socket.id && !settings.hostPlays) {
            buzzButton.disabled = true;
            buzzButton.classList.add('disabled');
        } else {
            buzzButton.disabled = false;
            buzzButton.classList.remove('disabled');
        }
        winnerDisplay.classList.add('hidden'); // Skryj případného vítěze z minulého kola
        nextRoundButton.classList.add('hidden');
        newGameButton.classList.add('hidden');
    });

    // Událost, když někdo bzučí a je vítěz kola
    socket.on('buzzerWinner', (winnerData) => {
        console.log(`app.js: Vítěz bzučení v kole: ${winnerData.username}`);
        gameStateMessage.textContent = `Vítěz kola: ${winnerData.username}!`;
        winnerDisplay.textContent = `První bzučel: ${winnerData.username}`;
        winnerDisplay.classList.remove('hidden');
        buzzButton.disabled = true; // Zakaž bzučák, dokud hostitel nespustí další kolo/hru
        buzzButton.classList.add('disabled');
    });

    // Událost, když kolo skončí (čas vypršel nebo někdo bzučel)
    socket.on('roundEnded', (roundNum, winner) => {
        console.log(`app.js: Kolo ${roundNum} skončilo.`);
        if (!winner) {
            gameStateMessage.textContent = 'Kolo skončilo! Nikdo nebzučel.';
            winnerDisplay.textContent = 'Nikdo nebzučel.';
            winnerDisplay.classList.remove('hidden');
        }
        buzzButton.disabled = true; // Zakaž bzučák
        buzzButton.classList.add('disabled');

        // Pokud je hostitel a nejsou všechna kola odehrána, zobraz "Další Kolo"
        if (currentRoomState && currentRoomState.hostId === socket.id && currentRoomState.currentRound < currentRoomState.gameSettings.numRounds) {
            nextRoundButton.classList.remove('hidden');
        }
    });

    // Událost, když celá hra skončí
    socket.on('gameOver', () => {
        console.log('app.js: Hra skončila!');
        gameStateMessage.textContent = 'Hra skončila!';
        winnerDisplay.textContent = 'Děkujeme za hru!'; // Zde můžeš přidat konečné skóre
        winnerDisplay.classList.remove('hidden');
        buzzButton.disabled = true;
        buzzButton.classList.add('disabled');
        nextRoundButton.classList.add('hidden'); // Skryj tlačítko pro další kolo

        // Pokud je hostitel, zobraz "Nová Hra"
        if (currentRoomState && currentRoomState.hostId === socket.id) {
            newGameButton.classList.remove('hidden');
        }
    });

    // Událost pro reset bzučáku (server to posílá, když je potřeba vyčistit stav bzučáku)
    socket.on('buzzerReset', () => {
        console.log('app.js: Buzzer resetován.');
        winnerDisplay.classList.add('hidden'); // Skryj vítěze
        // Pokud je v aktivním kole, znovu povol bzučák
        if (currentRoomState && currentRoomState.gameState === 'ACTIVE_ROUND') {
             if (currentRoomState.hostId === socket.id && !currentRoomState.gameSettings.hostPlays) {
                buzzButton.disabled = true; // Hostitel nehraje
                buzzButton.classList.add('disabled');
            } else {
                buzzButton.disabled = false;
                buzzButton.classList.remove('disabled');
            }
        }
    });


    socket.on('disconnect', () => {
        console.log('app.js: Odpojeno od serveru.');
        alert('Byl jsi odpojen od serveru. Zkus se připojit znovu.');
        currentRoomCode = null;
        currentRoomState = null;
        showSection('homeSection'); // Vrátíme se na domovskou obrazovku
        if (qrCodeContainer) { // Vyčistíme QR kód
            qrCodeContainer.innerHTML = ''; 
            qrCodeContainer.classList.add('hidden'); // Skryjeme kontejner
        }
    });

}; // Konec window.onload
