// キャンバスとコンテキストの取得
const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

// UI要素の取得
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

// ゲームの状態変数
let score = 0;
let combo = 0;
let selectedColor = 'red';
let enemies = [];
let gameInterval;
let isGameOver = false;
let enemiesDefeatedCount = 0;

// Web Audio APIのコンテキスト
let audioContext; // ★★★ 追加: Web Audio APIのコンテキストを宣言 ★★★

// 色の定義
const colors = {
    red: '#ff6347',
    green: '#3cb371',
    blue: '#4682b4'
};
const colorNames = Object.keys(colors);

// 敵のクラス
class Enemy {
    constructor(color) {
        this.size = 40;
        this.x = canvas.width + this.size;
        this.y = Math.random() * (canvas.height - this.size);
        this.color = color;
        this.speed = (Math.random() * 1.5 + 1.5) / 5;
    }

    draw() {
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.size, this.size);
        ctx.strokeStyle = 'white';
        ctx.strokeRect(this.x, this.y, this.size, this.size);
    }

    update() {
        this.x -= this.speed;
    }
}

// 効果音を生成して再生する関数 ★★★ 追加 ★★★
function playHitSound() {
    if (!audioContext) return;
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(440, audioContext.currentTime);
    gainNode.gain.setValueAtTime(1, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.1);
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.1);
}

// ゲームの初期化（スタート画面表示）
function init() {
    score = 0;
    combo = 0;
    enemiesDefeatedCount = 0;
    selectedColor = 'red';
    enemies = [];
    isGameOver = false;
    updateUI();

    startScreen.classList.remove('hidden');
    gameContainer.classList.add('hidden');
    scoreDisplayContainer.classList.add('hidden');
    gameOverScreen.classList.add('hidden');

    colorButtons.forEach(btn => btn.classList.remove('selected'));
    document.querySelector('.color-button[data-color="red"]').classList.add('selected');

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    if (gameInterval) clearInterval(gameInterval);
}

// ゲーム開始処理
function startGame() {
    function isMobileDevice() {
        const userAgent = navigator.userAgent || navigator.vendor || window.opera;
        return /android|iphone|ipad|ipod|windows phone/i.test(userAgent);
    };

    if (isMobileDevice() && window.innerHeight > window.innerWidth) {
        alert('快適にプレイするために、画面を横向きにしてください。');
        return;
    }

    startScreen.classList.add('hidden');
    gameContainer.classList.remove('hidden');
    scoreDisplayContainer.classList.remove('hidden');

    resizeCanvas();

    // ★★★ 追加: audioContextを初期化 ★★★
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }

    spawnEnemy();
    gameInterval = setInterval(gameLoop, 1000 / 60);
}


// キャンバスのリサイズ処理
function resizeCanvas() {
    if (!gameContainer.classList.contains('hidden')) {
        const padding = 0.1;
        gameContainer.style.height = `${window.innerHeight * (1 - padding)}px`;
        gameContainer.style.width = `${window.innerWidth * (1 - padding)}px`;

        canvas.width = gameContainer.offsetWidth * 0.75;
        canvas.height = gameContainer.offsetHeight;
    } else {
        canvas.width = 800 * 0.75;
        canvas.height = 600;
    }
}

// ゲームループ
function gameLoop() {
    if (isGameOver) {
        clearInterval(gameInterval);
        return;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const boundaryX = 0;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, canvas.height);
    ctx.strokeStyle = 'red';
    ctx.lineWidth = 3;
    ctx.stroke();

    enemies.forEach(enemy => {
        enemy.update();
        enemy.draw();
    });

    enemies = enemies.filter(enemy => {
        if (enemy.x <= boundaryX) {
            gameOver();
            return false;
        }
        return true;
    });
}

// 敵の生成
function spawnEnemy(count = 1) {
    for (let i = 0; i < count; i++) {
        const randomColor = colorNames[Math.floor(Math.random() * colorNames.length)];
        enemies.push(new Enemy(colors[randomColor]));
    }
}

// UIの更新
function updateUI() {
    scoreDisplay.textContent = score;
    comboCountDisplay.textContent = combo;
}

// 撃破処理
function handleHit(x, y) {
    if (isGameOver) return;

    for (let i = enemies.length - 1; i >= 0; i--) {
        const enemy = enemies[i];
        if (x > enemy.x && x < enemy.x + enemy.size && y > enemy.y && y < enemy.y + enemy.size) {
            if (colors[selectedColor] === enemy.color) {
                combo++;
                score += 100 * combo;
                enemiesDefeatedCount++;
                enemies.splice(i, 1);
                spawnEnemy(1);
                if (enemiesDefeatedCount % 5 === 0) {
                    spawnEnemy(1);
                }
                playHitSound(); // ★★★ 復元: 効果音を再生 ★★★
            } else {
                combo = 0;
            }
            updateUI();
            return;
        }
    }
}

// ゲームオーバー処理
function gameOver() {
    isGameOver = true;
    finalScoreDisplay.textContent = score;
    gameOverScreen.classList.remove('hidden');
    gameContainer.classList.add('hidden');
    scoreDisplayContainer.classList.add('hidden');
}

// イベントリスナーの設定

startButton.addEventListener('click', startGame);

let isColorSwitching = false;
colorButtons.forEach(button => {
    button.addEventListener('click', () => {
        colorButtons.forEach(btn => btn.classList.remove('selected'));
        button.classList.add('selected');
        combo = 0;
        selectedColor = button.dataset.color;
        updateUI();
    });

    button.addEventListener('touchstart', (e) => {
        if (isColorSwitching) {
            return;
        }
        isColorSwitching = true;

        colorButtons.forEach(btn => btn.classList.remove('selected'));
        button.classList.add('selected');
        combo = 0;
        selectedColor = button.dataset.color;
        updateUI();
    }, { passive: true });

    button.addEventListener('touchend', () => {
        isColorSwitching = false;
    });
});

canvas.addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    handleHit(x, y);
});

canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const x = e.touches[0].clientX - rect.left;
    const y = e.touches[0].clientY - rect.top;
    handleHit(x, y);
}, { passive: false });

restartButton.addEventListener('click', init);

init(
    // 画面の向きが変わったときのイベントリスナー
    window.addEventListener('orientationchange', () => {
        resizeCanvas();
    })
);