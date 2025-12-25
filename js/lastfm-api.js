/**
 * Last.fm API Integration
 * Per recuperare immagini artisti
 */

const LASTFM_API_KEY = 'ef32691328598b06143d9d6eef90164b';
const LASTFM_BASE_URL = 'https://ws.audioscrobbler.com/2.0/';

class LastFmAPI {
    constructor() {
        this.cache = new Map(); // Cache in-memory per evitare richieste duplicate
    }

    /**
     * Recupera informazioni artista con immagine
     */
    async getArtistInfo(artistName) {
        // Check cache
        const cacheKey = `artist_${artistName.toLowerCase()}`;
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }

        try {
            const params = new URLSearchParams({
                method: 'artist.getinfo',
                artist: artistName,
                api_key: LASTFM_API_KEY,
                format: 'json',
                autocorrect: 1 // Corregge automaticamente typo nel nome
            });

            const response = await fetch(`${LASTFM_BASE_URL}?${params}`);

            if (!response.ok) {
                console.warn(`Last.fm API error for ${artistName}:`, response.status);
                return null;
            }

            const data = await response.json();

            if (data.error) {
                console.warn(`Last.fm API error for ${artistName}:`, data.message);
                return null;
            }

            if (!data.artist) {
                return null;
            }

            // Estrai immagine (preferenza: extralarge > large > medium)
            let imageUrl = null;
            if (data.artist.image && data.artist.image.length > 0) {
                const images = data.artist.image;

                // Cerca prima extralarge, poi large, poi medium
                const extraLarge = images.find(img => img.size === 'extralarge');
                const large = images.find(img => img.size === 'large');
                const medium = images.find(img => img.size === 'medium');

                const selectedImage = extraLarge || large || medium;
                if (selectedImage && selectedImage['#text']) {
                    imageUrl = selectedImage['#text'];
                }
            }

            const result = {
                name: data.artist.name,
                imageUrl: imageUrl,
                bio: data.artist.bio?.summary || null,
                listeners: data.artist.stats?.listeners || null
            };

            // Cache result
            this.cache.set(cacheKey, result);

            return result;

        } catch (error) {
            console.error('Error fetching artist from Last.fm:', error);
            return null;
        }
    }

    /**
     * Recupera solo l'immagine dell'artista (più veloce)
     */
    async getArtistImage(artistName) {
        const info = await this.getArtistInfo(artistName);
        return info ? info.imageUrl : null;
    }
}

// Istanza globale
const lastfmAPI = new LastFmAPI();
