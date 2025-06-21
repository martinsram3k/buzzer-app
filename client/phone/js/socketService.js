// client-web/js/socketService.js

// Zde specifikujeme URL tvého nasazeného serveru na Renderu.
// Je DŮLEŽITÉ, aby tato URL odpovídala adrese, kde běží tvůj backend.
const SOCKET_SERVER_URL = "https://buzzer-app-t20g.onrender.com";

// Inicializace Socket.IO klienta s explicitní URL
const socket = io(SOCKET_SERVER_URL, {
    // Volitelné: Vynutí websocket jako primární transport.
    // Může pomoci při některých síťových konfiguracích nebo proxy serverech.
    transports: ['websocket']
});

// --- Posluchači základních Socket.IO událostí ---

// Událost: Klient se úspěšně připojil k serveru
socket.on('connect', () => {
    console.log('Socket.IO: Připojeno k serveru!', socket.id);
    // Zde můžeš volat funkci pro zobrazení zprávy uživateli, např.
    // displayMessage('Připojeno k serveru.');
});

// Událost: Klient se odpojil od serveru
socket.on('disconnect', () => {
    console.log('Socket.IO: Odpojeno od serveru.');
    // displayMessage('Odpojeno od serveru.');
});

// Událost: Došlo k chybě při připojování k serveru
socket.on('connect_error', (err) => {
    console.error('Socket.IO: Chyba připojení:', err.message);
    // Zobraz chybovou zprávu uživateli
    displayError('Chyba připojení k serveru: ' + err.message + '. Zkuste to prosím později.');
});


// --- Posluchače událostí souvisejících s přihlášením ---

// Událost: Server posílá odpověď na pokus o přihlášení
socket.on('loginResponse', (response) => {
    console.log('Přijata odpověď na přihlášení:', response);

    if (response.success) {
        // Přihlášení bylo úspěšné
        isAuthenticated = true; // Aktualizujeme globální stav v app.js
        currentUsername = response.username; // Uložíme uživatelské jméno

        // Uložíme stav přihlášení a jméno uživatele do localStorage
        // To zajistí, že uživatel zůstane přihlášen i po obnovení stránky
        localStorage.setItem('isAuthenticated', 'true');
        localStorage.setItem('username', response.username);

        displayMessage(`Vítejte, ${response.username}! Úspěšné přihlášení.`);
        
        // Aktualizujeme uživatelské rozhraní v Account sekci
        // Tato funkce je definována v app.js
        updateAccountSectionUI(); 
        
        // Po úspěšném přihlášení přesměrujeme uživatele na Home sekci
        // Tato funkce je definována v app.js
        showSection('homeSection'); 
    } else {
        // Přihlášení selhalo
        isAuthenticated = false; // Nastavíme stav na odhlášeno
        currentUsername = null; // Vymažeme jméno uživatele

        // Vymažeme uložené přihlašovací údaje z localStorage
        localStorage.removeItem('isAuthenticated');
        localStorage.removeItem('username');

        // Zobrazíme chybovou zprávu uživateli
        displayError(`Chyba přihlášení: ${response.message}`);
        
        // Aktualizujeme uživatelské rozhraní, aby se zobrazil přihlašovací formulář
        updateAccountSectionUI(); 
    }
});

// --- Důležité: Poznámka k proměnným 'isAuthenticated', 'currentUsername',
//              'displayMessage', 'displayError', 'updateAccountSectionUI', 'showSection' ---
// Tyto proměnné/funkce jsou definovány v 'app.js'.
// Aby byly dostupné zde v 'socketService.js', ujisti se, že 'socketService.js' je
// načten v HTML **před** 'app.js', NEBO že jsou tyto proměnné
// explicitně "exponovány" z 'app.js' do globálního scope (což už děláš tím,
// že je nedeklaruješ jako 'const'/'let' uvnitř úzce vymezených funkcí),
// nebo že 'socketService.js' tyto funkce/proměnné přijímá jako parametry.
// Současné nastavení (načtení socketService.js PŘED app.js) by fungovalo tak,
// že app.js přepisuje ty globální proměnné, což je potenciálně matoucí.
// Nejlepší je, aby app.js importoval socketService a předával funkce.
// Prozatím předpokládáme, že global scope funguje, jak očekáváno díky pořadí načítání.