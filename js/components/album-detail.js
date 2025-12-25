/**
 * Album Detail Component
 * Vista dettaglio album con tracklist e rating
 */

class AlbumDetail {
    constructor() {
        this.currentAlbum = null;
        this.currentUserId = null;
        this.songRatings = [];
        this.ratingWidgets = [];
    }

    async show(album, userId) {
        this.currentAlbum = album;
        this.currentUserId = userId;

        // Carica rating canzoni esistenti
        this.songRatings = await db.getAlbumSongRatings(userId, album.id);

        this.render();

        const container = document.getElementById('album-detail-view');
        container.classList.add('active');
    }

    hide() {
        document.getElementById('album-detail-view').classList.remove('active');
        this.currentAlbum = null;
        this.ratingWidgets = [];
    }

    render() {
        const container = document.getElementById('album-detail-view');
        const album = this.currentAlbum;

        const coverUrl = album.coverUrl || 'assets/placeholder-album.svg';

        container.innerHTML = `
      <div class="detail-header">
        <button class="back-btn" id="back-to-library">← Libreria</button>
        <h1>Dettaglio Album</h1>
      </div>
      
      <div class="detail-content">
        <div class="album-header">
          <img class="album-cover-large" src="${coverUrl}" alt="${escapeHtml(album.title)}">
          <div class="album-header-info">
            <h2 class="album-title-large">${escapeHtml(album.title)}</h2>
            <div class="album-artist-large">${escapeHtml(album.artist)}</div>
            ${album.year ? `<div class="album-year-large">${album.year}</div>` : ''}
            <div class="album-tracks-count">${album.tracks.length} tracce</div>
          </div>
        </div>
        
        <div class="album-rating-section">
          <h3>Valutazione Album</h3>
          <div class="rating-container">
            <div class="rating-item">
              <span class="rating-label">Media calcolata:</span>
              <span class="rating-value">${album.autoRating !== null ? roundRating(album.autoRating) : '--'}</span>
            </div>
            <div class="rating-item">
              <span class="rating-label">Voto manuale:</span>
              <div id="album-manual-rating"></div>
            </div>
            <div class="rating-prevalence">
              ${album.manualRating !== null
                ? `<strong>Voto prevalente: ${roundRating(album.manualRating)}</strong> (manuale)`
                : album.autoRating !== null
                    ? `<strong>Voto prevalente: ${roundRating(album.autoRating)}</strong> (automatico)`
                    : 'Nessun voto ancora'}
            </div>
          </div>
        </div>
        
        <div class="tracklist-section">
          <h3>Tracklist</h3>
          <div class="tracklist" id="tracklist"></div>
        </div>
      </div>
    `;

        // Back button
        container.querySelector('#back-to-library').addEventListener('click', () => {
            this.hide();
        });

        // Render tracklist con rating widgets
        this.renderTracklist();

        // Render album manual rating widget
        this.renderAlbumRating();
    }

    renderTracklist() {
        const tracklist = document.getElementById('tracklist');
        tracklist.innerHTML = '';

        this.currentAlbum.tracks.forEach((track, index) => {
            const trackItem = document.createElement('div');
            trackItem.className = 'track-item';

            // Trova rating esistente per questa traccia
            const existingRating = this.songRatings.find(r => r.trackNumber == track.number);
            const currentRating = existingRating ? existingRating.rating : 0;

            trackItem.innerHTML = `
        <div class="track-number">${track.number}</div>
        <div class="track-info">
          <div class="track-title">${escapeHtml(track.title)}</div>
          ${track.duration ? `<div class="track-duration">${formatDuration(track.duration)}</div>` : ''}
        </div>
        <div class="track-rating" id="track-rating-${index}"></div>
      `;

            tracklist.appendChild(trackItem);

            // Crea rating widget per questa canzone
            const ratingContainer = trackItem.querySelector(`#track-rating-${index}`);
            const widget = new RatingWidget(ratingContainer, {
                maxRating: 10,
                currentRating: currentRating,
                size: 'small',
                onChange: async (rating) => {
                    await this.handleSongRating(track.number, rating);
                }
            });

            this.ratingWidgets.push(widget);
        });
    }

    renderAlbumRating() {
        const container = document.getElementById('album-manual-rating');

        const widget = new RatingWidget(container, {
            maxRating: 10,
            currentRating: this.currentAlbum.manualRating || 0,
            size: 'medium',
            onChange: async (rating) => {
                await this.handleAlbumRating(rating);
            }
        });
    }

    async handleSongRating(trackNumber, rating) {
        try {
            // Salva rating canzone
            await db.setSongRating(this.currentUserId, this.currentAlbum.id, trackNumber, rating);

            // Ricalcola rating automatico album
            const autoRating = await db.calculateAlbumAutoRating(this.currentUserId, this.currentAlbum.id);

            // Aggiorna album corrente
            this.currentAlbum.autoRating = autoRating;

            // Aggiorna display rating album
            this.updateRatingDisplay();

            showToast('Rating salvato!', 'success');

        } catch (error) {
            showToast('Errore salvataggio rating', 'error');
            console.error(error);
        }
    }

    async handleAlbumRating(rating) {
        try {
            // Salva rating manuale album
            await db.updateAlbumRating(this.currentAlbum.id, rating, null);

            // Aggiorna album corrente
            this.currentAlbum.manualRating = rating;

            // Aggiorna display
            this.updateRatingDisplay();

            showToast('Voto album salvato!', 'success');

        } catch (error) {
            showToast('Errore salvataggio voto', 'error');
            console.error(error);
        }
    }

    updateRatingDisplay() {
        const ratingSection = document.querySelector('.album-rating-section');

        // Aggiorna media calcolata
        ratingSection.querySelector('.rating-value').textContent =
            this.currentAlbum.autoRating !== null ? roundRating(this.currentAlbum.autoRating) : '--';

        // Aggiorna prevalenza
        const prevalence = ratingSection.querySelector('.rating-prevalence');
        if (this.currentAlbum.manualRating !== null) {
            prevalence.innerHTML = `<strong>Voto prevalente: ${roundRating(this.currentAlbum.manualRating)}</strong> (manuale)`;
        } else if (this.currentAlbum.autoRating !== null) {
            prevalence.innerHTML = `<strong>Voto prevalente: ${roundRating(this.currentAlbum.autoRating)}</strong> (automatico)`;
        } else {
            prevalence.innerHTML = 'Nessun voto ancora';
        }
    }
}
