class AudioHandler {
    constructor() {
        this.audioContext = null;
        this.isAudioInitialized = false;
        this.isPlaying = false;
    }

    // Initialize audio context with user interaction
    initializeAudioContext() {
        if (!this.isAudioInitialized) {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.isAudioInitialized = true;
        }
    }

    // Function to create oscillators for each component
    createOscillators(components, duration) {
        const baseFreq = 220; // A3 note as base frequency
        const startTime = this.audioContext.currentTime;
        const endTime = startTime + duration;

        components.forEach(comp => {
            if (comp.freq === 0 || comp.amp === 0) return; // Skip components with 0 frequency or amplitude

            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();

            // Set frequency based on the component's frequency multiplier
            oscillator.frequency.value = baseFreq * comp.freq;

            // Set amplitude
            gainNode.gain.value = Math.abs(comp.amp) * 0.25; // Scale down amplitude for comfortable listening

            // Apply phase shift using a delay node
            const phaseShiftDelay = this.audioContext.createDelay();
            const phasePeriod = 1 / (baseFreq * comp.freq); // Period of the wave in seconds
            const phaseDelay = (comp.phase * phasePeriod); // Convert phase (0-1) to time delay
            phaseShiftDelay.delayTime.value = phaseDelay;

            // Apply fade in/out to avoid clicks
            gainNode.gain.setValueAtTime(0, startTime);
            gainNode.gain.linearRampToValueAtTime(Math.abs(comp.amp) * 0.25, startTime + 0.01);
            gainNode.gain.linearRampToValueAtTime(0, endTime - 0.01);

            // Connect nodes with phase shift
            oscillator.connect(phaseShiftDelay);
            phaseShiftDelay.connect(gainNode);
            gainNode.connect(this.audioContext.destination);

            // Start and stop the oscillator
            oscillator.start(startTime);
            oscillator.stop(endTime);
        });
    }

    // Function to play sound for target waveform
    playWaveform(components) {
        if (this.isPlaying) return;
        this.isPlaying = true;

        console.log(components);
        this.initializeAudioContext();
        this.createOscillators(components, 3);

        setTimeout(() => {
            this.isPlaying = false;
        }, 3000);
    }

    initializeAudioHandlers(uiElement, components) {
        uiElement.addEventListener('click', () => this.playWaveform(components));
    }
}

export {AudioHandler};
