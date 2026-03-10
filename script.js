const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
const colorButtons = document.querySelectorAll('.color-button');
const scoreDisplay = document.getElementById('current-score');
const comboCountDisplay = document.getElementById('combo-count');
const gameOverScreen = document.getElementById('game-over-screen');
const finalScoreDisplay = document.getElementById('final-score');
const restartButton = document.getElementById('restart-button');
const startScreen = document.getElementById('start-screen');
const startButton = document.getElementById('start-button');
const gameContainer = document.getElementById('game-container');
const scoreDisplayContainer = document.getElementById('score-display');

let score = 0, combo = 0, selectedColor = 'red', enemies = [];
let isGameOver = false, enemiesDefeatedCount = 0;
let lastTime = 0;
let audioContext;

const colors = {
    red: '#ff6347',
    green: '#3cb371',
    blue: '#4682b4'
};
const colorNames = Object.keys(colors);

class Enemy {
    constructor() {
        const dpr = window.devicePixelRatio || 1;
        this.size = 50;
        const logicalWidth = canvas.width / dpr;
        const logicalHeight = canvas.height / dpr;

        if (window.innerHeight > window.innerWidth) {
            this.x = Math.random() * (logicalWidth - this.size);
            this.y = -this.size;
        } else {
            this.x = logicalWidth + this.size;
            this.y = Math.random() * (logicalHeight - this.size);
        }

        const randomColorName = colorNames[Math.floor(Math.random() * colorNames.length)];
        this.color = colors[randomColorName];
        this.speed = (Math.random() * 30 + 60); 
        this.borderColor = 'white';
    }

    draw() {
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.size, this.size);
        ctx.strokeStyle = this.borderColor;
        ctx.lineWidth = 3;
        ctx.strokeRect(this.x, this.y, this.size, this.size);
    }

    update(dt) {
        if (window.innerHeight > window.innerWidth) {
            this.y += this.speed * dt;
        } else {
            this.x -= this.speed * dt;
        }
    }

    isOut(width, height) {
        if (window.innerHeight > window.innerWidth) {
            // 修正：敵の底辺(y + size)が画面下端に到達したか判定
            return (this.y + this.size) > height;
        } else {
            // 修正：敵の左辺(x)が画面左端(判定線付近)に到達したか判定
            return this.x < 0;
        }
    }
}

function resizeCanvas() {
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    updateEnemyBorders();
}

function playHitSound() {
    if (!audioContext) return;
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(500, audioContext.currentTime);
    gain.gain.setValueAtTime(0.1, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.1);
    osc.connect(gain).connect(audioContext.destination);
    osc.start();
    osc.stop(audioContext.currentTime + 0.1);
}

function spawnEnemy() {
    enemies.push(new Enemy());
}

function updateUI() {
    scoreDisplay.textContent = score;
    comboCountDisplay.textContent = combo;
}

function updateEnemyBorders() {
    enemies.forEach(e => {
        e.borderColor = (colors[selectedColor] === e.color) ? '#f39c12' : 'white';
    });
}

function gameOver() {
    isGameOver = true;
    finalScoreDisplay.textContent = score;
    gameOverScreen.classList.remove('hidden');
    scoreDisplayContainer.classList.add('hidden');
}

function gameLoop(timestamp) {
    if (isGameOver) return;

    const dt = (timestamp - lastTime) / 1000;
    lastTime = timestamp;

    const dpr = window.devicePixelRatio || 1;
    const logicalWidth = canvas.width / dpr;
    const logicalHeight = canvas.height / dpr;

    ctx.clearRect(0, 0, logicalWidth, logicalHeight);

    // 敵の更新と描画
    for (let i = enemies.length - 1; i >= 0; i--) {
        enemies[i].update(dt);
        enemies[i].draw();

        if (enemies[i].isOut(logicalWidth, logicalHeight)) {
            gameOver();
            return;
        }
    }

    // デッドラインの描画（敵の上に重なるよう後に描画）
    ctx.strokeStyle = 'red';
    ctx.lineWidth = 4;
    ctx.beginPath();
    if (window.innerHeight > window.innerWidth) {
        // 縦画面：下端
        ctx.moveTo(0, logicalHeight - 2);
        ctx.lineTo(logicalWidth, logicalHeight - 2);
    } else {
        // 横画面：左端
        ctx.moveTo(2, 0);
        ctx.lineTo(2, logicalHeight);
    }
    ctx.stroke();

    requestAnimationFrame(gameLoop);
}

function handleHit(clientX, clientY) {
    if (isGameOver) return;
    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    for (let i = enemies.length - 1; i >= 0; i--) {
        const e = enemies[i];
        if (x > e.x && x < e.x + e.size && y > e.y && y < e.y + e.size) {
            if (colors[selectedColor] === e.color) {
                processHit(i);
                return;
            }
        }
    }

    for (let i = enemies.length - 1; i >= 0; i--) {
        const e = enemies[i];
        if (x > e.x && x < e.x + e.size && y > e.y && y < e.y + e.size) {
            combo = 0;
            updateEnemyBorders();
            updateUI();
            return;
        }
    }
}

function processHit(index) {
    combo++;
    score += 100 * combo;
    enemiesDefeatedCount++;
    enemies.splice(index, 1);
    spawnEnemy();
    if (enemiesDefeatedCount % 5 === 0) spawnEnemy();
    playHitSound();
    updateEnemyBorders();
    updateUI();
}

function startGame() {
    if (!audioContext) audioContext = new (window.AudioContext || window.webkitAudioContext)();
    
    startScreen.classList.add('hidden');
    gameOverScreen.classList.add('hidden');
    gameContainer.classList.remove('hidden');
    scoreDisplayContainer.classList.remove('hidden');
    
    score = 0;
    combo = 0;
    enemies = [];
    isGameOver = false;
    enemiesDefeatedCount = 0;
    
    resizeCanvas();
    spawnEnemy();
    lastTime = performance.now();
    requestAnimationFrame(gameLoop);
    updateUI();
}

startButton.addEventListener('click', startGame);
restartButton.addEventListener('click', startGame);

colorButtons.forEach(btn => {
    const select = (e) => {
        if (e) e.preventDefault();
        combo = 0; 
        selectedColor = btn.dataset.color;
        colorButtons.forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        updateEnemyBorders();
        updateUI();
    };
    btn.addEventListener('touchstart', select, { passive: false });
    btn.addEventListener('mousedown', select);
});

canvas.addEventListener('mousedown', (e) => handleHit(e.clientX, e.clientY));
canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    handleHit(e.touches[0].clientX, e.touches[0].clientY);
}, { passive: false });

window.addEventListener('resize', resizeCanvas);
document.querySelector('[data-color="red"]').classList.add('selected');