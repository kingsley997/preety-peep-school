// js/ui.js
const UI = {
    currentRecoveryPhrase: [],

    // Called after splash screen finishes
    init() {
        if (!Auth.isAdminSetup()) {
            document.getElementById('setup-screen').style.display = 'block';
        } else {
            document.getElementById('login-screen').style.display = 'block';
        }
    },

    async showRecoveryPhrase() {
        const username = document.getElementById('setup-username').value.trim();
        const password = document.getElementById('setup-password').value;

        if (!username || !password) {
            alert("Please enter both a username and a password.");
            return;
        }

        // Generate and save the phrase temporarily
        this.currentRecoveryPhrase = Auth.generateRecoveryPhrase();
        
        // Display the words
        const container = document.getElementById('recovery-words-display');
        container.innerHTML = '';
        this.currentRecoveryPhrase.forEach((word, index) => {
            container.innerHTML += `<div class="word-pill">${index + 1}. ${word}</div>`;
        });

        // Switch to step 2
        document.getElementById('setup-step-1').style.display = 'none';
        document.getElementById('setup-step-2').style.display = 'block';
    },

    async completeSetup() {
        const isConfirmed = document.getElementById('recovery-confirm').checked;
        if (!isConfirmed) {
            alert("You must confirm that you have written down the recovery phrase.");
            return;
        }

        const username = document.getElementById('setup-username').value.trim();
        const password = document.getElementById('setup-password').value;

        await Auth.createAdmin(username, password, this.currentRecoveryPhrase);
        
        alert("Admin account created successfully! Default Cashier username is 'cashier' and password is 'cashier123'.");
        
        // Reload to show login screen
        location.reload();
    },

    async handleLogin() {
        const role = document.getElementById('login-role').value;
        const username = document.getElementById('login-username').value.trim();
        const password = document.getElementById('login-password').value;
        const errorMsg = document.getElementById('login-error');

        const success = await Auth.login(username, password, role);

        if (success) {
            errorMsg.style.display = 'none';
            document.getElementById('login-screen').style.display = 'none';
            document.getElementById('dashboard-screen').style.display = 'block';
            document.getElementById('user-display-name').textContent = username;
            
            // Save session
            Store.set('current_session', { username, role });
        } else {
            errorMsg.style.display = 'block';
        }
    },

    logout() {
        Store.set('current_session', null);
        location.reload();
    }
};