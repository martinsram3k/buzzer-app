// client-web/js/app.js

const buzzerButton = document.getElementById('buzzerButton');
const resetButton = document.getElementById('resetButton');
const winnerContainer = document.getElementById('winnerContainer');
const winnerIdDisplay = document.getElementById('winnerId');
const winnerTimeDisplay = document.getElementById('winnerTime');

let currentWinner = null;

function updateWinnerDisplay(winner) {
    currentWinner = winner;
    if (winner) {
        winnerIdDisplay.textContent = `ID: ${winner.id}`;
        winnerTimeDisplay.textContent = `(Bzučel v: ${new Date(winner.time).toLocaleTimeString()})`;
        winnerContainer.classList.remove('hidden');
        buzzerButton.disabled = true;
        resetButton.disabled = false;
    } else {
        winnerContainer.classList.add('hidden');
        buzzerButton.disabled = false;
        resetButton.disabled = true;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.onBuzzerWinner((winner) => {
        updateWinnerDisplay(winner);
        // Odebrán alert()
    });

    window.onBuzzerReset(() => {
        updateWinnerDisplay(null);
        // Odebrán alert()
    });

    updateWinnerDisplay(null);
});

buzzerButton.addEventListener('click', () => {
    if (!currentWinner) {
        window.buzz();
    }
});

resetButton.addEventListener('click', () => {
    window.resetBuzzer();
});