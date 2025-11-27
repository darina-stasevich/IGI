document.addEventListener('DOMContentLoaded', () => {

    class AdvancedSlider {
        constructor(containerElement) {
            this.container = containerElement;
            if (!this.container) return;

            this.container.sliderInstance = this;
            this.localStorageKey = `slider-${this.container.id}-settings`;
            this.slides = this.container.querySelectorAll('.carousel-slide');
            if (this.slides.length === 0) return;

            this.slideIndex = 0;
            this.totalSlides = this.slides.length;
            this.intervalId = null;
            this.debugOutput = document.getElementById('debug-settings-output');

            this.loadOptions();
            this.init();
        }

        loadOptions() {
            const serverDefaults = {
                loop: this.container.dataset.loop === 'true',
                navs: this.container.dataset.navs !== 'false',
                pags: this.container.dataset.pags !== 'false',
                auto: this.container.dataset.auto === 'true',
                stopMouseHover: this.container.dataset.stopMouseHover === 'true',
                delay: parseInt(this.container.dataset.delay, 10) || 5000,
            };

            const savedOptions = JSON.parse(localStorage.getItem(this.localStorageKey));

            this.options = {...serverDefaults, ...savedOptions};

            if (savedOptions && serverDefaults.delay !== savedOptions.delay) {
                this.options.delay = serverDefaults.delay;
                localStorage.setItem(this.localStorageKey, JSON.stringify(this.options));
            }
        }

        updateDebugOutput() {
            if (this.debugOutput) {
                this.debugOutput.textContent = JSON.stringify(this.options, null, 2);
            }
        }

        init() {
            this.applyLinksAndCaptions();
            this.createControls();
            this.updateSlider();
            this.setupAutoPlay();
            this.updateDebugOutput();
        }

        setupAutoPlay() {
            this.stopAutoPlay();
            this.removeHoverListeners();
            if (this.options.auto) {
                this.startAutoPlay();
                if (this.options.stopMouseHover) {
                    this.addHoverListeners();
                }
            }
        }

        addHoverListeners() {
            this.boundStop = () => this.stopAutoPlay();
            this.boundStart = () => this.startAutoPlay();
            this.container.addEventListener('mouseenter', this.boundStop);
            this.container.addEventListener('mouseleave', this.boundStart);
        }

        removeHoverListeners() {
            if (this.boundStop) this.container.removeEventListener('mouseenter', this.boundStop);
            if (this.boundStart) this.container.removeEventListener('mouseleave', this.boundStart);
        }

        applyLinksAndCaptions() {
            this.slides.forEach((slide) => {
                if (slide.dataset.processed) return;
                const img = slide.querySelector('img');
                if (!img) return;
                const linkUrl = img.dataset.link;
                const captionText = img.dataset.caption;
                const figcaption = slide.querySelector('figcaption');
                if (figcaption) figcaption.textContent = captionText || '';
                if (linkUrl) {
                    const link = document.createElement('a');
                    link.href = linkUrl;
                    link.className = 'carousel-slide-link';
                    link.append(...slide.childNodes);
                    slide.appendChild(link);
                }
                slide.dataset.processed = 'true';
            });
        }

        createControls() {
            const existingControls = this.container.querySelector('.carousel-controls');
            if (existingControls) existingControls.remove();
            const controlsWrapper = document.createElement('div');
            controlsWrapper.className = 'carousel-controls';
            this.container.appendChild(controlsWrapper);
            if (this.options.navs && this.totalSlides > 1) {
                controlsWrapper.append(
                    this.createButton('prev', '&#10094;', () => this.changeSlide(-1)),
                    this.createButton('next', '&#10095;', () => this.changeSlide(1))
                );
            }
            if (this.options.pags && this.totalSlides > 1) {
                const pagContainer = document.createElement('div');
                pagContainer.className = 'carousel-pagination';
                this.slides.forEach((_, i) => pagContainer.appendChild(this.createButton('pag-item', '', () => this.goToSlide(i), i)));
                controlsWrapper.appendChild(pagContainer);
                this.paginationItems = pagContainer.children;
            }
            const counter = document.createElement('div');
            counter.className = 'carousel-counter';
            this.counterElement = counter;
            controlsWrapper.appendChild(this.counterElement);
        }

        createButton(className, html, onClick, index = null) {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = `carousel-${className}`;
            btn.innerHTML = html;
            btn.addEventListener('click', onClick);
            if (index !== null) btn.dataset.slideTo = index;
            return btn;
        }

        changeSlide(direction) {
            this.goToSlide(this.slideIndex + direction);
        }

        goToSlide(slideNumber) {
            let newIndex = slideNumber;
            if (this.options.loop) {
                newIndex = (newIndex + this.totalSlides) % this.totalSlides;
            } else {
                newIndex = Math.max(0, Math.min(newIndex, this.totalSlides - 1));
            }
            if (newIndex === this.slideIndex) return;
            this.slideIndex = newIndex;
            this.updateSlider();
            if (this.options.auto) this.resetAutoPlay();
        }

        updateSlider() {
            this.slides.forEach((s, i) => s.classList.toggle('active', i === this.slideIndex));
            if (this.paginationItems) {
                Array.from(this.paginationItems).forEach((p, i) => p.classList.toggle('active', i === this.slideIndex));
            }
            if (this.counterElement) this.counterElement.textContent = `${this.slideIndex + 1}/${this.totalSlides}`;
        }

        updateOptions(newOptions) {
            if (!newOptions) return;
            this.options = {...this.options, ...newOptions};
            localStorage.setItem(this.localStorageKey, JSON.stringify(this.options));
            this.createControls();
            this.updateSlider();
            this.setupAutoPlay();
            this.updateDebugOutput();
        }

        startAutoPlay() {
            if (this.intervalId) this.stopAutoPlay();
            if (this.options.auto && this.totalSlides > 1) {
                this.intervalId = setInterval(() => this.changeSlide(1), this.options.delay);
            }
        }

        stopAutoPlay() {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }

        resetAutoPlay() {
            this.stopAutoPlay();
            this.startAutoPlay();
        }
    }

    // Инициализация
    document.querySelectorAll('.carousel-container').forEach(el => new AdvancedSlider(el));

    document.querySelectorAll('.slider-controls-form').forEach(form => {
        const slider = document.getElementById(form.dataset.sliderId)?.sliderInstance;
        if (!slider) return;

        // Заполняем форму
        Object.keys(slider.options).forEach(key => {
            const input = form.elements[key];
            if (input?.type === 'checkbox') input.checked = slider.options[key];
        });

        // Обработчик
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const newOpts = {};
            form.querySelectorAll('input[type="checkbox"]').forEach(cb => newOpts[cb.name] = cb.checked);
            slider.updateOptions(newOpts);
            alert('Настройки обновлены!');
        });
    });
});