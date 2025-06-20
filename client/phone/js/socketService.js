// client-web/js/socketService.js

const SOCKET_SERVER_URL = 'https://buzzer-app-t20g.onrender.com'; // <--- ZKONTROLUJ A POUŽIJ SVOU SKUTEČNOU URL!

const socket = io(SOCKET_SERVER_URL);
window.socket = socket; // Zpřístupníme socket objekt globálně

// --- Obecné události socketu (pro debugování) ---
socket.on('connect', () => {
  console.log('socketService: Připojeno k serveru Socket.IO! ID:', socket.id);
});

socket.on('disconnect', () => {
  console.log('socketService: Odpojeno od serveru Socket.IO.');
});

socket.on('connect_error', (err) => {
  console.error('socketService: Chyba připojení Socket.IO:', err.message);
});


// --- Funkce pro odesílání událostí na server ---

// Pro vytváření a připojování do místností
window.createRoom = (username) => {
  console.log('socketService: Emituji createRoom s jménem:', username);
  socket.emit('createRoom', username);
};

window.joinRoom = (roomId, username) => {
  console.log('socketService: Emituji joinRoom s kódem:', roomId, 'a jménem:', username);
  socket.emit('joinRoom', roomId, username);
};

// NOVÉ: Pro aktualizaci nastavení hry hostitelem
window.updateGameSettings = (roomId, settings) => {
    console.log('socketService: Emituji updateGameSettings pro místnost:', roomId, 'nastavení:', settings);
    socket.emit('updateGameSettings', roomId, settings);
};

// NOVÉ: Pro vykopnutí hráče hostitelem
window.kickPlayer = (playerId) => {
    console.log('socketService: Emituji kickPlayer pro ID:', playerId);
    socket.emit('kickPlayer', playerId);
};

// NOVÉ: Pro spuštění hry hostitelem (z lobby)
window.startGame = (roomId) => {
    console.log('socketService: Emituji startGame pro místnost:', roomId);
    socket.emit('startGame', roomId);
};

// NOVÉ: Pro spuštění dalšího kola hostitelem
window.startNextRound = (roomId) => {
    console.log('socketService: Emituji startNextRound pro místnost:', roomId);
    socket.emit('startNextRound', roomId);
};

// NOVÉ: Pro ukončení hry hostitelem
window.endGame = (roomId) => {
    console.log('socketService: Emituji endGame pro místnost:', roomId);
    socket.emit('endGame', roomId);
};

// NOVÉ: Pro reset celé hry hostitelem (např. po "Game Over")
window.resetGame = (roomId) => {
    console.log('socketService: Emituji resetGame pro místnost:', roomId);
    socket.emit('resetGame', roomId);
};

// Stávající funkce pro bzučák a reset (použijeme v rámci herního cyklu)
window.buzz = () => {
  socket.emit('buzz');
  console.log('socketService: Odeslána událost: buzz');
};

// Toto už nebudeme volat přímo z tlačítka, ale z logiky hry
window.resetBuzzer = () => {
  socket.emit('resetBuzzer');
  console.log('socketService: Odeslána událost: resetBuzzer');
};

// NOVÉ: Pro explicitní opuštění místnosti
window.leaveRoom = (roomId) => {
    console.log('socketService: Emituji leaveRoom pro místnost:', roomId);
    socket.emit('leaveRoom', roomId);
    // Po opuštění místnosti můžeme socket odpojit, pokud chceme plný reset spojení
    socket.disconnect();
    // A znovu ho připojit pro další hru
    setTimeout(() => {
        socket.connect();
        window.socket = socket; // Znovu nastavíme window.socket
    }, 500); // Malá prodleva
};