/**
 * Artists View Component
 * Vista artisti con aggregazione e rating
 */

class ArtistsView {
    constructor() {
        this.artists = [];
        this.currentUserId = null;
    }

    async load(userId) {
        this.currentUserId = userId;

        // Ottieni tutti gli album dell'utente
        const albums = await db.getUserAlbums(userId);

        // Aggrega artisti unici
        const artistMap = new Map();

        albums.forEach(album => {
            if (!artistMap.has(album.artist)) {
                artistMap.set(album.artist, {
                    name: album.artist,
                    albums: [],
                    autoRating: null,
                    manualRating: null,
                    imageUrl: null // Per Last.fm
                });
            }

            artistMap.get(album.artist).albums.push(album);
        });

        // Converti in array e calcola rating
        this.artists = Array.from(artistMap.values());

        // Per ogni artista, calcola rating automatico e recupera eventuale rating manuale
        for (const artist of this.artists) {
            // Calcola auto rating (media album dell'artista)
            const albumRatings = artist.albums
                .map(a => a.manualRating !== null ? a.manualRating : a.autoRating)
                .filter(r => r !== null);

            if (albumRatings.length > 0) {
                artist.autoRating = average(albumRatings);
            }

            // Recupera eventuale rating manuale
            const artistRating = await db.getArtistRating(userId, artist.name);
            if (artistRating) {
                artist.manualRating = artistRating.manualRating;
            }
        }

        // Ordina per rating (prevalente) decrescente
        this.artists.sort((a, b) => {
            const ratingA = a.manualRating !== null ? a.manualRating : a.autoRating || 0;
            const ratingB = b.manualRating !== null ? b.manualRating : b.autoRating || 0;
            return ratingB - ratingA;
        });

        // Render immediato con placeholder
        this.render();

        // Carica immagini in background e aggiorna progressivamente
        this.loadArtistImages();
    }

    async loadArtistImages() {
        // Carica immagini per ogni artista in parallelo
        const imagePromises = this.artists.map(async (artist) => {
            try {
                const imageUrl = await lastfmAPI.getArtistImage(artist.name);

                // Ignora se Last.fm restituisce il suo placeholder generico (stella)
                // Last.fm usa 2a96cbd8b46e442fc41c2b86b821562f.png come placeholder
                if (imageUrl && !imageUrl.includes('2a96cbd8b46e442fc41c2b86b821562f')) {
                    artist.imageUrl = imageUrl;
                    // Aggiorna solo questa card specifica
                    this.updateArtistCard(artist);
                }
            } catch (error) {
                console.warn(`Could not fetch image for ${artist.name}:`, error);
            }
        });

        await Promise.all(imagePromises);
    }

    updateArtistCard(artist) {
        // Trova la card dell'artista e aggiorna solo l'immagine
        const grid = document.querySelector('#artists-view .artist-grid');
        if (!grid) return;

        const cards = grid.querySelectorAll('.artist-card');
        cards.forEach(card => {
            const nameEl = card.querySelector('.artist-name');
            if (nameEl && nameEl.textContent === artist.name) {
                const img = card.querySelector('.artist-image img');
                if (img && artist.imageUrl) {
                    img.src = artist.imageUrl;
                }
            }
        });
    }

    render() {
        const container = document.getElementById('artists-view');
        const grid = container.querySelector('.artist-grid');

        if (this.artists.length === 0) {
            grid.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">🎤</div>
          <h2>Nessun artista ancora</h2>
          <p>Aggiungi album alla tua libreria per visualizzare gli artisti</p>
        </div>
      `;
            return;
        }

        grid.innerHTML = '';

        this.artists.forEach(artist => {
            const artistCard = this.createArtistCard(artist);
            grid.appendChild(artistCard);
        });
    }

    createArtistCard(artist) {
        const card = document.createElement('div');
        card.className = 'artist-card';

        // Determina rating da mostrare (manuale prevale su automatico)
        const displayRating = artist.manualRating !== null ? artist.manualRating : artist.autoRating;
        const ratingBadge = displayRating !== null
            ? `<div class="rating-badge">${roundRating(displayRating)}</div>`
            : '';

        // Usa immagine Last.fm se disponibile, altrimenti placeholder
        const imageUrl = artist.imageUrl || 'assets/placeholder-artist.svg';

        card.innerHTML = `
      <div class="artist-image">
        <img src="${imageUrl}" alt="${escapeHtml(artist.name)}" loading="lazy" onerror="this.src='assets/placeholder-artist.svg'">
        ${ratingBadge}
      </div>
      <div class="artist-info">
        <div class="artist-name">${escapeHtml(artist.name)}</div>
        <div class="artist-album-count">${artist.albums.length} ${artist.albums.length === 1 ? 'album' : 'album'}</div>
      </div>
    `;

        card.addEventListener('click', () => {
            this.showArtistDetail(artist);
        });

        return card;
    }

    showArtistDetail(artist) {
        const modal = document.createElement('div');
        modal.className = 'modal active';
        modal.id = 'artist-detail-modal';

        const displayRating = artist.manualRating !== null ? artist.manualRating : artist.autoRating;

        modal.innerHTML = `
      <div class="modal-content artist-detail-content">
        <button class="close-modal">×</button>
        <h2>${escapeHtml(artist.name)}</h2>
        
        <div class="artist-detail-rating">
          <div class="rating-item">
            <span class="rating-label">Media calcolata:</span>
            <span class="rating-value">${artist.autoRating !== null ? roundRating(artist.autoRating) : '--'}</span>
          </div>
          <div class="rating-item">
            <span class="rating-label">Voto manuale:</span>
            <div id="artist-manual-rating"></div>
          </div>
          <div class="rating-prevalence">
            ${artist.manualRating !== null
                ? `<strong>Voto prevalente: ${roundRating(artist.manualRating)}</strong> (manuale)`
                : artist.autoRating !== null
                    ? `<strong>Voto prevalente: ${roundRating(artist.autoRating)}</strong> (automatico)`
                    : 'Nessun voto ancora'}
          </div>
        </div>
        
        <h3>Album in libreria (${artist.albums.length})</h3>
        <div class="artist-albums-list">
          ${artist.albums.map(album => {
                        const albumRating = album.manualRating !== null ? album.manualRating : album.autoRating;
                        return `
              <div class="artist-album-item">
                <img src="${album.coverUrl || 'assets/placeholder-album.svg'}" alt="${escapeHtml(album.title)}">
                <div class="album-item-info">
                  <div class="album-item-title">${escapeHtml(album.title)}</div>
                  ${album.year ? `<div class="album-item-year">${album.year}</div>` : ''}
                  ${albumRating !== null ? `<div class="album-item-rating">★ ${roundRating(albumRating)}</div>` : ''}
                </div>
              </div>
            `;
                    }).join('')}
        </div>
      </div>
    `;

        document.body.appendChild(modal);

        // Close button
        modal.querySelector('.close-modal').addEventListener('click', () => {
            modal.remove();
        });

        // Click fuori
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });

        // Rating widget per artista
        const ratingContainer = modal.querySelector('#artist-manual-rating');
        new RatingWidget(ratingContainer, {
            maxRating: 10,
            currentRating: artist.manualRating || 0,
            size: 'medium',
            onChange: async (rating) => {
                await this.handleArtistRating(artist, rating, modal);
            }
        });
    }

    async handleArtistRating(artist, rating, modal) {
        try {
            // Salva rating manuale artista
            await db.setArtistRating(this.currentUserId, artist.name, rating);

            // Aggiorna artista corrente
            artist.manualRating = rating;

            // Aggiorna display nel modal
            const prevalence = modal.querySelector('.rating-prevalence');
            prevalence.innerHTML = `<strong>Voto prevalente: ${roundRating(rating)}</strong> (manuale)`;

            // Ricarica vista artisti per aggiornare la griglia
            await this.load(this.currentUserId);

            showToast('Voto artista salvato!', 'success');

        } catch (error) {
            showToast('Errore salvataggio voto', 'error');
            console.error(error);
        }
    }

    show() {
        document.getElementById('artists-view').classList.add('active');
        document.getElementById('library-view').classList.remove('active');
        const historyView = document.getElementById('history-view');
        if (historyView) historyView.classList.remove('active');
    }

    hide() {
        document.getElementById('artists-view').classList.remove('active');
    }
}
