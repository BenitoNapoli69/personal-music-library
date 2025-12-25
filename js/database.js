/**
 * Database Manager - IndexedDB per la persistenza locale
 */

const DB_NAME = 'MusicLibraryDB';
const DB_VERSION = 1;

class Database {
  constructor() {
    this.db = null;
  }

  /**
   * Inizializza il database
   */
  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // Object Store: Users
        if (!db.objectStoreNames.contains('users')) {
          const userStore = db.createObjectStore('users', { keyPath: 'id', autoIncrement: true });
          userStore.createIndex('name', 'name', { unique: true });
        }

        // Object Store: Albums
        if (!db.objectStoreNames.contains('albums')) {
          const albumStore = db.createObjectStore('albums', { keyPath: 'id', autoIncrement: true });
          albumStore.createIndex('userId', 'userId', { unique: false });
          albumStore.createIndex('mbid', 'mbid', { unique: false });
          albumStore.createIndex('userAlbum', ['userId', 'mbid'], { unique: true });
        }

        // Object Store: Song Ratings
        if (!db.objectStoreNames.contains('songRatings')) {
          const songStore = db.createObjectStore('songRatings', { keyPath: 'id', autoIncrement: true });
          songStore.createIndex('userId', 'userId', { unique: false });
          songStore.createIndex('albumId', 'albumId', { unique: false });
          songStore.createIndex('userTrack', ['userId', 'albumId', 'trackNumber'], { unique: true });
        }

        // Object Store: Artist Ratings
        if (!db.objectStoreNames.contains('artistRatings')) {
          const artistStore = db.createObjectStore('artistRatings', { keyPath: 'id', autoIncrement: true });
          artistStore.createIndex('userArtist', ['userId', 'artistName'], { unique: true });
        }
      };
    });
  }

  /**
   * USERS
   */
  async createUser(name) {
    const transaction = this.db.transaction(['users'], 'readwrite');
    const store = transaction.objectStore('users');

    try {
      const request = store.add({ name, createdAt: new Date().toISOString() });
      return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      throw error;
    }
  }

  async getAllUsers() {
    const transaction = this.db.transaction(['users'], 'readonly');
    const store = transaction.objectStore('users');

    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getUser(id) {
    const transaction = this.db.transaction(['users'], 'readonly');
    const store = transaction.objectStore('users');

    return new Promise((resolve, reject) => {
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * ALBUMS
   */
  async addAlbum(userId, albumData) {
    const transaction = this.db.transaction(['albums'], 'readwrite');
    const store = transaction.objectStore('albums');

    const album = {
      userId,
      mbid: albumData.mbid,
      title: albumData.title,
      artist: albumData.artist,
      year: albumData.year,
      coverUrl: albumData.coverUrl,
      tracks: albumData.tracks,
      addedAt: new Date().toISOString(),
      manualRating: null,
      autoRating: null
    };

    return new Promise((resolve, reject) => {
      const request = store.add(album);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getUserAlbums(userId) {
    const transaction = this.db.transaction(['albums'], 'readonly');
    const store = transaction.objectStore('albums');
    const index = store.index('userId');

    return new Promise((resolve, reject) => {
      const request = index.getAll(userId);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getAlbum(albumId) {
    const transaction = this.db.transaction(['albums'], 'readonly');
    const store = transaction.objectStore('albums');

    return new Promise((resolve, reject) => {
      const request = store.get(albumId);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async updateAlbumRating(albumId, manualRating = null, autoRating = null) {
    const album = await this.getAlbum(albumId);
    if (!album) throw new Error('Album non trovato');

    const transaction = this.db.transaction(['albums'], 'readwrite');
    const store = transaction.objectStore('albums');

    if (manualRating !== null) album.manualRating = manualRating;
    if (autoRating !== null) album.autoRating = autoRating;

    return new Promise((resolve, reject) => {
      const request = store.put(album);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * SONG RATINGS
   */
  async setSongRating(userId, albumId, trackNumber, rating) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['songRatings'], 'readwrite');
      const store = transaction.objectStore('songRatings');
      const index = store.index('userTrack');

      // Verifica se esiste già un rating per questa canzone
      const getKeyRequest = index.getKey([userId, albumId, trackNumber]);

      getKeyRequest.onsuccess = () => {
        const existingKey = getKeyRequest.result;

        if (existingKey) {
          // Aggiorna rating esistente
          const getRequest = store.get(existingKey);

          getRequest.onsuccess = () => {
            const existing = getRequest.result;
            existing.rating = rating;

            const putRequest = store.put(existing);
            putRequest.onsuccess = () => resolve(putRequest.result);
            putRequest.onerror = () => reject(putRequest.error);
          };

          getRequest.onerror = () => reject(getRequest.error);
        } else {
          // Crea nuovo rating
          const addRequest = store.add({ userId, albumId, trackNumber, rating });
          addRequest.onsuccess = () => resolve(addRequest.result);
          addRequest.onerror = () => reject(addRequest.error);
        }
      };

      getKeyRequest.onerror = () => reject(getKeyRequest.error);
    });
  }

  async getAlbumSongRatings(userId, albumId) {
    const transaction = this.db.transaction(['songRatings'], 'readonly');
    const store = transaction.objectStore('songRatings');
    const index = store.index('albumId');

    return new Promise((resolve, reject) => {
      const request = index.getAll(albumId);
      request.onsuccess = () => {
        const allRatings = request.result;
        // Filtra solo i rating di questo utente
        const userRatings = allRatings.filter(r => r.userId === userId);
        resolve(userRatings);
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * ARTIST RATINGS
   */
  async setArtistRating(userId, artistName, manualRating) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['artistRatings'], 'readwrite');
      const store = transaction.objectStore('artistRatings');
      const index = store.index('userArtist');

      // Verifica se esiste già un rating per questo artista
      const getKeyRequest = index.getKey([userId, artistName]);

      getKeyRequest.onsuccess = () => {
        const existingKey = getKeyRequest.result;

        if (existingKey) {
          // Aggiorna rating esistente
          const getRequest = store.get(existingKey);

          getRequest.onsuccess = () => {
            const existing = getRequest.result;
            existing.manualRating = manualRating;

            const putRequest = store.put(existing);
            putRequest.onsuccess = () => resolve(putRequest.result);
            putRequest.onerror = () => reject(putRequest.error);
          };

          getRequest.onerror = () => reject(getRequest.error);
        } else {
          // Crea nuovo rating
          const addRequest = store.add({ userId, artistName, manualRating, autoRating: null });
          addRequest.onsuccess = () => resolve(addRequest.result);
          addRequest.onerror = () => reject(addRequest.error);
        }
      };

      getKeyRequest.onerror = () => reject(getKeyRequest.error);
    });
  }

  async getArtistRating(userId, artistName) {
    const transaction = this.db.transaction(['artistRatings'], 'readonly');
    const store = transaction.objectStore('artistRatings');
    const index = store.index('userArtist');

    return new Promise((resolve, reject) => {
      const request = index.get([userId, artistName]);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async updateArtistAutoRating(userId, artistName, autoRating) {
    const existing = await this.getArtistRating(userId, artistName);

    const transaction = this.db.transaction(['artistRatings'], 'readwrite');
    const store = transaction.objectStore('artistRatings');

    if (existing) {
      existing.autoRating = autoRating;
      return new Promise((resolve, reject) => {
        const request = store.put(existing);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    } else {
      return new Promise((resolve, reject) => {
        const request = store.add({ userId, artistName, manualRating: null, autoRating });
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    }
  }

  /**
   * UTILITY: Calcola rating automatico album (media canzoni votate)
   */
  async calculateAlbumAutoRating(userId, albumId) {
    const ratings = await this.getAlbumSongRatings(userId, albumId);

    if (ratings.length === 0) return null;

    const sum = ratings.reduce((acc, r) => acc + r.rating, 0);
    const avg = sum / ratings.length;

    // Aggiorna il rating automatico dell'album
    await this.updateAlbumRating(albumId, null, avg);

    return avg;
  }

  /**
   * UTILITY: Calcola rating automatico artista (media album)
   */
  async calculateArtistAutoRating(userId, artistName) {
    const albums = await this.getUserAlbums(userId);
    const artistAlbums = albums.filter(a => a.artist === artistName);

    if (artistAlbums.length === 0) return null;

    // Usa il rating prevalente di ogni album (manuale se presente, altrimenti automatico)
    const ratings = artistAlbums
      .map(a => a.manualRating !== null ? a.manualRating : a.autoRating)
      .filter(r => r !== null);

    if (ratings.length === 0) return null;

    const sum = ratings.reduce((acc, r) => acc + r, 0);
    const avg = sum / ratings.length;

    // Aggiorna il rating automatico dell'artista
    await this.updateArtistAutoRating(userId, artistName, avg);

    return avg;
  }
}

// Istanza globale
const db = new Database();
