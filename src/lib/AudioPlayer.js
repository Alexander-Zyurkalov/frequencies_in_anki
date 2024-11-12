
var audioContext;
var isAudioInitialized = false;
var isPlaying = false;

// Initialize audio context with user interaction
function initializeAudioContext() {
    if (!isAudioInitialized) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        isAudioInitialized = true;
    }
}

// Function to create oscillators for each component
function createOscillators(components, duration) {
    const baseFreq = 220; // A3 note as base frequency
    const startTime = audioContext.currentTime;
    const endTime = startTime + duration;

    components.forEach(comp => {
        if (comp.freq === 0 || comp.amp === 0) return; // Skip components with 0 frequency or amplitude

        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        // Set frequency based on the component's frequency multiplier
        oscillator.frequency.value = baseFreq * comp.freq;

        // Set amplitude
        gainNode.gain.value = Math.abs(comp.amp) * 0.25; // Scale down amplitude for comfortable listening

        // Apply phase shift using a delay node
        const phaseShiftDelay = audioContext.createDelay();
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
        gainNode.connect(audioContext.destination);

        // Start and stop the oscillator
        oscillator.start(startTime);
        oscillator.stop(endTime);
    });
}

// Function to play sound for target waveform
function playTargetSound() {
    if (isPlaying) return;
    isPlaying = true;

    initializeAudioContext();
    createOscillators(components, 3);

    setTimeout(() => {
        isPlaying = false;
    }, 3000);
}

// Function to play sound for attempt waveform
function playAttemptSound() {
    if (isPlaying) return;
    isPlaying = true;

    initializeAudioContext();
    createOscillators(userComponents, 3);

    setTimeout(() => {
        isPlaying = false;
    }, 3000);
}

export function initializeAudioHandlers() {
    const targetCanvas = document.getElementById('targetCanvas');
    const attemptCanvas = document.getElementById('attemptCanvas');

    targetCanvas.addEventListener('click', playTargetSound);
    attemptCanvas.addEventListener('click', playAttemptSound);
}


export { initializeAudioContext, createOscillators, playAttemptSound };
