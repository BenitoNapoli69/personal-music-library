/**
 * User Manager Component
 * Gestione selezione e creazione utenti
 */

class UserManager {
    constructor() {
        this.currentUser = null;
        this.onUserSelected = null;
    }

    async init() {
        // Recupera ultimo utente da localStorage
        const lastUserId = storage.get('lastUserId');
        if (lastUserId) {
            const user = await db.getUser(lastUserId);
            if (user) {
                this.currentUser = user;
                return user;
            }
        }
        return null;
    }

    async showUserSelection() {
        const users = await db.getAllUsers();

        const container = document.getElementById('user-selection-screen');
        const userList = container.querySelector('.user-list');

        userList.innerHTML = '';

        // Mostra utenti esistenti
        users.forEach(user => {
            const userCard = document.createElement('div');
            userCard.className = 'user-card';
            userCard.innerHTML = `
        <div class="user-avatar">${user.name.charAt(0).toUpperCase()}</div>
        <div class="user-name">${escapeHtml(user.name)}</div>
      `;

            userCard.addEventListener('click', () => this.selectUser(user));
            userList.appendChild(userCard);
        });

        // Card per nuovo utente
        const newUserCard = document.createElement('div');
        newUserCard.className = 'user-card new-user';
        newUserCard.innerHTML = `
      <div class="user-avatar">+</div>
      <div class="user-name">Nuovo Utente</div>
    `;

        newUserCard.addEventListener('click', () => this.showNewUserDialog());
        userList.appendChild(newUserCard);

        // Mostra schermata
        container.classList.add('active');
    }

    showNewUserDialog() {
        const name = prompt('Inserisci il nome del nuovo utente:');

        if (!name || name.trim() === '') {
            return;
        }

        this.createUser(name.trim());
    }

    async createUser(name) {
        try {
            const userId = await db.createUser(name);
            const user = await db.getUser(userId);

            this.selectUser(user);
            showToast(`Benvenuto, ${name}!`, 'success');

        } catch (error) {
            if (error.name === 'ConstraintError') {
                showToast('Questo nome utente esiste già', 'error');
            } else {
                showToast('Errore nella creazione dell\'utente', 'error');
                console.error(error);
            }
        }
    }

    selectUser(user) {
        console.log('[UserManager] selectUser called for:', user.name);
        this.currentUser = user;
        storage.set('lastUserId', user.id);

        // Nascondi schermata selezione
        const userScreen = document.getElementById('user-selection-screen');
        console.log('[UserManager] Hiding user selection screen');
        userScreen.classList.remove('active');

        // Callback
        if (this.onUserSelected) {
            console.log('[UserManager] Calling onUserSelected callback');
            this.onUserSelected(user);
        } else {
            console.warn('[UserManager] onUserSelected callback is NOT set!');
        }
    }

    getCurrentUser() {
        return this.currentUser;
    }

    async switchUser() {
        this.currentUser = null;
        storage.remove('lastUserId');
        await this.showUserSelection();
    }
}
