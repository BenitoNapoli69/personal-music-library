/**
 * Rating Widget Component
 * Widget riutilizzabile per stelle di valutazione con supporto mezze stelle
 */

class RatingWidget {
    constructor(container, options = {}) {
        this.container = container;
        this.maxRating = options.maxRating || 10;
        this.currentRating = options.currentRating || 0;
        this.onChange = options.onChange || (() => { });
        this.readonly = options.readonly || false;
        this.size = options.size || 'medium'; // small, medium, large
        this.allowHalf = options.allowHalf !== false; // Default true

        this.render();
    }

    render() {
        this.container.innerHTML = '';
        this.container.className = `rating-widget rating-${this.size}`;

        if (this.readonly) {
            this.container.classList.add('readonly');
        }

        for (let i = 1; i <= this.maxRating; i++) {
            const star = document.createElement('span');
            star.className = 'star';
            star.dataset.value = i;

            // Determina quale simbolo mostrare
            if (this.currentRating >= i) {
                star.innerHTML = '★'; // Stella piena
            } else if (this.allowHalf && this.currentRating >= i - 0.5) {
                star.innerHTML = '⯨'; // Mezza stella
            } else {
                star.innerHTML = '☆'; // Stella vuota
            }

            if (!this.readonly) {
                star.addEventListener('mouseenter', (e) => this.handleHover(i, e));
                star.addEventListener('mousemove', (e) => this.handleHover(i, e));
                star.addEventListener('mouseleave', () => this.handleHoverOut());
                star.addEventListener('click', (e) => this.handleClick(i, e));
            }

            this.container.appendChild(star);
        }

        // Aggiungi display numerico
        const display = document.createElement('span');
        display.className = 'rating-display';
        display.textContent = this.currentRating > 0 ? this.currentRating.toFixed(1) : '--';
        this.container.appendChild(display);
    }

    handleHover(baseValue, event) {
        if (!this.allowHalf) {
            this.updateStarsDisplay(baseValue);
            return;
        }

        // Calcola se siamo sulla metà sinistra o destra della stella
        const star = event.target;
        const rect = star.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const isLeftHalf = x < rect.width / 2;

        const rating = isLeftHalf ? baseValue - 0.5 : baseValue;
        this.updateStarsDisplay(rating);
    }

    updateStarsDisplay(rating) {
        const stars = this.container.querySelectorAll('.star');
        stars.forEach((star, index) => {
            const starValue = index + 1;

            if (rating >= starValue) {
                star.innerHTML = '★';
                star.classList.add('hover');
            } else if (this.allowHalf && rating >= starValue - 0.5) {
                star.innerHTML = '⯨';
                star.classList.add('hover');
            } else {
                star.innerHTML = '☆';
                star.classList.remove('hover');
            }
        });
    }

    handleHoverOut() {
        const stars = this.container.querySelectorAll('.star');
        stars.forEach((star, index) => {
            const starValue = index + 1;

            if (this.currentRating >= starValue) {
                star.innerHTML = '★';
            } else if (this.allowHalf && this.currentRating >= starValue - 0.5) {
                star.innerHTML = '⯨';
            } else {
                star.innerHTML = '☆';
            }
            star.classList.remove('hover');
        });
    }

    handleClick(baseValue, event) {
        if (!this.allowHalf) {
            this.currentRating = baseValue;
            this.render();
            this.onChange(baseValue);
            return;
        }

        // Calcola se siamo sulla metà sinistra o destra della stella
        const star = event.target;
        const rect = star.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const isLeftHalf = x < rect.width / 2;

        const rating = isLeftHalf ? baseValue - 0.5 : baseValue;

        this.currentRating = rating;
        this.render();
        this.onChange(rating);
    }

    setRating(rating) {
        this.currentRating = rating;
        this.render();
    }

    getRating() {
        return this.currentRating;
    }
}
