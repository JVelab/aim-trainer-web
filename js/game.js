class Game {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.mode = null;
        this.modeInstance = null;
        this.isRunning = false;
        this.isPaused = false;
        this.gameDuration = 0;
        this.timeRemaining = 0;
        this.gameStartTime = 0;
        this.particles = [];
        this.animationId = null;
        this.timerRAF = null;
        this.lastTimerUpdate = 0;

        this.resize();
        this.bindEvents();
    }

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    bindEvents() {
        window.addEventListener('resize', () => this.resize());

        this.canvas.addEventListener('mousemove', (e) => {
            if (this.modeInstance) {
                this.modeInstance.onMouseMove(e.clientX, e.clientY);
            }
            UI.onMouseMove(e);
        });

        this.canvas.addEventListener('click', (e) => {
            if (this.modeInstance && this.isRunning && !this.isPaused) {
                this.modeInstance.onClick(e.clientX, e.clientY);
                UI.click(e);
            }
        });

        this.canvas.addEventListener('contextmenu', (e) => {
            e.preventDefault();
        });
    }

    start(mode) {
        this.stopAll();
        
        this.mode = mode;
        this.isRunning = true;
        this.isPaused = false;
        this.particles = [];
        this.modeInstance = null;
        this.lastTimerUpdate = 0;

        switch(mode) {
            case GameModes.TRACKING:
                this.modeInstance = new TrackingMode(this.canvas);
                this.gameDuration = 30000;
                this.timeRemaining = 30;
                break;
            case GameModes.FLICKING:
                this.modeInstance = new FlickingMode(this.canvas);
                this.gameDuration = 20000;
                this.timeRemaining = 20;
                break;
            case GameModes.SWITCHING:
                this.modeInstance = new SwitchingMode(this.canvas);
                this.gameDuration = 25000;
                this.timeRemaining = 25;
                break;
            default:
                this.modeInstance = new TrackingMode(this.canvas);
                this.gameDuration = 30000;
                this.timeRemaining = 30;
        }

        this.gameStartTime = performance.now();
        
        ScoreSystem.init(mode);
        UI.updateHUD();
        UI.updateTimer(this.timeRemaining);
        
        this.modeInstance.start();
        this.gameLoop();

        const modeNames = {
            tracking: 'TRACKING',
            flicking: 'FLICKING',
            switching: 'SWITCHING'
        };
        document.getElementById('mode-title').textContent = modeNames[mode] || mode;
    }

    stopAll() {
        this.isRunning = false;
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
        if (this.timerRAF) {
            cancelAnimationFrame(this.timerRAF);
            this.timerRAF = null;
        }
    }

    gameLoop(timestamp) {
        if (!this.isRunning) return;

        if (!this.isPaused) {
            this.updateTimer(timestamp);
            this.update();
            this.draw();
        }

        this.animationId = requestAnimationFrame((t) => this.gameLoop(t));
    }

    updateTimer(timestamp) {
        if (this.gameDuration <= 0) return;
        if (!this.lastTimerUpdate) this.lastTimerUpdate = timestamp;
        
        const elapsed = timestamp - this.gameStartTime;
        const remaining = Math.max(0, Math.ceil((this.gameDuration - elapsed) / 1000));
        
        if (remaining !== this.timeRemaining) {
            this.timeRemaining = remaining;
            UI.updateTimer(this.timeRemaining);
        }

        if (this.timeRemaining <= 0) {
            this.end();
        }
    }

    update() {
        if (this.modeInstance) {
            this.modeInstance.update();
        }

        this.updateParticles();
    }

    draw() {
        this.ctx.fillStyle = '#0a0a0f';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        this.drawGrid();

        if (this.modeInstance) {
            this.modeInstance.draw(this.ctx);
        }

        this.drawParticles();
        UI.updateHUD();
    }

    drawGrid() {
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
        this.ctx.lineWidth = 1;

        const gridSize = 50;
        for (let x = 0; x < this.canvas.width; x += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, this.canvas.height);
            this.ctx.stroke();
        }
        for (let y = 0; y < this.canvas.height; y += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.canvas.width, y);
            this.ctx.stroke();
        }
    }

    createHitParticles(x, y, color = '#00f0ff') {
        for (let i = 0; i < 12; i++) {
            const angle = (Math.PI * 2 / 12) * i;
            const speed = 3 + Math.random() * 4;
            this.particles.push({
                x: x,
                y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 1,
                decay: 0.02 + Math.random() * 0.02,
                size: 3 + Math.random() * 3,
                color: color
            });
        }
    }

    updateParticles() {
        this.particles = this.particles.filter(p => {
            p.x += p.vx;
            p.y += p.vy;
            p.vx *= 0.96;
            p.vy *= 0.96;
            p.life -= p.decay;
            return p.life > 0;
        });
    }

    drawParticles() {
        this.particles.forEach(p => {
            this.ctx.save();
            this.ctx.globalAlpha = p.life;
            this.ctx.fillStyle = p.color;
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.restore();
        });
    }

    end() {
        this.stopAll();

        ScoreSystem.endSession();

        let results = {
            accuracy: 0,
            score: 0,
            hits: 0,
            avgReactionTime: 0
        };

        if (this.modeInstance) {
            if (this.mode === GameModes.TRACKING) {
                const endResult = this.modeInstance.end();
                results = {
                    ...endResult,
                    score: ScoreSystem.getSessionStats().score,
                    hits: ScoreSystem.getSessionStats().hits
                };
            } else if (this.modeInstance.end) {
                const endResult = this.modeInstance.end();
                results = {
                    ...endResult,
                    score: ScoreSystem.getSessionStats().score,
                    accuracy: ScoreSystem.getSessionStats().accuracy
                };
            }
        }

        setTimeout(() => {
            UI.showResults(results);
        }, 500);
    }

    stop() {
        this.stopAll();
        this.particles = [];
    }

    pause() {
        if (this.isPaused) return;
        this.isPaused = true;
        this.pauseStartTime = performance.now();
    }

    resume() {
        if (!this.isPaused) return;
        this.isPaused = false;
        if (this.pauseStartTime) {
            const pauseDuration = performance.now() - this.pauseStartTime;
            this.gameStartTime += pauseDuration;
            this.pauseStartTime = null;
        }
    }
}

window.Game = Game;
