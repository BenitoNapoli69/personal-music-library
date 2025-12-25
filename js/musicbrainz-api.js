/**
 * MusicBrainz API Integration
 * https://musicbrainz.org/doc/MusicBrainz_API
 */

const MB_API_BASE = 'https://musicbrainz.org/ws/2';
const CAA_API_BASE = 'https://coverartarchive.org';
const RATE_LIMIT_DELAY = 1100; // 1.1 secondi per stare sicuri

class MusicBrainzAPI {
    constructor() {
        this.lastRequestTime = 0;
        this.cache = new Map(); // Cache in-memory per la sessione
    }

    /**
     * Rate limiting: assicura 1 richiesta al secondo
     */
    async waitForRateLimit() {
        const now = Date.now();
        const timeSinceLastRequest = now - this.lastRequestTime;

        if (timeSinceLastRequest < RATE_LIMIT_DELAY) {
            const waitTime = RATE_LIMIT_DELAY - timeSinceLastRequest;
            await new Promise(resolve => setTimeout(resolve, waitTime));
        }

        this.lastRequestTime = Date.now();
    }

    /**
     * Fetch generico con rate limiting e user-agent
     */
    async fetchAPI(url) {
        await this.waitForRateLimit();

        const response = await fetch(url, {
            headers: {
                'User-Agent': 'MusicLibraryManager/1.0 (educational-project)',
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`API Error: ${response.status} ${response.statusText}`);
        }

        return await response.json();
    }

    /**
     * Cerca album per titolo e/o artista
     */
    async searchAlbums(query, limit = 10) {
        const cacheKey = `search:${query}:${limit}`;

        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }

        // Encode query per URL
        const encodedQuery = encodeURIComponent(query);
        const url = `${MB_API_BASE}/release?query=${encodedQuery}&fmt=json&limit=${limit}`;

        try {
            const data = await this.fetchAPI(url);

            const results = data.releases.map(release => ({
                mbid: release.id,
                title: release.title,
                artist: release['artist-credit']
                    ? release['artist-credit'].map(ac => ac.name).join(', ')
                    : 'Sconosciuto',
                year: release.date ? release.date.substring(0, 4) : null,
                country: release.country,
                format: release.media && release.media[0] ? release.media[0].format : null
            }));

            this.cache.set(cacheKey, results);
            return results;

        } catch (error) {
            console.error('Errore ricerca album:', error);
            throw error;
        }
    }

    /**
     * Ottieni dettagli completi di un album (con tracklist)
     */
    async getAlbumDetails(mbid) {
        const cacheKey = `album:${mbid}`;

        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }

        const url = `${MB_API_BASE}/release/${mbid}?inc=recordings+artist-credits&fmt=json`;

        try {
            const data = await this.fetchAPI(url);

            // Estrai tracklist
            const tracks = [];
            if (data.media && data.media.length > 0) {
                data.media.forEach(medium => {
                    if (medium.tracks) {
                        medium.tracks.forEach(track => {
                            tracks.push({
                                number: track.position,
                                title: track.title || track.recording?.title || 'Senza titolo',
                                duration: track.length || track.recording?.length || null
                            });
                        });
                    }
                });
            }

            const albumDetails = {
                mbid: data.id,
                title: data.title,
                artist: data['artist-credit']
                    ? data['artist-credit'].map(ac => ac.name).join(', ')
                    : 'Sconosciuto',
                year: data.date ? data.date.substring(0, 4) : null,
                tracks: tracks,
                coverUrl: null // Verrà recuperato separatamente
            };

            // Prova a recuperare la copertina
            try {
                const coverUrl = await this.getCoverArt(mbid);
                albumDetails.coverUrl = coverUrl;
            } catch (e) {
                console.warn('Copertina non disponibile per', mbid);
            }

            this.cache.set(cacheKey, albumDetails);
            return albumDetails;

        } catch (error) {
            console.error('Errore dettagli album:', error);
            throw error;
        }
    }

    /**
     * Ottieni URL copertina album dal Cover Art Archive
     */
    async getCoverArt(mbid) {
        const cacheKey = `cover:${mbid}`;

        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }

        await this.waitForRateLimit();

        try {
            const response = await fetch(`${CAA_API_BASE}/release/${mbid}`);

            if (!response.ok) {
                return null;
            }

            const data = await response.json();

            // Cerca immagine front cover
            const frontCover = data.images.find(img => img.front === true);
            const coverUrl = frontCover
                ? frontCover.thumbnails?.large || frontCover.thumbnails?.small || frontCover.image
                : data.images[0]?.thumbnails?.large || data.images[0]?.image || null;

            this.cache.set(cacheKey, coverUrl);
            return coverUrl;

        } catch (error) {
            console.warn('Cover art non disponibile:', error);
            return null;
        }
    }

    /**
     * Cerca immagine artista (usando MusicBrainz artist lookup)
     */
    async getArtistImage(artistName) {
        const cacheKey = `artist-img:${artistName}`;

        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }

        try {
            // Cerca l'artista
            const encodedName = encodeURIComponent(artistName);
            const searchUrl = `${MB_API_BASE}/artist?query=${encodedName}&fmt=json&limit=1`;
            const searchData = await this.fetchAPI(searchUrl);

            if (!searchData.artists || searchData.artists.length === 0) {
                return null;
            }

            const artistId = searchData.artists[0].id;

            // Nota: MusicBrainz non fornisce immagini artista direttamente
            // Potremmo usare un servizio esterno o placeholder
            // Per ora ritorniamo null e useremo placeholder

            this.cache.set(cacheKey, null);
            return null;

        } catch (error) {
            console.warn('Immagine artista non disponibile:', error);
            return null;
        }
    }
}

// Istanza globale
const musicAPI = new MusicBrainzAPI();
