
// Modified easing function with better precision for small values
function easeInOutCubic(t) {
    // Ensure t is between 0 and 1
    t = Math.max(0, Math.min(1, t));

    // Enhanced precision cubic easing
    if (t < 0.5) {
        return 4 * t * t * t;
    } else {
        const t2 = -2 * t + 2;
        return 1 - (t2 * t2 * t2) / 2;
    }
}

function arePointsEqual(points1, points2) {
    if (points1.length !== points2.length) {
        return false;
    }
    for (var i = 0; i < points1.length; i++) {
        if (points1[i] !== points2[i]) {
            return false;
        }
    }
    return true;
}

class WaveformRenderer {
    constructor() {
        this.animationState = {
            queues: {
                'red': {
                    frames: [],
                    currentFrame: 0,
                    lastClearTime: 0
                },
                'blue': {
                    frames: [],
                    currentFrame: 0,
                    lastClearTime: 0
                },
                '#d3d2d2': {
                    frames: [],
                    currentFrame: 0,
                    lastClearTime: 0
                }
            },
            isAnimating: false,
            stepTime: 16
        };
    }

    setupCanvas(canvas) {
        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();

        canvas.width = rect.width * dpr;
        canvas.height = rect.width * 0.25 * dpr;

        const ctx = canvas.getContext('2d');
        ctx.scale(dpr, dpr);
        return ctx;
    }

    drawGridLines(canvas, ctx) {
        var rect = canvas.getBoundingClientRect();
        var cycleWidth = rect.width / numCycles;

        // Set initial grid style for background grid
        ctx.strokeStyle = '#ddd';
        ctx.lineWidth = 1;

        // Draw vertical cycle lines
        ctx.setLineDash([5, 5]);
        for (var i = 0; i <= numCycles; i++) {
            var x = i * cycleWidth;
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, rect.height);
            ctx.stroke();
        }

        // Draw horizontal amplitude lines
        var canvasHeight = rect.height;
        var centerY = canvasHeight / 2;
        var stepSize = (canvasHeight - 20) / 20; // 20 steps for -1 to 1 in 0.1 increments

        for (var i = -10; i <= 10; i++) {
            if (i !== 0) {  // Skip the centre line here, we'll draw it separately
                var y = centerY + (i * stepSize);
                ctx.beginPath();
                ctx.moveTo(0, y);
                ctx.lineTo(rect.width, y);
                ctx.stroke();
            }
        }

        // Reset dash setting
        ctx.setLineDash([]);

        // Draw the centre line (x-axis) with a different style
        ctx.strokeStyle = '#c8c8c8';  // Darker grey for the centre line
        ctx.lineWidth = 2;  // Thicker line
        ctx.beginPath();
        ctx.moveTo(0, centerY);
        ctx.lineTo(rect.width, centerY);
        ctx.stroke();
    }

    calculateWaveform(width, height, comps) {
        var scale = (height / 2 - 20);
        var points = [];
        for (var x = 0; x < width; x++) {
            points[x] = 0;
        }

        for (var i = 0; i < comps.length; i++) {
            var comp = comps[i];
            for (var x = 0; x < width; x++) {
                var t = x * (Math.PI * 2 * numCycles / width);
                if (comp.freq === 0)
                    points[x] -= comp.amp;
                else
                    points[x] -= comp.amp * Math.sin(comp.freq * t + comp.phase * Math.PI * 2);
            }
        }
        for (var x = 0; x < width; x++) {
            points[x] = points[x] * scale + height / 2;
        }
        return points;
    }

    drawWaveform(canvas, points, colour, ctx) {
        // Draw waveform
        ctx.strokeStyle = colour;
        ctx.lineWidth = 2;
        ctx.beginPath();

        for (var x = 0; x < points.length; x++) {
            var scaledY = points[x]
            if (x === 0) {
                ctx.moveTo(x, scaledY);
            } else {
                ctx.lineTo(x, scaledY);
            }
        }
        ctx.stroke();
    }

    calculateMorphFrames(startPoints, endPoints, steps, color) {
        const frames = [];
        const width = startPoints.length;

        for (let step = 0; step <= steps; step++) {
            const rawProgress = step / steps;
            const progress = easeInOutCubic(rawProgress);

            const framePoints = new Array(width);
            for (let x = 0; x < width; x++) {
                framePoints[x] = startPoints[x] + (endPoints[x] - startPoints[x]) * progress;
            }

            frames.push({
                points: framePoints,
                color: color
            });
        }

        return frames;
    }
     scheduleMorphicDraw(canvas, startPoints, endPoints, color, ctx) {
        const duration = 1000; // Animation duration in milliseconds
        const steps = Math.floor(duration / this.animationState.stepTime);
        var newFrames;

        if (this.arePointsEqual(startPoints, endPoints)) {
            newFrames = [{
                points: JSON.parse(JSON.stringify(startPoints)),
                color: color
            }]
        } else {
            newFrames = this.calculateMorphFrames(startPoints, endPoints, steps, color);
        }

        // If it's been more than 5 seconds since the last clear, or no animation is running,
        // clear the queue and start fresh
        const now = Date.now();
        if (!this.animationState.isAnimating || now - this.animationState.queues[color].lastClearTime > 5000) {
            this.animationState.queues[color].frames = newFrames;
            this.animationState.queues[color].currentFrame = 0;
            this.animationState.queues[color].lastClearTime = now;
        } else {
            this.animationState.queues[color].frames = this.animationState.queues[color].frames.concat(newFrames);
        }

        // If not already animating, start the animation loop
        if (!this.animationState.isAnimating) {
            this.animationState.isAnimating = true;
            requestAnimationFrame(() => this.drawNextFrame(canvas, ctx));
        }
    }

    stopAnimation() {
        this.animationState.isAnimating = false;
        Object.keys(this.animationState.queues).forEach(colour => {
            this.animationState.queues[colour].currentFrame = 0;
            this.animationState.queues[colour].frames = [];
        });
    }

    drawNextFrame(canvas, ctx) {
        const activeQueues = Object.keys(this.animationState.queues).filter(color =>
            this.animationState.queues[color].frames.length > 0
        );
        // Ensure 'red' is processed last
        activeQueues.sort(color => (color === 'red' ? 1 : -1));

        if (activeQueues.length === 0) {
            this.stopAnimation();
            return;
        }

        // Clear canvas and redraw grid
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        this.drawGridLines(canvas, ctx);

        let shouldContinue = false;

        // Draw current frame for each active queue
        activeQueues.forEach(colour => {
            const queue = this.animationState.queues[colour];
            const frameIndex = Math.min(queue.currentFrame, queue.frames.length - 1);
            const frame = queue.frames[frameIndex];

            this.drawWaveform(canvas, frame.points, colour, ctx);

            // Only increment if we haven't reached the end
            if (queue.currentFrame < queue.frames.length - 1) {
                queue.currentFrame++;
                shouldContinue = true;
            }
        });

        // Continue animation if any queue still has frames
        if (shouldContinue) {
            setTimeout(() => {
                requestAnimationFrame(() => this.drawNextFrame(canvas, ctx));
            }, this.animationState.stepTime);
        } else {
            this.stopAnimation();
        }
    }

    redrawAll() {
        var targetCanvas = document.getElementById('targetCanvas');
        var ctx = this.setupCanvas(targetCanvas);
        var rect = targetCanvas.getBoundingClientRect();

        ctx.clearRect(0, 0, rect.width, rect.height);
        this.drawGridLines(targetCanvas, ctx);

        var points = this.calculateWaveform(rect.width, rect.height, this.components);
        this.drawWaveform(targetCanvas, points, 'blue', ctx);

        this.stopAnimation();
        this.drawAttempt();
    }
}

export default WaveformRenderer;
