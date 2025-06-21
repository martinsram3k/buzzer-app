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
    }, 2000); 

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
function displayError(message) {
    console.error('Globální chyba:', message);
    //alert(message); // Pro ostré nasazení by se alert nepoužíval
    loginMessage.textContent = message; // Zobrazíme chybu ve formuláři
    loginMessage.style.color = 'var(--primary-color)'; // Červená barva
}