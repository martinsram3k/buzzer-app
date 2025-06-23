// client-web/js/app.js

// --- Reference na HTML elementy ---
const homeSection = document.getElementById('homeSection');
const gameSection = document.getElementById('gameSection');
const accountSection = document.getElementById('accountSection');
const loadingScreen = document.getElementById('loadingScreen');
const appContainer = document.getElementById('appContainer');
const navButtons = document.querySelectorAll('.nav-button'); // Všechna navigační tlačítka v dolní liště
const quickStartButton = document.getElementById('quickStartButton'); // Tlačítko pro rychlý start na Home sekci
const quickStartAccount = document.getElementById('quickStartAccount'); // Tlačítko pro rychlý start na Home sekci

// --- Reference na HTML elementy pro horní a dolní navigaci a jejich animaci ---
const navTitle = document.querySelector('.top-nav .nav-title'); // Titulek v horní navigaci
const navHome = document.querySelector('.top-nav .nav-home');   // Ikona domů v horní navigaci
const bottomNav = document.querySelector('.bottom-nav');         // Celá dolní navigace

// --- Globální proměnné stavu ---
let currentActiveSectionId = null;

// Pro animaci horní navigace (sledování stavu, pokud by byla volána manuálně nebo přes interval)
let isShifted = false;

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

    // --- LOGIKA PRO AKTIVNÍ STAV NAVIGAČNÍCH TLAČÍTEK (dolní navigace) ---
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

    // Speciální logika pro Account sekci (již není potřeba aktualizovat UI pro přihlášení)
    // Protože Account sekce už nebude mít přihlašovací formulář,
    // nemusíme volat updateAccountSectionUI().
}

// --- Funkce pro animaci horní navigace (lze volat manuálně) ---
/**
 * Posune navTitle, zobrazí/skryje navHome a skryje/zobrazí bottomNav.
 * Ovládá se střídáním CSS tříd 'shifted' a 'visible'.
 */
function animateTopNav() {
    // Zajištění, že všechny potřebné elementy existují
    if (navTitle && navHome && bottomNav) {
        if (!isShifted) {
            // Aktivujeme animaci: posun titulku, zobrazení ikony domu, skrytí dolní navigace
            navTitle.classList.add('shifted');
            navHome.classList.add('visible'); // CSS se postará o animaci opacity
            bottomNav.classList.add('shifted'); // CSS se postará o posun dolní navigace
            console.log('Navigace: Horní posunuto, Home ikona viditelná, Dolní navigace skryta.');
        } else {
            // Deaktivujeme animaci: vrátí titulek, skryje ikonu domu, zobrazí dolní navigaci
            navTitle.classList.remove('shifted');
            navHome.classList.remove('visible'); // CSS se postará o animaci opacity
            bottomNav.classList.remove('shifted'); // CSS se postará o posun dolní navigace
            console.log('Navigace: Vráceno do výchozího stavu.');
        }
        isShifted = !isShifted; // Přepne stav pro další iteraci
    } else {
        console.warn('animateTopNav: Některé elementy (navTitle, navHome nebo bottomNav) nebyly nalezeny pro animaci.');
    }
}

// --- Funkce pro spuštění postupné animace navigačních tlačítek ---
/**
 * Spustí animaci "poskakování" pro každé navigační tlačítko v dolní navigaci
 * postupně s malým zpožděním. Animace proběhne jen jednou (dle CSS).
 * @param {number} delayBetweenButtons Zpoždění (v ms) mezi spuštěním animace pro každé tlačítko.
 */
function startStaggeredNavButtonAnimation(delayBetweenButtons = 200) {
    if (navButtons.length === 0) {
        console.warn('startStaggeredNavButtonAnimation: Žádná navigační tlačítka nebyla nalezena.');
        return;
    }

    navButtons.forEach((button, index) => {
        // Použijeme setTimeout k postupnému přidávání animační třídy
        setTimeout(() => {
            // Přidáme třídu, která spustí jednorázovou animaci poskakování
            button.classList.add('nav-button-hop');
            console.log(`Tlačítko ${button.dataset.section || index} začalo poskakovat.`);

            // Po dokončení animace (což je dáno CSS 'animation-iteration-count: 1')
            // by se třída měla automaticky odebrat, aby bylo možné animaci spustit znovu.
            button.addEventListener('animationend', () => {
                button.classList.remove('nav-button-hop');
            }, { once: true }); // Listener se spustí jen jednou
        }, index * delayBetweenButtons); // Zpoždění je násobkem indexu tlačítka
    });
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

// --- Nastavení posluchačů událostí ---
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOMContentLoaded: DOM je načten.');

    // Při načtení DOMu spustíme simulaci loading screenu
    // A po něm se zobrazí appContainer a Home sekce
    setTimeout(() => {
        hideLoadingScreen();
    }, 200);

    // --- ZDE ZAČÍNÁ BLOK PRO AUTOMATICKOU ANIMACI HORNÍ/DOLNÍ NAVIGACE ---
    // Pokud nechceš, aby se animace spouštěla automaticky každou sekundu,
    // zakomentuj následující řádek (přidej // na začátek).
    // Příklad: // let autoAnimateInterval = setInterval(animateTopNav, 1000);
    let autoAnimateInterval = setInterval(animateTopNav, 5000); // Spustí animaci každou 1 sekundu (1000 ms)
    console.log('Interval pro automatickou animaci navigace spuštěn.');
    // --- ZDE KONČÍ BLOK PRO AUTOMATICKOU ANIMACI HORNÍ/DOLNÍ NAVIGACE ---


    // --- ZDE ZAČÍNÁ BLOK PRO POSTUPNOU ANIMACI DOLNÍCH NAVIGAČNÍCH TLAČÍTEK ---
    // Pokud nechceš, aby se tato animace spouštěla automaticky při načtení,
    // zakomentuj následující řádek (přidej // na začátek).
    // Příklad: // startStaggeredNavButtonAnimation(200);
    startStaggeredNavButtonAnimation(200); // Spustí postupnou animaci tlačítek s 200ms zpožděním
    console.log('Postupná animace dolních navigačních tlačítek spuštěna.');
    // --- ZDE KONČÍ BLOK PRO POSTUPNOU ANIMACI DOLNÍCH NAVIGAČNÍCH TLAČÍTEK ---


    // Přidání posluchačů pro navigační tlačítka (dolní navigace)
    if (navButtons.length > 0) {
        navButtons.forEach(button => {
            button.addEventListener('click', (event) => {
                const sectionId = button.dataset.section;
                if (sectionId) {
                    showSection(sectionId);
                    // Odebereme animaci "poskakování" ze všech navigačních tlačítek po kliknutí
                    // Tím se zajistí, že se animace zastaví po interakci.
                    navButtons.forEach(btn => btn.classList.remove('nav-button-hop'));
                    console.log('Navigační tlačítko kliknuto: Animace "poskakování" odstraněna ze všech tlačítek.');
                }
            });
        });
    }

    // --- Posluchače pro Quick Actions tlačítka ---
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
            showSection('homeSection'); // Přepne na domovskou sekci
            console.log('NavHome kliknuto: Přepínám na homeSection.');
        });
    }

    // Funkce displayMessage a displayError již nejsou potřeba, protože nejsou spojeny s přihlašováním.
    // Byly odebrány.
});

// --- Pomocné funkce (displayMessage a displayError jsou odebrány) ---