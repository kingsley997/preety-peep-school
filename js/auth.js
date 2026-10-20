// js/auth.js
const Auth = {
    // Securely hash a string using the browser's built-in Crypto API
    async hashString(str) {
        const encoder = new TextEncoder();
        const data = encoder.encode(str);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    },

    // Generate a 6-word recovery phrase
    generateRecoveryPhrase() {
        const wordList = ["apple", "river", "mountain", "clock", "window", "tree", "bridge", "ocean", "stone", "paper", "lamp", "door", "garden", "cloud", "fire", "water", "earth", "wind", "star", "moon", "sun", "bird", "fish", "bear", "wolf", "fox", "deer", "horse", "lion", "tiger", "eagle", "owl", "snake", "frog", "whale", "shark", "crab", "ant", "bee", "fly", "rose", "lily", "pine", "oak", "maple", "cedar", "grass", "leaf", "root", "seed"];
        
        let phrase = [];
        for (let i = 0; i < 6; i++) {
            const randomIndex = Math.floor(Math.random() * wordList.length);
            phrase.push(wordList[randomIndex]);
        }
        return phrase;
    },

    // Check if an admin account exists
    isAdminSetup() {
        return Store.get('admin_user') !== null;
    },

    // Create the initial Admin account
    async createAdmin(username, password, recoveryPhrase) {
        const hashedPassword = await this.hashString(password);
        const hashedRecovery = await this.hashString(recoveryPhrase.join(' '));
        
        const adminData = {
            username: username,
            passwordHash: hashedPassword,
            recoveryHash: hashedRecovery,
            role: 'admin'
        };
        
        Store.set('admin_user', adminData);
        
        // Also create a default cashier account for convenience
        const defaultCashierHash = await this.hashString('cashier123');
        Store.set('cashier_user', {
            username: 'cashier',
            passwordHash: defaultCashierHash,
            role: 'cashier'
        });
    },

    // Attempt to log in
    async login(username, password, role) {
        const userKey = role === 'admin' ? 'admin_user' : 'cashier_user',
              userData = Store.get(userKey);
              
        if (!userData) return false;
        
        const hashedInput = await this.hashString(password);
        return hashedInput === userData.passwordHash;
    },

    // Reset password using recovery phrase
    async resetAdminPassword(newPassword, recoveryPhrase) {
        const admin = Store.get('admin_user');
        if (!admin) return false;
        
        const hashedInput = await this.hashString(recoveryPhrase.join(' '));
        if (hashedInput === admin.recoveryHash) {
            admin.passwordHash = await this.hashString(newPassword);
            Store.set('admin_user', admin);
            return true;
        }
        return false;
    }
};