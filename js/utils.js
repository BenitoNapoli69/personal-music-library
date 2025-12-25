/**
 * Utility Functions
 */

/**
 * Debounce function per evitare troppe chiamate consecutive
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Formatta durata in millisecondi in mm:ss
 */
function formatDuration(ms) {
    if (!ms) return '--:--';

    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

/**
 * Formatta data ISO in formato leggibile
 */
function formatDate(isoString) {
    if (!isoString) return '';

    const date = new Date(isoString);
    return new Intl.DateTimeFormat('it-IT', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    }).format(date);
}

/**
 * Calcola media di un array di numeri
 */
function average(numbers) {
    if (!numbers || numbers.length === 0) return null;

    const sum = numbers.reduce((acc, n) => acc + n, 0);
    return sum / numbers.length;
}

/**
 * Mostra notifica toast
 */
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;

    document.body.appendChild(toast);

    // Animazione di ingresso
    setTimeout(() => toast.classList.add('show'), 10);

    // Rimozione dopo 3 secondi
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

/**
 * Lazy loading per immagini
 */
function lazyLoadImage(img) {
    const src = img.dataset.src;
    if (!src) return;

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const image = entry.target;
                image.src = image.dataset.src;
                image.classList.add('loaded');
                observer.unobserve(image);
            }
        });
    });

    observer.observe(img);
}

/**
 * Genera ID univoco
 */
function generateId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Escape HTML per prevenire XSS
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Truncate testo lungo
 */
function truncate(text, maxLength) {
    if (!text || text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}

/**
 * Local Storage helpers
 */
const storage = {
    set(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch (e) {
            console.error('Errore salvataggio localStorage:', e);
        }
    },

    get(key, defaultValue = null) {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : defaultValue;
        } catch (e) {
            console.error('Errore lettura localStorage:', e);
            return defaultValue;
        }
    },

    remove(key) {
        try {
            localStorage.removeItem(key);
        } catch (e) {
            console.error('Errore rimozione localStorage:', e);
        }
    }
};

/**
 * Arrotonda rating a 1 decimale
 */
function roundRating(rating) {
    if (rating === null || rating === undefined) return null;
    return Math.round(rating * 10) / 10;
}
