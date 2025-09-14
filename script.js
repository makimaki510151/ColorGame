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
let enemiesDefeatedCount = 0; // 新規追加：撃破した敵の数をカウント

// Web Audio APIのコンテキスト
let audioContext;

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
        this.size = 50; // 敵のサイズを元の30に戻す
        this.x = canvas.width + this.size;
        this.y = Math.random() * (canvas.height - this.size);
        this.color = color;
        // 速度を全体的に1/5に変更 (0.3から0.6のランダムな速度)
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

// ゲームの初期化（スタート画面表示）
function init() {
    score = 0;
    combo = 0;
    enemiesDefeatedCount = 0;
    selectedColor = 'red';
    enemies = [];
    isGameOver = false;
    updateUI();

    // UIの表示/非表示を管理
    startScreen.classList.remove('hidden');
    gameContainer.classList.add('hidden');
    scoreDisplayContainer.classList.add('hidden');
    gameOverScreen.classList.add('hidden');

    colorButtons.forEach(btn => btn.classList.remove('selected'));
    document.querySelector('.color-button[data-color="red"]').classList.add('selected');

    // キャンバスのリサイズ
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // 既存のゲームループがあれば停止
    if (gameInterval) clearInterval(gameInterval);
}

// ゲーム開始処理
function startGame() {
    startScreen.classList.add('hidden');
    gameContainer.classList.remove('hidden');
    scoreDisplayContainer.classList.remove('hidden');

    // ゲーム開始時にキャンバスのサイズを正しく設定
    resizeCanvas();

    // Web Audio APIのコンテキストを初期化
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }

    // 最初の敵を生成
    spawnEnemy();

    // ゲームループを開始
    gameInterval = setInterval(gameLoop, 1000 / 60);
}

// 効果音を生成して再生する関数
function playHitSound() {
    if (!audioContext) return;

    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.type = 'sine'; // 正弦波
    oscillator.frequency.setValueAtTime(440, audioContext.currentTime); // 440Hz
    
    // 音量（ゲイン）を徐々に下げる
    gainNode.gain.setValueAtTime(1, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.1);

    // ノードを接続
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    // 再生開始
    oscillator.start();
    // 0.1秒後に停止
    oscillator.stop(audioContext.currentTime + 0.1);
}

// キャンバスのリサイズ処理
function resizeCanvas() {
    if (!gameContainer.classList.contains('hidden')) {
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

    // 画面クリア
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 境界線の描画
    const boundaryX = 0; // 左端の境界線
    ctx.beginPath();
    ctx.moveTo(boundaryX, 0);
    ctx.lineTo(boundaryX, canvas.height);
    ctx.strokeStyle = 'red'; // 境界線の色を赤に変更
    ctx.lineWidth = 3;
    ctx.stroke();

    // 敵の更新と描画
    enemies.forEach(enemy => {
        enemy.update();
        enemy.draw();
    });

    // 敵が境界線に到達したかの判定
    enemies = enemies.filter(enemy => {
        // 敵がキャンバスの左端に触れたらゲームオーバー
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
    if (isGameOver) return; // ゲームオーバー中は操作無効

    // 敵の配列を逆順にチェックして、手前の敵から判定
    for (let i = enemies.length - 1; i >= 0; i--) {
        const enemy = enemies[i];
        if (x > enemy.x && x < enemy.x + enemy.size &&
            y > enemy.y && y < enemy.y + enemy.size) {

            // 選択中の色と敵の色が一致しているか判定
            if (colors[selectedColor] === enemy.color) {
                // 撃破成功
                combo++;
                score += 100 * combo; // コンボに応じてスコア増加
                enemiesDefeatedCount++; // 撃破数をインクリメント

                // 撃破した敵を配列から削除
                enemies.splice(i, 1);

                spawnEnemy(1);

                // 5体倒すごとに1体増殖
                if (enemiesDefeatedCount % 5 === 0) {
                    spawnEnemy(1);
                }

                // 効果音を再生
                playHitSound();

            } else {
                // 色が不一致、コンボリセット
                combo = 0;
            }
            updateUI();
            return; // 1体だけ処理
        }
    }
}

// ゲームオーバー処理
function gameOver() {
    isGameOver = true;
    finalScoreDisplay.textContent = score;
    gameOverScreen.classList.remove('hidden');
    gameContainer.classList.add('hidden'); // ゲーム画面を非表示
    scoreDisplayContainer.classList.add('hidden'); // スコア表示も非表示
}

// イベントリスナーの設定

// スタートボタン
startButton.addEventListener('click', startGame);

// 色選択ボタン
colorButtons.forEach(button => {
    button.addEventListener('click', () => {
        colorButtons.forEach(btn => btn.classList.remove('selected'));
        button.classList.add('selected');
        // 選択色を変更した時点でコンボをリセットする
        combo = 0;
        selectedColor = button.dataset.color;
        updateUI(); // UIを更新してコンボを0にする
    });
});

// キャンバスのクリック（PC）
canvas.addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    handleHit(x, y);
});

// キャンバスのタッチ（スマートフォン）
canvas.addEventListener('touchstart', (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.touches[0].clientX - rect.left;
    const y = e.touches[0].clientY - rect.top;
    handleHit(x, y);
});

// リスタートボタン
restartButton.addEventListener('click', init); // init()でスタート画面に戻る

// 初期化（ページロード時）
init();