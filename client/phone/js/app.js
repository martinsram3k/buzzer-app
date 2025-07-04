// client-web/js/app.js

// --- Reference to HTML elements ---
const homeSection = document.getElementById('homeSection');
const gameSection = document.getElementById('gameSection');
const accountSection = document.getElementById('accountSection');
const nameSection = document.getElementById('nameSection');
const loadingScreen = document.getElementById('loadingScreen');
const appContainer = document.getElementById('appContainer');
const navButtons = document.querySelectorAll('.nav-button');
const quickStartButton = document.getElementById('quickStartButton');
const quickStartAccount = document.getElementById('quickStartAccount');

const navTitle = document.querySelector('.top-nav .nav-title');
const navHome = document.querySelector('.top-nav .nav-home');
const bottomNav = document.querySelector('.bottom-nav');

// NEW REFERENCE FOR PIN CLEAR BUTTON
const clearGameCodeButton = document.getElementById('clearGameCodeButton');

const qrCodeScanIcon = document.getElementById('qrCodeScanIcon');
const qrReaderDiv = document.getElementById('qr-reader');
const qrReaderResultsDiv = document.getElementById('qr-reader-results');
const joinGameCodeInput = document.getElementById('joinGameCode');
const qrOverlay = document.getElementById('qr-overlay');
const qrOverlayCloseButton = document.getElementById('qrOverlayCloseButton');

const joinGameButton = document.getElementById('joinGameButton');
const playerNameInput = document.getElementById('playerNameInput');
const submitNameButton = document.getElementById('submitNameButton');

// --- DARK MODE LOGIC: Reference na Dark Mode přepínač ---
const darkModeToggle = document.getElementById('darkModeToggle');


// --- Global state variables ---
let currentActiveSectionId = null;
let isShifted = false;
let html5QrCode = null;

// Array to store history of visited sections
const sectionHistory = [];


// --- Function to switch sections ---
/**
 * Displays a specific section and hides all others.
 * Uses CSS 'active' classes for smooth transitions.
 * @param {string} newSectionId ID of the HTML element of the section to display (e.g., 'homeSection').
 * @param {boolean} isBackNavigation Indicates whether it's a back navigation (default false).
 */
function showSection(newSectionId, isBackNavigation = false) {
    if (newSectionId === currentActiveSectionId) {
        console.log(`showSection: Section '${newSectionId}' is already active, skipping.`);
        return;
    }

    console.log(`showSection: Switching from section '${currentActiveSectionId || 'none'}' to '${newSectionId}'. Is it a return: ${isBackNavigation}`);

    // --- Section history management ---
    if (!isBackNavigation) {
        // Add the current section to history ONLY if it's not the same section we are already on
        // and if it's not the same section as the last one in history (to prevent duplicates on repeated clicks).
        if (currentActiveSectionId && (sectionHistory.length === 0 || sectionHistory[sectionHistory.length - 1] !== currentActiveSectionId)) {
            sectionHistory.push(currentActiveSectionId);
        }
    }
    // If isBackNavigation is true, history is already modified by goBack() function.

    console.log(`showSection: Current history before setting new section: ${sectionHistory.join(' -> ')}`);


    const oldActiveSection = document.getElementById(currentActiveSectionId);
    const newActiveSection = document.getElementById(newSectionId);

    // Hide the old active section
    if (oldActiveSection) {
        oldActiveSection.classList.remove('active');
        console.log(`showSection: Removed 'active' class from old section '${currentActiveSectionId}'.`);
    }

    // Show the new section
    if (newActiveSection) {
        newActiveSection.classList.add('active');
        currentActiveSectionId = newSectionId; // Update the active section ID.
        console.log(`showSection: Section '${newSectionId}' displayed. New currentActiveSectionId: ${currentActiveSectionId}`);
    } else {
        console.warn(`showSection: New section with ID '${newSectionId}' was not found in the DOM.`);
    }

    // --- LOGIC FOR NAVIGATION ANIMATIONS (Top and Bottom navigation) ---
    // Change: Navigation will only shift for 'nameSection'.
    const shouldNavBeShifted = (newSectionId === 'nameSection');

    if (shouldNavBeShifted && !isShifted) {
        animateTopNav();
        if (bottomNav) bottomNav.classList.add('shifted');
        console.log('showSection: Switched to section requiring shift (nameSection), navigation shifted.');
    } else if (!shouldNavBeShifted && isShifted) {
        animateTopNav();
        if (bottomNav) bottomNav.classList.remove('shifted');
        console.log('showSection: Switched to section not requiring shift, navigation returned.');
    }
    // If the state is already correct, do nothing.

    // --- LOGIC FOR ACTIVE STATE OF NAVIGATION BUTTONS (bottom navigation) ---
    navButtons.forEach(button => {
        const navText = button.querySelector('.nav-text');
        const navIcon = button.querySelector('.nav-icon');

        if (navText) navText.classList.remove('active');
        if (navIcon) navIcon.classList.remove('active');
        button.classList.remove('active');
    });

    const activeButton = document.querySelector(`.nav-button[data-section="${newSectionId}"]`);
    if (activeButton) {
        const activeNavText = activeButton.querySelector('.nav-text');
        const activeNavIcon = activeButton.querySelector('.nav-icon');

        if (activeNavText) activeNavText.classList.add('active');
        if (activeNavIcon) activeNavIcon.classList.add('active');
        activeButton.classList.add('active');
    }
}

// --- Function for animating the top navigation ---
function animateTopNav() {
    if (navTitle && navHome) {
        if (!isShifted) {
            navTitle.classList.add('shifted');
            navHome.classList.add('visible');
            // console.log('Navigation: Top shifted, Home icon visible.'); // Commented for less log
        } else {
            navTitle.classList.remove('shifted');
            navHome.classList.remove('visible');
            // console.log('Navigation: Returned to default state.'); // Commented for less log
        }
        isShifted = !isShifted;
    } else {
        console.warn('animateTopNav: Some elements (navTitle or navHome) were not found for animation.');
    }
}

// --- Function to start staggered animation of bottom navigation buttons ---
function startStaggeredNavButtonAnimation(delayBetweenButtons = 200) {
    if (navButtons.length === 0) {
        console.warn('startStaggeredNavButtonAnimation: No navigation buttons found.');
        return;
    }

    navButtons.forEach((button, index) => {
        setTimeout(() => {
            button.classList.add('nav-button-hop');
            // console.log(`Button ${button.dataset.section || index} started hopping.`); // Commented for less log
            button.addEventListener('animationend', () => {
                button.classList.remove('nav-button-hop');
            }, { once: true });
        }, index * delayBetweenButtons);
    });
}

// --- Function to navigate back ---
/**
 * Navigates to the previous section in history.
 * If there is no previous section (or only homeSection), it stays on homeSection.
 */
function goBack() {
    // If there is more than one item in history (i.e., we can go back)
    if (sectionHistory.length > 0) {
        const previousSectionId = sectionHistory.pop(); // Remove the last (previous) section from history
        console.log(`goBack: Navigating back to '${previousSectionId}'. Current history: ${sectionHistory.join(' -> ')}`);
        showSection(previousSectionId, true); // Display the previous section and mark it as "return"
    } else {
        // If history is empty, or contains only one item (home),
        // we stay on homeSection.
        console.log('goBack: History is empty or at the beginning. Staying on homeSection.');
        showSection('homeSection', true);
    }
}


// --- Function to show/hide QR Overlay ---
function toggleQrOverlay(show) {
    if (qrOverlay) {
        if (show) {
            qrOverlay.classList.add('active');
            if (qrReaderResultsDiv) qrReaderResultsDiv.textContent = '';
            if (joinGameCodeInput) joinGameCodeInput.value = '';
        } else {
            qrOverlay.classList.remove('active');
        }
    }
}

// --- Function to hide loading screen and show app content ---
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
        console.log('appContainer is visible.');
    }

    // Automatically display the Home section after hiding the loading screen.
    // This first section will be automatically added to history within showSection.
    setTimeout(() => {
        showSection('homeSection');
    }, 100);

    console.log('Application is loaded and ready.');
}

// --- Event listener setup ---
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOMContentLoaded: DOM is loaded.');

    setTimeout(() => {
        hideLoadingScreen();
    }, 200);


    // Optional staggered button animation (running)
    startStaggeredNavButtonAnimation(200);
    console.log('Staggered animation of bottom navigation buttons started.');

    // Listeners for navigation buttons (bottom navigation)
    if (navButtons.length > 0) {
        navButtons.forEach(button => {
            button.addEventListener('click', (event) => {
                const sectionId = button.dataset.section;
                if (sectionId) {
                    showSection(sectionId);
                    navButtons.forEach(btn => btn.classList.remove('nav-button-hop'));
                    // console.log('Navigation button clicked: "Hopping" animation removed.'); // Commented for less log
                }
            });
        });
    }

    // --- LISTENER FOR TEXTAREA CLEAR BUTTON ---
    if (clearGameCodeButton) {
        clearGameCodeButton.addEventListener('click', () => {
            if (joinGameCodeInput) {
                joinGameCodeInput.value = ''; // Clear the textarea
                console.log('joinGameCodeInput textarea cleared.');
            }
        });
    }

    // Listeners for Quick Actions buttons (on Home section)
    if (quickStartButton) {
        quickStartButton.addEventListener('click', () => {
            const sectionId = quickStartButton.dataset.section;
            if (sectionId) {
                showSection(sectionId);
            }
        });
    }

    if (quickStartAccount) {
        quickStartAccount.addEventListener('click', () => {
            const sectionId = quickStartAccount.dataset.section;
            if (sectionId) {
                showSection(sectionId);
            }
        });
    }

    // Listener for the home icon in the top navigation (now acting as a back button)
    if (navHome) {
        navHome.addEventListener('click', () => {
            goBack();
            console.log('NavHome clicked: Attempting to go back.');
        });
    }

    // LISTENER FOR QR CODE ICON
    if (qrCodeScanIcon) {
        qrCodeScanIcon.addEventListener('click', () => {
            console.log('QR Code icon clicked. Launching QR scanner overlay.');
            toggleQrOverlay(true);

            if (!html5QrCode) {
                html5QrCode = new Html5Qrcode("qr-reader");
            }

            html5QrCode.start(
                { facingMode: "environment" },
                { fps: 10, qrbox: { width: 250, height: 250 } },
                (decodedText, decodedResult) => {
                    console.log(`QR code scanned: ${decodedText}`);
                    qrReaderResultsDiv.textContent = `Scanned: ${decodedText}`;
                    joinGameCodeInput.value = decodedText;

                    html5QrCode.stop().then(() => {
                        console.log('QR reader stopped after successful scan.');
                        toggleQrOverlay(false);
                    }).catch((err) => {
                        console.error('Error stopping QR reader after scan:', err);
                        toggleQrOverlay(false);
                    });
                },
                (errorMessage) => {
                    // console.warn(`Scan error: ${errorMessage}`);
                }
            ).catch((err) => {
                console.error(`Error starting QR reader: ${err}`);
                qrReaderResultsDiv.textContent = `Error: ${err.message || err}`;
                toggleQrOverlay(false);
            });
        });
    }

    // LISTENER FOR CLOSE BUTTON IN OVERLAY
    if (qrOverlayCloseButton) {
        qrOverlayCloseButton.addEventListener('click', () => {
            console.log('Overlay close button clicked.');
            if (html5QrCode && html5QrCode.isScanning) {
                html5QrCode.stop().then(() => {
                    console.log('QR reader stopped manually.');
                    toggleQrOverlay(false);
                }).catch((err) => {
                    console.error('Error stopping QR reader manually:', err);
                    toggleQrOverlay(false);
                });
            } else {
                toggleQrOverlay(false);
            }
        });
    }

    // LISTENER FOR "Join" BUTTON (on gameSection)
    if (joinGameButton) {
        joinGameButton.addEventListener('click', () => {
            console.log('Join Game button clicked. Switching to nameSection.');
            showSection('nameSection');
        });
    }

    // LISTENER FOR "Continue" BUTTON (on nameSection)
    if (submitNameButton) {
        submitNameButton.addEventListener('click', () => {
            const playerName = playerNameInput.value.trim();
            if (playerName) {
                console.log(`Player name entered: ${playerName}.`);
                // After entering the name, we return to the game section (example).
                goBack(); // This should return the user to the gameSection they came from.
            } else {
                alert('Please enter your name!');
            }
        });
    }

    // --- DARK MODE LOGIC: Funkce a event listener ---

    /**
     * Nastaví nebo odebere třídu 'dark-mode' z <body> elementu
     * a uloží preference do localStorage.
     * @param {boolean} isDark True pro aktivaci Dark Mode, false pro Light Mode.
     */
    function setDarkMode(isDark) {
        if (isDark) {
            document.body.classList.add('dark-mode'); // Přidá třídu dark-mode
            console.log('Dark Mode activated.');
        } else {
            document.body.classList.remove('dark-mode'); // Odebere třídu dark-mode
            console.log('Light Mode activated.');
        }
        // Ulož preference uživatele do Local Storage
        localStorage.setItem('darkMode', isDark);
    }

    // Načti preference z Local Storage při načtení stránky
    // Pokud je 'darkMode' nastaveno na 'true' (jako string), aktivuj Dark Mode
    const savedDarkMode = localStorage.getItem('darkMode') === 'true';
    if (darkModeToggle) { // Zajištění, že element existuje před manipulací
        if (savedDarkMode) {
            setDarkMode(true);
            darkModeToggle.checked = true; // Nastav přepínač do správné pozice
        } else {
            setDarkMode(false);
            darkModeToggle.checked = false; // Nastav přepínač do správné pozice
        }

        // Přidej posluchač události pro změnu přepínače Dark Mode
        darkModeToggle.addEventListener('change', () => {
            setDarkMode(darkModeToggle.checked);
        });
        console.log('Dark Mode toggle listener set up.');
    } else {
        console.warn('Dark Mode toggle element (darkModeToggle) not found.');
    }

    // --- Konec DARK MODE LOGIC ---

}); // End of DOMContentLoaded