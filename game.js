// Game state
const gameState = {
    player: { x: 1, y: 1, emoji: '🧔' },
    cave: { x: 8, y: 8, emoji: '🏠' },
    maze: [],
    beans: [],
    dinosaurs: [],
    items: [],
    gridSize: 10,
    inventory: {
        beans: 0,
        tools: ['rock']
    },
    stats: {
        lives: 3,
        coffeesBrewed: 0
    },
    fighting: null,
    gameStarted: false
};

// Dinosaur types with hats
const dinoTypes = [
    { emoji: '🦖', name: 'T-Rex', preference: 'rock', sight: 3 },
    { emoji: '🦕', name: 'Brontosaurus', preference: 'paper', sight: 3 },
    { emoji: '🦡', name: 'Raptor', preference: 'scissors', sight: 4 }
];

// Hats array
const hats = ['🎩', '🧢', '🎓'];

// DOM Elements
const gridEl = document.getElementById('grid');
const livesEl = document.getElementById('lives');
const beansEl = document.getElementById('beans');
const toolsEl = document.getElementById('tools');
const coffeesEl = document.getElementById('coffees');
const startBtn = document.getElementById('start-btn');
const brewBtn = document.getElementById('brew-btn');
const fightArea = document.getElementById('fight-area');
const dinoTypeEl = document.getElementById('dino-type');
const rpsResult = document.getElementById('rps-result');
const continueBtn = document.getElementById('continue-btn');
const tutorialModal = document.getElementById('tutorial-modal');
const gameOverModal = document.getElementById('game-over-modal');
const finalScoreEl = document.getElementById('final-score');
const restartBtn = document.getElementById('restart-btn');
const tutorialCloseBtn = document.getElementById('tutorial-close');

// Initialize the game
function initGame() {
    // Create the grid
    createGrid();
    
    // Set up event listeners
    startBtn.addEventListener('click', startGame);
    brewBtn.addEventListener('click', brewCoffee);
    document.getElementById('rock').addEventListener('click', () => makeChoice('rock'));
    document.getElementById('paper').addEventListener('click', () => makeChoice('paper'));
    document.getElementById('scissors').addEventListener('click', () => makeChoice('scissors'));
    continueBtn.addEventListener('click', endFight);
    restartBtn.addEventListener('click', restartGame);
    tutorialCloseBtn.addEventListener('click', () => {
        tutorialModal.style.display = 'none';
    });
    
    // Add listeners for brew minigame buttons if they exist
    const brewStartBtn = document.getElementById('brew-start');
    const brewCancelBtn = document.getElementById('brew-cancel');
    if (brewStartBtn && brewCancelBtn) {
        brewStartBtn.addEventListener('click', () => {
            // Will be set up in the startBrewingMinigame function
        });
        brewCancelBtn.addEventListener('click', () => {
            document.getElementById('brew-minigame').style.display = 'none';
        });
    }
    
    // Show tutorial on first load
    tutorialModal.style.display = 'flex';
}

// Create the grid
function createGrid() {
    gridEl.innerHTML = '';
    for (let y = 0; y < gameState.gridSize; y++) {
        for (let x = 0; x < gameState.gridSize; x++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.dataset.x = x;
            cell.dataset.y = y;
            cell.addEventListener('click', () => handleCellClick(x, y));
            gridEl.appendChild(cell);
        }
    }
}

// Start the game
function startGame() {
    if (gameState.gameStarted) return;
    
    // Generate maze layout
    generateMaze();
    
    // Place entities
    placeEntities();
    
    // Update UI
    updateUI();
    
    // Hide start button
    startBtn.style.display = 'none';
    
    gameState.gameStarted = true;
}

// Generate maze
function generateMaze() {
    // Create empty maze
    gameState.maze = [];
    
    // First, fill the entire maze with walls
    for (let y = 0; y < gameState.gridSize; y++) {
        const row = [];
        for (let x = 0; x < gameState.gridSize; x++) {
            // Border walls
            if (x === 0 || y === 0 || x === gameState.gridSize - 1 || y === gameState.gridSize - 1) {
                row.push(1); // Wall
            } else {
                row.push(0); // Path
            }
        }
        gameState.maze.push(row);
    }
    
    // Now add some internal walls (25% chance)
    for (let y = 1; y < gameState.gridSize - 1; y++) {
        for (let x = 1; x < gameState.gridSize - 1; x++) {
            // Skip player and cave positions
            if ((x === gameState.player.x && y === gameState.player.y) || 
                (x === gameState.cave.x && y === gameState.cave.y)) {
                continue;
            }
            
            // 25% chance for wall
            if (Math.random() < 0.25) {
                gameState.maze[y][x] = 1;
            }
        }
    }
    
    // Ensure the maze is fully connected
    ensureMazeConnectivity();
    
    // Ensure player and cave positions are paths
    gameState.maze[gameState.player.y][gameState.player.x] = 0;
    gameState.maze[gameState.cave.y][gameState.cave.x] = 0;
    
    // Ensure paths around the cave
    gameState.maze[gameState.cave.y-1][gameState.cave.x] = 0;
    gameState.maze[gameState.cave.y][gameState.cave.x-1] = 0;
}

// Ensure all path cells in the maze are connected
function ensureMazeConnectivity() {
    // Create a copy of the maze to track visited cells
    const visited = [];
    for (let y = 0; y < gameState.gridSize; y++) {
        const row = [];
        for (let x = 0; x < gameState.gridSize; x++) {
            row.push(false);
        }
        visited.push(row);
    }
    
    // Flood fill from player position
    const queue = [{x: gameState.player.x, y: gameState.player.y}];
    visited[gameState.player.y][gameState.player.x] = true;
    
    while (queue.length > 0) {
        const current = queue.shift();
        
        // Check all four directions
        const directions = [
            {dx: 0, dy: -1}, // Up
            {dx: 1, dy: 0},  // Right
            {dx: 0, dy: 1},  // Down
            {dx: -1, dy: 0}  // Left
        ];
        
        for (const dir of directions) {
            const nx = current.x + dir.dx;
            const ny = current.y + dir.dy;
            
            // Check if in bounds
            if (nx <= 0 || ny <= 0 || nx >= gameState.gridSize - 1 || ny >= gameState.gridSize - 1) {
                continue;
            }
            
            // If it's a path and not visited, add to queue
            if (gameState.maze[ny][nx] === 0 && !visited[ny][nx]) {
                queue.push({x: nx, y: ny});
                visited[ny][nx] = true;
            }
        }
    }
    
    // Find all unvisited path cells and connect them to a visited neighbor
    for (let y = 1; y < gameState.gridSize - 1; y++) {
        for (let x = 1; x < gameState.gridSize - 1; x++) {
            // If it's a path cell but wasn't visited
            if (gameState.maze[y][x] === 0 && !visited[y][x]) {
                // Find a visited neighbor
                let foundConnection = false;
                const directions = [
                    {dx: 0, dy: -1}, // Up
                    {dx: 1, dy: 0},  // Right
                    {dx: 0, dy: 1},  // Down
                    {dx: -1, dy: 0}  // Left
                ];
                
                // Shuffle directions for randomness
                for (let i = directions.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [directions[i], directions[j]] = [directions[j], directions[i]];
                }
                
                for (const dir of directions) {
                    const nx = x + dir.dx;
                    const ny = y + dir.dy;
                    
                    if (nx <= 0 || ny <= 0 || nx >= gameState.gridSize - 1 || ny >= gameState.gridSize - 1) {
                        continue;
                    }
                    
                    // If neighbor is visited, create a path
                    if (visited[ny][nx]) {
                        // Create a path from the unvisited cell to this visited cell
                        gameState.maze[y][x] = 0;
                        
                        // If there's a wall between them, remove it
                        if (gameState.maze[ny][nx] === 1) {
                            gameState.maze[ny][nx] = 0;
                        }
                        
                        foundConnection = true;
                        break;
                    }
                }
                
                // If we couldn't find a connection, just make it a wall
                if (!foundConnection) {
                    gameState.maze[y][x] = 1;
                }
            }
        }
    }
    
    // Now do a final connectivity check
    // If there are still unreachable path cells, convert them to walls
    for (let y = 1; y < gameState.gridSize - 1; y++) {
        for (let x = 1; x < gameState.gridSize - 1; x++) {
            if (gameState.maze[y][x] === 0 && !isReachable(x, y)) {
                gameState.maze[y][x] = 1;
            }
        }
    }
}

// Check if a cell is reachable from the player position
function isReachable(targetX, targetY) {
    // Create a copy of the maze to track visited cells
    const visited = [];
    for (let y = 0; y < gameState.gridSize; y++) {
        const row = [];
        for (let x = 0; x < gameState.gridSize; x++) {
            row.push(false);
        }
        visited.push(row);
    }
    
    // Flood fill from player position
    const queue = [{x: gameState.player.x, y: gameState.player.y}];
    visited[gameState.player.y][gameState.player.x] = true;
    
    while (queue.length > 0) {
        const current = queue.shift();
        
        // Check if we've reached the target
        if (current.x === targetX && current.y === targetY) {
            return true;
        }
        
        // Check all four directions
        const directions = [
            {dx: 0, dy: -1}, // Up
            {dx: 1, dy: 0},  // Right
            {dx: 0, dy: 1},  // Down
            {dx: -1, dy: 0}  // Left
        ];
        
        for (const dir of directions) {
            const nx = current.x + dir.dx;
            const ny = current.y + dir.dy;
            
            // Check if in bounds
            if (nx < 0 || ny < 0 || nx >= gameState.gridSize || ny >= gameState.gridSize) {
                continue;
            }
            
            // If it's a path and not visited, add to queue
            if (gameState.maze[ny][nx] === 0 && !visited[ny][nx]) {
                queue.push({x: nx, y: ny});
                visited[ny][nx] = true;
            }
        }
    }
    
    // If we've exhausted the queue without finding the target, it's not reachable
    return false;
}

// Place entities in the maze
function placeEntities() {
    // Clear entities
    gameState.beans = [];
    gameState.dinosaurs = [];
    gameState.items = [];
    
    // Place beans (10-15)
    for (let i = 0; i < 15; i++) {
        const pos = findEmptyCell();
        if (pos) {
            gameState.beans.push({ x: pos.x, y: pos.y, emoji: '🫘' });
        }
    }
    
    // Place dinosaurs (3)
    for (let i = 0; i < 3; i++) {
        const pos = findEmptyCell();
        if (pos) {
            const dinoType = dinoTypes[i % dinoTypes.length];
            // Add a random hat to the dinosaur
            const randomHat = hats[Math.floor(Math.random() * hats.length)];
            // We'll display the dinosaur and hat separately in the UI
            
            gameState.dinosaurs.push({
                x: pos.x,
                y: pos.y,
                emoji: dinoType.emoji,
                type: dinoType.name,
                preference: dinoType.preference,
                hat: randomHat
            });
        }
    }
    
    // Place scissors
    const scissorsPos = findEmptyCell();
    if (scissorsPos) {
        gameState.items.push({ 
            x: scissorsPos.x, 
            y: scissorsPos.y, 
            emoji: '✂️', 
            type: 'scissors' 
        });
    }
    
    // Place paper
    const paperPos = findEmptyCell();
    if (paperPos) {
        gameState.items.push({ 
            x: paperPos.x, 
            y: paperPos.y, 
            emoji: '📜', 
            type: 'paper' 
        });
    }
}

// Find an empty cell in the maze
function findEmptyCell() {
    let attempts = 0;
    
    while (attempts < 50) {
        const x = Math.floor(Math.random() * (gameState.gridSize - 2)) + 1;
        const y = Math.floor(Math.random() * (gameState.gridSize - 2)) + 1;
        
        // Check if it's a path and not occupied
        if (gameState.maze[y][x] === 0 && isEmptyCell(x, y)) {
            return { x, y };
        }
        
        attempts++;
    }
    
    return null;
}

// Check if a cell is empty
function isEmptyCell(x, y) {
    // Check player
    if (gameState.player.x === x && gameState.player.y === y) return false;
    
    // Check cave
    if (gameState.cave.x === x && gameState.cave.y === y) return false;
    
    // Check beans
    if (gameState.beans.some(bean => bean.x === x && bean.y === y)) return false;
    
    // Check dinosaurs
    if (gameState.dinosaurs.some(dino => dino.x === x && dino.y === y)) return false;
    
    // Check items
    if (gameState.items.some(item => item.x === x && item.y === y)) return false;
    
    return true;
}

// Handle cell click
function handleCellClick(x, y) {
    if (!gameState.gameStarted || gameState.fighting) return;
    
    // Check if adjacent to player
    const dx = Math.abs(x - gameState.player.x);
    const dy = Math.abs(y - gameState.player.y);
    
    // Must be adjacent (non-diagonal) and not a wall
    if (dx + dy === 1 && gameState.maze[y][x] === 0) {
        movePlayer(x, y);
    }
}

// Move player
function movePlayer(x, y) {
    // Update player position
    gameState.player.x = x;
    gameState.player.y = y;
    
    // Check for collisions
    checkCollisions();
    
    // Move dinosaurs
    moveDinosaurs();
    
    // Check for dinosaur collisions
    checkDinosaurCollisions();
    
    // Update UI
    updateUI();
}

// Check for collisions with items/beans
function checkCollisions() {
    // Check for bean collision
    const beanIndex = gameState.beans.findIndex(bean => 
        bean.x === gameState.player.x && bean.y === gameState.player.y
    );
    
    if (beanIndex !== -1) {
        gameState.inventory.beans++;
        gameState.beans.splice(beanIndex, 1);
    }
    
    // Check for item collision
    const itemIndex = gameState.items.findIndex(item => 
        item.x === gameState.player.x && item.y === gameState.player.y
    );
    
    if (itemIndex !== -1) {
        const item = gameState.items[itemIndex];
        
        if (!gameState.inventory.tools.includes(item.type)) {
            gameState.inventory.tools.push(item.type);
        }
        
        gameState.items.splice(itemIndex, 1);
        
        // Update tool visibility in fight area
        updateToolAvailability();
    }
    
    // Check if at cave
    if (gameState.player.x === gameState.cave.x && gameState.player.y === gameState.cave.y) {
        brewBtn.disabled = gameState.inventory.beans < 10;
        // Show how many beans you have and how many you need
        if (gameState.inventory.beans < 10) {
            beansEl.innerHTML = `<span style="color: ${gameState.inventory.beans >= 5 ? 'gold' : 'salmon'}">${gameState.inventory.beans}/10</span>`;
        } else {
            beansEl.innerHTML = `<span style="color: lightgreen">${gameState.inventory.beans}/10</span>`;
        }
    } else {
        brewBtn.disabled = true;
        beansEl.textContent = gameState.inventory.beans + '/10';
    }
}

// Update tool availability in the fight area
function updateToolAvailability() {
    document.getElementById('rock').classList.toggle('disabled', !gameState.inventory.tools.includes('rock'));
    document.getElementById('paper').classList.toggle('disabled', !gameState.inventory.tools.includes('paper'));
    document.getElementById('scissors').classList.toggle('disabled', !gameState.inventory.tools.includes('scissors'));
}

// Check for collisions with dinosaurs
function checkDinosaurCollisions() {
    for (let i = 0; i < gameState.dinosaurs.length; i++) {
        const dino = gameState.dinosaurs[i];
        
        if (dino.x === gameState.player.x && dino.y === gameState.player.y) {
            // Start fight
            startFight(dino);
            break;
        }
    }
}

// Move dinosaurs
function moveDinosaurs() {
    gameState.dinosaurs.forEach(dino => {
        // Simple movement - move randomly with 50% chance
        if (Math.random() < 0.5) {
            // Possible directions: up, right, down, left
            const directions = [
                { dx: 0, dy: -1 },
                { dx: 1, dy: 0 },
                { dx: 0, dy: 1 },
                { dx: -1, dy: 0 }
            ];
            
            // Shuffle directions
            for (let i = directions.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [directions[i], directions[j]] = [directions[j], directions[i]];
            }
            
            // Try each direction
            for (const dir of directions) {
                const newX = dino.x + dir.dx;
                const newY = dino.y + dir.dy;
                
                // Check if valid move
                if (newX > 0 && newX < gameState.gridSize - 1 && 
                    newY > 0 && newY < gameState.gridSize - 1 && 
                    gameState.maze[newY][newX] === 0 && 
                    isEmptyCell(newX, newY)) {
                    
                    dino.x = newX;
                    dino.y = newY;
                    break;
                }
            }
        }
    });
}

// Start fight with dinosaur
function startFight(dino) {
    gameState.fighting = dino;
    
    // Custom intro based on hat type
    let introText;
    if (dino.hat === '🎩') {
        introText = `${dino.type} Gentleman`;
    } else if (dino.hat === '🎓') {
        introText = `Burnt-out Graduate ${dino.type}`;
    } else if (dino.hat === '🧢') {
        introText = `Punk ${dino.type}`;
    }
    
    dinoTypeEl.textContent = introText;
    rpsResult.textContent = '';
    continueBtn.style.display = 'none';
    updateToolAvailability();
    
    // Add dinosaur's pre-fight speech based on hat type
    const speechDiv = document.createElement('div');
    speechDiv.className = 'dino-speech';
    
    // Predetermined choice based on hat type
    let actualChoice, declaredChoice;
    
    if (dino.hat === '🎩') {
        // Top hat dinosaur always tells the truth about their move
        actualChoice = getDinoChoice(dino);
        declaredChoice = actualChoice;
        
        let speechText;
        if (declaredChoice === 'rock') {
            speechText = "I say, I shall be using rock this round. A gentleman always announces his move!";
        } else if (declaredChoice === 'paper') {
            speechText = "I do believe paper is the appropriate choice for this engagement.";
        } else {
            speechText = "Scissors shall be my weapon of choice, as any proper gentleman would declare.";
        }
        speechDiv.textContent = speechText;
        
    } else if (dino.hat === '🎓') {
        // Graduate dinosaur always uses the same move each fight (store on the dino object)
        if (!dino.graduateChoice) {
            // First time fighting this graduate, assign a consistent choice
            const choices = ['rock', 'paper', 'scissors'];
            dino.graduateChoice = choices[Math.floor(Math.random() * choices.length)];
        }
        
        actualChoice = dino.graduateChoice;
        
        // Disinterested speech, doesn't reveal their move
        const speeches = [
            "Ugh, whatever. Let's just get this over with.",
            "I've got student loans and a thesis to finish...",
            "I learned game theory but I'm too tired to apply it.",
            "Same strategy as always. Why change what barely works?"
        ];
        speechDiv.textContent = speeches[Math.floor(Math.random() * speeches.length)];
        
    } else if (dino.hat === '🧢') {
        // Punk dinosaur always lies about their move
        actualChoice = getDinoChoice(dino);
        
        // Choose something that's NOT the actual choice
        const choices = ['rock', 'paper', 'scissors'].filter(c => c !== actualChoice);
        declaredChoice = choices[Math.floor(Math.random() * choices.length)];
        
        let speechText;
        if (declaredChoice === 'rock') {
            speechText = "Yo, I'm TOTALLY gonna use rock! *snickers*";
        } else if (declaredChoice === 'paper') {
            speechText = "Paper's my move, bro! Trust me! *winks mockingly*";
        } else {
            speechText = "Scissors, dude! That's what I'm using! *crosses fingers behind back*";
        }
        speechDiv.textContent = speechText;
    }
    
    // Store the actual choice on the dino object for this round
    dino.currentChoice = actualChoice;
    
    // Add speech bubble before the RPS choices
    const rpsChoicesDiv = document.querySelector('.rps-choices');
    fightArea.insertBefore(speechDiv, rpsChoicesDiv);
    
    fightArea.style.display = 'block';
}

// Get dinosaur choice
function getDinoChoice(dino) {
    if (!dino) dino = gameState.fighting;
    
    // If the dinosaur already has a choice for this round, return it
    if (dino.currentChoice) {
        return dino.currentChoice;
    }
    
    const rand = Math.random();
    
    // 60% chance to use preferred choice
    if (rand < 0.6) {
        return dino.preference;
    }
    
    // 40% chance for random choice
    const choices = ['rock', 'paper', 'scissors'];
    const otherChoices = choices.filter(c => c !== dino.preference);
    return otherChoices[Math.floor(Math.random() * otherChoices.length)];
}

// Make a choice in rock-paper-scissors
function makeChoice(playerChoice) {
    if (!gameState.fighting || !gameState.inventory.tools.includes(playerChoice)) return;
    
    // Get dinosaur choice (already determined in startFight)
    const dinoChoice = gameState.fighting.currentChoice;
    
    // Determine winner
    let result;
    if (playerChoice === dinoChoice) {
        result = 'draw';
    } else if (
        (playerChoice === 'rock' && dinoChoice === 'scissors') ||
        (playerChoice === 'paper' && dinoChoice === 'rock') ||
        (playerChoice === 'scissors' && dinoChoice === 'paper')
    ) {
        result = 'win';
    } else {
        result = 'lose';
    }
    
    // Show result
    let resultHTML = '';
    const playerEmoji = playerChoice === 'rock' ? '🪨' : playerChoice === 'paper' ? '📜' : '✂️';
    const dinoEmoji = dinoChoice === 'rock' ? '🪨' : dinoChoice === 'paper' ? '📜' : '✂️';
    
    resultHTML += `You chose ${playerEmoji} | Dino chose ${dinoEmoji}<br>`;
    
    // Get custom dialogue based on hat type
    const hat = gameState.fighting.hat;
    
    if (result === 'win') {
        if (hat === '🎩') {
            resultHTML += '<span style="color: lightgreen">You win! "I say, jolly good show! I shall retreat with dignity," says the dinosaur as it tips its top hat and walks away.</span>';
        } else if (hat === '🎓') {
            resultHTML += '<span style="color: lightgreen">You win! "Whatever. I didn\'t even study for this fight," sighs the burnt-out graduate dinosaur as it trudges away.</span>';
        } else if (hat === '🧢') {
            resultHTML += '<span style="color: lightgreen">You win! "This is SO unfair! I\'ll get you next time!" yells the punk dinosaur as it stomps away angrily.</span>';
        }
    } else if (result === 'lose') {
        if (hat === '🎩') {
            resultHTML += '<span style="color: salmon">You lose! "I do apologize for the inconvenience, but I must insist on eating you now," says the gentleman dinosaur, adjusting its monocle.</span>';
        } else if (hat === '🎓') {
            resultHTML += '<span style="color: salmon">You lose! "I\'ve got student loans to pay. Nothing personal," mumbles the graduate dinosaur with dead eyes.</span>';
        } else if (hat === '🧢') {
            resultHTML += '<span style="color: salmon">You lose! "HA! Take that, cave-loser! Who\'s the apex predator NOW?" taunts the punk dinosaur, high-fiving its tail.</span>';
        }
    } else {
        if (hat === '🎩') {
            resultHTML += '<span style="color: gold">It\'s a draw! "A stalemate! How intriguing. Shall we try again?" says the gentleman dinosaur, tipping its hat politely.</span>';
        } else if (hat === '🎓') {
            resultHTML += '<span style="color: gold">It\'s a draw! "Can we just call it a day? I\'ve got papers to grade," sighs the graduate dinosaur, looking at its watch.</span>';
        } else if (hat === '🧢') {
            resultHTML += '<span style="color: gold">It\'s a draw! "BOOORING! Play for real or go home!" the punk dinosaur shouts while dramatically rolling its eyes.</span>';
        }
        continueBtn.style.display = 'none';
        rpsResult.innerHTML = resultHTML;
        return;
    }
    
    rpsResult.innerHTML = resultHTML;
    continueBtn.style.display = 'inline-block';
}

// End fight
function endFight() {
    const resultText = rpsResult.textContent.toLowerCase();
    
    if (resultText.includes('win')) {
        // Remove dinosaur
        const index = gameState.dinosaurs.findIndex(d => d === gameState.fighting);
        if (index !== -1) {
            gameState.dinosaurs.splice(index, 1);
        }
    } else if (resultText.includes('lose')) {
        // Lose a life
        gameState.stats.lives--;
        
        // Game over if no lives left
        if (gameState.stats.lives <= 0) {
            gameOver();
            return;
        }
        
        // Move player back to start
        gameState.player.x = 1;
        gameState.player.y = 1;
    }
    
    // Remove any speech bubbles
    const speechBubbles = document.querySelectorAll('.dino-speech');
    speechBubbles.forEach(bubble => bubble.remove());
    
    // Hide fight area
    fightArea.style.display = 'none';
    gameState.fighting = null;
    
    // Update UI
    updateUI();
}

// Brew coffee
function brewCoffee() {
    if (gameState.inventory.beans < 10 || 
        gameState.player.x !== gameState.cave.x || 
        gameState.player.y !== gameState.cave.y) return;
    
    // Start the brewing mini-game
    startBrewingMinigame();
}

// Start the brewing mini-game
function startBrewingMinigame() {
    const brewMinigame = document.getElementById('brew-minigame');
    const brewSequence = document.getElementById('brewing-sequence');
    const brewingInput = document.getElementById('brewing-input');
    const brewMessage = document.getElementById('brew-message');
    const brewStartButton = document.getElementById('brew-start');
    const brewCancelButton = document.getElementById('brew-cancel');
    const brewButtons = document.querySelectorAll('.brew-button');
    
    // Clear previous data
    brewSequence.textContent = '';
    brewingInput.textContent = '';
    brewMessage.textContent = '';
    
    // Generate a random sequence of 4-6 brewing steps
    const steps = ['grind', 'heat', 'pour', 'stir'];
    const sequenceLength = Math.floor(Math.random() * 3) + 4; // 4-6 steps
    
    let sequence = [];
    for (let i = 0; i < sequenceLength; i++) {
        sequence.push(steps[Math.floor(Math.random() * steps.length)]);
    }
    
    // Store sequence on the game state
    gameState.brewingSequence = sequence;
    gameState.playerSequence = [];
    
    // Display the sequence using emojis
    const sequenceEmojis = sequence.map(step => {
        if (step === 'grind') return '⚙️';
        if (step === 'heat') return '🔥';
        if (step === 'pour') return '💧';
        if (step === 'stir') return '🔄';
        return '';
    });
    
    brewSequence.textContent = sequenceEmojis.join(' ');
    
    // Show the mini-game
    brewMinigame.style.display = 'flex';
    
    // Set up event listeners
    brewStartButton.onclick = () => {
        // Hide sequence after 3 seconds
        setTimeout(() => {
            brewSequence.textContent = '❓ ❓ ❓ ❓ ❓ ❓'.substring(0, sequenceLength * 2 - 1);
            
            // Enable brew buttons
            brewButtons.forEach(btn => {
                btn.disabled = false;
                btn.onclick = () => {
                    const action = btn.dataset.action;
                    makeBrewingStep(action);
                };
            });
            
            brewStartButton.style.display = 'none';
        }, 3000);
    };
    
    brewCancelButton.onclick = () => {
        brewMinigame.style.display = 'none';
    };
    
    // Disable brew buttons initially
    brewButtons.forEach(b