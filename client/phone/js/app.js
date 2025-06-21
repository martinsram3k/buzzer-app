// client-web/js/app.js

// --- Reference na HTML elementy ---
const homeSection = document.getElementById('homeSection');
const gameSection = document.getElementById('gameSection');
const accountSection = document.getElementById('accountSection');

const loadingScreen = document.getElementById('loadingScreen');
const appContainer = document.getElementById('appContainer'); 

// Navigační tlačítka
const navButtons = document.querySelectorAll('.nav-button'); 

// --- Globální proměnné stavu ---
let socketInitialized = false; 
let currentActiveSectionId = null; // Změnil jsem výchozí hodnotu na null, bude nastavena prvním voláním showSection

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

    // Důležité: Tady poprvé zavoláme showSection pro 'homeSection'
    // Použijeme krátkou prodlevu, aby se stihl appContainer zobrazit.
    setTimeout(() => {
        showSection('homeSection');
    }, 250); 
    
    console.log('Aplikace je načtena a připravena.');
}

// --- Nastavení posluchačů událostí ---
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOMContentLoaded: DOM je načten.');

    // Při načtení DOMu spustíme simulaci loading screenu
    setTimeout(() => {
        hideLoadingScreen();
    }, 150); 

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
});

// --- Příklad globálních pomocných funkcí ---
function displayError(message) {
    console.error('Globální chyba:', message);
    alert(message);
}