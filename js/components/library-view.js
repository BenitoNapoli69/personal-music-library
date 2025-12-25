/**
 * Library View Component
 * Vista principale libreria musicale
 */

class LibraryView {
    constructor() {
        this.albums = [];
        this.searchResults = [];
        this.onAlbumClick = null;
        this.currentSort = storage.get('librarySortBy', 'addedAt');
        this.userId = null;
    }

    async load(userId) {
        this.userId = userId;
        this.albums = await db.getUserAlbums(userId);
        this.sortAlbums();
        this.render();
    }

    sortAlbums() {
        const sortBy = this.currentSort;

        this.albums.sort((a, b) => {
            switch (sortBy) {
                case 'addedAt':
                    // Più recenti prima
                    return new Date(b.addedAt) - new Date(a.addedAt);

                case 'year':
                    // Più recenti prima, null alla fine
                    if (!a.year && !b.year) return 0;
                    if (!a.year) return 1;
                    if (!b.year) return -1;
                    return parseInt(b.year) - parseInt(a.year);

                case 'rating':
                    // Rating più alto prima
                    const ratingA = a.manualRating !== null ? a.manualRating : (a.autoRating || 0);
                    const ratingB = b.manualRating !== null ? b.manualRating : (b.autoRating || 0);
                    return ratingB - ratingA;

                case 'artist':
                    // Ordine alfabetico artista
                    return a.artist.localeCompare(b.artist, 'it');

                case 'title':
                    // Ordine alfabetico titolo
                    return a.title.localeCompare(b.title, 'it');

                default:
                    return 0;
            }
        });
    }

    setupSorting() {
        const sortSelect = document.getElementById('library-sort-select');
        if (!sortSelect) return;

        sortSelect.value = this.currentSort;

        sortSelect.addEventListener('change', async (e) => {
            this.currentSort = e.target.value;
            storage.set('librarySortBy', this.currentSort);
            this.sortAlbums();
            this.render();
        });
    }

    render() {
        const container = document.getElementById('library-view');
        const grid = container.querySelector('.album-grid');

        if (this.albums.length === 0) {
            grid.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">🎵</div>
          <h2>La tua libreria è vuota</h2>
          <p>Cerca e aggiungi i tuoi album preferiti per iniziare!</p>
        </div>
      `;
            return;
        }

        grid.innerHTML = '';

        this.albums.forEach(album => {
            const albumCard = this.createAlbumCard(album);
            grid.appendChild(albumCard);
        });

        // Setup sorting dopo render
        this.setupSorting();
    }

    createAlbumCard(album) {
        const card = document.createElement('div');
        card.className = 'album-card';

        // Determina rating da mostrare (manuale prevale su automatico)
        const displayRating = album.manualRating !== null ? album.manualRating : album.autoRating;
        const ratingBadge = displayRating !== null
            ? `<div class="rating-badge">${roundRating(displayRating)}</div>`
            : '';

        const coverUrl = album.coverUrl || 'assets/placeholder-album.svg';

        card.innerHTML = `
      <div class="album-cover">
        <img src="${coverUrl}" alt="${escapeHtml(album.title)}" loading="lazy">
        ${ratingBadge}
      </div>
      <div class="album-info">
        <div class="album-title">${escapeHtml(album.title)}</div>
        <div class="album-artist">${escapeHtml(album.artist)}</div>
        ${album.year ? `<div class="album-year">${album.year}</div>` : ''}
      </div>
    `;

        card.addEventListener('click', () => {
            if (this.onAlbumClick) {
                this.onAlbumClick(album);
            }
        });

        return card;
    }

    setupSearch(userId) {
        const searchBtn = document.getElementById('add-album-btn');
        const searchModal = document.getElementById('search-modal');
        const searchInput = document.getElementById('album-search-input');
        const searchResults = document.getElementById('search-results');
        const closeBtn = searchModal.querySelector('.close-modal');

        // Apri modal
        searchBtn.addEventListener('click', () => {
            searchModal.classList.add('active');
            searchInput.focus();
        });

        // Chiudi modal
        closeBtn.addEventListener('click', () => {
            searchModal.classList.remove('active');
            searchInput.value = '';
            searchResults.innerHTML = '';
        });

        // Click fuori modal
        searchModal.addEventListener('click', (e) => {
            if (e.target === searchModal) {
                searchModal.classList.remove('active');
            }
        });

        // Search con debounce
        const debouncedSearch = debounce(async (query) => {
            if (query.length < 2) {
                searchResults.innerHTML = '';
                return;
            }

            searchResults.innerHTML = '<div class="loading">Ricerca in corso...</div>';

            try {
                const results = await musicAPI.searchAlbums(query);
                this.displaySearchResults(results, userId, searchModal);
            } catch (error) {
                searchResults.innerHTML = '<div class="error">Errore nella ricerca. Riprova.</div>';
                console.error(error);
            }
        }, 500);

        searchInput.addEventListener('input', (e) => {
            debouncedSearch(e.target.value.trim());
        });
    }

    displaySearchResults(results, userId, modal) {
        const searchResults = document.getElementById('search-results');

        if (results.length === 0) {
            searchResults.innerHTML = '<div class="no-results">Nessun risultato trovato</div>';
            return;
        }

        searchResults.innerHTML = '';

        results.forEach(result => {
            const resultItem = document.createElement('div');
            resultItem.className = 'search-result-item';

            resultItem.innerHTML = `
        <div class="result-info">
          <div class="result-title">${escapeHtml(result.title)}</div>
          <div class="result-artist">${escapeHtml(result.artist)}</div>
          <div class="result-meta">
            ${result.year ? result.year : ''}
            ${result.country ? ` • ${result.country}` : ''}
            ${result.format ? ` • ${result.format}` : ''}
          </div>
        </div>
        <button class="add-btn">Aggiungi</button>
      `;

            const addBtn = resultItem.querySelector('.add-btn');
            addBtn.addEventListener('click', async (e) => {
                e.stopPropagation();
                addBtn.disabled = true;
                addBtn.textContent = 'Caricamento...';

                try {
                    await this.addAlbumToLibrary(userId, result.mbid);
                    modal.classList.remove('active');
                    searchResults.innerHTML = '';
                    document.getElementById('album-search-input').value = '';
                    showToast('Album aggiunto alla libreria!', 'success');
                } catch (error) {
                    addBtn.disabled = false;
                    addBtn.textContent = 'Aggiungi';

                    if (error.name === 'ConstraintError') {
                        showToast('Album già presente nella libreria', 'warning');
                    } else {
                        showToast('Errore aggiunta album', 'error');
                        console.error(error);
                    }
                }
            });

            searchResults.appendChild(resultItem);
        });
    }

    async addAlbumToLibrary(userId, mbid) {
        // Recupera dettagli completi
        const albumDetails = await musicAPI.getAlbumDetails(mbid);

        // Aggiungi al database
        const albumId = await db.addAlbum(userId, albumDetails);

        // Ricarica libreria
        await this.load(userId);
    }

    show() {
        document.getElementById('library-view').classList.add('active');
        document.getElementById('artists-view').classList.remove('active');
        const historyView = document.getElementById('history-view');
        if (historyView) historyView.classList.remove('active');
    }

    hide() {
        document.getElementById('library-view').classList.remove('active');
    }
}
