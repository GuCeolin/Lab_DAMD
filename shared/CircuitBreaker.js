// shared/CircuitBreaker.js
// Implementação simples de Circuit Breaker
// Estados: CLOSED (normal) -> OPEN (falhas) -> HALF_OPEN (recuperando)

class CircuitBreaker {
    constructor(options = {}) {
        this.failureThreshold = options.failureThreshold || 3;
        this.resetTimeout = options.resetTimeout || 30000; // 30 segundos
        this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
        this.failureCount = 0;
        this.lastFailureTime = null;
        this.successCount = 0;
    }

    async execute(fn) {
        if (this.state === 'OPEN') {
            if (Date.now() - this.lastFailureTime > this.resetTimeout) {
                console.log('[CircuitBreaker] Tentando recuperar - HALF_OPEN');
                this.state = 'HALF_OPEN';
                this.successCount = 0;
            } else {
                throw new Error('Circuit breaker is OPEN');
            }
        }

        try {
            const result = await fn();
            this.onSuccess();
            return result;
        } catch (error) {
            this.onFailure();
            throw error;
        }
    }

    onSuccess() {
        this.failureCount = 0;
        if (this.state === 'HALF_OPEN') {
            this.successCount++;
            if (this.successCount >= 2) {
                console.log('[CircuitBreaker] Recuperado - CLOSED');
                this.state = 'CLOSED';
                this.successCount = 0;
            }
        }
    }

    onFailure() {
        this.lastFailureTime = Date.now();
        this.failureCount++;
        if (this.failureCount >= this.failureThreshold) {
            console.log(`[CircuitBreaker] Aberto após ${this.failureCount} falhas - OPEN`);
            this.state = 'OPEN';
        }
    }

    getState() {
        return {
            state: this.state,
            failureCount: this.failureCount,
            lastFailureTime: this.lastFailureTime
        };
    }
}

module.exports = CircuitBreaker;
