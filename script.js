// State
let players = [];
let races = [];
let grandPrix = {
    active: false,
    raceNumber: 0,
    maxControllers: 4,
    currentRacers: [], // IDs of players in current race
    results: [], // [{ playerId, rank }] for current race
    history: [] // { raceNumber, results: [] }
};

const POINTS_SYSTEM = {
    1: 15,
    2: 12,
    3: 10,
    4: 9,
    5: 8,
    6: 7,
    7: 6,
    8: 5,
    9: 4,
    10: 3,
    11: 2,
    12: 1
};

// DOM Elements
const addPlayerForm = document.getElementById('add-player-form');
const playerNameInput = document.getElementById('player-name');
const raceForm = document.getElementById('race-form');
const raceWinnerSelect = document.getElementById('race-winner');
const leaderboardBody = document.getElementById('leaderboard-body');
const emptyState = document.getElementById('empty-state');
const resetBtn = document.getElementById('reset-btn');

// Grand Prix Elements
const gpSetup = document.getElementById('gp-setup');
const startGpBtn = document.getElementById('start-gp-btn');
const controllerCountInput = document.getElementById('controller-count');
const gpActiveSection = document.getElementById('gp-active');
const activeRacersGrid = document.getElementById('active-racers');
const onDeckRacersList = document.getElementById('on-deck-racers');
const raceNumberDisplay = document.getElementById('race-number');
// const resetGpBtn = document.getElementById('reset-gp-btn'); // Removed as it doesn't exist
const registrationSection = document.getElementById('registration');
const leaderboardSection = document.getElementById('leaderboard'); // Keep this for general leaderboard display

// Initialize
function init() {
    loadData();
    renderLeaderboard();
    checkPlayerCount();
    if (grandPrix.active) {
        showGpView();
        renderGpState();
    }
}

// Event Listeners
addPlayerForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = playerNameInput.value.trim();
    if (name) {
        addPlayer(name);
        playerNameInput.value = '';
    }
});

// Global function for Reset All
window.resetTournament = function () {
    if (confirm('Are you sure you want to reset the tournament? All data will be lost.')) {
        players = [];
        races = [];
        grandPrix = { active: false, raceNumber: 0, maxControllers: 4, currentRacers: [], history: [] };
        saveData();
        renderLeaderboard();
        endGrandPrix();
        // Also hide tournament complete if open
        document.getElementById('tournament-complete').style.display = 'none';
        document.getElementById('registration').style.display = 'block';
        checkPlayerCount();
    }
}

// Logic
function addPlayer(name) {
    const player = {
        id: Date.now().toString(),
        name: name,
        wins: 0,
        points: 0,
        racesPlayed: 0
    };
    players.push(player);
    saveData();
    renderLeaderboard();
    checkPlayerCount();
}

function checkPlayerCount() {
    if (players.length >= 2 && !grandPrix.active) {
        gpSetup.style.display = 'block';

        // Update max controllers based on player count
        controllerCountInput.max = players.length;

        // Adjust value if it exceeds new max
        if (parseInt(controllerCountInput.value) > players.length) {
            controllerCountInput.value = players.length;
        }
        updateFairnessRecommendation();
    } else {
        gpSetup.style.display = 'none';
    }
}

// Global function to remove a player
window.removePlayer = function (id) {
    if (confirm('Remove this player?')) {
        players = players.filter(p => p.id !== id);
        saveData();
        renderLeaderboard();
        checkPlayerCount();
    }
}

function startGrandPrix(controllers, races) {
    grandPrix.active = true;
    grandPrix.maxControllers = controllers;
    // Handle infinite races passed as string or number
    grandPrix.maxRaces = (races === '∞' || races > 12) ? Infinity : (parseInt(races) || 4);
    grandPrix.raceNumber = 1;
    grandPrix.history = [];
    grandPrix.results = []; // Initialize results array

    // Reset race counts for a new GP? 
    // Usually yes, but maybe we want to keep history?
    // Let's reset for fairness in this session.
    players.forEach(p => p.racesPlayed = 0);

    generateNextRace();
    showGpView();
    saveData();
}

function endGrandPrix() {
    grandPrix.active = false;
    grandPrix.currentRacers = [];
    saveData();
    renderLeaderboard(); // Ensure final standings are shown

    document.getElementById('gp-active').style.display = 'none';
    const summarySection = document.getElementById('tournament-complete');
    summarySection.style.display = 'block';

    // Populate summary with winner
    // Populate summary with winner(s)
    console.log("Ending Grand Prix. Players:", JSON.parse(JSON.stringify(players)));

    const sorted = [...players].sort((a, b) => b.points - a.points);
    const maxPoints = sorted[0]?.points || 0;
    const winners = sorted.filter(p => p.points === maxPoints);

    console.log("Max Points:", maxPoints);
    console.log("Winners:", winners);

    if (winners.length > 0) {
        const h2 = summarySection.querySelector('h2');
        const winnerNames = winners.map(w => w.name).join(' & ');
        const titleText = winners.length > 1 ? "It's a Tie!" : "Tournament Complete!";
        const winText = winners.length > 1 ? "Win!" : "Wins!";

        h2.innerHTML = `
            <div style="margin-bottom: 1rem;">
                <img src="assets/trophy.png" alt="Winner Trophy" class="winner-trophy">
            </div>
            ${titleText}<br>
            <span style="font-size: 2rem; color: var(--primary-color); text-shadow: 0 0 20px rgba(255, 215, 0, 0.5);">${winnerNames} ${winText}</span>
        `;
    }
}

function startNewTournament() {
    // Soft reset: Keep players, reset stats
    players.forEach(p => {
        p.points = 0;
        p.wins = 0;
        p.racesPlayed = 0;
    });
    grandPrix.history = [];
    grandPrix.results = [];
    saveData();
    renderLeaderboard();

    document.getElementById('tournament-complete').style.display = 'none';
    document.getElementById('registration').style.display = 'block';
    checkPlayerCount();
}

// Event Listeners for new buttons
// Global function for HTML onclick access
window.confirmEndGp = function () {
    // Direct action, no confirm dialog to avoid issues
    endGrandPrix();
}

// Global function for number input adjustment
window.adjustValue = function (elementId, delta) {
    const input = document.getElementById(elementId);
    if (!input) return;

    // Handle Infinite case for race count
    if (elementId === 'race-count') {
        let currentVal = input.value === '∞' ? 13 : parseInt(input.value);
        let newVal = currentVal + delta;

        if (newVal > 12) {
            input.value = '∞';
        } else if (newVal < 1) {
            input.value = 1;
        } else {
            input.value = newVal;
        }
        return;
    }

    let val = parseInt(input.value) + delta;
    const max = parseInt(input.max);
    const min = parseInt(input.min);

    if (val > max) val = max;
    if (val < min) val = min;

    input.value = val;

    if (elementId === 'controller-count') {
        updateFairnessRecommendation();
    }
}

// Event Listeners for new buttons
// Keeping delegation for new tournament button just in case
document.addEventListener('click', (e) => {
    const newTournamentBtn = e.target.closest('#new-tournament-btn');
    if (newTournamentBtn) {
        startNewTournament();
    }
});

function showGpView() {
    document.getElementById('registration').style.display = 'none';
    document.getElementById('gp-active').style.display = 'flex'; // Use flex to maintain layout
    document.getElementById('tournament-complete').style.display = 'none';
}

function generateNextRace() {
    // Fair Queue Algorithm
    // 1. Sort players by racesPlayed (ascending)
    // 2. Tie-breaker: Random shuffle (to avoid same groups always)

    // Create a copy to sort
    const sorted = [...players].sort((a, b) => {
        if (a.racesPlayed !== b.racesPlayed) {
            return a.racesPlayed - b.racesPlayed;
        }
        return 0.5 - Math.random();
    });

    // Pick top N
    const count = Math.min(grandPrix.maxControllers, players.length);
    const nextRacers = sorted.slice(0, count);

    grandPrix.currentRacers = nextRacers.map(p => p.id);

    renderGpState();
}

function renderGpState() {
    raceNumberDisplay.textContent = grandPrix.raceNumber;

    // Render Active Racers
    activeRacersGrid.innerHTML = '';

    // Update header to guide user
    const currentRank = grandPrix.results.length + 1;
    const trackDisplay = document.getElementById('current-track-display');

    if (grandPrix.results.length === grandPrix.currentRacers.length) {
        trackDisplay.textContent = "All set! Confirm results to finish.";
        trackDisplay.style.color = "var(--primary-color)";
    } else {
        trackDisplay.textContent = `Select ${getOrdinal(currentRank)} Place`;
        trackDisplay.style.color = "var(--text-secondary)";
    }

    // Update Race Badge
    const badge = document.querySelector('.race-badge');
    if (badge) {
        if (grandPrix.maxRaces === Infinity) {
            badge.innerHTML = `RACE <span id="race-number">${grandPrix.raceNumber}</span>`;
        } else {
            badge.innerHTML = `RACE <span id="race-number">${grandPrix.raceNumber}</span> / ${grandPrix.maxRaces}`;
        }
    }

    grandPrix.currentRacers.forEach(id => {
        const player = players.find(p => p.id === id);
        if (player) {
            const chip = document.createElement('div');
            chip.className = 'racer-chip';

            // Check if already ranked
            const result = grandPrix.results.find(r => r.playerId === id);

            if (result) {
                chip.classList.add('ranked');
                // Only animate if it's the most recent one (highest rank number currently assigned)
                const isNewest = result.rank === grandPrix.results.length;
                const animateClass = isNewest ? 'animate' : '';
                chip.innerHTML = `
                    <span>${player.name}</span>
                    <div class="rank-badge rank-${result.rank} ${animateClass}">${getOrdinal(result.rank)}</div>
                `;
                // Allow deselecting? For now, maybe just block interaction or allow reset
                chip.onclick = () => {
                    // Optional: Undo logic could go here
                };
            } else {
                chip.textContent = player.name;
                // Add click handler for selection
                chip.onclick = () => {
                    selectRacerRank(player.id);
                };
            }

            activeRacersGrid.appendChild(chip);
        }
    });

    // Add Confirm/Reset Buttons if needed
    updateRaceActions();

    // Render On Deck (Next likely group)
    // Simulate next race generation
    // 1. Assume current racers finish (+1 race played)
    const simulatedPlayers = players.map(p => ({
        ...p,
        racesPlayed: grandPrix.currentRacers.includes(p.id) ? (p.racesPlayed || 0) + 1 : (p.racesPlayed || 0)
    }));

    // 2. Sort using Fair Queue logic
    const sortedNext = simulatedPlayers.sort((a, b) => {
        if (a.racesPlayed !== b.racesPlayed) {
            return a.racesPlayed - b.racesPlayed;
        }
        // Deterministic tie-breaker for UI stability (e.g., name) 
        // or keep random if we want to show it's dynamic? 
        // Let's use name for stability in "Up Next" view
        return a.name.localeCompare(b.name);
    });

    // 3. Pick top N
    const nextCount = Math.min(grandPrix.maxControllers, players.length);
    const nextRacers = sortedNext.slice(0, nextCount);

    onDeckRacersList.innerHTML = '';
    nextRacers.forEach(p => {
        const chip = document.createElement('div');
        chip.className = 'mini-chip';
        chip.textContent = `${p.name} (${p.racesPlayed})`; // Show projected count? Or current? Let's show current for clarity
        // Actually, showing projected count might be confusing if it hasn't happened yet.
        // Let's show the name and maybe a "Next" indicator if needed.
        // Reverting to showing just name and current count from real player object
        const realPlayer = players.find(rp => rp.id === p.id);
        chip.textContent = `${realPlayer.name} (${realPlayer.racesPlayed})`;
        onDeckRacersList.appendChild(chip);
    });

    renderRaceCounts();
}

function renderRaceCounts() {
    const grid = document.getElementById('race-stats-grid');
    if (!grid) return;

    grid.innerHTML = '';

    // Sort by name for easy lookup
    const sorted = [...players].sort((a, b) => a.name.localeCompare(b.name));

    sorted.forEach(p => {
        const div = document.createElement('div');
        div.className = 'stat-chip';
        div.innerHTML = `<span style="color: var(--text-primary)">${p.name}</span>: ${p.racesPlayed || 0}`;

        // Highlight if they are currently racing
        if (grandPrix.currentRacers.includes(p.id)) {
            div.style.borderColor = 'var(--primary-color)';
            div.style.background = 'rgba(14, 165, 233, 0.1)';
        }

        grid.appendChild(div);
    });
}


function selectRacerRank(playerId) {
    if (grandPrix.results.find(r => r.playerId === playerId)) return;

    const rank = grandPrix.results.length + 1;
    grandPrix.results.push({ playerId, rank });
    renderGpState();
}

function updateRaceActions() {
    const resetBtn = document.getElementById('reset-selection-btn');
    const confirmBtn = document.getElementById('confirm-results-btn');

    // Reset Button Visibility
    if (grandPrix.results.length > 0) {
        resetBtn.style.visibility = 'visible';
        resetBtn.onclick = () => {
            grandPrix.results = [];
            renderGpState();
        };
    } else {
        resetBtn.style.visibility = 'hidden';
    }

    // Confirm Button State
    const isComplete = grandPrix.results.length === grandPrix.currentRacers.length && grandPrix.currentRacers.length > 0;

    if (isComplete) {
        confirmBtn.disabled = false;
        confirmBtn.style.opacity = '1';
        confirmBtn.style.cursor = 'pointer';
        confirmBtn.textContent = 'Confirm Results';
        confirmBtn.onclick = () => {
            submitRaceResults();
        };
    } else {
        confirmBtn.disabled = true;
        confirmBtn.style.opacity = '0.5';
        confirmBtn.style.cursor = 'not-allowed';
        confirmBtn.textContent = `Select ${getOrdinal(grandPrix.results.length + 1)} Place`;
    }
}

function calculateFairRaceCounts(playerCount, controllerCount) {
    if (playerCount < 2 || controllerCount < 1) return [];

    const fairCounts = [];
    // Check all race counts from 1 to 12
    for (let r = 1; r <= 12; r++) {
        // Total slots = races * controllers
        // If total slots is divisible by player count, everyone plays equal times
        if ((r * controllerCount) % playerCount === 0) {
            fairCounts.push(r);
        }
    }

    return fairCounts;
}

function updateFairnessRecommendation() {
    const recDiv = document.getElementById('fairness-recommendation');
    const pCount = players.length;
    const cCount = parseInt(document.getElementById('controller-count').value) || 4;

    if (pCount < 2) {
        recDiv.style.display = 'none';
        return;
    }

    const fairCounts = calculateFairRaceCounts(pCount, cCount);

    if (fairCounts.length > 0) {
        recDiv.style.display = 'block';
        recDiv.innerHTML = `
            <span style="color: var(--text-secondary); font-size: 0.8rem;">Fair: </span>
            ${fairCounts.map(c => `<span class="fair-badge" onclick="setRaceCount(${c})">${c}</span>`).join('')}
        `;
    } else {
        recDiv.style.display = 'none';
    }
}

// Helper to set race count from badge
window.setRaceCount = function (count) {
    const input = document.getElementById('race-count');
    if (input) {
        input.value = count;
    }
}

function getOrdinal(n) {
    const s = ["th", "st", "nd", "rd"];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
}



function submitRaceResults() {
    try {
        // Distribute points
        grandPrix.results.forEach(result => {
            const player = players.find(p => p.id === result.playerId);
            if (player) {
                const points = POINTS_SYSTEM[result.rank] || 1;
                player.points += points;

                if (result.rank === 1) {
                    player.wins += 1;
                }

                // Update participation count
                player.racesPlayed = (player.racesPlayed || 0) + 1;
            }
        });

        // Save history
        grandPrix.history.push({
            raceNumber: grandPrix.raceNumber,
            results: [...grandPrix.results]
        });

        // Update leaderboard immediately with new points
        renderLeaderboard();

        // Check if tournament should end (only if not infinite)
        if (grandPrix.maxRaces !== Infinity && grandPrix.raceNumber >= grandPrix.maxRaces) {
            endGrandPrix();
            return;
        }

        // Prepare next race
        grandPrix.raceNumber++;
        grandPrix.results = []; // Clear for next race

        saveData();

        // Transition to next race
        generateNextRace();
        renderGpState();
        renderLeaderboard(); // Update leaderboard with new points
    } catch (error) {
        console.error("Error submitting results:", error);
        alert(`Something went wrong saving the results: ${error.message}`);
    }
}


function renderLeaderboard() {
    leaderboardBody.innerHTML = '';

    if (players.length === 0) {
        emptyState.style.display = 'block';
        return;
    }

    emptyState.style.display = 'none';

    // Sort players by points (descending)
    const sortedPlayers = [...players].sort((a, b) => b.points - a.points);

    let currentRank = 1;
    sortedPlayers.forEach((player, index) => {
        // Check for tie with previous player
        if (index > 0 && player.points < sortedPlayers[index - 1].points) {
            currentRank = index + 1;
        }
        // If points are equal, currentRank stays the same (tie)

        const rankDisplay = `#${currentRank}`;
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td class="rank-cell">
                <div class="rank-indicator rank-${currentRank}">${rankDisplay}</div>
            </td>
            <td class="player-cell">
                <span class="player-name">${player.name}</span>
            </td>
            <td class="wins-cell">${player.wins}</td>
            <td class="points-cell">${player.points}</td>
            <td class="actions-cell">
                <button class="btn-icon-danger" onclick="removePlayer('${player.id}')" title="Remove Player">×</button>
            </td>
        `;
        leaderboardBody.appendChild(tr);
    });
}

// Persistence
function saveData() {
    localStorage.setItem('mario-players', JSON.stringify(players));
    localStorage.setItem('mario-races', JSON.stringify(races));
    localStorage.setItem('mario-gp', JSON.stringify(grandPrix));
}

function loadData() {
    const savedPlayers = localStorage.getItem('mario-players');
    if (savedPlayers) players = JSON.parse(savedPlayers);

    const savedGp = localStorage.getItem('mario-gp');
    if (savedGp) {
        grandPrix = JSON.parse(savedGp);
        if (!grandPrix.results) grandPrix.results = []; // Backwards compatibility
        if (!grandPrix.history) grandPrix.history = []; // Backwards compatibility
    }
}

// Start App
init();
