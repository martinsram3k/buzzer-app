// client-web/js/app.js

// --- Reference na HTML elementy ---
const homeSection = document.getElementById('homeSection');
const gameSection = document.getElementById('gameSection');
const accountSection = document.getElementById('accountSection');
const nameSection = document.getElementById('nameSection');
const loadingScreen = document.getElementById('loadingScreen');
const appContainer = document.getElementById('appContainer');
const navButtons = document.querySelectorAll('.nav-button');
const quickStartButton = document.getElementById('quickStartButton');
const quickStartAccount = document.getElementById('quickStartAccount');

const navTitle = document.querySelector('.top-nav .nav-title');
const navHome = document.querySelector('.top-nav .nav-home');
const bottomNav = document.querySelector('.bottom-nav');

// NOVÁ REFERENCE PRO TLAČÍTKO VYMAZÁNÍ PINU
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


// --- Globální proměnné stavu ---
let currentActiveSectionId = null;
let isShifted = false;
let html5QrCode = null;

// Pole pro ukládání historie navštívených sekcí
const sectionHistory = [];


// --- Funkce pro přepínání sekcí ---
/**
 * Zobrazí konkrétní sekci a skryje všechny ostatní.
 * Používá CSS třídy 'active' pro plynulé přechody.
 * @param {string} newSectionId ID HTML elementu sekce, který se má zobrazit (např. 'homeSection').
 * @param {boolean} isBackNavigation Indikuje, zda se jedná o navigaci zpět (default false).
 */
function showSection(newSectionId, isBackNavigation = false) {
    if (newSectionId === currentActiveSectionId) {
        console.log(`showSection: Sekce '${newSectionId}' je již aktivní, přeskočím.`);
        return;
    }

    console.log(`showSection: Přepínám ze sekce '${currentActiveSectionId || 'žádná'}' na '${newSectionId}'. Je to návrat: ${isBackNavigation}`);

    // --- Správa historie sekcí ---
    if (!isBackNavigation) {
        // Přidáme aktuální sekci do historie POUZE pokud to není ta samá sekce, na které už jsme
        // a pokud to není ta samá sekce jako poslední v historii (aby se zabránilo duplicitám při opakovaném klikání).
        if (currentActiveSectionId && (sectionHistory.length === 0 || sectionHistory[sectionHistory.length - 1] !== currentActiveSectionId)) {
            sectionHistory.push(currentActiveSectionId);
        }
    }
    // Pokud je isBackNavigation true, historie je již upravena funkcí goBack().

    console.log(`showSection: Aktuální historie před nastavením nové sekce: ${sectionHistory.join(' -> ')}`);


    const oldActiveSection = document.getElementById(currentActiveSectionId);
    const newActiveSection = document.getElementById(newSectionId);

    // Skryj starou aktivní sekci
    if (oldActiveSection) {
        oldActiveSection.classList.remove('active');
        console.log(`showSection: Odebrána třída 'active' ze staré sekce '${currentActiveSectionId}'.`);
    }

    // Zobraz novou sekci
    if (newActiveSection) {
        newActiveSection.classList.add('active');
        currentActiveSectionId = newSectionId; // Aktualizuj ID aktivní sekce.
        console.log(`showSection: Sekce '${newSectionId}' zobrazena. Nová currentActiveSectionId: ${currentActiveSectionId}`);
    } else {
        console.warn(`showSection: Nová sekce s ID '${newSectionId}' nebyla nalezena v DOMu.`);
    }

    // --- LOGIKA PRO NAVIGAČNÍ ANIMACE (Horní a Dolní navigace) ---
    // Definuje, pro které sekce má být horní navigace posunuta a dolní skryta.
    // Přidali jsme 'accountSection', aby se navigace posunula i tam, pokud to tak chceš.
    const shouldNavBeShifted = (newSectionId === 'nameSection' || newSectionId === 'accountSection');

    if (shouldNavBeShifted && !isShifted) {
        animateTopNav();
        if (bottomNav) bottomNav.classList.add('shifted');
        console.log('showSection: Přejito do sekce vyžadující posun, navigace posunuta.');
    } else if (!shouldNavBeShifted && isShifted) {
        animateTopNav();
        if (bottomNav) bottomNav.classList.remove('shifted');
        console.log('showSection: Přejito do sekce nevyžadující posun, navigace vrácena.');
    }
    // Pokud je stav už správný, nic neděláme.

    // --- LOGIKA PRO AKTIVNÍ STAV NAVIGAČNÍCH TLAČÍTEK (dolní navigace) ---
    navButtons.forEach(button => {
        const navText = button.querySelector('.nav-text');
        const navIcon = button.querySelector('.nav-icon');

        if (navText) navText.classList.remove('active');
        if (navIcon) navIcon.classList.remove('active');
        button.classList.remove('active');
    });

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
        if (!isShifted) {
            navTitle.classList.add('shifted');
            navHome.classList.add('visible');
            console.log('Navigace: Horní posunuto, Home ikona viditelná.');
        } else {
            navTitle.classList.remove('shifted');
            navHome.classList.remove('visible');
            console.log('Navigace: Vráceno do výchozího stavu.');
        }
        isShifted = !isShifted;
    } else {
        console.warn('animateTopNav: Některé elementy (navTitle nebo navHome) nebyly nalezeny pro animaci.');
    }
}

// --- Funkce pro spuštění postupné animace dolních navigačních tlačítek ---
function startStaggeredNavButtonAnimation(delayBetweenButtons = 200) {
    if (navButtons.length === 0) {
        console.warn('startStaggeredNavButtonAnimation: Žádná navigační tlačítka nebyla nalezena.');
        return;
    }

    navButtons.forEach((button, index) => {
        setTimeout(() => {
            button.classList.add('nav-button-hop');
            console.log(`Tlačítko ${button.dataset.section || index} začalo poskakovat.`);
            button.addEventListener('animationend', () => {
                button.classList.remove('nav-button-hop');
            }, { once: true });
        }, index * delayBetweenButtons);
    });
}

// --- Funkce pro navigaci zpět ---
/**
 * Naviguje na předchozí sekci v historii.
 * Pokud není žádná předchozí sekce (nebo jen homeSection), zůstane na homeSection.
 */
function goBack() {
    // Pokud je v historii více než jedna položka (tj. můžeme jít zpět)
    if (sectionHistory.length > 0) {
        const previousSectionId = sectionHistory.pop(); // Odebereme poslední (předchozí) sekci z historie
        console.log(`goBack: Naviguji zpět na '${previousSectionId}'. Aktuální historie: ${sectionHistory.join(' -> ')}`);
        showSection(previousSectionId, true); // Zobrazíme předchozí sekci a označíme to jako "návrat"
    } else {
        // Pokud je historie prázdná, nebo obsahuje jen jednu položku (home),
        // zůstaneme na homeSection.
        console.log('goBack: Historie je prázdná nebo na začátku. Zůstávám na homeSection.');
        showSection('homeSection', true);
    }
}


// --- Funkce pro zobrazení/skrytí QR Overlaye ---
function toggleQrOverlay(show) {
    if (qrOverlay) {
        if (show) {
            qrOverlay.classList.add('active');
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
        loadingScreen.classList.add('fade-out');
        loadingScreen.addEventListener('transitionend', () => {
            loadingScreen.style.display = 'none';
        }, { once: true });
    }

    if (appContainer) {
        appContainer.classList.remove('hidden-app-content');
        appContainer.classList.add('visible-app-content');
        console.log('appContainer is visible.');
    }

    // Automaticky zobrazíme Home sekci po skrytí loading screenu.
    // Tato první sekce se automaticky přidá do historie uvnitř showSection.
    setTimeout(() => {
        showSection('homeSection');
    }, 100);

    console.log('Aplikace je načtena a připravena.');
}

// --- Nastavení posluchačů událostí ---
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOMContentLoaded: DOM je načten.');

    setTimeout(() => {
        hideLoadingScreen();
    }, 200);


    

    // Volitelné automatické animace navigace (zakomentováno)
    /* let autoAnimateInterval = setInterval(animateTopNav, 1000);
    console.log('Interval pro automatickou animaci navigace spuštěn.'); */

    // Volitelná animace poskakování tlačítek (spuštěno)
    startStaggeredNavButtonAnimation(200);
    console.log('Postupná animace dolních navigačních tlačítek spuštěna.');

    // Posluchače pro navigační tlačítka (dolní navigace)
    if (navButtons.length > 0) {
        navButtons.forEach(button => {
            button.addEventListener('click', (event) => {
                const sectionId = button.dataset.section;
                if (sectionId) {
                    showSection(sectionId);
                    navButtons.forEach(btn => btn.classList.remove('nav-button-hop'));
                    console.log('Navigační tlačítko kliknuto: "Hopping" animace odstraněna.');
                }
            });
        });
    }

        // --- LISTENER PRO TLAČÍTKO VYMAZÁNÍ TEXTAREA ---
        if (clearGameCodeButton) {
            clearGameCodeButton.addEventListener('click', () => {
                if (joinGameCodeInput) {
                    joinGameCodeInput.value = ''; // Vyprázdní textarea
                    console.log('Textarea joinGameCodeInput vyprázdněna.');
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

    // Listener pro ikonu domů v horní navigaci (nyní jako tlačítko zpět)
    if (navHome) {
        navHome.addEventListener('click', () => {
            goBack();
            console.log('NavHome kliknuto: Pokus o návrat zpět.');
        });
    }

    // LISTENER PRO QR KÓD IKONU
    if (qrCodeScanIcon) {
        qrCodeScanIcon.addEventListener('click', () => {
            console.log('QR Code ikona kliknuta. Spouštím QR skener overlay.');
            toggleQrOverlay(true);

            if (!html5QrCode) {
                html5QrCode = new Html5Qrcode("qr-reader");
            }

            html5QrCode.start(
                { facingMode: "environment" },
                { fps: 10, qrbox: { width: 250, height: 250 } },
                (decodedText, decodedResult) => {
                    console.log(`QR kód naskenován: ${decodedText}`);
                    qrReaderResultsDiv.textContent = `Naskenováno: ${decodedText}`;
                    joinGameCodeInput.value = decodedText;

                    html5QrCode.stop().then(() => {
                        console.log('QR čtečka zastavena po úspěšném skenování.');
                        toggleQrOverlay(false);
                    }).catch((err) => {
                        console.error('Chyba při zastavování QR čtečky po skenování:', err);
                        toggleQrOverlay(false);
                    });
                },
                (errorMessage) => {
                    // console.warn(`Chyba skenování: ${errorMessage}`);
                }
            ).catch((err) => {
                console.error(`Chyba při spouštění QR čtečky: ${err}`);
                qrReaderResultsDiv.textContent = `Chyba: ${err.message || err}`;
                toggleQrOverlay(false);
            });
        });
    }

    // LISTENER PRO TLAČÍTKO ZAVŘÍT V OVERLAYI
    if (qrOverlayCloseButton) {
        qrOverlayCloseButton.addEventListener('click', () => {
            console.log('Tlačítko zavřít overlay kliknuto.');
            if (html5QrCode && html5QrCode.isScanning) {
                html5QrCode.stop().then(() => {
                    console.log('QR čtečka zastavena ručně.');
                    toggleQrOverlay(false);
                }).catch((err) => {
                    console.error('Chyba při zastavování QR čtečky ručně:', err);
                    toggleQrOverlay(false);
                });
            } else {
                toggleQrOverlay(false);
            }
        });
    }

    // LISTENER PRO TLAČÍTKO "Join" (na gameSection)
    if (joinGameButton) {
        joinGameButton.addEventListener('click', () => {
            console.log('Tlačítko Join Game kliknuto. Přepínám na nameSection.');
            showSection('nameSection');
        });
    }

    // LISTENER PRO TLAČÍTKO "Pokračovat" (na nameSection)
    if (submitNameButton) {
        submitNameButton.addEventListener('click', () => {
            const playerName = playerNameInput.value.trim();
            if (playerName) {
                console.log(`Jméno hráče zadáno: ${playerName}.`);
                // Po zadání jména se vrátíme zpět na herní sekci (příklad).
                goBack(); // Toto by mělo uživatele vrátit na gameSection, odkud přišel.
            } else {
                alert('Prosím, zadej své jméno!');
            }
        });
    }

    

}); // Konec DOMContentLoaded