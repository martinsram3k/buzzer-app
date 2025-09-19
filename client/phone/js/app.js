// client-web/js/app.js

// --- References to HTML elements (Ensuring elements exist) ---
// Main application sections
const homeSection = document.getElementById("homeSection");
const gameSection = document.getElementById("gameSection");
const accountSection = document.getElementById("accountSection");
const nameSection = document.getElementById("nameSection");
const lobbySection = document.getElementById("lobbySection");
const roomSettingsSection = document.getElementById("roomSettingsSection");
const gameplaySection = document.getElementById("gameplaySection"); // New section for active game

// Special elements for loading and navigation
const loadingScreen = document.getElementById("loadingScreen");
const appContainer = document.getElementById("appContainer");
const navButtons = document.querySelectorAll(".nav-button");
const quickStartButton = document.getElementById("quickStartButton");
const quickStartAccount = document.getElementById("quickStartAccount");

const navTitle = document.querySelector(".top-nav .nav-title");
const navHome = document.querySelector(".top-nav .nav-home");
const bottomNav = document.querySelector(".bottom-nav");

// Elements for input and actions
const clearGameCodeButton = document.getElementById("clearGameCodeButton");
const qrCodeScanIcon = document.getElementById("qrCodeScanIcon");
const qrReaderDiv = document.getElementById("qr-reader");
const qrReaderResultsDiv = document.getElementById("qr-reader-results");
const joinGameCodeInput = document.getElementById("joinGameCode");
const qrOverlay = document.getElementById("qr-overlay");
const qrOverlayCloseButton = document.getElementById("qrOverlayCloseButton");

const joinGameButton = document.getElementById("joinGameButton");
const playerNameInput = document.getElementById("playerNameInput");
const submitNameButton = document.getElementById("submitNameButton");
const createGameButton = document.getElementById("createGameButton");

// References for elements in lobbySection (for players)
const lobbyRoomCode = document.getElementById("lobbyRoomCode");
const lobbyPlayerList = document.getElementById("lobbyPlayerList");
const leaveLobbyButton = document.getElementById("leaveLobbyButton");
const waitingForHostText = document.getElementById("waitingForHostText"); // Added

// References for elements in roomSettingsSection (for host)
const settingsRoomCode = document.getElementById("settingsRoomCode");
const maxPlayersAllowedInput = document.getElementById(
  "maxPlayersAllowedInput"
); // NEW: Max players in room
const roundTimeInput = document.getElementById("roundTime");
const hostPlaysToggle = document.getElementById("hostPlays");
const numRoundsInput = document.getElementById("numRoundsInput"); // NEW: Number of rounds
const updateSettingsButton = document.getElementById("updateSettingsButton");
const startGameButton = document.getElementById("startGameButton");
const closeRoomButton = document.getElementById("closeRoomButton");
const hostPlayerList = document.getElementById("hostPlayerList");
const qrCodeContainer = document.getElementById("qrCodeContainer");

// References for advanced settings
const advanceModeToggle = document.getElementById("advanceModeToggle"); // NEW
const advancedSettingsContainer = document.getElementById(
  "advancedSettingsContainer"
); // NEW
const multipleBuzzToggle = document.getElementById("multipleBuzzToggle"); // NEW
const teamsToggle = document.getElementById("teamsToggle"); // NEW
const teamSizeInput = document.getElementById("teamSizeInput"); // NEW
const numTeamsInput = document.getElementById("numTeamsInput"); // NEW
const hostStartsNextRoundToggle = document.getElementById(
  "hostStartsNextRoundToggle"
); // NEW
const restTimeBetweenRoundsInput = document.getElementById(
  "restTimeBetweenRoundsInput"
); // NEW

// References for elements in gameplaySection
const currentRoundDisplay = document.getElementById("currentRoundDisplay");
const gameStateMessage = document.getElementById("gameStateMessage");
const countdownDisplay = document.getElementById("countdownDisplay");
const buzzButton = document.getElementById("buzzButton");
const winnerDisplay = document.getElementById("winnerDisplay");
const nextRoundButton = document.getElementById("nextRoundButton");
const newGameButton = document.getElementById("newGameButton");
const leaveGameButton = document.getElementById("leaveGameButton");
const cancelGameButton = document.getElementById("cancelGameButton"); // NOVÉ: Tlačítko pro zrušení hry

const copyGameCode = document.getElementById("copyRoomCodeButton");
const copyConfirmationMessage = document.getElementById(
  "copyConfirmationMessage"
);

const darkModeToggle = document.getElementById("darkModeToggle");

// --- Global state variables ---
let currentActiveSectionId = null;
let isShifted = false;
let html5QrCode = null;
let gameMode = null;
let currentRoomCode = null;
let currentRoomState = null;

const sectionHistory = [];

const QR_BACKEND_URL = "https://buzzer-app-t20g.onrender.com/generate_qr";

copyGameCode.addEventListener("click", () => {
  const roomCode = settingsRoomCode.textContent;
  navigator.clipboard
    .writeText(roomCode)
    .then(() => {
      console.log(`Copied room code: ${roomCode}`);
      copyConfirmationMessage.classList.remove("hidden");
      setTimeout(() => {
        copyConfirmationMessage.classList.add("hidden");
      }, 1000);
    })
    .catch((err) => {
      console.error("Failed to copy: ", err);
    });
});

// --- Functions for switching sections ---
/**
 * Displays a specific section and hides all others.
 * Uses CSS 'active' classes for smooth transitions.
 * @param {string} newSectionId ID of the HTML element section to display (e.g., 'homeSection').
 * @param {boolean} isBackNavigation Indicates whether it's a back navigation (default false).
 */
function showSection(newSectionId, isBackNavigation = false) {
  if (newSectionId === currentActiveSectionId) {
    console.log(
      `showSection: Section '${newSectionId}' is already active, skipped.`
    );
    return;
  }

  console.log(
    `showSection: Switching from section '${
      currentActiveSectionId || "none"
    }' to '${newSectionId}'. Is it a return: ${isBackNavigation}`
  );

  if (!isBackNavigation) {
    if (
      currentActiveSectionId &&
      (sectionHistory.length === 0 ||
        sectionHistory[sectionHistory.length - 1] !== currentActiveSectionId)
    ) {
      sectionHistory.push(currentActiveSectionId);
    }
  }

  console.log(
    `showSection: Current history before setting new section: ${sectionHistory.join(
      " -> "
    )}`
  );

  const oldActiveSection = document.getElementById(currentActiveSectionId);
  const newActiveSection = document.getElementById(newSectionId);

  if (oldActiveSection) {
    oldActiveSection.classList.remove("active");
    console.log(
      `showSection: Removed 'active' class from old section '${currentActiveSectionId}'.`
    );
  }

  if (newActiveSection) {
    newActiveSection.classList.add("active");
    currentActiveSectionId = newSectionId;
    console.log(
      `showSection: Section '${newSectionId}' displayed. New currentActiveSectionId: ${currentActiveSectionId}`
    );
  } else {
    console.warn(
      `showSection: New section with ID '${newSectionId}' was not found in the DOM.`
    );
  }

  const shouldNavBeShifted =
    newSectionId === "nameSection" ||
    newSectionId === "lobbySection" ||
    newSectionId === "roomSettingsSection" ||
    newSectionId === "gameplaySection";

  if (shouldNavBeShifted && !isShifted) {
    animateTopNav();
    if (bottomNav) bottomNav.classList.add("shifted");
    console.log(
      `showSection: Switched to section requiring shift (${newSectionId}), navigation shifted.`
    );
  } else if (!shouldNavBeShifted && isShifted) {
    animateTopNav();
    if (bottomNav) bottomNav.classList.remove("shifted");
    console.log(
      "showSection: Switched to section not requiring shift, navigation returned."
    );
  }

  navButtons.forEach((button) => {
    const navText = button.querySelector(".nav-text");
    const navIcon = button.querySelector(".nav-icon");

    if (navText) navText.classList.remove("active");
    if (navIcon) navIcon.classList.remove("active");
    button.classList.remove("active");
  });

  const activeButton = document.querySelector(
    `.nav-button[data-section="${newSectionId}"]`
  );
  if (activeButton) {
    const activeNavText = activeButton.querySelector(".nav-text");
    const activeNavIcon = activeButton.querySelector(".nav-icon");

    if (activeNavText) activeNavText.classList.add("active");
    if (activeNavIcon) activeNavIcon.classList.add("active");
    activeButton.classList.add("active");
  }

  if (newSectionId !== "roomSettingsSection") {
    if (qrCodeContainer) qrCodeContainer.innerHTML = "";
    qrCodeContainer.classList.add("hidden");
    console.log("QR code cleared because we left roomSettingsSection.");
  }
}

// --- Function for animating top navigation ---
function animateTopNav() {
  if (navTitle && navHome) {
    if (!isShifted) {
      navTitle.classList.add("shifted");
      navHome.classList.add("visible");
    } else {
      navTitle.classList.remove("shifted");
      navHome.classList.remove("visible");
    }
    isShifted = !isShifted;
  } else {
    console.warn(
      "animateTopNav: Some elements (navTitle or navHome) were not found for animation."
    );
  }
}

// --- Function to start staggered animation of bottom navigation buttons ---
function startStaggeredNavButtonAnimation(delayBetweenButtons = 200) {
  if (navButtons.length === 0) {
    console.warn(
      "startStaggeredNavButtonAnimation: No navigation buttons found."
    );
    return;
  }

  navButtons.forEach((button, index) => {
    setTimeout(() => {
      button.classList.add("nav-button-hop");
      button.addEventListener(
        "animationend",
        () => {
          button.classList.remove("nav-button-hop");
        },
        { once: true }
      );
    }, index * delayBetweenButtons);
  });
}

// --- Function for navigating back ---
/**
 * Navigates to the previous section in history.
 * If there is no previous section (or only homeSection), it stays on homeSection.
 */
function goBack() {
  if (sectionHistory.length > 0) {
    const previousSectionId = sectionHistory.pop();
    console.log(
      `goBack: Navigating back to '${previousSectionId}'. Current history: ${sectionHistory.join(
        " -> "
      )}`
    );
    showSection(previousSectionId, true);
  } else {
    console.log(
      "goBack: History is empty or at the beginning. Staying on homeSection."
    );
    showSection("homeSection", true);
  }
}

// --- Function for showing/hiding QR overlay ---
function toggleQrOverlay(show) {
  if (qrOverlay) {
    if (show) {
      qrOverlay.classList.add("active");
      if (qrReaderResultsDiv) qrReaderResultsDiv.textContent = "";
      if (joinGameCodeInput) joinGameCodeInput.value = "";
    } else {
      qrOverlay.classList.remove("active");
    }
  }
}

// --- Function for hiding loading screen and showing app content ---
function hideLoadingScreen() {
  if (loadingScreen) {
    loadingScreen.classList.add("fade-out");
    loadingScreen.addEventListener(
      "transitionend",
      () => {
        loadingScreen.style.display = "none";
      },
      { once: true }
    );
  }

  if (appContainer) {
    appContainer.classList.remove("hidden-app-content");
    appContainer.classList.add("visible-app-content");
    console.log("appContainer is visible.");
  }

  setTimeout(() => {
    showSection("homeSection");
  }, 100);

  console.log("Application loaded and ready.");
}

// --- Centralized logic for entering nameSection ---
/**
 * Processes entry into nameSection, sets gameMode, and switches section.
 * @param {string} mode Game mode ('join' or 'create').
 */
function handleGameModeEntry(mode) {
  gameMode = mode;
  console.log(
    `handleGameModeEntry: Game mode set to '${gameMode}'. Switching to nameSection.`
  );
  playerNameInput.value = "";
  showSection("nameSection");
}

// --- Function for generating QR code from backend ---
/**
 * Generates a QR code by calling the backend and displays it in the specified container.
 * @param {string} dataText Data to be encoded into the QR code (e.g., room code).
 */
async function generateQRCode(dataText) {
  console.log("generateQRCode called with data:", dataText);
  console.log("qrCodeContainer element:", qrCodeContainer);

  if (qrCodeContainer) {
    qrCodeContainer.innerHTML = "";
    qrCodeContainer.classList.add("hidden");
    qrCodeContainer.style.display = "flex";
  } else {
    console.error(
      "Cannot generate QR code: Container (qrCodeContainer) was not found in the DOM."
    );
    return;
  }

  const qrImage = document.createElement("img");
  qrImage.alt = "QR Code";
  qrImage.style.maxWidth = "100%";
  qrImage.style.height = "auto";

  const spinner = document.createElement("div");
  spinner.className = "spinner";
  qrCodeContainer.appendChild(spinner);
  qrCodeContainer.classList.remove("hidden");

  try {
    const response = await fetch(
      `${QR_BACKEND_URL}?text=${encodeURIComponent(dataText)}`
    );
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    const data = await response.json();

    if (data.qr_code_image) {
      qrImage.src = `data:image/png;base64,${data.qr_code_image}`;
      qrImage.onload = () => {
        qrCodeContainer.innerHTML = "";
        qrCodeContainer.appendChild(qrImage);
        qrCodeContainer.classList.remove("hidden");
        console.log("QR code successfully displayed from backend.");
      };
      qrImage.onerror = () => {
        console.error("Error loading QR code from base64 data.");
        qrCodeContainer.innerHTML =
          '<p style="color: red;">Error: Could not load QR code.</p>';
      };
    } else {
      console.error("Backend response does not contain qr_code_image.");
      qrCodeContainer.innerHTML =
        '<p style="color: red;">Error: QR code was not generated.</p>';
    }
  } catch (error) {
    console.error("Error calling backend for QR code:", error);
    qrCodeContainer.innerHTML = `<p style="color: red;">QR code generation error: ${error.message}</p>`;
  } finally {
    if (spinner.parentNode === qrCodeContainer) {
      spinner.remove();
    }
  }
}

// --- Function to update lobby UI section (for both host and players) ---
/**
 * Updates the player list and other information in the lobby UI.
 * @param {object} roomData Object with room data from the server.
 */
function updateLobbyUI(roomData) {
  if (!roomData) return;

  // Update for host (roomSettingsSection)
  // Here, the player list and settings in roomSettingsSection should be updated
  if (roomData.hostId === socket.id) {
    if (hostPlayerList) {
      hostPlayerList.innerHTML = ""; // Clear player list
      roomData.players.forEach((player) => {
        const li = document.createElement("li");
        li.classList.add("player-item");

        // Player name
        const playerNameSpan = document.createElement("span");
        playerNameSpan.textContent = player.username;
        if (player.id === roomData.hostId) {
          playerNameSpan.textContent += " (Host)";
          playerNameSpan.classList.add("player-host");
        }
        li.appendChild(playerNameSpan);

        // Kick player button (only if not the host)
        if (player.id !== roomData.hostId) {
          const kickButton = document.createElement("button");
          kickButton.textContent = "Kick";
          kickButton.classList.add("kick-button");
          kickButton.addEventListener("click", () => {
            // Confirmation before kicking
            if (
              confirm(
                `Are you sure you want to kick player ${player.username}?`
              )
            ) {
              window.kickPlayer(player.id); // Call function from socketService.js
            }
          });
          li.appendChild(kickButton);
        }
        hostPlayerList.appendChild(li);
      });
    }
    if (settingsRoomCode) {
      settingsRoomCode.textContent = roomData.roomId;
    }

    // Update UI settings based on server data (in case the host reloads)
    if (roomData.gameSettings) {
      maxPlayersAllowedInput.value = roomData.gameSettings.maxPlayers;
      roundTimeInput.value = roomData.gameSettings.roundDuration;
      hostPlaysToggle.checked = roomData.gameSettings.hostPlays;
      numRoundsInput.value = roomData.gameSettings.numRounds;

      // Advanced settings - update toggle state based on server data
      advanceModeToggle.checked = roomData.gameSettings.advanceMode || false; // NEW: Sets toggle state
      multipleBuzzToggle.checked = roomData.gameSettings.multipleBuzz || false;
      teamsToggle.checked = roomData.gameSettings.teamsEnabled || false;
      teamSizeInput.value = roomData.gameSettings.teamSize || 1; // Updated default to 1
      numTeamsInput.value = roomData.gameSettings.numTeams || 0; // Updated default to 0
      hostStartsNextRoundToggle.checked =
        roomData.gameSettings.hostStartsNextRound || true;
      restTimeBetweenRoundsInput.value =
        roomData.gameSettings.restTimeBetweenRounds || 5;

      // Show/hide advanced settings based on state from roomData
      if (advancedSettingsContainer) {
        // Ensure the container exists
        if (roomData.gameSettings.advanceMode) {
          advancedSettingsContainer.classList.remove("hidden");
          console.log(
            "updateLobbyUI: Advanced settings container should be VISIBLE (from roomData)."
          );
        } else {
          advancedSettingsContainer.classList.add("hidden");
          console.log(
            "updateLobbyUI: Advanced settings container should be HIDDEN (from roomData)."
          );
        }
      } else {
        console.warn(
          "updateLobbyUI: advancedSettingsContainer element not found."
        );
      }
    }

    const requiredPlayers = roomData.gameSettings.hostPlays ? 1 : 2;
    if (startGameButton) {
      if (roomData.players.length >= requiredPlayers) {
        startGameButton.disabled = false;
        startGameButton.classList.remove("disabled");
      } else {
        startGameButton.disabled = true;
        startGameButton.classList.add("disabled");
      }
    }
    if (currentActiveSectionId === "roomSettingsSection") {
      generateQRCode(roomData.roomId);
    } else {
      qrCodeContainer.classList.add("hidden");
    }
  } else {
    if (lobbyPlayerList) {
      lobbyPlayerList.innerHTML = "";
      roomData.players.forEach((player) => {
        const li = document.createElement("li");
        li.textContent = player.username;
        if (player.id === roomData.hostId) {
          li.textContent += " (Host)";
          li.classList.add("player-host");
        }
        lobbyPlayerList.appendChild(li);
      });
    }
    if (lobbyRoomCode) {
      lobbyRoomCode.textContent = roomData.roomId;
    }

    if (waitingForHostText) {
      if (roomData.gameState === "LOBBY") {
        waitingForHostText.classList.remove("hidden");
      } else {
        waitingForHostText.classList.add("hidden");
      }
    }
    qrCodeContainer.classList.add("hidden");
  }
}

// --- Function to update gameplay UI section ---
/**
 * Aktualizuje herní UI na základě dat ze serveru.
 * @param {object} roomData Objekt s daty místnosti ze serveru.
 */
function updateGameplayUI(roomData) {
  if (!roomData) return;

  // Vždy aktualizuj zobrazení kola
  currentRoundDisplay.textContent = `Round ${roomData.currentRound} / ${roomData.gameSettings.numRounds}`;

  // Skryj všechny dynamické prvky na začátku každé aktualizace
  countdownDisplay.classList.add("hidden");
  buzzButton.classList.add("hidden");
  winnerDisplay.classList.add("hidden");
  nextRoundButton.classList.add("hidden");
  newGameButton.classList.add("hidden");
  leaveGameButton.classList.remove("hidden");
  cancelGameButton.classList.add("hidden"); // Skryj tlačítko pro zrušení hry

  buzzButton.disabled = true; // Výchozí stav je zakázáno

  const isHost = roomData.hostId === socket.id;

  switch (roomData.gameState) {
    case "COUNTDOWN":
      gameStateMessage.textContent = `Game starts in...`;
      countdownDisplay.textContent = roomData.countdownTime;
      countdownDisplay.classList.remove("hidden");
      if (isHost) {
        cancelGameButton.classList.remove("hidden");
      }
      break;
    case "ACTIVE_ROUND":
      gameStateMessage.textContent = "Buzz!";
      buzzButton.classList.remove("hidden");

      // Povol bzučení jen pro hráče, kteří hrají
      if (!isHost || (isHost && roomData.gameSettings.hostPlays)) {
        buzzButton.disabled = false;
        buzzButton.classList.remove("disabled");
      } else {
        buzzButton.disabled = true;
        buzzButton.classList.add("disabled");
      }
      if (isHost) {
        cancelGameButton.classList.remove("hidden");
      }
      break;
    case "ROUND_END":
      // Zobrazení vítěze kola
      if (roomData.winner) {
        gameStateMessage.textContent = `Round ended! Winner: ${roomData.winner.username}!`;
        winnerDisplay.textContent = `First to buzz: ${roomData.winner.username}`;
        winnerDisplay.classList.remove("hidden");
      } else {
        gameStateMessage.textContent = "Round ended (time expired).";
        winnerDisplay.textContent = "No one buzzed.";
        winnerDisplay.classList.remove("hidden");
      }

      // Deaktivace tlačítka pro bzučení
      buzzButton.disabled = true;
      buzzButton.classList.add("disabled");

      // Zobrazení tlačítka pro další kolo pro hostitele, pokud hra neskončila
      if (isHost && roomData.currentRound < roomData.gameSettings.numRounds) {
        nextRoundButton.classList.remove("hidden");
      }
      if (isHost) {
        cancelGameButton.classList.remove("hidden");
      }
      break;
    case "GAME_OVER":
      gameStateMessage.textContent = "Game Over!";
      winnerDisplay.textContent = "Thanks for playing!";
      winnerDisplay.classList.remove("hidden");

      // Deaktivace tlačítka pro bzučení
      buzzButton.disabled = true;
      buzzButton.classList.add("disabled");

      // Zobrazení tlačítka pro novou hru pro hostitele
      if (isHost) {
        newGameButton.classList.remove("hidden");
      }
      break;
    default:
      gameStateMessage.textContent = "Waiting for game...";
      buzzButton.disabled = true;
      buzzButton.classList.add("disabled");
      break;
  }
}

/**
 * Získá aktuální herní nastavení z formuláře pro hostitele.
 * @returns {object} Objekt s herním nastavením.
 */
function getGameSettings() {
  return {
    roundDuration: parseInt(roundTimeInput.value, 10),
    numRounds: parseInt(numRoundsInput.value, 10),
    hostPlays: hostPlaysToggle.checked,
    advanceMode: advanceModeToggle.checked,
    multipleBuzz: multipleBuzzToggle.checked,
    teamsEnabled: teamsToggle.checked,
    teamSize: parseInt(teamSizeInput.value, 10),
    numTeams: parseInt(numTeamsInput.value, 10),
    hostStartsNextRound: hostStartsNextRoundToggle.checked,
    restTimeBetweenRounds: parseInt(restTimeBetweenRoundsInput.value, 10),
    maxPlayers: parseInt(maxPlayersAllowedInput.value, 10),
  };
}

// --- window.onload Event Listener (Changed from DOMContentLoaded) ---
// Ensures that the code runs only after the entire DOM and all resources are loaded.
window.onload = () => {
  console.log("window.onload: All resources loaded, DOM is ready.");

  setTimeout(() => {
    hideLoadingScreen();
  }, 200);

  startStaggeredNavButtonAnimation(200);

  if (navButtons.length > 0) {
    navButtons.forEach((button) => {
      button.addEventListener("click", () => {
        const sectionId = button.dataset.section;
        if (sectionId) {
          showSection(sectionId);
          navButtons.forEach((btn) => btn.classList.remove("nav-button-hop"));
        }
      });
    });
  }

  if (clearGameCodeButton) {
    clearGameCodeButton.addEventListener("click", () => {
      if (joinGameCodeInput) {
        joinGameCodeInput.value = "";
      }
    });
  }

  if (quickStartButton) {
    quickStartButton.addEventListener("click", () => {
      const sectionId = quickStartButton.dataset.section;
      if (sectionId) {
        showSection(sectionId);
      }
    });
  }

  if (quickStartAccount) {
    quickStartAccount.addEventListener("click", () => {
      const sectionId = quickStartAccount.dataset.section;
      if (sectionId) {
        showSection(sectionId);
      }
    });
  }

  if (navHome) {
    navHome.addEventListener("click", () => {
      goBack();
    });
  }

  if (qrCodeScanIcon) {
    qrCodeScanIcon.addEventListener("click", () => {
      console.log("QR code icon clicked. Starting QR scanner overlay.");
      toggleQrOverlay(true);

      if (!html5QrCode) {
        html5QrCode = new Html5Qrcode("qr-reader");
      }

      html5QrCode
        .start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          (decodedText, decodedResult) => {
            console.log(`QR code scanned: ${decodedText}`);
            if (qrReaderResultsDiv)
              qrReaderResultsDiv.textContent = `Scanned: ${decodedText}`;
            if (joinGameCodeInput) joinGameCodeInput.value = decodedText;

            html5QrCode
              .stop()
              .then(() => {
                console.log("QR reader stopped after successful scan.");
                toggleQrOverlay(false);
              })
              .catch((err) => {
                console.error("Error stopping QR reader after scan:", err);
                toggleQrOverlay(false);
              });
          },
          (errorMessage) => {}
        )
        .catch((err) => {
          console.error(`Error starting QR reader: ${err}`);
          if (qrReaderResultsDiv)
            qrReaderResultsDiv.textContent = `Error: ${err.message || err}`;
          toggleQrOverlay(false);
        });
    });
  }

  if (qrOverlayCloseButton) {
    qrOverlayCloseButton.addEventListener("click", () => {
      console.log("Close overlay button clicked.");
      if (html5QrCode && html5QrCode.isScanning) {
        html5QrCode
          .stop()
          .then(() => {
            console.log("QR reader stopped manually.");
            toggleQrOverlay(false);
          })
          .catch((err) => {
            console.error("Error manually stopping QR reader:", err);
            toggleQrOverlay(false);
          });
      } else {
        toggleQrOverlay(false);
      }
    });
  }

  if (joinGameButton) {
    joinGameButton.addEventListener("click", () => {
      handleGameModeEntry("join");
    });
  }

  if (createGameButton) {
    createGameButton.addEventListener("click", () => {
      handleGameModeEntry("create");
    });
  }

  if (submitNameButton) {
    submitNameButton.addEventListener("click", () => {
      const playerName = playerNameInput.value.trim();
      if (playerName) {
        console.log(
          `Player name entered: ${playerName}. Game mode: ${gameMode}`
        );

        if (gameMode === "join") {
          const gameCode = joinGameCodeInput.value.trim();
          if (!gameCode) {
            alert("Please enter a room code!");
            return;
          }
          console.log(
            `app.js: Attempting to join room ${gameCode} with name: ${playerName}`
          );
          window.joinRoom(gameCode, playerName);
        } else if (gameMode === "create") {
          console.log(
            `app.js: Attempting to create room with name: ${playerName}`
          );
          window.createRoom(playerName);
        }
      } else {
        alert("Please enter your name!");
      }
    });
  }

  // LISTENER FOR "Update Settings" Button in roomSettingsSection
  if (updateSettingsButton) {
    updateSettingsButton.addEventListener("click", () => {
      console.log('app.js: "Update Settings" button clicked.');
      const settings = {
        maxPlayers: parseInt(maxPlayersAllowedInput.value) || 10,
        roundDuration: parseInt(roundTimeInput.value) || 30,
        hostPlays: hostPlaysToggle.checked,
        numRounds: parseInt(numRoundsInput.value) || 3,

        // Advanced settings
        advanceMode: advanceModeToggle.checked,
        multipleBuzz: multipleBuzzToggle.checked,
        teamsEnabled: teamsToggle.checked,
        teamSize: parseInt(teamSizeInput.value) || 1,
        numTeams: parseInt(numTeamsInput.value) || 0,
        hostStartsNextRound: hostStartsNextRoundToggle.checked,
        restTimeBetweenRounds: parseInt(restTimeBetweenRoundsInput.value) || 5,
      };

      if (currentRoomCode) {
        window.updateGameSettings(currentRoomCode, settings);
      }
    });
  }

  // LISTENER FOR ADVANCED MODE TOGGLE
  if (advanceModeToggle) {
    advanceModeToggle.addEventListener("change", () => {
      if (advancedSettingsContainer) {
        if (advanceModeToggle.checked) {
          advancedSettingsContainer.classList.remove("hidden");
          console.log(
            "Advanced Mode toggle: Advanced settings container should be VISIBLE."
          );
        } else {
          advancedSettingsContainer.classList.add("hidden");
          console.log(
            "Advanced Mode toggle: Advanced settings container should be HIDDEN."
          );
        }
      } else {
        console.warn(
          "Advanced Mode toggle: advancedSettingsContainer element not found."
        );
      }
    });
  }

  if (startGameButton) {
    startGameButton.addEventListener("click", () => {
      console.log("app.js: Tlačítko Start Game stisknuto.");
      const gameSettings = getGameSettings();
      startGame(currentRoomCode, gameSettings);
    });
  }

  // Zrušena obsluha pro 'gameStarted' - je nahrazena 'roomState'
  // socket.on('gameStarted', (gameSettings) => { ... });

  if (leaveLobbyButton) {
    leaveLobbyButton.addEventListener("click", () => {
      console.log('app.js: "Leave Room" button clicked.');
      if (currentRoomCode) {
        window.leaveRoom(currentRoomCode);
        currentRoomCode = null;
      }
    });
  }

  if (closeRoomButton) {
    closeRoomButton.addEventListener("click", () => {
      console.log('app.js: "Close Room" button clicked.');
      if (currentRoomCode) {
        window.leaveRoom(currentRoomCode);
        currentRoomCode = null;
      }
    });
  }

  if (buzzButton) {
    buzzButton.addEventListener("click", () => {
      console.log('app.js: "Buzz!" button clicked.');
      window.buzz();
    });
  }

  // Obsluha tlačítka pro zrušení hry
  if (cancelGameButton) {
    cancelGameButton.addEventListener("click", () => {
      console.log('app.js: "Cancel Game" button clicked.');
      if (
        confirm(
          "Are you sure you want to cancel the game? All players will be returned to the lobby."
        )
      ) {
        if (currentRoomCode) {
          window.cancelGame(currentRoomCode);
        }
      }
    });
  }

  if (nextRoundButton) {
    nextRoundButton.addEventListener("click", () => {
      console.log('app.js: "Next Round" button clicked.');
      if (currentRoomCode) {
        window.startNextRound(currentRoomCode);
      }
    });
  }

  if (newGameButton) {
    newGameButton.addEventListener("click", () => {
      console.log('app.js: "New Game" button clicked.');
      if (currentRoomCode) {
        window.resetGame(currentRoomCode);
      }
    });
  }

  if (leaveGameButton) {
    leaveGameButton.addEventListener("click", () => {
      console.log('app.js: "Leave Game" button clicked.');
      if (currentRoomCode) {
        window.leaveRoom(currentRoomCode);
        currentRoomCode = null;
      }
    });
  }

  function setDarkMode(isDark) {
    if (isDark) {
      document.body.classList.add("dark-mode");
      console.log("Dark Mode activated.");
    } else {
      document.body.classList.remove("dark-mode");
      console.log("Light Mode activated.");
    }
    localStorage.setItem("darkMode", isDark);
  }

  const savedDarkMode = localStorage.getItem("darkMode") === "true";
  if (darkModeToggle) {
    if (savedDarkMode) {
      setDarkMode(true);
      darkModeToggle.checked = true;
    } else {
      setDarkMode(false);
      darkModeToggle.checked = false;
    }

    darkModeToggle.addEventListener("change", () => {
      setDarkMode(darkModeToggle.checked);
    });
    console.log("Dark Mode toggle listener set.");
  } else {
    console.warn("Dark Mode toggle element (darkModeToggle) not found.");
  }

  // Sjednocené obsluhy událostí od serveru
  socket.on("roomState", (roomData) => {
    currentRoomState = roomData;
    console.log("app.js: Received updated room state:", roomData);

    const isCurrentUserHost = roomData.hostId === socket.id;

    // Změna sekce na základě stavu hry
    if (
      roomData.gameState === "LOBBY" ||
      roomData.gameState === "ROOM_SETTINGS"
    ) {
      // Pokud je hostitel a je v lobby, ukáže nastavení, jinak ukáže lobby
      if (isCurrentUserHost) {
        if (currentActiveSectionId !== "roomSettingsSection") {
          showSection("roomSettingsSection");
        }
      } else {
        if (currentActiveSectionId !== "lobbySection") {
          showSection("lobbySection");
        }
      }
      updateLobbyUI(roomData);
    } else {
      // Všechny ostatní stavy hry (countdown, active, end)
      if (currentActiveSectionId !== "gameplaySection") {
        showSection("gameplaySection");
      }
      updateGameplayUI(roomData);
    }
  });

  socket.on("roomCreated", (roomId) => {
    console.log(`app.js: Room successfully created! Code: ${roomId}`);
    currentRoomCode = roomId;
    playerNameInput.value = "";

    if (settingsRoomCode) {
      settingsRoomCode.textContent = roomId;
      maxPlayersAllowedInput.value = 10;
      roundTimeInput.value = 30;
      hostPlaysToggle.checked = true;
      numRoundsInput.value = 3;

      advanceModeToggle.checked = false;
      if (advancedSettingsContainer) {
        advancedSettingsContainer.classList.add("hidden");
      } else {
        console.warn(
          "roomCreated: advancedSettingsContainer element not found."
        );
      }
      multipleBuzzToggle.checked = false;
      teamsToggle.checked = false;
      teamSizeInput.value = 1;
      numTeamsInput.value = 0;
      hostStartsNextRoundToggle.checked = true;
      restTimeBetweenRoundsInput.value = 5;
    }
    showSection("roomSettingsSection");
  });

  socket.on("roomJoined", (roomId) => {
    console.log(`app.js: Successfully joined room! Code: ${roomId}`);
    currentRoomCode = roomId;
    playerNameInput.value = "";
    if (lobbyRoomCode) {
      lobbyRoomCode.textContent = roomId;
    }
    showSection("lobbySection");
  });

  socket.on("roomNotFound", () => {
    console.error("app.js: Room with this code not found.");
    alert("Room with this code does not exist. Please check the code.");
    showSection("gameSection");
  });

  socket.on("notAuthorized", (message) => {
    console.error(`app.js: Authorization/operation error: ${message}`);
    alert(`Error: ${message}`);
  });

  socket.on("roomFull", (message) => {
    alert(message);
  });

  socket.on("kickedFromRoom", (message) => {
    alert(message);
    currentRoomCode = null;
    currentRoomState = null;
    showSection("homeSection");
  });

  socket.on("roomClosed", (message) => {
    console.log(`app.js: Room closed: ${message}`);
    alert(message || "The room has been closed.");
    currentRoomCode = null;
    currentRoomState = null;
    showSection("homeSection");
    if (qrCodeContainer) {
      qrCodeContainer.innerHTML = "";
      qrCodeContainer.classList.add("hidden");
    }
  });

  socket.on("playerKicked", (username) => {
    console.log(`app.js: Player ${username} was kicked.`);
    alert(`${username} was kicked from the room.`);
  });

  socket.on("disconnect", () => {
    console.log("app.js: Disconnected from server.");
    alert(
      "You have been disconnected from the server. Please try to reconnect."
    );
    currentRoomCode = null;
    currentRoomState = null;
    showSection("homeSection");
    if (qrCodeContainer) {
      qrCodeContainer.innerHTML = "";
      qrCodeContainer.classList.add("hidden");
    }
  });
};
