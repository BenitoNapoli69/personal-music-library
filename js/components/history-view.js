/**
 * History View Component
 * Vista storico con preferiti dell'utente
 */

class HistoryView {
    constructor() {
        this.currentUserId = null;
    }

    async load(userId) {
        this.currentUserId = userId;
        await this.render();
    }

    async render() {
        const container = document.getElementById('history-view');
        const content = container.querySelector('.history-content');

        // Ottieni i preferiti
        const favorites = await this.getFavorites();

        if (!favorites.artist && !favorites.album && !favorites.song) {
            content.innerHTML = `
        <div class="empty-history">
          <div class="empty-history-icon">📊</div>
          <h2>Nessuno storico ancora</h2>
          <p>Inizia a valutare i tuoi album e canzoni per vedere i tuoi preferiti!</p>
        </div>
      `;
            return;
        }

        const cards = [];

        // Card Artista Preferito
        if (favorites.artist) {
            cards.push(`
        <div class="favorite-card">
          <h3>🎤 Artista Preferito</h3>
          <div class="favorite-content">
            <img src="assets/placeholder-artist.svg" alt="${escapeHtml(favorites.artist.name)}" class="favorite-image">
            <div class="favorite-info">
              <div class="favorite-name">${escapeHtml(favorites.artist.name)}</div>
              <div class="favorite-rating">
                <span>⭐</span>
                <span>${roundRating(favorites.artist.rating)}/10</span>
              </div>
              <div class="favorite-artist">${favorites.artist.albumCount} ${favorites.artist.albumCount === 1 ? 'album' : 'album'} in libreria</div>
            </div>
          </div>
        </div>
      `);
        }

        // Card Album Preferito
        if (favorites.album) {
            cards.push(`
        <div class="favorite-card">
          <h3>💿 Album Preferito</h3>
          <div class="favorite-content">
            <img src="${favorites.album.coverUrl || 'assets/placeholder-album.svg'}" alt="${escapeHtml(favorites.album.title)}" class="favorite-image">
            <div class="favorite-info">
              <div class="favorite-name">${escapeHtml(favorites.album.title)}</div>
              <div class="favorite-artist">${escapeHtml(favorites.album.artist)}</div>
              ${favorites.album.year ? `<div class="favorite-album">${favorites.album.year}</div>` : ''}
              <div class="favorite-rating">
                <span>⭐</span>
                <span>${roundRating(favorites.album.rating)}/10</span>
              </div>
            </div>
          </div>
        </div>
      `);
        }

        // Card Canzone Preferita
        if (favorites.song) {
            cards.push(`
        <div class="favorite-card">
          <h3>🎵 Canzone Preferita</h3>
          <div class="favorite-content">
            <img src="${favorites.song.albumCover || 'assets/placeholder-album.svg'}" alt="${escapeHtml(favorites.song.albumTitle)}" class="favorite-image">
            <div class="favorite-info">
              <div class="favorite-name">${escapeHtml(favorites.song.title)}</div>
              <div class="favorite-artist">${escapeHtml(favorites.song.artist)}</div>
              <div class="favorite-album">da "${escapeHtml(favorites.song.albumTitle)}"</div>
              <div class="favorite-rating">
                <span>⭐</span>
                <span>${roundRating(favorites.song.rating)}/10</span>
              </div>
            </div>
          </div>
        </div>
      `);
        }

        content.innerHTML = cards.join('');
    }

    async getFavorites() {
        const favorites = {
            artist: null,
            album: null,
            song: null
        };

        // Album preferito
        const albums = await db.getUserAlbums(this.currentUserId);
        if (albums.length > 0) {
            const sortedAlbums = albums
                .map(a => ({
                    ...a,
                    rating: a.manualRating !== null ? a.manualRating : a.autoRating
                }))
                .filter(a => a.rating !== null)
                .sort((a, b) => b.rating - a.rating);

            if (sortedAlbums.length > 0) {
                favorites.album = sortedAlbums[0];
            }
        }

        // Artista preferito
        if (albums.length > 0) {
            const artistMap = new Map();

            for (const album of albums) {
                if (!artistMap.has(album.artist)) {
                    artistMap.set(album.artist, {
                        name: album.artist,
                        albums: [],
                        rating: null
                    });
                }
                artistMap.get(album.artist).albums.push(album);
            }

            for (const [artistName, data] of artistMap) {
                const artistRating = await db.getArtistRating(this.currentUserId, artistName);
                const albumRatings = data.albums
                    .map(a => a.manualRating !== null ? a.manualRating : a.autoRating)
                    .filter(r => r !== null);

                if (artistRating && artistRating.manualRating !== null) {
                    data.rating = artistRating.manualRating;
                } else if (albumRatings.length > 0) {
                    data.rating = average(albumRatings);
                }

                data.albumCount = data.albums.length;
            }

            const sortedArtists = Array.from(artistMap.values())
                .filter(a => a.rating !== null)
                .sort((a, b) => b.rating - a.rating);

            if (sortedArtists.length > 0) {
                favorites.artist = sortedArtists[0];
            }
        }

        // Canzone preferita
        const allSongRatings = [];
        for (const album of albums) {
            const songRatings = await db.getAlbumSongRatings(this.currentUserId, album.id);
            for (const rating of songRatings) {
                const track = album.tracks.find(t => t.number == rating.trackNumber);
                if (track) {
                    allSongRatings.push({
                        title: track.title,
                        artist: album.artist,
                        albumTitle: album.title,
                        albumCover: album.coverUrl,
                        rating: rating.rating
                    });
                }
            }
        }

        if (allSongRatings.length > 0) {
            allSongRatings.sort((a, b) => b.rating - a.rating);
            favorites.song = allSongRatings[0];
        }

        return favorites;
    }

    show() {
        document.getElementById('history-view').classList.add('active');
        document.getElementById('library-view').classList.remove('active');
        document.getElementById('artists-view').classList.remove('active');
    }

    hide() {
        document.getElementById('history-view').classList.remove('active');
    }
}
