// client-web/js/app.js

// --- Reference na HTML elementy ---
const homeSection = document.getElementById('homeSection');
const gameSection = document.getElementById('gameSection');
const accountSection = document.getElementById('accountSection');

const loadingScreen = document.getElementById('loadingScreen');
const mainWrapper = document.querySelector('.main-wrapper'); // Obal pro všechny sekce
const bottomNav = document.querySelector('.bottom-nav'); // Spodní navigace

// Navigační tlačítka
const navButtons = document.querySelectorAll('.nav-button'); 

// --- Globální proměnné stavu ---
let socketInitialized = false; 
let currentActiveSection = 'homeSection';

// --- Funkce pro přepínání sekcí ---
/**
 * Zobrazí konkrétní sekci a skryje všechny ostatní.
 * Aktualizuje také aktivní stav navigačního tlačítka, jeho ikony a textu.
 * @param {string} sectionId ID HTML elementu sekce, který se má zobrazit (např. 'homeSection').
 */
function showSection(sectionId) {
    console.log(`showSection: Pokus o zobrazení sekce: ${sectionId}`);

    const allSections = [homeSection, gameSection, accountSection];
    
    // Skryjeme všechny sekce
    allSections.forEach(section => {
        if (section) {
            section.classList.add('hidden');
        }
    });

    // Zobrazíme požadovanou sekci
    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
        targetSection.classList.remove('hidden');
        currentActiveSection = sectionId;
        console.log(`showSection: Sekce '${sectionId}' zobrazena.`);
    } else {
        console.warn(`showSection: Sekce s ID '${sectionId}' nebyla nalezena v DOMu.`);
        return;
    }

    // --- LOGIKA PRO AKTIVNÍ STAV NAVIGAČNÍCH TLAČÍTEK, TEXTŮ A IKON ---
    // Projdeme všechna navigační tlačítka a resetujeme jejich stav na neaktivní
    navButtons.forEach(button => {
        const navText = button.querySelector('.nav-text');
        const navIcon = button.querySelector('.nav-icon');
        
        // Odebereme 'active' třídu z textu
        if (navText) {
            navText.classList.remove('active');
        }
        // Odebereme 'active' třídu z ikony
        if (navIcon) {
            navIcon.classList.remove('active');
        }
        // Odebereme 'active' třídu z celého tlačítka
        button.classList.remove('active'); 
    });
    console.log('showSection: Všechny navigační texty, ikony a tlačítka resetovány (odebrána třída active).');

    // Nyní najdeme aktivní tlačítko a nastavíme mu správný stav
    const activeButton = document.querySelector(`.nav-button[data-section="${sectionId}"]`);
    if (activeButton) {
        const activeNavText = activeButton.querySelector('.nav-text');
        const activeNavIcon = activeButton.querySelector('.nav-icon');

        // Přidáme 'active' třídu k textu aktivního tlačítka
        if (activeNavText) {
            activeNavText.classList.add('active');
            console.log(`showSection: Nav-text pro '${sectionId}' označen jako aktivní.`);
        }

        // Přidáme 'active' třídu k ikonce aktivního tlačítka
        if (activeNavIcon) {
            activeNavIcon.classList.add('active');
            console.log(`showSection: Ikona pro '${sectionId}' označen jako aktivní.`);
        }
        // Přidáme 'active' třídu k celému tlačítku (pro případné další styly)
        activeButton.classList.add('active');
    } else {
        console.warn(`showSection: Nav-button pro data-section="${sectionId}" nebyl nalezen.`);
    }
    // --- KONEC LOGIKY PRO AKTIVNÍ STAV ---

    if (sectionId === 'gameSection' && !socketInitialized) {
        console.log('app.js: První přechod na herní sekci. Inicializuji herní logiku...');
        socketInitialized = true;
    }
}

// --- Funkce pro skrytí loading screenu a zobrazení obsahu ---
function hideLoadingScreen() {
    if (loadingScreen) {
        loadingScreen.classList.add('fade-out');
        // Po skončení animace fade-out odstraníme loadingScreen z DOMu
        loadingScreen.addEventListener('transitionend', () => {
            loadingScreen.style.display = 'none';
        }, { once: true }); // Zajistíme, že posluchač se spustí jen jednou
    }

    // Zobrazíme hlavní obsah aplikace
    if (mainWrapper) mainWrapper.classList.add('visible-content');
    if (bottomNav) bottomNav.classList.add('visible-content');

    // Inicializujeme první zobrazení sekce (např. Home)
    showSection('homeSection');
    console.log('Aplikace je načtena a připravena.');
}

// --- Nastavení posluchačů událostí ---
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOMContentLoaded: DOM je načten.');

    // --- Simulace načítání aplikace ---
    // V reálné aplikaci by zde byla volání API, inicializace modulů atd.
    // Jakmile je vše hotovo, zavolá se hideLoadingScreen().
    setTimeout(() => {
        hideLoadingScreen();
    }, 1000); // Simulace načítání 2 sekundy. Můžeš to upravit.

    // Přidání posluchačů pro navigační tlačítka (zůstává stejné)
    if (navButtons.length > 0) {
        navButtons.forEach(button => {
            button.addEventListener('click', (event) => {
                console.log('DOMContentLoaded: Kliknutí na navigační tlačítko detekováno!', event.currentTarget);
                const sectionId = button.dataset.section;
                if (sectionId) {
                    console.log(`DOMContentLoaded: data-section atribut: ${sectionId}`);
                    showSection(sectionId);
                } else {
                    console.warn('DOMContentLoaded: Kliknuté tlačítko nemá data-section atribut.');
                }
            });
        });
    } else {
        console.error('DOMContentLoaded: Nebyla nalezena žádná navigační tlačítka s třídou "nav-button". Zkontrolujte HTML.');
    }
});

// --- Příklad globálních pomocných funkcí ---
function displayError(message) {
    console.error('Globální chyba:', message);
    alert(message);
}