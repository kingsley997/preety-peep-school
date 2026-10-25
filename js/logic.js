// js/logic.js
console.log("✅ logic.js loaded successfully!");

const Auth = {
    async hashString(str) {
        if (!window.crypto || !window.crypto.subtle) {
            let hash = 0;
            for (let i = 0; i < str.length; i++) {
                const char = str.charCodeAt(i);
                hash = ((hash << 5) - hash) + char;
                hash = hash & hash;
            }
            return Math.abs(hash).toString(16).padStart(8, '0');
        }
        const encoder = new TextEncoder();
        const data = encoder.encode(str);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    },
    generateRecoveryPhrase() {
        const wordList = ["apple", "river", "mountain", "clock", "window", "tree", "bridge", "ocean", "stone", "paper", "lamp", "door", "garden", "cloud", "fire", "water", "earth", "wind", "star", "moon", "sun", "bird", "fish", "bear", "wolf", "fox", "deer", "horse", "lion", "tiger", "eagle", "owl", "snake", "frog", "whale", "shark", "crab", "ant", "bee", "fly", "rose", "lily", "pine", "oak", "maple", "cedar", "grass", "leaf", "root", "seed"];
        let phrase = [];
        for (let i = 0; i < 6; i++) phrase.push(wordList[Math.floor(Math.random() * wordList.length)]);
        return phrase;
    },
    isAdminSetup() { return Store.get('admin_user') !== null; },
    async createAdmin(username, password, recoveryPhrase) {
        const hashedPassword = await this.hashString(password);
        const hashedRecovery = await this.hashString(recoveryPhrase.join(' '));
        Store.set('admin_user', { username, passwordHash: hashedPassword, recoveryHash: hashedRecovery, role: 'admin' });
    },
    async login(username, password, role) {
        const userKey = role === 'admin' ? 'admin_user' : 'cashier_user';
        const userData = Store.get(userKey);
        if (!userData) return false;
        const hashedInput = await this.hashString(password);
        return hashedInput === userData.passwordHash && userData.username === username;
    }
};

const UI = {
    currentRecoveryPhrase: [],
    currentClassId: null,
    currentSession: null,
    currentReportText: "",
    currentScreen: 'login',
    pendingConfirmCallback: null,

    getLocalDateStr() {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    },

    togglePassword(inputId, btn) {
        const input = document.getElementById(inputId);
        if (input.type === "password") { input.type = "text"; btn.textContent = "🙈"; } 
        else { input.type = "password"; btn.textContent = "👁️"; }
    },

    showConfirm(message, callback) {
        document.getElementById('confirm-message').textContent = message;
        this.pendingConfirmCallback = callback;
        document.getElementById('confirm-modal').style.display = 'flex';
    },

    handleConfirmOk() {
        document.getElementById('confirm-modal').style.display = 'none';
        if (this.pendingConfirmCallback) {
            this.pendingConfirmCallback();
            this.pendingConfirmCallback = null;
        }
    },

    handleConfirmCancel() {
        document.getElementById('confirm-modal').style.display = 'none';
        this.pendingConfirmCallback = null;
    },

    showFactoryResetModal() {
        document.getElementById('factory-reset-input').value = '';
        document.getElementById('factory-reset-modal').style.display = 'flex';
    },

    closeFactoryResetModal() {
        document.getElementById('factory-reset-modal').style.display = 'none';
    },

    confirmFactoryReset() {
        const input = document.getElementById('factory-reset-input').value.trim().toUpperCase();
        if (input === 'RESET') {
            localStorage.clear();
            sessionStorage.clear();
            alert("System has been factory reset. Reloading...");
            location.reload();
        } else {
            alert("⚠️ You must type exactly RESET to confirm.");
            document.getElementById('factory-reset-input').value = '';
            document.getElementById('factory-reset-input').focus();
        }
    },

    // ==========================================
    // Sidebar Navigation Functions
    // ==========================================
    openSidebar() {
        document.getElementById('sidebar').classList.add('active');
        document.getElementById('sidebar-overlay').classList.add('active');
    },

    closeSidebar() {
        document.getElementById('sidebar').classList.remove('active');
        document.getElementById('sidebar-overlay').classList.remove('active');
    },

    navigateToModule(moduleName) {
        this.closeSidebar();
        
        // Hide all main screens
        const screens = ['dashboard-screen', 'school-fees-screen', 'assessment-screen', 'toiletries-screen', 'class-portal-screen', 'admin-settings-screen'];
        screens.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.style.display = 'none';
        });
        
        // Update active sidebar link
        const links = document.querySelectorAll('.sidebar-link');
        links.forEach(link => link.classList.remove('active'));
        
        // Show target screen and update active link
        if (moduleName === 'feeding-fee') {
            document.getElementById('dashboard-screen').style.display = 'block';
            this.renderDashboard();
            if (links[0]) links[0].classList.add('active');
        } else if (moduleName === 'school-fees') {
            document.getElementById('school-fees-screen').style.display = 'block';
            if (links[1]) links[1].classList.add('active');
        } else if (moduleName === 'assessment') {
            document.getElementById('assessment-screen').style.display = 'block';
            if (links[2]) links[2].classList.add('active');
        } else if (moduleName === 'toiletries') {
            document.getElementById('toiletries-screen').style.display = 'block';
            this.renderRequiredItems(); 
            if (links[3]) links[3].classList.add('active');
        } else if (moduleName === 'admin-settings') {
            document.getElementById('admin-settings-screen').style.display = 'block';
            this.renderAdminSettings();
            this.renderReportsList();
            if (links[4]) links[4].classList.add('active');
        }
        
        this.currentScreen = moduleName === 'feeding-fee' ? 'dashboard-screen' : moduleName + '-screen';
    },

    navigateTo(screenId, pushHistory = true) {
        const screens = ['setup-screen', 'login-screen', 'dashboard-screen', 'class-portal-screen', 'admin-settings-screen', 'forgot-password-screen'];
        screens.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.style.display = 'none';
        });

        const target = document.getElementById(screenId);
        if (target) target.style.display = 'block';

        if (pushHistory && screenId !== this.currentScreen) {
            const stateData = { screen: screenId };
            if (screenId === 'class-portal-screen' && this.currentClassId) {
                stateData.classId = this.currentClassId;
            }
            history.pushState(stateData, '', `#${screenId}`);
        }
        this.currentScreen = screenId;
    },

    handlePopState(event) {
        const state = event.state || {};
        let screenId = state.screen || 'login-screen';
        
        if (state.classId) {
            this.currentClassId = state.classId;
        }

        this.navigateTo(screenId, false);

        if (screenId === 'dashboard-screen') {
            this.renderDashboard();
        } else if (screenId === 'class-portal-screen') {
            const query = document.getElementById('student-search') ? document.getElementById('student-search').value : '';
            this.renderClassPortal(this.currentClassId, query);
        } else if (screenId === 'admin-settings-screen') {
            this.renderAdminSettings();
            this.renderReportsList();
        }
    },

    init() {
        window.addEventListener('popstate', (e) => this.handlePopState(e));
        
        const session = Store.get('current_session');
        
        if (!Auth.isAdminSetup()) { 
            this.navigateTo('setup-screen');
        } else if (session && session.username) {
            this.currentSession = session;
            document.getElementById('user-display-name').textContent = session.username;
            document.getElementById('admin-settings-btn').style.display = session.role === 'admin' ? 'inline-flex' : 'none';
            
            const hash = window.location.hash.replace('#', '');
            let targetScreen = 'dashboard-screen';
            
            if (hash === 'admin-settings-screen') {
                targetScreen = 'admin-settings-screen';
            } else if (hash === 'class-portal-screen') {
                const savedClassId = sessionStorage.getItem('currentClassId');
                if (savedClassId) {
                    this.currentClassId = savedClassId;
                    targetScreen = 'class-portal-screen';
                }
            }
            
            this.navigateTo(targetScreen, false);
            
            const links = document.querySelectorAll('.sidebar-link');
            
            if (targetScreen === 'dashboard-screen') {
                this.renderDashboard();
                if (links[0]) links[0].classList.add('active');
            } else if (targetScreen === 'class-portal-screen') {
                this.renderClassPortal(this.currentClassId, '');
            } else if (targetScreen === 'admin-settings-screen') {
                this.renderAdminSettings();
                this.renderReportsList();
                if (links[4]) links[4].classList.add('active');
            }
        } else { 
            this.navigateTo('login-screen');
            this.toggleForgotPasswordLink();
        }
    },

    async showRecoveryPhrase() {
        const username = document.getElementById('setup-username').value.trim();
        const password = document.getElementById('setup-password').value;
        const confirmPassword = document.getElementById('setup-confirm-password').value;
        if (!username || !password || !confirmPassword) { alert("Please fill in all fields."); return; }
        if (password !== confirmPassword) { alert("Passwords do not match! Please try again."); return; }
        this.currentRecoveryPhrase = Auth.generateRecoveryPhrase();
        const container = document.getElementById('recovery-words-display');
        container.innerHTML = '';
        this.currentRecoveryPhrase.forEach((word, index) => { container.innerHTML += `<div class="word-pill">${index + 1}. ${word}</div>`; });
        document.getElementById('setup-step-1').style.display = 'none';
        document.getElementById('setup-step-2').style.display = 'block';
    },

    async completeSetup() {
        if (!document.getElementById('recovery-confirm').checked) { alert("You must confirm that you have written down the recovery phrase."); return; }
        const username = document.getElementById('setup-username').value.trim();
        const password = document.getElementById('setup-password').value;
        await Auth.createAdmin(username, password, this.currentRecoveryPhrase);
        alert("Admin account created! Please log in and go to Admin Settings to create a Cashier account.");
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
            this.currentSession = { username, role };
            Store.set('current_session', this.currentSession);
            document.getElementById('user-display-name').textContent = username;
            document.getElementById('admin-settings-btn').style.display = role === 'admin' ? 'inline-flex' : 'none';
            this.navigateTo('dashboard-screen');
            this.renderDashboard(); 
        } else { errorMsg.style.display = 'block'; }
    },

    logout() { 
        this.closeSidebar(); // Ensure sidebar closes on logout
        Store.set('current_session', null); 
        sessionStorage.removeItem('currentClassId');
        location.reload(); 
    },

    showForgotPassword() {
        const role = document.getElementById('login-role').value;
        if (role !== 'admin') {
            alert("⚠️ The Forgot Password feature is only available for the Master Admin.\n\nIf you are a Cashier who forgot their password, please contact the School Owner/Admin to reset it.");
            return;
        }
        const adminData = Store.get('admin_user');
        if (!adminData || !adminData.recoveryHash) {
            alert("⚠️ No recovery phrase found for this account.\n\nThis may be an older account created before the recovery system was added. Please contact technical support.");
            return;
        }
        this.navigateTo('forgot-password-screen');
        document.getElementById('recovery-step-1').style.display = 'block';
        document.getElementById('recovery-step-2').style.display = 'none';
        document.getElementById('recovery-phrase-input').value = '';
        document.getElementById('recovery-error').style.display = 'none';
    },

    backToLogin() { history.back(); },

    toggleForgotPasswordLink() {
        const role = document.getElementById('login-role').value;
        const link = document.getElementById('forgot-password-link');
        link.style.display = role === 'admin' ? 'flex' : 'none';
    },

    async verifyRecoveryPhrase() {
        const input = document.getElementById('recovery-phrase-input').value.trim();
        const errorMsg = document.getElementById('recovery-error');
        if (!input) {
            errorMsg.textContent = "Please enter your recovery phrase.";
            errorMsg.style.display = 'block';
            return;
        }
        const cleanedPhrase = input.toLowerCase().replace(/\d+\./g, '').replace(/\s+/g, ' ').trim();
        const words = cleanedPhrase.split(' ').filter(w => w.length > 0);
        
        if (words.length !== 6) {
            errorMsg.textContent = `Please enter exactly 6 words. You entered ${words.length}.`;
            errorMsg.style.display = 'block';
            return;
        }
        
        const hashedInput = await Auth.hashString(words.join(' '));
        const adminData = Store.get('admin_user');
        
        if (hashedInput !== adminData.recoveryHash) {
            errorMsg.textContent = "Invalid recovery phrase. Please check your words and try again.";
            errorMsg.style.display = 'block';
            return;
        }
        
        errorMsg.style.display = 'none';
        document.getElementById('recovery-step-1').style.display = 'none';
        document.getElementById('recovery-step-2').style.display = 'block';
        document.getElementById('new-admin-username').value = adminData.username;
    },

    async resetAdminPassword() {
        const newUsername = document.getElementById('new-admin-username').value.trim();
        const newPassword = document.getElementById('new-admin-password').value;
        const newConfirm = document.getElementById('new-admin-confirm').value;
        
        if (!newUsername) { alert("Please enter a new username."); return; }
        if (!newPassword) { alert("Please enter a new password."); return; }
        if (newPassword !== newConfirm) { alert("Passwords do not match!"); return; }
        if (newPassword.length < 6) { alert("Password must be at least 6 characters long."); return; }
        
        const adminData = Store.get('admin_user');
        const hashedPassword = await Auth.hashString(newPassword);
        
        Store.set('admin_user', { username: newUsername, passwordHash: hashedPassword, recoveryHash: adminData.recoveryHash, role: 'admin' });
        alert(`✅ Admin account reset successfully!\n\nNew Username: ${newUsername}\n\nPlease log in with your new credentials.`);
        location.reload();
    },

    renderDashboard() {
        const today = new Date();
        const dateStr = this.getLocalDateStr();
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        document.getElementById('current-date').textContent = today.toLocaleDateString('en-GB', options);

        let roster = Store.get(`roster_${dateStr}`);
        if (!roster) {
            const classes = Store.get('classes');
            if (!classes) return;
            roster = classes.map(cls => ({
                classId: cls.id, className: cls.name, fee: cls.fee,
                students: cls.students.map(s => ({ ...s, status: 'unpaid', time: null }))
            }));
            Store.set(`roster_${dateStr}`, roster);
        }

        let totalExpected = 0, totalCollected = 0;
        const gridContainer = document.getElementById('class-grid-container');
        let gridHtml = '';
        
        roster.forEach(cls => {
            let classExpected = 0, classCollected = 0, paidCount = 0, absentCount = 0, notPayingCount = 0;
            cls.students.forEach(student => {
                if (student.status === 'absent') absentCount++;
                if (student.status === 'exempt') notPayingCount++;
                if (student.status === 'paid') { classCollected += cls.fee; paidCount++; }
            });
            let billableStudents = cls.students.length - absentCount - notPayingCount;
            classExpected = billableStudents * cls.fee;
            totalExpected += classExpected;
            totalCollected += classCollected;
            const percentage = classExpected > 0 ? Math.round((classCollected / classExpected) * 100) : 0;

            gridHtml += `
                <div class="class-card" onclick="UI.openClassPortal('${cls.classId}')">
                    <div class="class-card-header">
                        <span class="class-name">${cls.className}</span>
                        <span class="class-fee">GHS ${(cls.fee / 100).toFixed(2)}</span>
                    </div>
                    <div class="progress-container">
                        <div class="progress-bar-bg"><div class="progress-bar-fill" style="width: ${percentage}%"></div></div>
                        <div class="progress-text">
                            <span>${paidCount} / ${billableStudents} Paid</span>
                            <span>GHS ${(classCollected / 100).toFixed(2)}</span>
                        </div>
                    </div>
                </div>`;
        });
        gridContainer.innerHTML = gridHtml;

        const totalOutstanding = totalExpected - totalCollected;
        document.getElementById('stat-expected').textContent = `GHS ${(totalExpected / 100).toFixed(2)}`;
        document.getElementById('stat-collected').textContent = `GHS ${(totalCollected / 100).toFixed(2)}`;
        document.getElementById('stat-outstanding').textContent = `GHS ${(totalOutstanding / 100).toFixed(2)}`;
    },

    openClassPortal(classId) {
        this.currentClassId = classId;
        sessionStorage.setItem('currentClassId', classId);
        this.navigateTo('class-portal-screen');
        document.getElementById('student-search').value = '';
        this.renderClassPortal(classId, '');
    },

    goBackToDashboard() { 
        sessionStorage.removeItem('currentClassId');
        history.back(); 
    },

    renderClassPortal(classId, filterQuery = '') {
        this.currentClassId = classId;
        const dateStr = this.getLocalDateStr();
        const roster = Store.get(`roster_${dateStr}`);
        const cls = roster.find(c => c.classId === classId);
        if (!cls) return;

        document.getElementById('portal-class-name').textContent = cls.className;
        document.getElementById('portal-class-fee').textContent = `Daily Fee: GHS ${(cls.fee / 100).toFixed(2)}`;

        let studentsToShow = [...cls.students].sort((a, b) => a.name.localeCompare(b.name));

        if (filterQuery) {
            const q = filterQuery.toLowerCase();
            studentsToShow = studentsToShow.filter(s => s.name.toLowerCase().includes(q));
        }

        let paidCount = 0, collectedTotal = 0, absentCount = 0, notPayingCount = 0;
        const container = document.getElementById('student-list-container');
        let htmlContent = '';

        if (studentsToShow.length === 0) {
            htmlContent = '<div style="padding: 2rem; text-align: center; color: var(--color-text-muted);">No students found matching that name.</div>';
        } else {
            studentsToShow.forEach(student => {
                if (student.status === 'paid') { paidCount++; collectedTotal += cls.fee; }
                if (student.status === 'absent') absentCount++;
                if (student.status === 'exempt') notPayingCount++;

                let badgeHTML = '', actionHTML = '';
                
                if (student.status === 'unpaid') {
                    badgeHTML = `<span class="status-badge status-unpaid">Unpaid</span>`;
                    actionHTML = `
                        <button class="btn-collect" onclick="UI.collectFee('${classId}', '${student.id}')">Collect GHS ${(cls.fee / 100).toFixed(2)}</button>
                        <button class="btn-icon btn-absent" onclick="UI.markAbsent('${classId}', '${student.id}')" title="Mark Absent">🚫</button>
                        <button class="btn-icon btn-exempt" onclick="UI.markNotPaying('${classId}', '${student.id}')" title="Mark Not Paying">🆓</button>
                    `;
                } else if (student.status === 'paid') {
                    badgeHTML = `<span class="status-badge status-paid">Paid ${student.time || ''}</span>`;
                    actionHTML = `<button class="btn-icon btn-undo" onclick="UI.undoPayment('${classId}', '${student.id}')" title="Undo Payment">↩️</button>`;
                } else if (student.status === 'absent') {
                    badgeHTML = `<span class="status-badge status-absent">Absent</span>`;
                    actionHTML = `<button class="btn-icon btn-undo" onclick="UI.resetStatus('${classId}', '${student.id}')" title="Reset to Unpaid">↩️</button>`;
                } else if (student.status === 'exempt') {
                    badgeHTML = `<span class="status-badge status-exempt">Not Paying</span>`;
                    actionHTML = `<button class="btn-icon btn-undo" onclick="UI.resetStatus('${classId}', '${student.id}')" title="Reset to Unpaid">↩️</button>`;
                }

                htmlContent += `
                    <div class="student-row">
                        <div class="student-info"><span class="student-name">${student.name}</span>${badgeHTML}</div>
                        <div class="student-actions">
                            ${actionHTML}
                            <button class="btn-icon" onclick="UI.removeStudentToday('${classId}', '${student.id}')" title="Remove for Today">🗑️</button>
                        </div>
                    </div>`;
            });
        }
        
        container.innerHTML = htmlContent;
        
        document.getElementById('portal-paid-count').textContent = `${paidCount} / ${cls.students.length - absentCount - notPayingCount}`;
        document.getElementById('portal-collected-total').textContent = `GHS ${(collectedTotal / 100).toFixed(2)}`;
    },

    filterStudents() {
        const query = document.getElementById('student-search').value;
        this.renderClassPortal(this.currentClassId, query);
    },

    updateStudentStatus(classId, studentId, status) {
        const dateStr = this.getLocalDateStr();
        const roster = Store.get(`roster_${dateStr}`);
        const cls = roster.find(c => c.classId === classId);
        const student = cls.students.find(s => s.id === studentId);
        if (student) {
            student.status = status;
            if (status === 'paid') student.time = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
            else student.time = null;
            Store.set(`roster_${dateStr}`, roster);
            const currentQuery = document.getElementById('student-search').value;
            this.renderClassPortal(classId, currentQuery);
        }
    },

    collectFee(classId, studentId) { this.updateStudentStatus(classId, studentId, 'paid'); },
    
    undoPayment(classId, studentId) {
        this.showConfirm("Undo this payment?", () => {
            this.updateStudentStatus(classId, studentId, 'unpaid');
        });
    },

    markAbsent(classId, studentId) { this.updateStudentStatus(classId, studentId, 'absent'); },
    markNotPaying(classId, studentId) { this.updateStudentStatus(classId, studentId, 'exempt'); },
    
    resetStatus(classId, studentId) {
        this.showConfirm("Reset this student to Unpaid?", () => {
            this.updateStudentStatus(classId, studentId, 'unpaid');
        });
    },
    
    removeStudentToday(classId, studentId) {
        this.showConfirm("Remove this student from today's list?", () => {
            const dateStr = this.getLocalDateStr();
            const roster = Store.get(`roster_${dateStr}`);
            const cls = roster.find(c => c.classId === classId);
            cls.students = cls.students.filter(s => s.id !== studentId);
            Store.set(`roster_${dateStr}`, roster); 
            const currentQuery = document.getElementById('student-search').value;
            this.renderClassPortal(classId, currentQuery);
        });
    },
    
    addStudentForToday() {
        const nameInput = document.getElementById('new-student-name');
        const name = nameInput.value.trim();
        if (!name) return alert("Please enter a student name.");
        const dateStr = this.getLocalDateStr();
        const roster = Store.get(`roster_${dateStr}`);
        const cls = roster.find(c => c.classId === this.currentClassId);
        cls.students.push({ id: `temp_${Date.now()}`, name: name, fee: cls.fee, status: 'unpaid', time: null });
        Store.set(`roster_${dateStr}`, roster); nameInput.value = ''; 
        document.getElementById('student-search').value = '';
        this.renderClassPortal(this.currentClassId, '');
    },

    openAdminSettings() {
        this.navigateToModule('admin-settings');
    },

    goBackFromSettings() { 
        this.closeSidebar();
        history.back(); 
    },

    renderAdminSettings() {
        const cashierData = Store.get('cashier_user');
        if (cashierData) document.getElementById('cashier-username').value = cashierData.username;
        else document.getElementById('cashier-username').value = '';
        document.getElementById('cashier-password').value = '';

        const classes = Store.get('classes');
        const container = document.getElementById('settings-list-container');
        let settingsHtml = '';
        classes.forEach(cls => {
            const feeInGhs = (cls.fee / 100).toFixed(2);
            settingsHtml += `
                <div class="settings-row">
                    <span class="settings-class-name">${cls.name}</span>
                    <div class="settings-input-wrapper">
                        <input type="number" step="0.10" min="0" class="settings-input" id="fee-${cls.id}" value="${feeInGhs}">
                        <span class="currency-label">GHS</span>
                    </div>
                </div>`;
        });
        container.innerHTML = settingsHtml;
    },

    async saveCashierAccount() {
        const username = document.getElementById('cashier-username').value.trim();
        const password = document.getElementById('cashier-password').value;
        if (!username) return alert("Please enter a username.");
        if (!password) return alert("Please enter a password.");
        const hashedPassword = await Auth.hashString(password);
        Store.set('cashier_user', { username, passwordHash: hashedPassword, role: 'cashier' });
        alert(`✅ Cashier account saved!\nUsername: ${username}`);
        document.getElementById('cashier-password').value = '';
        history.back();
    },

    saveAdminFees() {
        const classes = Store.get('classes');
        let updated = false;
        classes.forEach(cls => {
            const input = document.getElementById(`fee-${cls.id}`);
            const newFeeGhs = parseFloat(input.value);
            if (!isNaN(newFeeGhs) && newFeeGhs >= 0) {
                const newFeePesewas = Math.round(newFeeGhs * 100);
                if (cls.fee !== newFeePesewas) { cls.fee = newFeePesewas; updated = true; }
            }
        });
        if (updated) {
            Store.set('classes', classes);
            const dateStr = this.getLocalDateStr();
            const roster = Store.get(`roster_${dateStr}`);
            if (roster) {
                roster.forEach(cls => {
                    const masterClass = classes.find(m => m.id === cls.classId);
                    if (masterClass) cls.fee = masterClass.fee;
                });
                Store.set(`roster_${dateStr}`, roster);
            }
            alert("✅ Fees updated successfully!");
            history.back();
        } else { 
            alert("No changes were made."); 
        }
    },

    finishDayAndSave() {
        this.showConfirm("Are you sure you want to FINISH the day? This will save a report and reset the board for tomorrow.", () => {
            try {
                const now = new Date();
                const dateStr = this.getLocalDateStr();
                const timeStr = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
                const roster = Store.get(`roster_${dateStr}`);
                
                if (!roster) return alert("No data to save for today.");

                let totalExpected = 0, totalCollected = 0, totalPresent = 0, totalPaidStudents = 0;
                let totalAbsent = 0, totalNotPaying = 0;
                let classSummaries = [];

                roster.forEach(cls => {
                    let classExp = 0, classColl = 0, present = 0, paid = 0, absent = 0, notPaying = 0;
                    cls.students.forEach(s => {
                        if (s.status === 'absent') { absent++; totalAbsent++; } else { present++; }
                        if (s.status === 'exempt') { notPaying++; totalNotPaying++; }
                        if (s.status === 'paid') { paid++; classColl += cls.fee; totalPaidStudents++; }
                        if (s.status !== 'absent' && s.status !== 'exempt') { classExp += cls.fee; totalExpected += cls.fee; }
                    });
                    totalCollected += classColl;
                    totalPresent += present;
                    classSummaries.push(`${cls.className}: ${paid} Paid | ${absent} Absent | ${notPaying} Free`);
                });

                const report = {
                    id: Date.now(), date: dateStr, timeFinished: timeStr,
                    officer: this.currentSession ? this.currentSession.username : 'Unknown',
                    totalExpected, totalCollected, totalOutstanding: totalExpected - totalCollected,
                    totalPresent, totalPaidStudents, totalAbsent, totalNotPaying, classDetails: classSummaries
                };

                let reports = Store.get('daily_reports') || [];
                reports.unshift(report); 
                Store.set('daily_reports', reports);

                const resetRoster = roster.map(cls => ({
                    ...cls, students: cls.students.map(s => ({ ...s, status: 'unpaid', time: null }))
                }));
                Store.set(`roster_${dateStr}`, resetRoster);

                const summary = `
ALPHA TECH - DAILY FEEDING SUMMARY
----------------------------------
Date: ${report.date} | Time: ${report.timeFinished}
Officer: ${report.officer}

FINANCIAL BREAKDOWN:
Total Expected: GHS ${(report.totalExpected / 100).toFixed(2)}
Total Collected: GHS ${(report.totalCollected / 100).toFixed(2)}
Total Outstanding: GHS ${(report.totalOutstanding / 100).toFixed(2)}

ATTENDANCE & STATUS:
Students Present: ${report.totalPresent}
Students Absent: ${report.totalAbsent}
Students Not Paying: ${report.totalNotPaying}
Students Who Paid: ${report.totalPaidStudents}

CLASS BREAKDOWN:
${report.classDetails.join('\n')}
----------------------------------
Generated by Alpha Tech System
                `.trim();

                this.currentReportText = summary;
                document.getElementById('report-content').textContent = summary;
                document.getElementById('report-modal').style.display = 'flex';
            } catch (error) {
                console.error("Error finishing day:", error);
                alert("An unexpected error occurred. Please try again.");
            }
        });
    },

    renderReportsList() {
        const reports = Store.get('daily_reports') || [];
        const container = document.getElementById('reports-list-container');
        
        if (reports.length === 0) {
            container.innerHTML = '<p style="color: var(--color-text-muted); text-align: center;">No saved reports yet.</p>';
            return;
        }
        
        let reportsHtml = '';
        reports.forEach(rep => {
            reportsHtml += `
                <div class="settings-row" style="cursor: pointer;" onclick="UI.viewReport(${rep.id})">
                    <div>
                        <strong style="color: var(--color-primary);">${rep.date}</strong>
                        <span style="color: var(--color-text-muted); font-size: 0.85rem; margin-left: 10px;">at ${rep.timeFinished}</span>
                    </div>
                    <div style="text-align: right;">
                        <span style="font-weight: 700; color: var(--color-accent);">GHS ${(rep.totalCollected / 100).toFixed(2)}</span>
                        <span style="font-size: 0.8rem; color: var(--color-text-muted); display: block;">By ${rep.officer}</span>
                    </div>
                </div>`;
        });
        container.innerHTML = reportsHtml;
    },

    viewReport(reportId) {
        const reports = Store.get('daily_reports') || [];
        const rep = reports.find(r => r.id === reportId);
        if (!rep) return;

        const summary = `
ALPHA TECH - DAILY FEEDING SUMMARY
----------------------------------
Date: ${rep.date} | Time Finished: ${rep.timeFinished}
Officer: ${rep.officer}

FINANCIAL BREAKDOWN:
Total Expected: GHS ${(rep.totalExpected / 100).toFixed(2)}
Total Collected: GHS ${(rep.totalCollected / 100).toFixed(2)}
Total Outstanding: GHS ${(rep.totalOutstanding / 100).toFixed(2)}

ATTENDANCE & STATUS:
Students Present: ${rep.totalPresent}
Students Absent: ${rep.totalAbsent || 0}
Students Not Paying: ${rep.totalNotPaying || 0}
Students Who Paid: ${rep.totalPaidStudents}

CLASS BREAKDOWN:
${rep.classDetails.join('\n')}
----------------------------------
Generated by Alpha Tech System
        `.trim();

        this.currentReportText = summary;
        document.getElementById('report-content').textContent = summary;
        document.getElementById('report-modal').style.display = 'flex';
    },

    closeReportModal() {
        document.getElementById('report-modal').style.display = 'none';
    },

    copyReportText() {
        const textArea = document.createElement("textarea");
        textArea.value = this.currentReportText;
        textArea.style.position = "fixed";
        textArea.style.left = "-9999px";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        try {
            const successful = document.execCommand('copy');
            if (successful) alert("✅ Summary copied! You can now paste it into WhatsApp.");
            else alert("⚠️ Copy failed. Please select the text manually and copy.");
        } catch (err) {
            alert("⚠️ Your browser doesn't support auto-copy. Please select the text manually.");
        }
        document.body.removeChild(textArea);
    },

    downloadReport() {
        const blob = new Blob([this.currentReportText], { type: 'text/plain' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        const dateStr = this.currentReportText.match(/Date: (.*) \|/)?.[1] || 'Report';
        a.href = url;
        a.download = `AlphaTech_Summary_${dateStr}.txt`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        alert("✅ Report downloaded to your device!");
    },

    // ==========================================
    // TOILETRIES MODULE FUNCTIONS (Parent Compliance)
    // ==========================================
    switchToiletriesTab(tabName) {
        // Update tab buttons
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        document.getElementById(`tab-${tabName}`).classList.add('active');
        
        // Show/hide views
        document.getElementById('toiletries-required-view').style.display = tabName === 'required' ? 'block' : 'none';
        document.getElementById('toiletries-checklist-view').style.display = tabName === 'checklist' ? 'block' : 'none';
        document.getElementById('toiletries-compliance-view').style.display = tabName === 'compliance' ? 'block' : 'none';
        
        if (tabName === 'required') this.renderRequiredItems();
        if (tabName === 'checklist') this.populateToiletryClassDropdown();
        if (tabName === 'compliance') this.renderComplianceReport();
    },

    renderRequiredItems() {
        const required = Store.get('toiletries_required') || [];
        const container = document.getElementById('toiletries-required-list');
        
        if (required.length === 0) {
            container.innerHTML = '<p style="color: var(--color-text-muted); text-align: center; padding: 2rem;">No required items set yet. Click "+ Add Required Item" to start.</p>';
            return;
        }

        let html = '';
        required.forEach(item => {
            html += `
                <div class="toiletry-card">
                    <div class="toiletry-header">
                        <span class="toiletry-name">${item.name}</span>
                        <span class="required-badge">${item.requiredQty} ${item.unit}</span>
                    </div>
                    <p style="color: var(--color-text-muted); font-size: 0.85rem; margin: 0;">Required per student</p>
                    <div class="toiletry-actions">
                        <button class="btn-delete-item" onclick="UI.deleteToiletryItem('${item.id}')">🗑️ Remove Item</button>
                    </div>
                </div>
            `;
        });
        container.innerHTML = html;
    },

    showAddToiletryModal() {
        document.getElementById('toiletry-modal-title').textContent = 'Add Required Item';
        document.getElementById('toiletry-name').value = '';
        document.getElementById('toiletry-unit').value = '';
        document.getElementById('toiletry-required').value = '1';
        document.getElementById('toiletry-modal').style.display = 'flex';
    },

    closeToiletryModal() {
        document.getElementById('toiletry-modal').style.display = 'none';
    },

    saveToiletryItem() {
        const name = document.getElementById('toiletry-name').value.trim();
        const unit = document.getElementById('toiletry-unit').value.trim();
        const requiredQty = parseInt(document.getElementById('toiletry-required').value) || 1;

        if (!name || !unit) return alert("Please enter item name and unit.");

        let required = Store.get('toiletries_required') || [];
        required.push({ 
            id: 'item_' + Date.now(), 
            name, 
            unit, 
            requiredQty
        });

        Store.set('toiletries_required', required);
        this.closeToiletryModal();
        this.renderRequiredItems();
    },

    deleteToiletryItem(itemId) {
        this.showConfirm("Remove this required item? This cannot be undone.", () => {
            let required = Store.get('toiletries_required') || [];
            required = required.filter(i => i.id !== itemId);
            Store.set('toiletries_required', required);
            this.renderRequiredItems();
        });
    },

    populateToiletryClassDropdown() {
        const classes = Store.get('classes') || [];
        const select = document.getElementById('toiletry-checklist-class');
        select.innerHTML = '<option value="">-- Select a Class --</option>';
        classes.forEach(cls => {
            select.innerHTML += `<option value="${cls.id}">${cls.name}</option>`;
        });
        document.getElementById('toiletries-checklist-list').style.display = 'none';
        document.getElementById('save-checklist-btn').style.display = 'none';
    },

    renderToiletriesChecklist() {
        const classId = document.getElementById('toiletry-checklist-class').value;
        const listContainer = document.getElementById('toiletries-checklist-list');
        const saveBtn = document.getElementById('save-checklist-btn');
        const searchContainer = document.getElementById('toiletry-search-container');
        const searchInput = document.getElementById('toiletry-checklist-search');
        
        // Reset search when class changes
        if (searchInput) searchInput.value = '';

        if (!classId) {
            listContainer.style.display = 'none';
            saveBtn.style.display = 'none';
            if (searchContainer) searchContainer.style.display = 'none';
            return;
        }

        const required = Store.get('toiletries_required') || [];
        if (required.length === 0) {
            listContainer.innerHTML = '<div style="padding: 2rem; text-align: center; color: var(--color-text-muted);">Please add required items first.</div>';
            listContainer.style.display = 'block';
            saveBtn.style.display = 'none';
            if (searchContainer) searchContainer.style.display = 'none';
            return;
        }

        const dateStr = this.getLocalDateStr();
        const roster = Store.get(`roster_${dateStr}`);
        const cls = roster ? roster.find(c => c.classId === classId) : null;

        if (!cls || cls.students.length === 0) {
            listContainer.innerHTML = '<div style="padding: 2rem; text-align: center; color: var(--color-text-muted);">No students in this class today.</div>';
            listContainer.style.display = 'block';
            saveBtn.style.display = 'none';
            if (searchContainer) searchContainer.style.display = 'none';
            return;
        }

        // Sort students alphabetically by name
        const sortedStudents = [...cls.students].sort((a, b) => a.name.localeCompare(b.name));

        // Check if there's already a saved checklist for today and this class
        const existingRecords = Store.get('toiletries_checklist') || [];
        const todayRecord = existingRecords.find(rec => rec.date === dateStr && rec.classId === classId);

        let html = '';
        sortedStudents.forEach(student => {
            let itemsHtml = '';
            required.forEach(item => {
                // Check if this item was already saved for this student today
                let isSelected = false;
                if (todayRecord) {
                    const savedStudent = todayRecord.students.find(s => s.id === student.id);
                    if (savedStudent && savedStudent.items.includes(item.id)) {
                        isSelected = true;
                    }
                }
                
                const selectedClass = isSelected ? 'selected' : '';
                itemsHtml += `<button class="item-toggle ${selectedClass}" onclick="UI.toggleToiletryItem(this, '${student.id}', '${item.id}')" data-student="${student.id}" data-item="${item.id}">${item.name}</button>`;
            });

            // Add a visual indicator if the student is already complete/partial based on today's record
            let statusBadge = '';
            if (todayRecord) {
                const savedStudent = todayRecord.students.find(s => s.id === student.id);
                if (savedStudent && savedStudent.items.length === required.length) {
                    statusBadge = `<span style="color: var(--color-accent); font-size: 0.8rem; font-weight: 700; margin-left: 0.5rem;">✅ Complete</span>`;
                } else if (savedStudent && savedStudent.items.length > 0) {
                    statusBadge = `<span style="color: #f59e0b; font-size: 0.8rem; font-weight: 700; margin-left: 0.5rem;">⚠️ Partial</span>`;
                }
            }

            html += `
                <div class="checklist-row" data-student-name="${student.name.toLowerCase()}">
                    <span class="checklist-student">${student.name} ${statusBadge}</span>
                    <div class="checklist-items">${itemsHtml}</div>
                </div>
            `;
        });

        listContainer.innerHTML = html;
        listContainer.style.display = 'block';
        saveBtn.style.display = 'block';
        if (searchContainer) searchContainer.style.display = 'block';
    },

    // NEW: Filter function for the checklist search bar
    filterToiletriesChecklist() {
        const query = document.getElementById('toiletry-checklist-search').value.toLowerCase();
        const rows = document.querySelectorAll('.checklist-row');
        rows.forEach(row => {
            const name = row.getAttribute('data-student-name');
            if (name.includes(query)) {
                row.style.display = 'flex';
            } else {
                row.style.display = 'none';
            }
        });
    },

    saveToiletriesChecklist() {
        const classId = document.getElementById('toiletry-checklist-class').value;
        if (!classId) return;

        const required = Store.get('toiletries_required') || [];
        const dateStr = this.getLocalDateStr();
        const roster = Store.get(`roster_${dateStr}`);
        const cls = roster ? roster.find(c => c.classId === classId) : null;
        
        if (!cls) return alert("No roster found for this class today.");

        // Gather what each student brought
        const studentRecords = [];
        let totalCheckedCount = 0;

        cls.students.forEach(student => {
            const studentItems = [];
            const toggles = document.querySelectorAll(`.item-toggle[data-student="${student.id}"].selected`);
            
            toggles.forEach(toggle => {
                const itemId = toggle.dataset.item;
                studentItems.push(itemId);
                totalCheckedCount++;
            });
            
            studentRecords.push({
                id: student.id,
                name: student.name,
                items: studentItems // Array of item IDs the student brought
            });
        });

        if (totalCheckedCount === 0) {
            return this.showConfirm("No items have been checked. Save an empty checklist?", () => {
                this._saveChecklistRecord(classId, studentRecords);
            });
        }

        this._saveChecklistRecord(classId, studentRecords);
    },

    _saveChecklistRecord(classId, studentRecords) {
        const records = Store.get('toiletries_checklist') || [];
        const dateStr = this.getLocalDateStr();
        const timeStr = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
        const className = document.getElementById('toiletry-checklist-class').options[document.getElementById('toiletry-checklist-class').selectedIndex].text;
        
        // Remove any existing record for this class today to allow updates/edits
        const filteredRecords = records.filter(rec => !(rec.date === dateStr && rec.classId === classId));
        
        filteredRecords.unshift({
            id: Date.now(),
            date: dateStr,
            time: timeStr,
            classId: classId, // Saved classId for accurate matching
            className: className,
            students: studentRecords
        });
        Store.set('toiletries_checklist', filteredRecords);

        alert("✅ Checklist saved successfully!");
        this.switchToiletriesTab('compliance');
    },

    renderComplianceReport() {
        const records = Store.get('toiletries_checklist') || [];
        const container = document.getElementById('toiletries-compliance-list');
        
        if (records.length === 0) {
            container.innerHTML = '<p style="color: var(--color-text-muted); text-align: center; padding: 2rem;">No checklists recorded yet.</p>';
            return;
        }

        const required = Store.get('toiletries_required') || [];

        let html = '';
        records.forEach((rec, recIndex) => {
            const students = rec.students || [];
            let completeCount = 0;
            let missingCount = 0;
            const missingList = [];

            // Analyze each student's compliance
            students.forEach(student => {
                const broughtItems = student.items || [];
                const missingItems = [];

                required.forEach(reqItem => {
                    if (!broughtItems.includes(reqItem.id)) {
                        missingItems.push(`${reqItem.name} (${reqItem.requiredQty} ${reqItem.unit})`);
                    }
                });

                if (missingItems.length === 0) {
                    completeCount++;
                } else {
                    missingCount++;
                    missingList.push({ name: student.name, missing: missingItems });
                }
            });

            // Build the table rows
            let tableRows = '';
            students.forEach(student => {
                const broughtItems = student.items || [];
                const missingItems = [];

                required.forEach(reqItem => {
                    if (!broughtItems.includes(reqItem.id)) {
                        missingItems.push(`${reqItem.name} (${reqItem.requiredQty} ${reqItem.unit})`);
                    }
                });

                const statusHTML = missingItems.length === 0 
                    ? '<span class="status-complete">✅ Complete</span>'
                    : `<span class="status-missing">⚠️ Missing: ${missingItems.join(', ')}</span>`;

                tableRows += `
                    <tr>
                        <td style="font-weight: 500; white-space: nowrap;">${student.name}</td>
                        <td>${statusHTML}</td>
                    </tr>
                `;
            });

            html += `
                <details class="report-accordion">
                    <summary class="report-summary">
                        <span>📅 ${rec.date} - ${rec.className}</span>
                        <span style="font-size: 0.85rem; color: var(--color-text-muted); font-weight: normal;">
                            ${completeCount} ✅ | ${missingCount} ⚠️
                        </span>
                    </summary>
                    <div class="report-body">
                        <table class="compliance-table">
                            <thead>
                                <tr>
                                    <th>Student</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${tableRows}
                            </tbody>
                        </table>
                        ${missingList.length > 0 ? `
                            <button class="btn-copy-missing" onclick="UI.copyMissingList(${recIndex})">
                                📋 Copy Missing List for WhatsApp
                            </button>
                        ` : ''}
                    </div>
                </details>
            `;
        });
        container.innerHTML = html;
    },

    _generateMissingListText(record, missingList) {
        if (missingList.length === 0) return '';
        
        let text = `🧴 TOILETRIES REMINDER - ${record.className}\n`;
        text += `Date: ${record.date}\n\n`;
        text += `Dear Parents,\n\n`;
        text += `The following students are missing required toiletry items. Please send them to school as soon as possible:\n\n`;
        
        missingList.forEach(s => {
            text += `• ${s.name} - Missing: ${s.missing.join(', ')}\n`;
        });
        
        text += `\nThank you for your cooperation.\n`;
        text += `Preety Peep School`;
        
        return text;
    },

    copyMissingList(recordIndex) {
        const records = Store.get('toiletries_checklist') || [];
        const rec = records[recordIndex];
        if (!rec) return;

        const required = Store.get('toiletries_required') || [];
        const missingList = [];

        rec.students.forEach(student => {
            const broughtItems = student.items || [];
            const missingItems = [];

            required.forEach(reqItem => {
                if (!broughtItems.includes(reqItem.id)) {
                    missingItems.push(`${reqItem.name} (${reqItem.requiredQty} ${reqItem.unit})`);
                }
            });

            if (missingItems.length > 0) {
                missingList.push({ name: student.name, missing: missingItems });
            }
        });

        const text = this._generateMissingListText(rec, missingList);

        const textArea = document.createElement("textarea");
        textArea.value = text;
        textArea.style.position = "fixed";
        textArea.style.left = "-9999px";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        try {
            const successful = document.execCommand('copy');
            if (successful) alert("✅ Missing list copied! Paste it into WhatsApp to send to parents.");
            else alert("⚠️ Copy failed. Please select the text manually.");
        } catch (err) {
            alert("⚠️ Your browser doesn't support auto-copy.");
        }
        document.body.removeChild(textArea);
    }
};