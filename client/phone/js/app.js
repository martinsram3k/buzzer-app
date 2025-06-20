// client-web/js/app.js

// --- Reference na HTML elementy ---

// Sekce obsahu - tyto ID musí odpovídat ID ve vašem index.html
const homeSection = document.getElementById('homeSection');
const gameSection = document.getElementById('gameSection');
const accountSection = document.getElementById('accountSection');

// Navigační tlačítka - třída 'nav-button' musí být použita u tlačítek v bottom nav
const navButtons = document.querySelectorAll('.nav-button'); 

// --- Globální proměnné stavu ---
// Tyto proměnné budou řídit chování aplikace.
// Prozatím zjednodušeno pro demonstraci navigace.
let socketInitialized = false; // Příznak, zda byl Socket.IO již inicializován
let currentActiveSection = 'homeSection'; // ID aktuálně zobrazené sekce

// --- Funkce pro přepínání sekcí ---

/**
 * Zobrazí konkrétní sekci a skryje všechny ostatní.
 * Aktualizuje také aktivní stav navigačního tlačítka.
 * @param {string} sectionId ID HTML elementu sekce, který se má zobrazit (např. 'homeSection').
 */
function showSection(sectionId) {
    console.log(`showSection: Pokus o zobrazení sekce: ${sectionId}`); // LADÍCÍ ZPRÁVA

    // Ujistíme se, že všechny sekce jsou správně referencovány
    const allSections = [homeSection, gameSection, accountSection];
    
    // Skryjeme všechny sekce nejprve
    allSections.forEach(section => {
        if (section) { // Kontrola, zda element existuje
            section.classList.add('hidden');
            console.log(`showSection: Skryta sekce: ${section.id}`); // LADÍCÍ ZPRÁVA
        } else {
            console.warn('showSection: Reference na sekci je NULL nebo UNDEFINED.'); // LADÍCÍ ZPRÁVA
        }
    });

    // Zobrazíme požadovanou sekci
    const targetSection = document.getElementById(sectionId);
    if (targetSection) { // Kontrola, zda cílový element existuje
        targetSection.classList.remove('hidden');
        currentActiveSection = sectionId; // Aktualizujeme aktuálně aktivní sekci
        console.log(`showSection: Sekce '${sectionId}' zobrazena.`); // LADÍCÍ ZPRÁVA
    } else {
        console.warn(`showSection: Sekce s ID '${sectionId}' nebyla nalezena v DOMu.`); // LADÍCÍ ZPRÁVA
        return; // Ukončíme funkci, pokud sekce neexistuje
    }

    // Odebereme 'active' třídu ze všech navigačních tlačítek
    navButtons.forEach(button => button.classList.remove('active'));
    console.log('showSection: Všechny nav-buttons resetovány (odebrána třída active).'); // LADÍCÍ ZPRÁVA

    // Přidáme 'active' třídu k tlačítku, které odpovídá zobrazené sekci
    const activeButton = document.querySelector(`.nav-button[data-section="${sectionId}"]`);
    if (activeButton) {
        activeButton.classList.add('active');
        console.log(`showSection: Nav-button pro '${sectionId}' označen jako aktivní.`); // LADÍCÍ ZPRÁVA
    } else {
        console.warn(`showSection: Nav-button pro data-section="${sectionId}" nebyl nalezen.`); // LADÍCÍ ZPRÁVA
    }

    // Zde můžete přidat specifickou logiku, která se má spustit
    // při prvním přechodu na herní sekci (pro inicializaci Socket.IO apod.)
    if (sectionId === 'gameSection' && !socketInitialized) {
        console.log('app.js: První přechod na herní sekci. Inicializuji herní logiku...');
        // Zde byste obvykle volali funkci pro inicializaci Socket.IO a zobrazení první herní obrazovky (startScreen)
        // Příklad:
        // if (window.initializeGameSubScreens) { // Funkce, kterou budete muset přidat
        //     window.initializeGameSubScreens();
        // }
        // DŮLEŽITÉ: Ujistěte se, že `socketService.js` je načten PŘED `app.js` v HTML!
        // A že `io()` je voláno v `socketService.js` pro vytvoření `window.socket`.
        socketInitialized = true;
    }
}


// --- Nastavení posluchačů událostí ---

// Spustí se, jakmile se načte celý DOM
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOMContentLoaded: DOM je načten.'); // LADÍCÍ ZPRÁVA
    console.log('DOMContentLoaded: Počet nalezených navigačních tlačítek:', navButtons.length); // LADÍCÍ ZPRÁVA

    // Inicializace: Zobrazíme domovskou stránku při prvním načtení aplikace
    showSection('homeSection');

    // Přidáme posluchače událostí 'click' na všechna navigační tlačítka
    if (navButtons.length > 0) {
        navButtons.forEach(button => {
            button.addEventListener('click', (event) => {
                console.log('DOMContentLoaded: Kliknutí na navigační tlačítko detekováno!', event.currentTarget); // LADÍCÍ ZPRÁVA
                const sectionId = button.dataset.section; // Získá ID cílové sekce z atributu 'data-section'
                if (sectionId) {
                    console.log(`DOMContentLoaded: data-section atribut: ${sectionId}`); // LADÍCÍ ZPRÁVA
                    showSection(sectionId); // Zavolá funkci pro zobrazení dané sekce
                } else {
                    console.warn('DOMContentLoaded: Kliknuté tlačítko nemá data-section atribut.'); // LADÍCÍ ZPRÁVA
                }
            });
        });
    } else {
        console.error('DOMContentLoaded: Nebyla nalezena žádná navigační tlačítka s třídou "nav-button". Zkontrolujte HTML.'); // LADÍCÍ ZPRÁVA
    }
});


// --- Příklad globálních pomocných funkcí (pokud je potřebujete sdílet mezi sekcemi) ---
/**
 * Zobrazí dočasnou chybovou zprávu. Může být vylepšeno o sofistikovanější UI.
 * @param {string} message Chybová zpráva.
 */
function displayError(message) {
    // Tuto funkci byste pravděpodobně chtěli přizpůsobit tak,
    // aby se chybová zpráva zobrazovala v aktuálně aktivní sekci,
    // nebo v nějakém globálním notifikačním centru namísto `alert()`.
    console.error('Globální chyba:', message);
    alert(message); // Prozatím použijeme alert pro jednoduchost.
}

// Zde byste pak integrovali zbytek vaší herní logiky z předchozích verzí `app.js`.
// Ujistěte se, že všechny reference na HTML elementy jsou správné a jsou v rámci
// odpovídajících sekcí, nebo jsou globálně dostupné.
