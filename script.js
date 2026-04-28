function ensureRuntimeStyles() {
    if (document.getElementById('color-game-runtime-style')) return;
    const style = document.createElement('style');
    style.id = 'color-game-runtime-style';
    style.textContent = `
body {
    background-color: #2c3e50;
    color: #ecf0f1;
    font-family: sans-serif;
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100dvh;
    margin: 0;
    overflow: hidden;
}
#rotate-lock-screen {
    display: none;
    position: fixed;
    inset: 0;
    z-index: 100;
    background: rgba(12, 20, 30, 0.96);
    color: #ecf0f1;
    text-align: center;
    align-content: center;
    padding: 24px;
    box-sizing: border-box;
}
#game-container {
    display: flex;
    flex-direction: column-reverse;
    width: min(100vw, 56.25dvh);
    height: min(100dvh, 177.78dvw);
    max-width: 100vw;
    max-height: 100dvh;
    background-color: #34495e;
    margin: 0 auto;
    box-sizing: border-box;
}
#color-palette {
    width: 100%;
    height: 34%;
    display: flex;
    flex-direction: row;
    justify-content: space-around;
    align-items: center;
    padding: 6px;
    background: rgba(0, 0, 0, 0.3);
    z-index: 5;
    box-sizing: border-box;
}
.color-button {
    width: 30%;
    height: 88%;
    border-radius: 20px;
    border: 6px solid #ecf0f1;
}
.color-button[data-color="red"] { background-color: #ff6347; }
.color-button[data-color="green"] { background-color: #3cb371; }
.color-button[data-color="blue"] { background-color: #4682b4; }
.color-button.selected {
    transform: scale(0.95);
    border-color: #f39c12;
    box-shadow: inset 0 0 20px rgba(0,0,0,0.5), 0 0 15px #f39c12;
}
#game-canvas, #unity-canvas { width: 100%; height: 66%; touch-action: none; }
#score-display {
    position: absolute; top: 15px; left: 15px;
    font-size: 1.7em; font-weight: bold; pointer-events: none; z-index: 6;
}
#start-screen, #game-over-screen {
    position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
    background-color: rgba(44, 62, 80, 0.95);
    padding: 42px; border-radius: 15px; text-align: center;
    border: 3px solid #f39c12; z-index: 10; width: 90%; max-width: 480px;
}
#start-screen h1 { font-size: 2.8em; margin: 0 0 14px; }
#start-screen p, #game-over-screen p { font-size: 1.35em; line-height: 1.45; }
#game-over-screen h2 { font-size: 2em; margin: 0 0 8px; }
#start-button, #restart-button {
    padding: 18px 52px; font-size: 1.55em; font-weight: bold;
    color: #2c3e50; background-color: #f39c12; border: none; border-radius: 50px; margin-top: 24px;
}
.hidden { display: none !important; }
@media (orientation: landscape) and (hover: none) and (pointer: coarse) {
    #rotate-lock-screen { display: grid; }
    #start-screen, #game-container, #game-over-screen, #score-display { display: none !important; }
}
`;
    document.head.appendChild(style);
}

function ensureRuntimeDom() {
    const existingContainer = document.getElementById('game-container');
    const existingCanvas = document.getElementById('game-canvas') || document.getElementById('unity-canvas');
    if (existingContainer && existingCanvas && document.getElementById('start-screen')) return;

    ensureRuntimeStyles();
    document.body.innerHTML = `
    <div id="rotate-lock-screen">
        <h2>縦向きでプレイしてください</h2>
        <p>このゲームはスマホ縦画面専用です。端末を縦向きに戻すと再開できます。</p>
    </div>
    <div id="start-screen">
        <h1>カラーマッチ・シューター</h1>
        <p>色を選択し、流れてくる同じ色の敵を撃破しよう！</p>
        <button id="start-button">ゲームスタート</button>
    </div>
    <div id="game-container" class="hidden">
        <div id="color-palette">
            <div class="color-button" data-color="red"></div>
            <div class="color-button" data-color="green"></div>
            <div class="color-button" data-color="blue"></div>
        </div>
        <canvas id="unity-canvas"></canvas>
    </div>
    <div id="game-over-screen" class="hidden">
        <h2>ゲームオーバー</h2>
        <p>スコア: <span id="final-score">0</span></p>
        <button id="restart-button">もう一度プレイ</button>
    </div>
    <div id="score-display" class="hidden">
        スコア: <span id="current-score">0</span><br>
        コンボ: <span id="combo-count">0</span>
    </div>`;
}

ensureRuntimeDom();

const canvas = document.getElementById('game-canvas') || document.getElementById('unity-canvas');
if (!canvas) {
    throw new Error('Canvas element not found. Expected #game-canvas or #unity-canvas.');
}
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
        this.size = 70;
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
    ctx.setTransform(1, 0, 0, 1, 0, 0);
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
    if (scoreDisplay) scoreDisplay.textContent = score;
    if (comboCountDisplay) comboCountDisplay.textContent = combo;
}

function updateEnemyBorders() {
    enemies.forEach(e => {
        e.borderColor = (colors[selectedColor] === e.color) ? '#f39c12' : 'white';
    });
}

function gameOver() {
    isGameOver = true;
    if (finalScoreDisplay) finalScoreDisplay.textContent = score;
    if (gameOverScreen) gameOverScreen.classList.remove('hidden');
    if (scoreDisplayContainer) scoreDisplayContainer.classList.add('hidden');
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
    
    if (startScreen) startScreen.classList.add('hidden');
    if (gameOverScreen) gameOverScreen.classList.add('hidden');
    if (gameContainer) gameContainer.classList.remove('hidden');
    if (scoreDisplayContainer) scoreDisplayContainer.classList.remove('hidden');
    
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

if (startButton) startButton.addEventListener('click', startGame);
if (restartButton) restartButton.addEventListener('click', startGame);

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
const defaultRedButton = document.querySelector('[data-color="red"]');
if (defaultRedButton) {
    defaultRedButton.classList.add('selected');
}
