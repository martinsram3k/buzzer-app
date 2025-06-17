// client-web/js/app.js

// Získání odkazů na HTML elementy
const buzzerButton = document.getElementById('buzzerButton');
const resetButton = document.getElementById('resetButton');
const winnerContainer = document.getElementById('winnerContainer');
const winnerIdDisplay = document.getElementById('winnerId');
const winnerTimeDisplay = document.getElementById('winnerTime');

let currentWinner = null; // Proměnná pro sledování aktuálního vítěze

// --- Funkce pro aktualizaci UI ---

function updateWinnerDisplay(winner) {
    currentWinner = winner;
    if (winner) {
        winnerIdDisplay.textContent = `ID: ${winner.id}`;
        winnerTimeDisplay.textContent = `(Bzučel v: ${new Date(winner.time).toLocaleTimeString()})`;
        winnerContainer.classList.remove('hidden'); // Zobrazí kontejner vítěze
        buzzerButton.disabled = true; // Zakáže bzučák
        resetButton.disabled = false; // Povolí reset
    } else {
        winnerContainer.classList.add('hidden'); // Skryje kontejner vítěze
        buzzerButton.disabled = false; // Povolí bzučák
        resetButton.disabled = true; // Zakáže reset
    }
}

// --- Nastavení posluchačů událostí ze Socket.IO serveru ---

// Počkej, dokud se DOM nenačte, než začneš pracovat s elementy
document.addEventListener('DOMContentLoaded', () => {
    // Posluchač pro událost 'buzzerWinner' ze serveru
    // onBuzzerWinner a onBuzzerReset jsou nyní dostupné jako globální funkce z socketService.js
    window.onBuzzerWinner((winner) => {
        updateWinnerDisplay(winner);
        alert('Vítěz! Bzučel: ' + winner.id);
    });

    // Posluchač pro událost 'buzzerReset' ze serveru
    window.onBuzzerReset(() => {
        updateWinnerDisplay(null); // Resetuj zobrazení vítěze
        alert('Bzučák resetován! Můžete začít znovu.');
    });

    // Nastav počáteční stav tlačítek
    updateWinnerDisplay(null);
});


// --- Nastavení posluchačů pro HTML tlačítka ---

// Posluchač pro stisknutí tlačítka BZUČÁK
buzzerButton.addEventListener('click', () => {
    // Zabrání vícenásobnému bzučení, pokud už je vítěz
    if (!currentWinner) {
        window.buzz(); // Volá funkci 'buzz' z 'socketService.js'
    }
});

// Posluchač pro stisknutí tlačítka RESET
resetButton.addEventListener('click', () => {
    window.resetBuzzer(); // Volá funkci 'resetBuzzer' z 'socketService.js'
});