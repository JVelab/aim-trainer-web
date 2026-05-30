const GameModes = {
    TRACKING: 'tracking',
    FLICKING: 'flicking',
    SWITCHING: 'switching'
};

const TargetType = {
    CIRCLE: 'circle',
    SQUARE: 'square',
    DIAMOND: 'diamond'
};

class Target {
    constructor(x, y, radius, type = TargetType.CIRCLE, id = 0) {
        this.x = x;
        this.y = y;
        this.radius = radius;
        this.type = type;
        this.id = id;
        this.active = true;
        this.spawnTime = Date.now();
        this.hitTime = null;
        this.outerRadius = radius * 1.5;
        this.pulsePhase = Math.random() * Math.PI * 2;
        
        const colors = [
            { primary: '#00f0ff', secondary: '#00f0ff' },
            { primary: '#ff00aa', secondary: '#ff00aa' },
            { primary: '#00ff88', secondary: '#00ff88' },
            { primary: '#ffaa00', secondary: '#ffaa00' }
        ];
        this.color = colors[Math.floor(Math.random() * colors.length)];
    }

    update(deltaTime) {
        this.pulsePhase += deltaTime * 0.003;
    }

    draw(ctx) {
        if (!this.active) return;

        const pulse = Math.sin(this.pulsePhase) * 0.2 + 1;
        const currentOuterRadius = this.outerRadius * pulse;
        const currentInnerRadius = this.radius * pulse;

        ctx.save();
        ctx.globalAlpha = 0.3;
        ctx.fillStyle = this.color.primary;
        ctx.beginPath();
        if (this.type === TargetType.CIRCLE) {
            ctx.arc(this.x, this.y, currentOuterRadius, 0, Math.PI * 2);
        } else if (this.type === TargetType.SQUARE) {
            ctx.rect(
                this.x - currentOuterRadius,
                this.y - currentOuterRadius,
                currentOuterRadius * 2,
                currentOuterRadius * 2
            );
        } else if (this.type === TargetType.DIAMOND) {
            ctx.moveTo(this.x, this.y - currentOuterRadius);
            ctx.lineTo(this.x + currentOuterRadius, this.y);
            ctx.lineTo(this.x, this.y + currentOuterRadius);
            ctx.lineTo(this.x - currentOuterRadius, this.y);
            ctx.closePath();
        }
        ctx.fill();

        ctx.globalAlpha = 1;
        ctx.strokeStyle = this.color.primary;
        ctx.lineWidth = 3;
        ctx.beginPath();
        if (this.type === TargetType.CIRCLE) {
            ctx.arc(this.x, this.y, currentInnerRadius, 0, Math.PI * 2);
        } else if (this.type === TargetType.SQUARE) {
            ctx.rect(
                this.x - currentInnerRadius,
                this.y - currentInnerRadius,
                currentInnerRadius * 2,
                currentInnerRadius * 2
            );
        } else if (this.type === TargetType.DIAMOND) {
            ctx.moveTo(this.x, this.y - currentInnerRadius);
            ctx.lineTo(this.x + currentInnerRadius, this.y);
            ctx.lineTo(this.x, this.y + currentInnerRadius);
            ctx.lineTo(this.x - currentInnerRadius, this.y);
            ctx.closePath();
        }
        ctx.stroke();

        ctx.fillStyle = this.color.primary;
        ctx.beginPath();
        ctx.arc(this.x, this.y, 4, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    containsPoint(px, py) {
        const dx = px - this.x;
        const dy = py - this.y;
        return Math.sqrt(dx * dx + dy * dy) <= this.outerRadius;
    }

    onHit() {
        this.active = false;
        this.hitTime = Date.now();
        return Date.now() - this.spawnTime;
    }
}

class TrackingMode {
    constructor(canvas) {
        this.canvas = canvas;
        this.target = null;
        this.isActive = false;
        this.cursorX = 0;
        this.cursorY = 0;
        this.lastUpdateTime = Date.now();
        this.difficulty = 1;
        this.targetSpeed = 3;
        this.trackingScore = 0;
        this.trackingHits = 0;
        this.trackingFrames = 0;
    }

    start(duration = 30000) {
        this.isActive = true;
        this.target = new Target(
            this.canvas.width / 2,
            this.canvas.height / 2,
            40,
            TargetType.CIRCLE,
            1
        );
        this.target.color = { primary: '#00f0ff', secondary: '#00f0ff' };
        this.vx = (Math.random() - 0.5) * this.targetSpeed * 2;
        this.vy = (Math.random() - 0.5) * this.targetSpeed * 2;
        this.lastUpdateTime = Date.now();
        this.trackingScore = 0;
        this.trackingHits = 0;
        this.trackingFrames = 0;
    }

    update() {
        if (!this.isActive || !this.target) return;

        const now = Date.now();
        const deltaTime = now - this.lastUpdateTime;
        this.lastUpdateTime = now;

        this.target.update(deltaTime);

        this.target.x += this.vx;
        this.target.y += this.vy;

        const margin = 60;
        if (this.target.x < margin || this.target.x > this.canvas.width - margin) {
            this.vx *= -1;
            this.target.x = Math.max(margin, Math.min(this.canvas.width - margin, this.target.x));
        }
        if (this.target.y < margin || this.target.y > this.canvas.height - margin) {
            this.vy *= -1;
            this.target.y = Math.max(margin, Math.min(this.canvas.height - margin, this.target.y));
        }

        if (this.target.containsPoint(this.cursorX, this.cursorY)) {
            this.trackingHits++;
            ScoreSystem.addHit();
        }
        this.trackingFrames++;

        if (this.trackingFrames % 10 === 0) {
            const accuracy = this.trackingFrames > 0 
                ? (this.trackingHits / this.trackingFrames) * 100 
                : 0;
            this.trackingScore = Math.floor(accuracy * 10);
        }
    }

    draw(ctx) {
        if (this.target) {
            this.target.draw(ctx);
        }

        ctx.fillStyle = '#00f0ff';
        ctx.font = '16px Orbitron';
        ctx.textAlign = 'left';
        ctx.fillText(`Tracking: ${this.trackingScore}`, 20, this.canvas.height - 20);
    }

    onMouseMove(x, y) {
        this.cursorX = x;
        this.cursorY = y;
    }

    onClick(x, y) {
    }

    end() {
        this.isActive = false;
        const accuracy = this.trackingFrames > 0 
            ? (this.trackingHits / this.trackingFrames) * 100 
            : 0;
        return { accuracy: Math.floor(accuracy), score: this.trackingScore };
    }
}

class FlickingMode {
    constructor(canvas) {
        this.canvas = canvas;
        this.targets = [];
        this.isActive = false;
        this.roundTime = 3000;
        this.targetsPerRound = 10;
        this.currentTargetIndex = 0;
        this.roundStartTime = 0;
        this.reactionTimes = [];
        this.hits = 0;
        this.misses = 0;
        this.avgReactionTime = 0;
    }

    start() {
        this.isActive = true;
        this.targets = [];
        this.currentTargetIndex = 0;
        this.hits = 0;
        this.misses = 0;
        this.reactionTimes = [];
        this.lastUpdateTime = Date.now();
        this.spawnTarget();
    }

    spawnTarget() {
        const margin = 80;
        const x = margin + Math.random() * (this.canvas.width - margin * 2);
        const y = margin + Math.random() * (this.canvas.height - margin * 2);
        const types = [TargetType.CIRCLE, TargetType.SQUARE, TargetType.DIAMOND];
        const type = types[Math.floor(Math.random() * types.length)];
        
        const colors = [
            { primary: '#ff00aa', secondary: '#ff00aa' },
            { primary: '#ffaa00', secondary: '#ffaa00' }
        ];
        
        const target = new Target(x, y, 35, type, this.targets.length);
        target.color = colors[this.targets.length % 2];
        this.targets.push(target);
        this.roundStartTime = Date.now();
    }

    update() {
        if (!this.isActive) return;

        const now = Date.now();
        const deltaTime = now - this.lastUpdateTime;
        this.lastUpdateTime = now;

        this.targets.forEach(target => {
            if (target.active) {
                target.update(deltaTime);
            }
        });
    }

    draw(ctx) {
        this.targets.forEach(target => {
            if (target.active) {
                target.draw(ctx);
            }
        });

        ctx.fillStyle = '#ff00aa';
        ctx.font = '16px Orbitron';
        ctx.textAlign = 'left';
        ctx.fillText(`Hits: ${this.hits}/${this.targetsPerRound}`, 20, this.canvas.height - 20);
    }

    onClick(x, y) {
        if (!this.isActive) return;

        const activeTarget = this.targets.find(t => t.active);
        if (activeTarget && activeTarget.containsPoint(x, y)) {
            const reactionTime = activeTarget.onHit();
            this.reactionTimes.push(reactionTime);
            this.hits++;
            ScoreSystem.addHit(reactionTime);
            
            if (this.hits >= this.targetsPerRound) {
                this.end();
            } else {
                this.spawnTarget();
            }
        } else {
            this.misses++;
            ScoreSystem.addMiss();
        }
    }

    onMouseMove(x, y) {}

    end() {
        this.isActive = false;
        const totalTime = this.reactionTimes.reduce((a, b) => a + b, 0);
        this.avgReactionTime = this.reactionTimes.length > 0 
            ? Math.floor(totalTime / this.reactionTimes.length) 
            : 0;
        return {
            hits: this.hits,
            misses: this.misses,
            avgReactionTime: this.avgReactionTime
        };
    }
}

class SwitchingMode {
    constructor(canvas) {
        this.canvas = canvas;
        this.targets = [];
        this.isActive = false;
        this.currentTargetId = 0;
        this.targetsPerRound = 8;
        this.spawnedTargets = 0;
        this.hits = 0;
        this.misses = 0;
        this.avgReactionTime = 0;
        this.reactionTimes = [];
        this.lastTargetTime = 0;
        this.spawnDelay = 800;
        this.nextSpawnTime = 0;
    }

    start() {
        this.isActive = true;
        this.targets = [];
        this.currentTargetId = 0;
        this.spawnedTargets = 0;
        this.hits = 0;
        this.misses = 0;
        this.reactionTimes = [];
        this.lastTargetTime = Date.now();
        this.lastUpdateTime = Date.now();
        this.nextSpawnTime = Date.now() + this.spawnDelay;
        this.spawnNextTarget();
    }

    spawnNextTarget() {
        if (this.spawnedTargets >= this.targetsPerRound) return;

        const margin = 100;
        let x, y, tooClose;
        let attempts = 0;
        
        do {
            x = margin + Math.random() * (this.canvas.width - margin * 2);
            y = margin + Math.random() * (this.canvas.height - margin * 2);
            tooClose = this.targets.some(t => {
                const dx = t.x - x;
                const dy = t.y - y;
                return Math.sqrt(dx * dx + dy * dy) < 120;
            });
            attempts++;
        } while (tooClose && attempts < 20);

        const colors = [
            { primary: '#00ff88', secondary: '#00ff88' },
            { primary: '#00f0ff', secondary: '#00f0ff' }
        ];
        
        const target = new Target(x, y, 30, TargetType.CIRCLE, this.spawnedTargets);
        target.color = colors[this.spawnedTargets % 2];
        target.isNext = this.spawnedTargets === 0;
        this.targets.push(target);
        this.spawnedTargets++;
        this.currentTargetId = target.id;
        this.lastTargetTime = Date.now();
    }

    update() {
        if (!this.isActive) return;

        const now = Date.now();
        const deltaTime = now - this.lastUpdateTime;
        this.lastUpdateTime = now;

        this.targets.forEach(target => {
            if (target.active) {
                target.update(deltaTime);
            }
        });

        if (this.spawnedTargets < this.targetsPerRound && now >= this.nextSpawnTime) {
            this.spawnNextTarget();
            this.nextSpawnTime = now + this.spawnDelay;
        }

        this.targets.forEach((target, index) => {
            target.isNext = target.id === this.currentTargetId;
        });
    }

    draw(ctx) {
        this.targets.forEach(target => {
            if (target.active) {
                if (target.isNext) {
                    target.radius = 35;
                    target.outerRadius = 55;
                } else {
                    target.radius = 25;
                    target.outerRadius = 40;
                }
                target.draw(ctx);
            }
        });

        ctx.fillStyle = '#00ff88';
        ctx.font = '16px Orbitron';
        ctx.textAlign = 'left';
        ctx.fillText(`Targets: ${this.hits}/${this.targetsPerRound}`, 20, this.canvas.height - 20);
    }

    onClick(x, y) {
        if (!this.isActive) return;

        const clickedTarget = this.targets.find(t => 
            t.active && t.id === this.currentTargetId && t.containsPoint(x, y)
        );

        if (clickedTarget) {
            const reactionTime = clickedTarget.onHit();
            this.reactionTimes.push(reactionTime);
            this.hits++;
            ScoreSystem.addHit(reactionTime);
            
            const nextTarget = this.targets.find(t => t.active && t.id !== this.currentTargetId);
            if (nextTarget) {
                this.currentTargetId = nextTarget.id;
                this.lastTargetTime = Date.now();
            } else if (this.spawnedTargets >= this.targetsPerRound) {
                this.end();
            }
        } else {
            const wrongTarget = this.targets.find(t => t.active && t.containsPoint(x, y));
            if (wrongTarget) {
                this.misses++;
                ScoreSystem.addMiss();
            }
        }
    }

    onMouseMove(x, y) {}

    end() {
        this.isActive = false;
        const totalTime = this.reactionTimes.reduce((a, b) => a + b, 0);
        this.avgReactionTime = this.reactionTimes.length > 0 
            ? Math.floor(totalTime / this.reactionTimes.length) 
            : 0;
        return {
            hits: this.hits,
            misses: this.misses,
            avgReactionTime: this.avgReactionTime
        };
    }
}

window.GameModes = GameModes;
window.TargetType = TargetType;
window.Target = Target;
window.TrackingMode = TrackingMode;
window.FlickingMode = FlickingMode;
window.SwitchingMode = SwitchingMode;
