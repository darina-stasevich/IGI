class AdvancedSlider {
    constructor(containerElement) {
        this.container = containerElement;
        if (!this.container) return;

         this.container.sliderInstance = this;

        this.options = {
            loop: this.container.dataset.loop === 'true',
            navs: this.container.dataset.navs !== 'false',
            pags: this.container.dataset.pags !== 'false',
            auto: this.container.dataset.auto === 'true',
            stopMouseHover: this.container.dataset.stopMouseHover === 'true',
            delay: parseInt(this.container.dataset.delay, 10) || 5000,
        };

        this.slides = this.container.querySelectorAll('.carousel-slide');
        if (this.slides.length === 0) return;

        this.slideIndex = 0;
        this.totalSlides = this.slides.length;
        this.intervalId = null;

        this.init();
    }

    init() {
        this.applyLinksAndCaptions();
        this.createControls();
        this.updateSlider();

        if (this.options.auto) {
            this.startAutoPlay();
            if (this.options.stopMouseHover) {
                this.container.addEventListener('mouseenter', () => this.stopAutoPlay());
                this.container.addEventListener('mouseleave', () => this.startAutoPlay());
            }
        }
    }

    applyLinksAndCaptions() {
        this.slides.forEach((slide) => {
            const img = slide.querySelector('img');
            const linkUrl = img.dataset.link;
            const captionText = img.dataset.caption;

            const figcaption = slide.querySelector('figcaption');
            if (figcaption) {
                figcaption.textContent = captionText || '';
            }

            if (linkUrl) {
                const link = document.createElement('a');
                link.href = linkUrl;
                link.className = 'carousel-slide-link';
                link.append(...slide.childNodes);
                slide.appendChild(link);
            }
        });
    }

    createControls() {
        const controlsWrapper = document.createElement('div');
        controlsWrapper.className = 'carousel-controls';
        this.container.appendChild(controlsWrapper);

        if (this.options.navs && this.totalSlides > 1) {
            const prevButton = this.createButton('prev', '&#10094;', 'Предыдущий слайд', () => this.changeSlide(-1));
            const nextButton = this.createButton('next', '&#10095;', 'Следующий слайд', () => this.changeSlide(1));
            controlsWrapper.append(prevButton, nextButton);
        }

        if (this.options.pags && this.totalSlides > 1) {
            const paginationContainer = document.createElement('div');
            paginationContainer.className = 'carousel-pagination';
            this.slides.forEach((_, index) => {
                const pagButton = this.createButton('pag-item', '', `Перейти к слайду ${index + 1}`, () => this.goToSlide(index));
                pagButton.dataset.slideTo = index;
                paginationContainer.appendChild(pagButton);
            });
            controlsWrapper.appendChild(paginationContainer);
            this.paginationItems = paginationContainer.querySelectorAll('.carousel-pag-item');
        }

        const slideCounter = document.createElement('div');
        slideCounter.className = 'carousel-counter';
        this.counterElement = slideCounter;
        controlsWrapper.appendChild(this.counterElement);
    }

    createButton(className, innerHTML, title, onClick) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = `carousel-${className}`;
        button.innerHTML = innerHTML;
        button.title = title;
        button.addEventListener('click', onClick);
        return button;
    }

    changeSlide(direction) {
        this.goToSlide(this.slideIndex + direction);
    }

    goToSlide(slideNumber) {
        let newIndex = slideNumber;
        if (this.options.loop) {
            this.slideIndex = (newIndex + this.totalSlides) % this.totalSlides;
        } else {
            this.slideIndex = Math.max(0, Math.min(newIndex, this.totalSlides - 1));
        }
        this.updateSlider();
        this.resetAutoPlay();
    }

    updateSlider() {
        this.slides.forEach((slide, index) => {
            slide.classList.toggle('active', index === this.slideIndex);
        });

        if (this.paginationItems) {
            this.paginationItems.forEach((pag, index) => {
                pag.classList.toggle('active', index === this.slideIndex);
            });
        }

        if (this.counterElement) {
            this.counterElement.textContent = `${this.slideIndex + 1}/${this.totalSlides}`;
        }
    }

    updateOptions(newOptions) {
        if (!newOptions) return;
        Object.assign(this.options, newOptions);
        if (newOptions.delay !== undefined) {
            this.resetAutoPlay();
        }
    }
    startAutoPlay() {
        if (this.intervalId) this.stopAutoPlay();
        if (this.options.auto) {
            this.intervalId = setInterval(() => this.changeSlide(1), this.options.delay);
        }
    }

    stopAutoPlay() {
        clearInterval(this.intervalId);
        this.intervalId = null;
    }

    resetAutoPlay() {
        if (this.options.auto) {
            this.stopAutoPlay();
            this.startAutoPlay();
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.carousel-container').forEach(sliderElement => {
        new AdvancedSlider(sliderElement);
    });
});

document.addEventListener('DOMContentLoaded', () => {
    const delayInput = document.getElementById('delay-input');
    const sliderElement = document.getElementById('main-slider');

    if (delayInput && sliderElement) {
        delayInput.addEventListener('change', (event) => {
            const newDelay = parseInt(event.target.value, 10);

            if (!isNaN(newDelay) && newDelay >= 500 && sliderElement.sliderInstance) {
                sliderElement.sliderInstance.updateOptions({delay: newDelay});

                console.log(`Задержка слайдера обновлена на ${newDelay} мс.`);
            }
        });
    }
});