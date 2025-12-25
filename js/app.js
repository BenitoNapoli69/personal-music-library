/**
 * Main Application
 * Coordinamento tra tutti i componenti
 */

class MusicLibraryApp {
    constructor() {
        this.userManager = new UserManager();
        this.libraryView = new LibraryView();
        this.artistsView = new ArtistsView();
        this.historyView = new HistoryView();
        this.albumDetail = new AlbumDetail();

        this.currentView = 'library'; // 'library', 'artists' o 'history'
    }

    async init() {
        try {
            // Inizializza database
            await db.init();
            console.log('Database inizializzato');

            // Setup callback selezione utente PRIMA di verificare l'utente
            this.userManager.onUserSelected = async (user) => {
                await this.startApp(user);
            };

            // Verifica se c'è un ultimo utente
            const user = await this.userManager.init();

            if (user) {
                // Utente trovato, carica direttamente l'app
                await this.startApp(user);
            } else {
                // Mostra selezione utente
                await this.userManager.showUserSelection();
            }

        } catch (error) {
            console.error('Errore inizializzazione app:', error);
            showToast('Errore inizializzazione applicazione', 'error');
        }
    }

    async startApp(user) {
        console.log('Avvio app per utente:', user.name);

        // Carica libreria
        await this.libraryView.load(user.id);

        // Carica artisti
        await this.artistsView.load(user.id);

        // Carica storico
        await this.historyView.load(user.id);

        // Setup eventi
        this.setupNavigation();
        this.setupLibraryView(user.id);

        // Mostra vista libreria di default
        this.showLibrary();

        // Mostra nome utente nell'header
        this.updateHeader(user);
    }

    updateHeader(user) {
        const userDisplay = document.getElementById('current-user-display');
        if (userDisplay) {
            userDisplay.textContent = user.name;
            userDisplay.style.display = 'block';
        }

        // Setup switch user button
        const switchUserBtn = document.getElementById('switch-user-btn');
        if (switchUserBtn) {
            switchUserBtn.addEventListener('click', async () => {
                // Nascondi tutte le viste
                this.libraryView.hide();
                this.artistsView.hide();
                this.historyView.hide();
                this.albumDetail.hide();

                // Mostra selezione utente
                await this.userManager.switchUser();
            });
        }
    }

    setupNavigation() {
        const libraryTab = document.getElementById('nav-library');
        const artistsTab = document.getElementById('nav-artists');
        const historyTab = document.getElementById('nav-history');

        libraryTab.addEventListener('click', () => {
            this.showLibrary();
        });

        artistsTab.addEventListener('click', () => {
            this.showArtists();
        });

        historyTab.addEventListener('click', () => {
            this.showHistory();
        });
    }

    setupLibraryView(userId) {
        // Setup search
        this.libraryView.setupSearch(userId);

        // Setup click su album per mostrare dettaglio
        this.libraryView.onAlbumClick = async (album) => {
            this.libraryView.hide();
            await this.albumDetail.show(album, userId);

            // Quando si chiude il dettaglio, ricarica la libreria e torna alla vista
            const checkHidden = setInterval(async () => {
                if (!document.getElementById('album-detail-view').classList.contains('active')) {
                    clearInterval(checkHidden);
                    await this.libraryView.load(userId);
                    await this.artistsView.load(userId);
                    await this.historyView.load(userId);

                    if (this.currentView === 'library') {
                        this.libraryView.show();
                    } else if (this.currentView === 'artists') {
                        this.artistsView.show();
                    } else {
                        this.historyView.show();
                    }
                }
            }, 100);
        };
    }

    showLibrary() {
        this.currentView = 'library';
        this.libraryView.show();
        this.artistsView.hide();
        this.historyView.hide();

        // Aggiorna tab attivi
        document.getElementById('nav-library').classList.add('active');
        document.getElementById('nav-artists').classList.remove('active');
        document.getElementById('nav-history').classList.remove('active');
    }

    showArtists() {
        this.currentView = 'artists';
        this.artistsView.show();
        this.libraryView.hide();
        this.historyView.hide();

        // Aggiorna tab attivi
        document.getElementById('nav-artists').classList.add('active');
        document.getElementById('nav-library').classList.remove('active');
        document.getElementById('nav-history').classList.remove('active');
    }

    showHistory() {
        this.currentView = 'history';
        this.historyView.show();
        this.libraryView.hide();
        this.artistsView.hide();

        // Aggiorna tab attivi
        document.getElementById('nav-history').classList.add('active');
        document.getElementById('nav-library').classList.remove('active');
        document.getElementById('nav-artists').classList.remove('active');
    }
}

// Inizializza app quando il DOM è pronto
document.addEventListener('DOMContentLoaded', () => {
    const app = new MusicLibraryApp();
    app.init();
});
