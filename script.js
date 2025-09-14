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
        this.size = 30; // 敵のサイズを元の30に戻す
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
    window.addEventListener('resize', resizeCanvas); // 画面サイズや向きが変わるたびに呼び出す

    // 既存のゲームループがあれば停止
    if (gameInterval) clearInterval(gameInterval);
}

// ゲーム開始処理
function startGame() {
    // 端末がモバイルかどうかを判定する関数を修正
    function isMobileDevice() {
        // userAgentで一般的なモバイルデバイスを判定
        const userAgent = navigator.userAgent || navigator.vendor || window.opera;
        return /android|iphone|ipad|ipod|windows phone/i.test(userAgent);
    };

    // ゲーム開始前に縦向きの場合はアラートを表示
    if (isMobileDevice() && window.innerHeight > window.innerWidth) {
        alert('快適にプレイするために、画面を横向きにしてください。');
        return;
    }

    startScreen.classList.add('hidden');
    gameContainer.classList.remove('hidden');
    scoreDisplayContainer.classList.remove('hidden');

    // ゲーム開始時にキャンバスのサイズを正しく設定
    resizeCanvas();

    // 最初の敵を生成
    spawnEnemy();

    // ゲームループを開始
    gameInterval = setInterval(gameLoop, 1000 / 60);
}


// キャンバスのリサイズ処理
function resizeCanvas() {
    if (!gameContainer.classList.contains('hidden')) {
        const padding = 0.1; // 10%の余白
        gameContainer.style.height = `${window.innerHeight * (1 - padding)}px`;
        gameContainer.style.width = `${window.innerWidth * (1 - padding)}px`;

        // canvasのサイズを親要素のサイズに合わせて設定
        canvas.width = gameContainer.offsetWidth * 0.75;
        canvas.height = gameContainer.offsetHeight;
    } else {
        // スタート画面では固定サイズ
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
    const boundaryX = 0;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, canvas.height);
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
        // 敵が境界線に触れたらゲームオーバー
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