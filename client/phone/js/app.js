// client-web/js/app.js

// --- Reference na HTML elementy ---
// Tyto konstanty uchovávají odkazy na důležité HTML elementy,
// abychom s nimi mohli snadno manipulovat v JavaScriptu.
const homeSection = document.getElementById('homeSection');
const gameSection = document.getElementById('gameSection');
const accountSection = document.getElementById('accountSection');
const loadingScreen = document.getElementById('loadingScreen');
const appContainer = document.getElementById('appContainer');
const navButtons = document.querySelectorAll('.nav-button'); // Všechna navigační tlačítka v dolní liště
const quickStartButton = document.getElementById('quickStartButton'); // Tlačítko pro rychlý start na Home sekci
const quickStartAccount = document.getElementById('quickStartAccount'); // Tlačítko pro rychlý start na Home sekci

// Reference pro horní a dolní navigaci a jejich animaci
const navTitle = document.querySelector('.top-nav .nav-title');   // Titulek v horní navigaci
const navHome = document.querySelector('.top-nav .nav-home');     // Ikona domů v horní navigaci
const bottomNav = document.querySelector('.bottom-nav');           // Celá dolní navigace

// Reference pro QR skener a související elementy
const qrCodeScanIcon = document.getElementById('qrCodeScanIcon');  // Ikona pro spuštění QR skeneru
const qrReaderDiv = document.getElementById('qr-reader');          // Div, kde se zobrazí video ze skeneru
const qrReaderResultsDiv = document.getElementById('qr-reader-results'); // Div pro zobrazení naskenovaného výsledku
const joinGameCodeInput = document.getElementById('joinGameCode'); // Textarea pro vložení herního PINu/QR kódu
const qrOverlay = document.getElementById('qr-overlay');           // Hlavní overlay element pro skener
const qrOverlayCloseButton = document.getElementById('qrOverlayCloseButton'); // Tlačítko pro zavření overlaye

// --- Globální proměnné stavu ---
// Tyto proměnné udržují aktuální stav aplikace nebo animací.
let currentActiveSectionId = null; // ID aktuálně zobrazené sekce
let isShifted = false;             // Stav pro animaci horní navigace (posunuto/neposunuto)
let html5QrCode = null;            // Instance QR čtečky, inicializována na null

// --- Funkce pro přepínání sekcí ---
/**
 * Displays a specific section and hides all others.
 * Uses CSS classes 'active' for smooth transitions.
 * @param {string} newSectionId ID of the HTML element of the section to display (e.g., 'homeSection').
 */
function showSection(newSectionId) {
    if (newSectionId === currentActiveSectionId) {
        console.log(`showSection: Section '${newSectionId}' is already active, skipping.`);
        return; // Section is already active, do nothing.
    }

    console.log(`showSection: Switching from section '${currentActiveSectionId || 'none'}' to '${newSectionId}'.`);

    const oldActiveSection = document.getElementById(currentActiveSectionId);
    const newActiveSection = document.getElementById(newSectionId);

    // Hide the old active section by removing the 'active' class.
    if (oldActiveSection) {
        oldActiveSection.classList.remove('active');
        console.log(`showSection: Removed 'active' class from old section '${currentActiveSectionId}'.`);
    }

    // Display the new section by adding the 'active' class.
    if (newActiveSection) {
        newActiveSection.classList.add('active');
        currentActiveSectionId = newSectionId; // Update the ID of the active section.
        console.log(`showSection: Section '${newSectionId}' displayed.`);
    } else {
        console.warn(`showSection: New section with ID '${newSectionId}' not found in DOM.`);
    }

    // --- LOGIC FOR ACTIVE STATE OF NAVIGATION BUTTONS (bottom navigation) ---
    // Update the visual state of the bottom navigation buttons (text and icon),
    // to reflect the currently displayed section.
    navButtons.forEach(button => {
        const navText = button.querySelector('.nav-text');
        const navIcon = button.querySelector('.nav-icon');

        // Remove 'active' state from all buttons, icons, and texts.
        if (navText) {
            navText.classList.remove('active');
        }
        if (navIcon) {
            navIcon.classList.remove('active');
        }
        button.classList.remove('active');
    });

    // Add 'active' state to the button that corresponds to the new active section.
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
}

// --- Function for animating the top navigation (can be called manually or by interval) ---
/**
 * Toggles the visual state of the top navigation (title shifts, home icon appears/disappears)
 * and simultaneously hides/shows the bottom navigation.
 */
function animateTopNav() {
    // Ensure that all necessary elements exist before manipulating them.
    if (navTitle && navHome && bottomNav) {
        if (!isShifted) {
            // Activate animation: shift title, show home icon, hide bottom navigation.
            navTitle.classList.add('shifted');
            navHome.classList.add('visible');      // CSS handles the opacity animation.
            bottomNav.classList.add('shifted');    // CSS handles the bottom navigation transform.
            console.log('Navigation: Top shifted, Home icon visible, Bottom navigation hidden.');
        } else {
            // Deactivate animation: unshift title, hide home icon, show bottom navigation.
            navTitle.classList.remove('shifted');
            navHome.classList.remove('visible');   // CSS handles the opacity animation.
            bottomNav.classList.remove('shifted'); // CSS handles the bottom navigation transform.
            console.log('Navigation: Returned to default state.');
        }
        isShifted = !isShifted; // Toggle state for the next animation iteration.
    } else {
        console.warn('animateTopNav: Some elements (navTitle, navHome, or bottomNav) were not found for animation.');
    }
}

// --- Function to start staggered animation of bottom navigation buttons ---
/**
 * Starts a "hopping" animation for each bottom navigation button
 * sequentially with a small delay. The animation runs only once (according to CSS 'animation-iteration-count: 1').
 * @param {number} delayBetweenButtons Delay (in ms) between starting the animation for each button (default 200ms).
 */
function startStaggeredNavButtonAnimation(delayBetweenButtons = 200) {
    if (navButtons.length === 0) {
        console.warn('startStaggeredNavButtonAnimation: No navigation buttons found.');
        return;
    }

    navButtons.forEach((button, index) => {
        // Use setTimeout to progressively add the animation class with a delay.
        setTimeout(() => {
            button.classList.add('nav-button-hop'); // Add the class that starts the animation.
            console.log(`Button ${button.dataset.section || index} started hopping.`);

            // After the single-run animation is complete (as per CSS), remove the class,
            // so the animation can be triggered again in the future if needed.
            button.addEventListener('animationend', () => {
                button.classList.remove('nav-button-hop');
            }, { once: true }); // The listener will run only once for the given animation.
        }, index * delayBetweenButtons); // The delay increases with the button's index.
    });
}

// --- Function to show/hide the QR Overlay ---
/**
 * Shows or hides the QR scanner overlay.
 * Uses the CSS class 'active' for smooth display/hide.
 * @param {boolean} show True to show the overlay, false to hide.
 */
function toggleQrOverlay(show) {
    if (qrOverlay) {
        if (show) {
            qrOverlay.classList.add('active'); // Shows the overlay using CSS class.
            // Resets results when opening the overlay
            if (qrReaderResultsDiv) qrReaderResultsDiv.textContent = '';
            // Resets input
            if (joinGameCodeInput) joinGameCodeInput.value = '';
        } else {
            qrOverlay.classList.remove('active'); // Hides the overlay.
        }
    }
}

// --- Function to hide the loading screen and display the app content ---
/**
 * Hides the initial loading screen and displays the main application content.
 */
function hideLoadingScreen() {
    if (loadingScreen) {
        loadingScreen.classList.add('fade-out'); // Starts the CSS fade-out animation.
        // After the animation completes (transitionend), hide the element completely.
        loadingScreen.addEventListener('transitionend', () => {
            loadingScreen.style.display = 'none';
        }, { once: true }); // Ensures that the event listener runs only once.
    }

    // Display the entire app container by removing 'hidden-app-content' and adding 'visible-app-content'.
    if (appContainer) {
        appContainer.classList.remove('hidden-app-content');
        appContainer.classList.add('visible-app-content');
        console.log('appContainer is visible.');
    }

    // Automatically show the Home section after the loading screen is hidden.
    setTimeout(() => {
        showSection('homeSection');
    }, 100);

    console.log('Application is loaded and ready.');
}

// --- Event Listeners Setup ---
// This section runs once the entire DOM document has been loaded.
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOMContentLoaded: DOM is loaded.');

    // Starts a simulation of the loading screen when the DOM is loaded.
    // After a short delay, the appContainer and Home section will be displayed.
    setTimeout(() => {
        hideLoadingScreen();
    }, 200);

    // --- START OF BLOCK FOR AUTOMATIC TOP/BOTTOM NAVIGATION ANIMATION ---
    // This code automatically toggles the state of the top and bottom navigation every second.
    // You can easily comment it out (add // at the beginning of the line) if you don't want it.
    // Example of commenting out: // let autoAnimateInterval = setInterval(animateTopNav, 1000);
/*     let autoAnimateInterval = setInterval(animateTopNav, 1000); // Starts the animation every 1 second (1000 ms).
    console.log('Interval for automatic navigation animation started.'); */
    // --- END OF BLOCK FOR AUTOMATIC TOP/BOTTOM NAVIGATION ANIMATION ---


    // --- START OF BLOCK FOR STAGGERED ANIMATION OF BOTTOM NAVIGATION BUTTONS ---
    // This code starts a one-time, staggered hopping animation for the bottom navigation buttons.
    // You can easily comment it out (add // at the beginning of the line) if you don't want it.
    // Example of commenting out: // startStaggeredNavButtonAnimation(200);
    startStaggeredNavButtonAnimation(200); // Starts staggered animation of buttons with a 200ms delay between each.
    console.log('Staggered animation of bottom navigation buttons started.');
    // --- END OF BLOCK FOR STAGGERED ANIMATION OF BOTTOM NAVIGATION BUTTONS ---


    // Add listeners for navigation buttons (bottom navigation)
    if (navButtons.length > 0) {
        navButtons.forEach(button => {
            button.addEventListener('click', (event) => {
                const sectionId = button.dataset.section;
                if (sectionId) {
                    showSection(sectionId);
                    // Remove the "hopping" animation from all navigation buttons after clicking,
                    // to ensure the animation stops after user interaction.
                    navButtons.forEach(btn => btn.classList.remove('nav-button-hop'));
                    console.log('Navigation button clicked: "Hopping" animation removed from all buttons.');
                }
            });
        });
    }

    // --- Listeners for Quick Actions buttons (on Home section) ---
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

    // --- Listener for the home icon in the top navigation (nav-home) ---
    if (navHome) {
        navHome.addEventListener('click', () => {
            showSection('homeSection'); // Switches to the home section on click.
            console.log('NavHome clicked: Switching to homeSection.');
        });
    }

    // --- LISTENER FOR QR CODE ICON (start/stop scanner in overlay) ---
    if (qrCodeScanIcon) {
        qrCodeScanIcon.addEventListener('click', () => {
            console.log('QR Code icon clicked. Starting QR scanner overlay.');
            toggleQrOverlay(true); // Show the overlay.

            // If the scanner instance does not exist yet, create it.
            if (!html5QrCode) {
                html5QrCode = new Html5Qrcode("qr-reader");
            }

            // Start scanning.
            html5QrCode.start(
                { facingMode: "environment" }, // Prefers the back camera (for mobile devices).
                {
                    fps: 10,    // Frames per second for video analysis.
                    qrbox: { width: 250, height: 250 } // Size of the scanning box.
                },
                (decodedText, decodedResult) => {
                    // Callback for successful QR code scanning.
                    console.log(`QR code scanned: ${decodedText}`);
                    qrReaderResultsDiv.textContent = `Scanned: ${decodedText}`; // Displays the result.
                    joinGameCodeInput.value = decodedText; // Inserts the scanned text into the input.

                    // After successful scanning, stop the scanner and close the overlay.
                    html5QrCode.stop().then(() => {
                        console.log('QR scanner stopped after successful scan.');
                        toggleQrOverlay(false); // Hide the overlay.
                    }).catch((err) => {
                        console.error('Error stopping QR scanner after scan:', err);
                        toggleQrOverlay(false); // Hide the overlay even if there's an error stopping.
                    });
                },
                (errorMessage) => {
                    // Callback for errors during scanning (e.g., no QR code found).
                    // This logging can be very frequent, so it's often commented out
                    // or used only for deeper debugging.
                    // console.warn(`Scanning error: ${errorMessage}`);
                }
            ).catch((err) => {
                // Catch errors when starting the scanner itself (e.g., user denied camera access).
                console.error(`Error starting QR scanner: ${err}`);
                qrReaderResultsDiv.textContent = `Error: ${err.message || err}`; // Inform the user about the error.
                toggleQrOverlay(false); // Hide the overlay on startup error.
            });
        });
    }

    // --- LISTENER FOR THE CLOSE BUTTON IN THE OVERLAY ---
    if (qrOverlayCloseButton) {
        qrOverlayCloseButton.addEventListener('click', () => {
            console.log('Overlay close button clicked.');
            // If the scanner is running, stop it.
            if (html5QrCode && html5QrCode.isScanning) {
                html5QrCode.stop().then(() => {
                    console.log('QR scanner stopped manually.');
                    toggleQrOverlay(false); // Hide the overlay.
                }).catch((err) => {
                    console.error('Error stopping QR scanner manually:', err);
                    toggleQrOverlay(false); // Hide the overlay even if there's an error stopping.
                });
            } else {
                toggleQrOverlay(false); // If the scanner was not running, just hide the overlay.
            }
        });
    }
});