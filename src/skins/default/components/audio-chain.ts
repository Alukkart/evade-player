type NormalizationLevel = 'off' | 'light' | 'medium' | 'strong';

interface NormalizationPreset {
    threshold: number;
    ratio: number;
    knee: number;
    attack: number;
    release: number;
}

export interface AudioChainDebugInfo {
    hasContext: boolean;
    contextState: string | null;
    hasSource: boolean;
    hasGain: boolean;
    hasCompressor: boolean;
    gainValue: number | null;
    compressorThreshold: number | null;
    compressorRatio: number | null;
    pendingVolume: number;
    pendingNormalization: string;
    isInitialized: boolean;
    hasMediaElement: boolean;
    mediaElementTagName: string | null;
}

const NORMALIZATION_PRESETS: Record<NormalizationLevel, NormalizationPreset> = {
    off: {threshold: 0, ratio: 1, knee: 30, attack: 0.003, release: 0.25},
    light: {threshold: -24, ratio: 2, knee: 30, attack: 0.003, release: 0.25},
    medium: {threshold: -30, ratio: 4, knee: 20, attack: 0.003, release: 0.15},
    strong: {threshold: -36, ratio: 8, knee: 10, attack: 0.003, release: 0.1},
};

const MEDIA_KEYS = ['current', 'element', 'nativeElement', 'media'] as const;

function getPreset(level: string): NormalizationPreset {
    return NORMALIZATION_PRESETS[level as NormalizationLevel] || NORMALIZATION_PRESETS.off;
}

class AudioChainManager {
    private ctx: AudioContext | null = null;
    private source: MediaElementAudioSourceNode | null = null;
    private gainNode: GainNode | null = null;
    private compressorNode: DynamicsCompressorNode | null = null;
    private mediaElement: HTMLMediaElement | null = null;

    private pendingVolumeFactor = 1;
    private pendingNormalizationLevel: NormalizationLevel = 'off';
    private isInitialized = false;

    setMediaElement(element: unknown): void {
        const realElement = this.extractMediaElement(element);

        if (!realElement) {
            return;
        }

        // First element wins: the chain is a module-level singleton, so with two
        // players on one page only the first gets audio processing. Call
        // releaseMediaElement() on unmount so the next player can bind.
        if (this.mediaElement) {
            return;
        }

        this.mediaElement = realElement;

        if (this.pendingVolumeFactor !== 1 || this.pendingNormalizationLevel !== 'off') {
            this.ensureChain();
        }
    }

    /**
     * Unbinds the chain so a later media element can take over.
     *
     * Pass the element being torn down to make this a no-op when some other
     * player owns the chain; omit it to release unconditionally. Pending volume
     * and normalization are kept, so a remounted player re-applies them.
     */
    releaseMediaElement(element?: unknown): void {
        if (element !== undefined) {
            const realElement = this.extractMediaElement(element);
            if (!realElement || this.mediaElement !== realElement) {
                return;
            }
        }

        this.cleanup();
        this.mediaElement = null;
    }

    applyVolumeBoost(factor: number): void {
        this.pendingVolumeFactor = factor;

        if (!this.gainNode) {
            this.ensureChain();
            return;
        }

        this.gainNode.gain.value = Math.max(0, factor);
        this.ensureContextRunning();
    }

    applyNormalization(level: string): void {
        this.pendingNormalizationLevel = level as NormalizationLevel;

        if (!this.compressorNode) {
            this.ensureChain();
            return;
        }

        this.applyCompressor(level);
        this.ensureContextRunning();
    }

    resumeOnUserInteraction(): void {
        if (this.ensureChain()) {
            this.ensureContextRunning();
        }
    }

    getDebugInfo(): AudioChainDebugInfo {
        return {
            hasContext: !!this.ctx,
            contextState: this.ctx?.state ?? null,
            hasSource: !!this.source,
            hasGain: !!this.gainNode,
            hasCompressor: !!this.compressorNode,
            gainValue: this.gainNode?.gain.value ?? null,
            compressorThreshold: this.compressorNode?.threshold.value ?? null,
            compressorRatio: this.compressorNode?.ratio.value ?? null,
            pendingVolume: this.pendingVolumeFactor,
            pendingNormalization: this.pendingNormalizationLevel,
            isInitialized: this.isInitialized,
            hasMediaElement: !!this.mediaElement,
            mediaElementTagName: this.mediaElement?.tagName ?? null,
        };
    }

    private ensureChain(): boolean {
        if (this.isInitialized) {
            this.ensureContextRunning();
            return true;
        }

        if (!this.mediaElement) {
            return false;
        }

        try {
            this.ctx = new AudioContext();

            try {
                this.source = this.ctx.createMediaElementSource(this.mediaElement);
            } catch {
                this.cleanup();
                return false;
            }

            this.compressorNode = this.ctx.createDynamicsCompressor();
            this.gainNode = this.ctx.createGain();

            this.source.connect(this.compressorNode);
            this.compressorNode.connect(this.gainNode);
            this.gainNode.connect(this.ctx.destination);

            this.isInitialized = true;

            this.applyPendingSettings();
            this.ensureContextRunning();

            return true;
        } catch {
            this.cleanup();
            return false;
        }
    }

    private async ensureContextRunning(): Promise<boolean> {
        if (!this.ctx) {
            return false;
        }

        if (this.ctx.state === 'suspended') {
            try {
                await this.ctx.resume();
            } catch {
                return false;
            }
        }

        return this.ctx.state === 'running';
    }

    private applyPendingSettings(): void {
        if (!this.gainNode || !this.compressorNode) {
            return;
        }

        this.gainNode.gain.value = Math.max(0, this.pendingVolumeFactor);
        this.applyCompressor(this.pendingNormalizationLevel);
    }

    private applyCompressor(level: string): void {
        if (!this.compressorNode) {
            return;
        }

        const preset = getPreset(level);
        this.compressorNode.threshold.value = preset.threshold;
        this.compressorNode.ratio.value = preset.ratio;
        this.compressorNode.knee.value = preset.knee;
        this.compressorNode.attack.value = preset.attack;
        this.compressorNode.release.value = preset.release;
    }

    private cleanup(): void {
        for (const node of [this.source, this.compressorNode, this.gainNode]) {
            try {
                node?.disconnect();
            } catch {
                // Node may already be detached.
            }
        }

        if (this.ctx) {
            try {
                void this.ctx.close();
            } catch {
                // ignore
            }
        }
        this.ctx = null;
        this.source = null;
        this.gainNode = null;
        this.compressorNode = null;
        this.isInitialized = false;
    }

    private extractMediaElement(candidate: unknown): HTMLMediaElement | null {
        if (candidate === null || candidate === undefined) {
            return null;
        }

        if (candidate instanceof HTMLMediaElement) {
            return candidate;
        }

        if (typeof candidate !== 'object') {
            return null;
        }

        const obj = candidate as Record<string, unknown>;

        for (const key of MEDIA_KEYS) {
            if (obj[key] instanceof HTMLMediaElement) {
                return obj[key];
            }
        }

        if (typeof obj['tagName'] === 'string') {
            const maybeEl = candidate as HTMLMediaElement;
            if (
                typeof maybeEl.addEventListener === 'function' &&
                typeof maybeEl.play === 'function' &&
                typeof maybeEl.pause === 'function'
            ) {
                return maybeEl;
            }
        }

        return null;
    }
}

const manager = new AudioChainManager();

export function applyVolumeBoost(factor: number): void {
    manager.applyVolumeBoost(factor);
}

export function applyNormalization(level: string): void {
    manager.applyNormalization(level);
}

export function resumeOnUserInteraction(): void {
    manager.resumeOnUserInteraction();
}

export function setMediaElement(element: unknown): void {
    manager.setMediaElement(element);
}

export function releaseMediaElement(element?: unknown): void {
    manager.releaseMediaElement(element);
}

export function getAudioChainDebugInfo(): AudioChainDebugInfo {
    return manager.getDebugInfo();
}
