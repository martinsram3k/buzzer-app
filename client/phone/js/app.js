// client-web/js/app.js

// --- Reference na HTML elementy ---
// Tyto konstanty uchovávají odkazy na důležité HTML elementy,
// abychom s nimi mohli snadno manipulovat v JavaScriptu.
const homeSection = document.getElementById('homeSection');
const gameSection = document.getElementById('gameSection');
const accountSection = document.getElementById('accountSection');
const loadingScreen = document.getElementById('loadingScreen');
const appContainer = document.getElementById('appContainer');
const navButtons = document.querySelectorAll('.nav-button'); // Všechna navigační tlačítka v dolní liště
const quickStartButton = document.getElementById('quickStartButton'); // Tlačítko pro rychlý start na Home sekci
const quickStartAccount = document.getElementById('quickStartAccount'); // Tlačítko pro rychlý start na Home sekci

// Reference pro horní a dolní navigaci a jejich animaci
const navTitle = document.querySelector('.top-nav .nav-title');   // Titulek v horní navigaci
const navHome = document.querySelector('.top-nav .nav-home');     // Ikona domů v horní navigaci
const bottomNav = document.querySelector('.bottom-nav');           // Celá dolní navigace

// Reference pro QR skener a související elementy
const qrCodeScanIcon = document.getElementById('qrCodeScanIcon');  // Ikona pro spuštění QR skeneru
const qrReaderDiv = document.getElementById('qr-reader');          // Div, kde se zobrazí video ze skeneru
const qrReaderResultsDiv = document.getElementById('qr-reader-results'); // Div pro zobrazení naskenovaného výsledku
const joinGameCodeInput = document.getElementById('joinGameCode'); // Textarea pro vložení herního PINu/QR kódu
const qrOverlay = document.getElementById('qr-overlay');           // Hlavní overlay element pro skener
const qrOverlayCloseButton = document.getElementById('qrOverlayCloseButton'); // Tlačítko pro zavření overlaye

// --- Globální proměnné stavu ---
// Tyto proměnné udržují aktuální stav aplikace nebo animací.
let currentActiveSectionId = null; // ID aktuálně zobrazené sekce
let isShifted = false;             // Stav pro animaci horní navigace (posunuto/neposunuto)
let html5QrCode = null;            // Instance QR čtečky, inicializována na null

// --- Funkce pro přepínání sekcí ---
/**
 * Zobrazí konkrétní sekci a skryje všechny ostatní.
 * Používá CSS třídy 'active' pro plynulé přechody.
 * @param {string} newSectionId ID HTML elementu sekce, který se má zobrazit (např. 'homeSection').
 */
function showSection(newSectionId) {
    if (newSectionId === currentActiveSectionId) {
        console.log(`showSection: Sekce '${newSectionId}' je již aktivní, přeskočím.`);
        return; // Sekce je již aktivní, nic neděláme.
    }

    console.log(`showSection: Přepínám ze sekce '${currentActiveSectionId || 'žádná'}' na '${newSectionId}'.`);

    const oldActiveSection = document.getElementById(currentActiveSectionId);
    const newActiveSection = document.getElementById(newSectionId);

    // Skryjeme starou aktivní sekci odebráním třídy 'active'.
    if (oldActiveSection) {
        oldActiveSection.classList.remove('active');
        console.log(`showSection: Odebrána třída 'active' ze staré sekce '${currentActiveSectionId}'.`);
    }

    // Zobrazíme novou sekci přidáním třídy 'active'.
    if (newActiveSection) {
        newActiveSection.classList.add('active');
        currentActiveSectionId = newSectionId; // Aktualizujeme ID aktivní sekce.
        console.log(`showSection: Sekce '${newSectionId}' zobrazena.`);
    } else {
        console.warn(`showSection: Nová sekce s ID '${newSectionId}' nebyla nalezena v DOMu.`);
    }

    // --- LOGIKA PRO AKTIVNÍ STAV NAVIGAČNÍCH TLAČÍTEK (dolní navigace) ---
    // Aktualizujeme vizuální stav dolních navigačních tlačítek (text a ikona),
    // aby odrážely aktuálně zobrazenou sekci.
    navButtons.forEach(button => {
        const navText = button.querySelector('.nav-text');
        const navIcon = button.querySelector('.nav-icon');

        // Odebereme 'active' stav ze všech tlačítek, ikon a textů.
        if (navText) {
            navText.classList.remove('active');
        }
        if (navIcon) {
            navIcon.classList.remove('active');
        }
        button.classList.remove('active');
    });

    // Přidáme 'active' stav na tlačítko, které odpovídá nové aktivní sekci.
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
}

// --- Funkce pro animaci horní navigace (lze volat manuálně nebo intervalem) ---
/**
 * Přepíná vizuální stav horní navigace (titulek se posune, ikona domů se objeví/zmizí)
 * a zároveň skryje/zobrazí dolní navigaci.
 */
function animateTopNav() {
    // Zajištění, že všechny potřebné elementy existují, než s nimi manipulujeme.
    if (navTitle && navHome && bottomNav) {
        if (!isShifted) {
            // Aktivujeme animaci: posun titulku, zobrazení ikony domů, skrytí dolní navigace.
            navTitle.classList.add('shifted');
            navHome.classList.add('visible');      // CSS se postará o animaci opacity.
            bottomNav.classList.add('shifted');    // CSS se postará o posun dolní navigace.
            console.log('Navigace: Horní posunuto, Home ikona viditelná, Dolní navigace skryta.');
        } else {
            // Deaktivujeme animaci: vrátí titulek, skryje ikonu domů, zobrazí dolní navigaci.
            navTitle.classList.remove('shifted');
            navHome.classList.remove('visible');   // CSS se postará o animaci opacity.
            bottomNav.classList.remove('shifted'); // CSS se postará o posun dolní navigace.
            console.log('Navigace: Vráceno do výchozího stavu.');
        }
        isShifted = !isShifted; // Přepne stav pro další iteraci animace.
    } else {
        console.warn('animateTopNav: Některé elementy (navTitle, navHome nebo bottomNav) nebyly nalezeny pro animaci.');
    }
}

// --- Funkce pro spuštění postupné animace dolních navigačních tlačítek ---
/**
 * Spustí animaci "poskakování" pro každé navigační tlačítko v dolní navigaci
 * postupně s malým zpožděním. Animace proběhne jen jednou (dle CSS 'animation-iteration-count: 1').
 * @param {number} delayBetweenButtons Zpoždění (v ms) mezi spuštěním animace pro každé tlačítko (výchozí 200ms).
 */
function startStaggeredNavButtonAnimation(delayBetweenButtons = 200) {
    if (navButtons.length === 0) {
        console.warn('startStaggeredNavButtonAnimation: Žádná navigační tlačítka nebyla nalezena.');
        return;
    }

    navButtons.forEach((button, index) => {
        // Použijeme setTimeout k postupnému přidávání animační třídy s delayem.
        setTimeout(() => {
            button.classList.add('nav-button-hop'); // Přidá třídu, která spustí animaci.
            console.log(`Tlačítko ${button.dataset.section || index} začalo poskakovat.`);

            // Po dokončení jednorázové animace (dle CSS) odstraníme třídu,
            // aby bylo možné animaci v budoucnu spustit znovu, pokud by to bylo potřeba.
            button.addEventListener('animationend', () => {
                button.classList.remove('nav-button-hop');
            }, { once: true }); // Listener se spustí jen jednou pro danou animaci.
        }, index * delayBetweenButtons); // Zpoždění se zvyšuje s indexem tlačítka.
    });
}

// --- Funkce pro zobrazení/skrytí QR Overlaye ---
/**
 * Zobrazí nebo skryje QR skener overlay.
 * Používá CSS třídu 'active' pro plynulé zobrazení/skrytí.
 * @param {boolean} show True pro zobrazení overlaye, false pro skrytí.
 */
function toggleQrOverlay(show) {
    if (qrOverlay) {
        if (show) {
            qrOverlay.classList.add('active'); // Zobrazí overlay pomocí CSS třídy.
            // Resetuje výsledky při otevření overlaye
            if (qrReaderResultsDiv) qrReaderResultsDiv.textContent = '';
            // Resetuje input
            if (joinGameCodeInput) joinGameCodeInput.value = '';
        } else {
            qrOverlay.classList.remove('active'); // Skryje overlay.
        }
    }
}

// --- Funkce pro skrytí loading screenu a zobrazení obsahu aplikace ---
/**
 * Skryje úvodní načítací obrazovku a zobrazí hlavní obsah aplikace.
 */
function hideLoadingScreen() {
    if (loadingScreen) {
        loadingScreen.classList.add('fade-out'); // Spustí CSS fade-out animaci.
        // Po dokončení animace (transitionend) element skryjeme úplně.
        loadingScreen.addEventListener('transitionend', () => {
            loadingScreen.style.display = 'none';
        }, { once: true }); // Zajistí, že event listener se spustí jen jednou.
    }

    // Zobrazíme celý kontejner aplikace odebráním 'hidden-app-content' a přidáním 'visible-app-content'.
    if (appContainer) {
        appContainer.classList.remove('hidden-app-content');
        appContainer.classList.add('visible-app-content');
        console.log('appContainer je viditelný.');
    }

    // Po skrytí loading screenu automaticky zobrazíme Home sekci.
    setTimeout(() => {
        showSection('homeSection');
    }, 100);

    console.log('Aplikace je načtena a připravena.');
}

// --- Nastavení posluchačů událostí ---
// Tato sekce se spustí, jakmile je celý DOM dokument načten.
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOMContentLoaded: DOM je načten.');

    // Při načtení DOMu spustíme simulaci loading screenu.
    // Po krátké prodlevě se zobrazí appContainer a Home sekce.
    setTimeout(() => {
        hideLoadingScreen();
    }, 200);

    // --- ZDE ZAČÍNÁ BLOK PRO AUTOMATICKOU ANIMACI HORNÍ/DOLNÍ NAVIGACE ---
    // Tento kód automaticky přepíná stav horní a dolní navigace každou sekundu.
    // Můžeš jej snadno zakomentovat (přidáním // na začátek řádku), pokud jej nechceš.
    // Příklad zakomentování: // let autoAnimateInterval = setInterval(animateTopNav, 1000);
  /*   let autoAnimateInterval = setInterval(animateTopNav, 1000); // Spustí animaci každou 1 sekundu (1000 ms).
    console.log('Interval pro automatickou animaci navigace spuštěn.'); */
    // --- ZDE KONČÍ BLOK PRO AUTOMATICKOU ANIMACI HORNÍ/DOLNÍ NAVIGACE ---


    // --- ZDE ZAČÍNÁ BLOK PRO POSTUPNOU ANIMACI DOLNÍCH NAVIGAČNÍCH TLAČÍTEK ---
    // Tento kód spustí jednorázovou, postupnou animaci poskakování dolních navigačních tlačítek.
    // Můžeš jej snadno zakomentovat (přidáním // na začátek řádku), pokud jej nechceš.
    // Příklad zakomentování: // startStaggeredNavButtonAnimation(200);
    startStaggeredNavButtonAnimation(200); // Spustí postupnou animaci tlačítek s 200ms zpožděním mezi každým.
    console.log('Postupná animace dolních navigačních tlačítek spuštěna.');
    // --- ZDE KONČÍ BLOK PRO POSTUPNOU ANIMACI DOLNÍCH NAVIGAČNÍCH TLAČÍTEK ---


    // Přidání posluchačů pro navigační tlačítka (dolní navigace)
    if (navButtons.length > 0) {
        navButtons.forEach(button => {
            button.addEventListener('click', (event) => {
                const sectionId = button.dataset.section;
                if (sectionId) {
                    showSection(sectionId);
                    // Odebereme animaci "poskakování" ze všech navigačních tlačítek po kliknutí,
                    // aby se zajistilo, že se animace zastaví po uživatelské interakci.
                    navButtons.forEach(btn => btn.classList.remove('nav-button-hop'));
                    console.log('Navigační tlačítko kliknuto: Animace "poskakování" odstraněna ze všech tlačítek.');
                }
            });
        });
    }

    // --- Posluchače pro Quick Actions tlačítka (na Home sekci) ---
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

    // --- Posluchač pro ikonu domů v horní navigaci (nav-home) ---
    if (navHome) {
        navHome.addEventListener('click', () => {
            showSection('homeSection'); // Přepne na domovskou sekci po kliknutí.
            console.log('NavHome kliknuto: Přepínám na homeSection.');
        });
    }

    // --- POSLUCHAČ PRO QR KÓD IKONU (spuštění skeneru v overlayi) ---
    if (qrCodeScanIcon) {
        qrCodeScanIcon.addEventListener('click', () => {
            console.log('QR Code ikona kliknuta. Spouštím QR skener overlay.');
            toggleQrOverlay(true); // Zobrazíme overlay.

            // Pokud instance čtečky ještě neexistuje, vytvoříme ji.
            if (!html5QrCode) {
                html5QrCode = new Html5Qrcode("qr-reader");
            }

            // Spustíme skenování.
            html5QrCode.start(
                { facingMode: "environment" }, // Preferuje zadní kameru (pro mobilní zařízení).
                {
                    fps: 10,    // Počet snímků za sekundu pro analýzu videa.
                    qrbox: { width: 250, height: 250 } // Velikost čtecího rámečku.
                },
                (decodedText, decodedResult) => {
                    // Callback pro úspěšné naskenování QR kódu.
                    console.log(`QR kód naskenován: ${decodedText}`);
                    qrReaderResultsDiv.textContent = `Naskenováno: ${decodedText}`; // Zobrazí výsledek.
                    joinGameCodeInput.value = decodedText; // Vloží naskenovaný text do inputu.

                    // Po úspěšném naskenování zastavíme čtečku a zavřeme overlay.
                    html5QrCode.stop().then(() => {
                        console.log('QR čtečka zastavena po úspěšném skenování.');
                        toggleQrOverlay(false); // Skryjeme overlay.
                    }).catch((err) => {
                        console.error('Chyba při zastavování QR čtečky po skenování:', err);
                        toggleQrOverlay(false); // Skryjeme overlay i při chybě zastavení.
                    });
                },
                (errorMessage) => {
                    // Callback pro chyby během skenování (např. žádný QR kód nenalezen).
                    // Toto logování může být velmi časté, takže je často zakomentováno
                    // nebo použito jen pro hlubší ladění.
                    // console.warn(`Chyba skenování: ${errorMessage}`);
                }
            ).catch((err) => {
                // Zachycení chyb při spouštění samotné čtečky (např. uživatel nepovolil kameru).
                console.error(`Chyba při spouštění QR čtečky: ${err}`);
                qrReaderResultsDiv.textContent = `Chyba: ${err.message || err}`; // Informuje uživatele o chybě.
                toggleQrOverlay(false); // Skryjeme overlay při chybě spuštění.
            });
        });
    }

    // --- POSLUCHAČ PRO ZAVÍRACÍ TLAČÍTKO V OVERLAYI ---
    if (qrOverlayCloseButton) {
        qrOverlayCloseButton.addEventListener('click', () => {
            console.log('Zavírací tlačítko overlaye kliknuto.');
            // Pokud čtečka běží, zastavíme ji.
            if (html5QrCode && html5QrCode.isScanning) {
                html5QrCode.stop().then(() => {
                    console.log('QR čtečka zastavena ručně.');
                    toggleQrOverlay(false); // Skryjeme overlay.
                }).catch((err) => {
                    console.error('Chyba při zastavování QR čtečky ručně:', err);
                    toggleQrOverlay(false); // Skryjeme overlay i při chybě zastavení.
                });
            } else {
                toggleQrOverlay(false); // Pokud čtečka neběžela, jen skryjeme overlay.
            }
        });
    }
});