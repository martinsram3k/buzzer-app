// client-web/js/app.js

// --- Reference na HTML elementy ---
const homeSection = document.getElementById('homeSection');
const gameSection = document.getElementById('gameSection');
const accountSection = document.getElementById('accountSection');
const loadingScreen = document.getElementById('loadingScreen');
const appContainer = document.getElementById('appContainer'); 
const navButtons = document.querySelectorAll('.nav-button'); 

// Reference pro přihlášení
const loginForm = document.getElementById('loginForm');
const usernameInput = document.getElementById('usernameInput');
const passwordInput = document.getElementById('passwordInput');
const loginMessage = document.getElementById('loginMessage');

// Nové reference pro registraci
const registerForm = document.getElementById('registerForm');
const regUsernameInput = document.getElementById('regUsernameInput');
const regPasswordInput = document.getElementById('regPasswordInput');
const regConfirmPasswordInput = document.getElementById('regConfirmPasswordInput');
const registerMessage = document.getElementById('registerMessage');

// Reference pro přepínání formulářů
const showRegisterFormLink = document.getElementById('showRegisterFormLink');
const showLoginFormLink = document.getElementById('showLoginFormLink');

// Reference pro přihlášený obsah
const loggedInContent = document.getElementById('loggedInContent');
const loggedInUsernameSpan = document.getElementById('loggedInUsername');
const logoutButton = document.getElementById('logoutButton');


// --- Globální proměnné stavu ---
let socketInitialized = false; 
let currentActiveSectionId = null;
let isAuthenticated = false; 
let currentUsername = null; 

// --- Funkce pro přepínání sekcí ---
// (Tato funkce zůstává stejná, ale přidáme logiku pro Account sekci)
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

    if (oldActiveSection) {
        oldActiveSection.classList.remove('active');
        console.log(`showSection: Odebrána třída 'active' ze staré sekce '${currentActiveSectionId}'.`);
    }

    if (newActiveSection) {
        newActiveSection.classList.add('active');
        currentActiveSectionId = newSectionId;
        console.log(`showSection: Sekce '${newSectionId}' zobrazena.`);
    } else {
        console.warn(`showSection: Nová sekce s ID '${newSectionId}' nebyla nalezena v DOMu.`);
    }

    navButtons.forEach(button => {
        const navText = button.querySelector('.nav-text');
        const navIcon = button.querySelector('.nav-icon');
        
        if (navText) {
            navText.classList.remove('active');
        }
        if (navIcon) {
            navIcon.classList.remove('active');
        }
        button.classList.remove('active'); 
    });

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

    // Speciální logika pro Account sekci: aktualizovat UI po každém zobrazení
    if (newSectionId === 'accountSection') {
        updateAccountSectionUI(); 
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

    if (appContainer) {
        appContainer.classList.remove('hidden-app-content');
        appContainer.classList.add('visible-app-content');
        console.log('appContainer je viditelný.');
    }

    setTimeout(() => {
        showSection('homeSection'); // Po načtení se automaticky zobrazí Home sekce
    }, 100); 
    
    console.log('Aplikace je načtena a připravena.');
}

// --- Funkce pro aktualizaci UI Account sekce podle stavu přihlášení ---
function updateAccountSectionUI() {
    if (isAuthenticated) {
        // Uživatel je přihlášen
        loginForm.classList.remove('active-form');
        loginForm.classList.add('hidden-form');
        registerForm.classList.remove('active-form');
        registerForm.classList.add('hidden-form');

        loggedInContent.style.display = 'flex'; // Zobrazíme obsah pro přihlášeného
        loggedInUsernameSpan.textContent = currentUsername; // Nastavíme jméno uživatele
    } else {
        // Uživatel není přihlášen, zobrazíme správný formulář
        loggedInContent.style.display = 'none'; // Skryjeme obsah pro přihlášeného
        loginMessage.textContent = ''; // Vyčistíme zprávy
        registerMessage.textContent = '';

        // Zobrazíme přihlašovací formulář, pokud nebylo explicitly požadováno zobrazení registrace
        if (!registerForm.classList.contains('active-form')) {
             loginForm.classList.add('active-form');
             loginForm.classList.remove('hidden-form');
             registerForm.classList.add('hidden-form');
             registerForm.classList.remove('active-form');
        }
       
        // Vyčistíme inputy
        usernameInput.value = '';
        passwordInput.value = '';
        regUsernameInput.value = '';
        regPasswordInput.value = '';
        regConfirmPasswordInput.value = '';
    }
}

// --- Funkce pro přihlášení ---
function loginUser(username, password) {
    loginMessage.textContent = 'Přihlašování...';
    loginMessage.classList.remove('error-message', 'success-message'); // Vyčistíme třídy
    socket.emit('login', { username, password }); 
    console.log(`Odesílám přihlašovací data pro uživatele: ${username}`);
}

// --- Funkce pro odhlášení ---
function logoutUser() {
    isAuthenticated = false;
    currentUsername = null;
    localStorage.removeItem('isAuthenticated'); 
    localStorage.removeItem('username'); 
    updateAccountSectionUI(); 
    displayMessage('Úspěšně odhlášeno.', 'success'); 
    showSection('homeSection'); 
    console.log('Uživatel odhlášen.');
}

// --- Funkce pro registraci ---
function registerUser(username, password, confirmPassword) {
    registerMessage.textContent = 'Registruji se...';
    registerMessage.classList.remove('error-message', 'success-message'); // Vyčistíme třídy

    // Klientská validace
    if (password !== confirmPassword) {
        displayMessage('Hesla se neshodují.', 'error', registerMessage);
        return;
    }
    if (password.length < 6) { // Příklad, minimální délka hesla
        displayMessage('Heslo musí mít alespoň 6 znaků.', 'error', registerMessage);
        return;
    }
    if (username.length < 3) { // Příklad, minimální délka jména
        displayMessage('Uživatelské jméno musí mít alespoň 3 znaky.', 'error', registerMessage);
        return;
    }

    // Odeslání na server
    socket.emit('register', { username, password }); // Odešleme uživatelské jméno a heslo
    console.log(`Odesílám registrační data pro uživatele: ${username}`);
}


// --- Funkce pro přepínání formulářů ---
function showRegisterForm() {
    loginForm.classList.remove('active-form');
    loginForm.classList.add('hidden-form');
    registerForm.classList.add('active-form');
    registerForm.classList.remove('hidden-form');
    loginMessage.textContent = ''; // Vyčistíme zprávu z přihlášení
    registerMessage.textContent = ''; // Vyčistíme zprávu z registrace
    usernameInput.value = '';
    passwordInput.value = '';
    console.log('Zobrazuji registrační formulář.');
}

function showLoginForm() {
    registerForm.classList.remove('active-form');
    registerForm.classList.add('hidden-form');
    loginForm.classList.add('active-form');
    loginForm.classList.remove('hidden-form');
    loginMessage.textContent = ''; // Vyčistíme zprávu
    registerMessage.textContent = ''; // Vyčistíme zprávu
    regUsernameInput.value = '';
    regPasswordInput.value = '';
    regConfirmPasswordInput.value = '';
    console.log('Zobrazuji přihlašovací formulář.');
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

    setTimeout(() => {
        hideLoadingScreen();
    }, 2000); 

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
            event.preventDefault(); 
            const username = usernameInput.value.trim();
            const password = passwordInput.value.trim();

            if (username && password) {
                loginUser(username, password);
            } else {
                displayMessage('Prosím, vyplňte obě pole.', 'error', loginMessage);
            }
        });
    }

    // Posluchač pro odeslání registračního formuláře
    if (registerForm) {
        registerForm.addEventListener('submit', (event) => {
            event.preventDefault();
            const username = regUsernameInput.value.trim();
            const password = regPasswordInput.value.trim();
            const confirmPassword = regConfirmPasswordInput.value.trim();

            if (username && password && confirmPassword) {
                registerUser(username, password, confirmPassword);
            } else {
                displayMessage('Prosím, vyplňte všechna pole.', 'error', registerMessage);
            }
        });
    }

    // Posluchač pro tlačítko odhlášení
    if (logoutButton) {
        logoutButton.addEventListener('click', logoutUser);
    }

    // Posluchače pro přepínání formulářů
    if (showRegisterFormLink) {
        showRegisterFormLink.addEventListener('click', (event) => {
            event.preventDefault();
            showRegisterForm();
        });
    }
    if (showLoginFormLink) {
        showLoginFormLink.addEventListener('click', (event) => {
            event.preventDefault();
            showLoginForm();
        });
    }
});

// --- Pomocná funkce pro zobrazení zpráv ---
// Tuto funkci jsme rozšířili, aby mohla přijímat typ zprávy a konkrétní element
function displayMessage(message, type = 'info', targetElement = loginMessage) {
    console.log(`Zpráva (${type}):`, message);
    if (targetElement) {
        targetElement.textContent = message;
        targetElement.classList.remove('error-message', 'success-message'); // Vyčistíme předchozí třídy
        if (type === 'error') {
            targetElement.classList.add('error-message');
        } else if (type === 'success') {
            targetElement.classList.add('success-message');
        }
    } else {
        console.warn('displayMessage: Target element for message not found.');
    }
}

// displayError je nyní alias pro displayMessage s typem 'error'
function displayError(message, targetElement = loginMessage) {
    displayMessage(message, 'error', targetElement);
}