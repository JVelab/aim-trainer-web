const UI = {
    currentScreen: 'menu',
    gameInstance: null,

    init() {
        this.showMenu();
        this.bindEvents();
    },

    bindEvents() {
        document.querySelectorAll('.mode-card').forEach(card => {
            card.addEventListener('click', () => {
                const mode = card.dataset.mode;
                this.startGame(mode);
            });
        });

        document.getElementById('pause-btn')?.addEventListener('click', () => {
            this.togglePause();
        });

        document.getElementById('resume-btn')?.addEventListener('click', () => {
            this.togglePause();
        });

        document.getElementById('restart-btn')?.addEventListener('click', () => {
            const mode = ScoreSystem.getSessionStats().mode;
            this.startGame(mode);
        });

        document.getElementById('menu-btn')?.addEventListener('click', () => {
            this.showMenu();
        });

        document.getElementById('quit-btn')?.addEventListener('click', () => {
            this.showMenu();
        });
    },

    showMenu() {
        this.currentScreen = 'menu';
        document.getElementById('menu-screen').classList.remove('hidden');
        document.getElementById('game-screen').classList.add('hidden');
        
        if (this.gameInstance) {
            this.gameInstance.stop();
            this.gameInstance = null;
        }

        this.updateLeaderboard();
    },

    updateLeaderboard() {
        const leaderboardEl = document.getElementById('leaderboard-list');
        if (!leaderboardEl) return;

        const scores = ScoreSystem.getAllScores();
        const topScores = scores.slice(0, 5);

        if (topScores.length === 0) {
            leaderboardEl.innerHTML = '<p style="color: var(--text-secondary); text-align: center;">Sin puntuaciones aún</p>';
            return;
        }

        const modeNames = {
            tracking: 'Tracking',
            flicking: 'Flicking',
            switching: 'Switching'
        };

        leaderboardEl.innerHTML = topScores.map((score, index) => `
            <div class="leaderboard-item">
                <span class="rank">#${index + 1}</span>
                <span class="mode-name">${modeNames[score.mode] || score.mode}</span>
                <span class="high-score">${ScoreSystem.formatNumber(score.score)}</span>
            </div>
        `).join('');
    },

    startGame(mode) {
        this.currentScreen = 'game';
        document.getElementById('menu-screen').classList.add('hidden');
        document.getElementById('game-screen').classList.remove('hidden');

        ScoreSystem.init(mode);
        this.updateHUD();

        const canvas = document.getElementById('game-canvas');
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        if (this.gameInstance) {
            this.gameInstance.stop();
        }

        switch(mode) {
            case GameModes.TRACKING:
                this.gameInstance = new TrackingMode(canvas);
                break;
            case GameModes.FLICKING:
                this.gameInstance = new FlickingMode(canvas);
                break;
            case GameModes.SWITCHING:
                this.gameInstance = new SwitchingMode(canvas);
                break;
            default:
                this.gameInstance = new TrackingMode(canvas);
        }

        const modeNames = {
            tracking: 'TRACKING',
            flicking: 'FLICKING',
            switching: 'SWITCHING'
        };
        document.getElementById('mode-title').textContent = modeNames[mode] || mode;

        this.gameInstance.start();
        this.startGameLoop();

        const hudTimer = document.getElementById('hud-timer');
        if (hudTimer) {
            hudTimer.textContent = '30s';
        }
    },

    startGameLoop() {
        if (this.gameLoopId) {
            cancelAnimationFrame(this.gameLoopId);
        }

        const canvas = document.getElementById('game-canvas');
        const ctx = canvas.getContext('2d');

        const loop = () => {
            if (this.currentScreen !== 'game' || !this.gameInstance) return;

            ctx.fillStyle = '#0a0a0f';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            this.drawGrid(ctx, canvas);

            this.gameInstance.update();
            this.gameInstance.draw(ctx);

            this.gameLoopId = requestAnimationFrame(loop);
        };

        loop();
    },

    drawGrid(ctx, canvas) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
        ctx.lineWidth = 1;

        const gridSize = 50;
        for (let x = 0; x < canvas.width; x += gridSize) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, canvas.height);
            ctx.stroke();
        }
        for (let y = 0; y < canvas.height; y += gridSize) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(canvas.width, y);
            ctx.stroke();
        }
    },

    updateHUD() {
        const stats = ScoreSystem.getSessionStats();
        
        const accuracyEl = document.getElementById('accuracy-value');
        const scoreEl = document.getElementById('score-value');
        const comboEl = document.getElementById('combo-value');

        if (accuracyEl) accuracyEl.textContent = `${Math.floor(stats.accuracy)}%`;
        if (scoreEl) scoreEl.textContent = ScoreSystem.formatNumber(stats.score);
        if (comboEl) comboEl.textContent = stats.maxCombo;
    },

    updateTimer(seconds) {
        const timerEl = document.getElementById('hud-timer');
        if (timerEl) {
            timerEl.textContent = `${seconds}s`;
        }
    },

    togglePause() {
        const pauseOverlay = document.getElementById('pause-overlay');
        if (!pauseOverlay) return;

        if (pauseOverlay.classList.contains('hidden')) {
            pauseOverlay.classList.remove('hidden');
            if (this.gameInstance) {
                this.gameInstance.isPaused = true;
            }
        } else {
            pauseOverlay.classList.add('hidden');
            if (this.gameInstance) {
                this.gameInstance.isPaused = false;
            }
        }
    },

    showResults(results) {
        const resultsOverlay = document.getElementById('results-overlay');
        if (!resultsOverlay) return;

        document.getElementById('result-accuracy').textContent = `${results.accuracy}%`;
        document.getElementById('result-score').textContent = ScoreSystem.formatNumber(results.score);
        document.getElementById('result-hits').textContent = results.hits;
        document.getElementById('result-reaction').textContent = ScoreSystem.formatTime(results.avgReactionTime);

        resultsOverlay.classList.remove('hidden');
    },

    hideResults() {
        const resultsOverlay = document.getElementById('results-overlay');
        if (resultsOverlay) {
            resultsOverlay.classList.add('hidden');
        }
    },

    onMouseMove(e) {
        if (this.gameInstance && this.currentScreen === 'game') {
            this.gameInstance.onMouseMove(e.clientX, e.clientY);
        }
    },

    onClick(e) {
        if (this.gameInstance && this.currentScreen === 'game') {
            this.gameInstance.onClick(e.clientX, e.clientY);
            this.updateHUD();
        }
    }
};

window.UI = UI;
