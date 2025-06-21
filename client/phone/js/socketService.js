// client-web/js/socketService.js

const SOCKET_SERVER_URL = "https://buzzer-app-t20g.onrender.com"; 

const socket = io(SOCKET_SERVER_URL, {
    transports: ['websocket'] 
}); 

socket.on('connect', () => {
    console.log('Socket.IO: Připojeno k serveru!', socket.id);
});

socket.on('disconnect', () => {
    console.log('Socket.IO: Odpojeno od serveru.');
});

socket.on('connect_error', (err) => {
    console.error('Socket.IO: Chyba připojení:', err.message);
    displayError('Chyba připojení k serveru: ' + err.message + '. Zkuste to prosím později.');
});

// Posluchač pro odpověď na přihlášení (zůstává stejný)
socket.on('loginResponse', (response) => {
    console.log('Přijata odpověď na přihlášení:', response);
    if (response.success) {
        isAuthenticated = true;
        currentUsername = response.username;
        localStorage.setItem('isAuthenticated', 'true');
        localStorage.setItem('username', response.username);
        displayMessage(`Vítejte, ${response.username}! Úspěšné přihlášení.`, 'success', loginMessage); // Změna: přidán targetElement
        updateAccountSectionUI(); 
        showSection('homeSection'); 
    } else {
        isAuthenticated = false;
        currentUsername = null;
        localStorage.removeItem('isAuthenticated');
        localStorage.removeItem('username');
        displayError(`Chyba přihlášení: ${response.message}`, loginMessage); // Změna: přidán targetElement
        updateAccountSectionUI(); 
    }
});

// --- Nový posluchač pro odpověď na registraci ---
socket.on('registerResponse', (response) => {
    console.log('Přijata odpověď na registraci:', response);
    if (response.success) {
        displayMessage(`Registrace úspěšná! Nyní se můžete přihlásit jako ${response.username}.`, 'success', registerMessage);
        // Po úspěšné registraci automaticky zobrazíme přihlašovací formulář
        showLoginForm(); 
    } else {
        displayError(`Chyba registrace: ${response.message}`, registerMessage);
    }
});