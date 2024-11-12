export class ComponentManager {
    constructor() {
        this.currentComponentIndex = 0;
        this.userComponents = [];
        this.components = [];
        this.activeInteractions = 0;
        this.activeIndicator = null;
        this.indicatorTimeout = null;
    }

    initializeComponents(frequencyString, answerString) {
        const compStrings = frequencyString.split(',');
        if (this.userComponents.length === 0 || !document.getElementById('answer')) {
            const userCompStrings = answerString.split(',');
            if (userCompStrings.length < compStrings.length) {
                for (let i = userCompStrings.length; i < compStrings.length; i++) {
                    userCompStrings.push("0 0 0");
                }
            }
            this.userComponents = this.prepareComponent(userCompStrings);
        }
        this.components = this.prepareComponent(compStrings);
    }

    prepareComponent(compStrings) {
        return compStrings.map(str => {
            const parts = str.trim().split(' ');
            return {
                freq: parseFloat(parts[0]),
                amp: parseFloat(parts[1]),
                phase: parseFloat(parts[2])
            };
        });
    }

    createComponent(index) {
        const div = document.createElement('div');
        div.className = 'component-container';

        const title = document.createElement('div');
        title.textContent = 'Component ' + (index + 1);
        title.style.fontWeight = 'bold';
        title.style.marginBottom = '10px';
        div.appendChild(title);

        const controls = [
            {name: 'freq', label: 'F', max: 1, step: 0.01},
            {name: 'amp', label: 'A', max: 1, min: -1, step: 0.01},
            {name: 'phase', label: 'P', max: 1, step: 0.01}
        ];

        controls.forEach(control => {
            const container = document.createElement('div');
            container.className = 'slider-container';

            const row = document.createElement('div');
            row.className = 'slider-row';

            // Create buttons and slider
            const minusBtn = this.createButton('-', () => this.adjustValue(index, control.name, -control.step));
            const plusBtn = this.createButton('+', () => this.adjustValue(index, control.name, control.step));
            const slider = this.createSlider(index, control);
            const label = this.createLabel(control.label);

            row.appendChild(minusBtn);
            row.appendChild(label);
            row.appendChild(slider);
            row.appendChild(plusBtn);
            container.appendChild(row);
            div.appendChild(container);
        });

        return div;
    }

    createButton(text, onClick) {
        const btn = document.createElement('button');
        btn.className = 'adjust-button';
        btn.textContent = text;
        btn.onclick = onClick;
        return btn;
    }

    createLabel(text) {
        const label = document.createElement('span');
        label.className = 'slider-label';
        label.textContent = text + ':';
        return label;
    }

    createSlider(index, control) {
        const slider = document.createElement('input');
        slider.type = 'range';
        slider.className = 'slider';
        slider.min = control.min || 0;
        slider.max = control.max;
        slider.step = control.step;
        slider.value = this.convertToSliderValue(control.name, this.userComponents[index][control.name]);
        slider.setAttribute('data-control', control.name);

        // Add event listeners
        slider.addEventListener('mousedown', this.createSliderHandler(index, control.name));
        slider.addEventListener('touchstart', this.createSliderHandler(index, control.name));
        slider.addEventListener('input', this.createSliderHandler(index, control.name));
        slider.addEventListener('mouseup', this.createSliderTouchEndHandler(index, control.name));
        slider.addEventListener('touchend', this.createSliderTouchEndHandler(index, control.name));

        return slider;
    }

    convertToSliderValue(controlName, value) {
        if (controlName === 'freq') {
            if (value === 0) return 0;
            if (value < 1) {
                return 0.25 * (3 * value - 1) / 2;
            } else {
                return 0.25 + 0.75 * (Math.log2(value) / Math.log2(40));
            }
        }
        return value;
    }

    convertFromSliderValue(controlName, sliderValue) {
        if (controlName === 'freq') {
            if (sliderValue === 0) return 0;
            if (sliderValue < 0.25) {
                return (2 * sliderValue / 0.25 + 1) / 3;
            } else {
                const normalizedSlider = (sliderValue - 0.25) / 0.75;
                return Math.pow(40, normalizedSlider);
            }
        }
        return sliderValue;
    }

    formatOutputValue(value, precision = 2) {
        return value.toFixed(precision).replace(/\.?0+$/, '').replace(/([,.])\$/, '');
    }

    createFloatingIndicator() {
        const indicator = document.createElement('div');
        indicator.className = 'floating-indicator';
        return indicator;
    }

    showFloatingValue(value, slider, type) {
        if (this.activeIndicator) {
            this.activeIndicator.remove();
        }
        clearTimeout(this.indicatorTimeout);

        const indicator = this.createFloatingIndicator();
        const answerContainer = document.querySelector('.navigation-controls');
        answerContainer.appendChild(indicator);

        indicator.textContent = this.formatOutputValue(value);
        indicator.style.opacity = '1';
        this.activeIndicator = indicator;

        this.indicatorTimeout = setTimeout(() => {
            indicator.style.opacity = '0';
            setTimeout(() => indicator.remove(), 200);
        }, 1500);
    }


    adjustValue(index, controlName, step) {
        const slider = document.querySelector(`[data-control="${controlName}"]`);
        const currentActualValue = this.userComponents[index][controlName];

        let newValue;
        if (controlName === 'freq') {
            const lStep = step;
            const round = 2;
            newValue = currentActualValue + lStep;
            const roundedValue = Number(newValue.toFixed(round));
            if (lStep > 0 && roundedValue > currentActualValue || lStep < 0 && roundedValue < currentActualValue) {
                newValue = roundedValue;
            }
            newValue = Math.min(Math.max(newValue, 0), 40);
        } else {
            newValue = currentActualValue + step;
            newValue = Math.min(Math.max(newValue, parseFloat(slider.min) || 0), parseFloat(slider.max));
        }

        slider.value = this.convertToSliderValue(controlName, newValue);
        this.activeInteractions++;
        this.lastModifiedHarmonic = index;
        this.modifyUserComponents(index, controlName, newValue);

        // Add delayed effects
        setTimeout(() => {
            this.activeInteractions--;
            if (this.activeInteractions === 0) {
                if (this.onComponentUpdate) this.onComponentUpdate();
                if (this.onInteractionComplete) this.onInteractionComplete();
            }
        }, 2000);
    }

    createSliderHandler(index, controlName) {
        return (event) => {
            const sliderValue = parseFloat(event.target.value);
            const newValue = this.convertFromSliderValue(controlName, sliderValue);

            if (event.type === 'mousedown' || event.type === 'touchstart') {
                this.activeInteractions++;
                this.lastModifiedHarmonic = index;
            }

            this.modifyUserComponents(index, controlName, newValue);
        };
    }

    createSliderTouchEndHandler(index, controlName) {
        return () => {
            if (this.activeInteractions > 0) {
                this.activeInteractions--;
                if (this.activeInteractions === 0) {
                    // These callbacks should be set from outside
                    if (this.onComponentUpdate) this.onComponentUpdate();
                    if (this.onInteractionComplete) this.onInteractionComplete();
                }
            }
        };
    }

    modifyUserComponents(index, property, value) {
        this.userComponents[index][property] = Number(this.formatOutputValue(value));
        if (this.onComponentUpdate) this.onComponentUpdate();
        this.showFloatingValue(value, null, property);
    }

    updateAnswerString() {
        const answerStr = this.userComponents.map(comp => {
            const freq = this.formatOutputValue(comp.freq);
            const amp = this.formatOutputValue(comp.amp);
            const phase = this.formatOutputValue(comp.phase);
            return `${freq} ${amp} ${phase}`;
        }).join(', ');

        document.getElementById('answerString').textContent = answerStr;

        const typeans = document.getElementById('typeans');
        if (typeans) {
            typeans.value = answerStr;
        }
    }

    navigateNext() {
        if (this.currentComponentIndex < this.components.length - 1) {
            this.currentComponentIndex++;
            this.updateComponentView();
        }
    }

    updateComponentView() {
        document.getElementById('componentNumber').textContent =
            'Component ' + (this.currentComponentIndex + 1) + ' of ' + this.components.length;

        document.getElementById('prevComponent').disabled = this.currentComponentIndex === 0;
        document.getElementById('nextComponent').disabled = this.currentComponentIndex === this.components.length - 1;

        const container = document.getElementById('sliderContainer');
        container.innerHTML = '';
        container.appendChild(this.createComponent(this.currentComponentIndex));

        this.updateSliderValues();
    }

    updateSliderValues() {
        const component = this.userComponents[this.currentComponentIndex];
        const container = document.querySelector('.component-container');

        ['freq', 'amp', 'phase'].forEach(controlName => {
            const slider = container.querySelector(`[data-control="${controlName}"]`);
            if (slider) {
                slider.value = this.convertToSliderValue(controlName, component[controlName]);
            }
        });
    }
}
