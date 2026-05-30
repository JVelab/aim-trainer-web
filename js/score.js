const ScoreSystem = {
    STORAGE_KEY: 'simulador_punteria_scores',

    data: {
        currentSession: {
            mode: null,
            score: 0,
            hits: 0,
            misses: 0,
            accuracy: 0,
            reactionTimes: [],
            startTime: null,
            endTime: null,
            combo: 0,
            maxCombo: 0
        }
    },

    init(mode) {
        this.data.currentSession = {
            mode: mode,
            score: 0,
            hits: 0,
            misses: 0,
            accuracy: 0,
            reactionTimes: [],
            startTime: Date.now(),
            endTime: null,
            combo: 0,
            maxCombo: 0
        };
    },

    addHit(reactionTime = null) {
        this.data.currentSession.hits++;
        this.data.currentSession.combo++;
        if (this.data.currentSession.combo > this.data.currentSession.maxCombo) {
            this.data.currentSession.maxCombo = this.data.currentSession.combo;
        }
        if (reactionTime !== null) {
            this.data.currentSession.reactionTimes.push(reactionTime);
        }
        this.calculateScore();
        this.updateAccuracy();
    },

    addMiss() {
        this.data.currentSession.misses++;
        this.data.currentSession.combo = 0;
        this.updateAccuracy();
    },

    calculateScore() {
        const baseScore = 100;
        const comboMultiplier = 1 + (this.data.currentSession.combo * 0.1);
        const accuracyBonus = this.data.currentSession.accuracy * 0.5;
        this.data.currentSession.score = Math.floor(
            this.data.currentSession.hits * baseScore * comboMultiplier + accuracyBonus
        );
    },

    updateAccuracy() {
        const total = this.data.currentSession.hits + this.data.currentSession.misses;
        this.data.currentSession.accuracy = total > 0 
            ? (this.data.currentSession.hits / total) * 100 
            : 0;
    },

    getAverageReactionTime() {
        const times = this.data.currentSession.reactionTimes;
        if (times.length === 0) return 0;
        const sum = times.reduce((a, b) => a + b, 0);
        return Math.floor(sum / times.length);
    },

    endSession() {
        this.data.currentSession.endTime = Date.now();
        this.calculateScore();
        this.updateAccuracy();
        this.saveScore();
    },

    saveScore() {
        const session = this.data.currentSession;
        if (!session.mode) return;

        const allScores = this.getAllScores();
        
        const newEntry = {
            mode: session.mode,
            score: session.score,
            accuracy: Math.floor(session.accuracy),
            hits: session.hits,
            misses: session.misses,
            maxCombo: session.maxCombo,
            avgReactionTime: this.getAverageReactionTime(),
            date: new Date().toISOString(),
            duration: session.endTime 
                ? Math.floor((session.endTime - session.startTime) / 1000) 
                : 0
        };

        allScores.push(newEntry);
        allScores.sort((a, b) => b.score - a.score);
        
        if (allScores.length > 100) {
            allScores.splice(100);
        }

        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(allScores));
        } catch (e) {
            console.warn('No se pudo guardar en localStorage:', e);
        }
    },

    getAllScores() {
        try {
            const stored = localStorage.getItem(this.STORAGE_KEY);
            return stored ? JSON.parse(stored) : [];
        } catch (e) {
            return [];
        }
    },

    getTopScores(mode = null, limit = 10) {
        let scores = this.getAllScores();
        if (mode) {
            scores = scores.filter(s => s.mode === mode);
        }
        return scores.slice(0, limit);
    },

    getHighScore(mode) {
        const scores = this.getTopScores(mode, 1);
        return scores.length > 0 ? scores[0].score : 0;
    },

    clearScores() {
        try {
            localStorage.removeItem(this.STORAGE_KEY);
        } catch (e) {
            console.warn('No se pudo limpiar localStorage:', e);
        }
    },

    getSessionStats() {
        return { ...this.data.currentSession };
    },

    formatNumber(num) {
        return num.toLocaleString();
    },

    formatTime(ms) {
        if (typeof ms !== 'number' || isNaN(ms)) return '0ms';
        return `${Math.floor(ms)}ms`;
    }
};

window.ScoreSystem = ScoreSystem;
