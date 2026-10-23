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

    getLocalDateStr() {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    },

    togglePassword(inputId, btn) {
        const input = document.getElementById(inputId);
        if (input.type === "password") { input.type = "text"; btn.textContent = "🙈"; } 
        else { input.type = "password"; btn.textContent = "👁️"; }
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
            history.pushState({ screen: screenId }, '', `#${screenId}`);
        }
        this.currentScreen = screenId;
    },

    handlePopState(event) {
        const state = event.state;
        let screenId = 'login-screen';

        if (state && state.screen) {
            screenId = state.screen;
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
        if (!Auth.isAdminSetup()) { 
            this.navigateTo('setup-screen');
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
            this.navigateTo('dashboard-screen');
            document.getElementById('user-display-name').textContent = username;
            this.currentSession = { username, role };
            Store.set('current_session', this.currentSession);
            document.getElementById('admin-settings-btn').style.display = role === 'admin' ? 'inline-flex' : 'none';
            this.renderDashboard(); 
        } else { errorMsg.style.display = 'block'; }
    },

    logout() { 
        Store.set('current_session', null); 
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
        
        // FIX: Build HTML string first to prevent mobile DOM rendering bugs
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
        this.navigateTo('class-portal-screen');
        document.getElementById('student-search').value = '';
        this.renderClassPortal(classId, '');
    },

    goBackToDashboard() { history.back(); },

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
        
        // FIX: Build HTML string first to prevent mobile DOM rendering bugs
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
                    actionHTML = `<button class="btn-collect" onclick="UI.collectFee('${classId}', '${student.id}')">Collect GHS ${(cls.fee / 100).toFixed(2)}</button>`;
                } else if (student.status === 'paid') {
                    badgeHTML = `<span class="status-badge status-paid">Paid ${student.time || ''}</span>`;
                    actionHTML = `<button class="btn-icon" onclick="UI.undoPayment('${classId}', '${student.id}')" title="Undo">↩️</button>`;
                } else if (student.status === 'absent') {
                    badgeHTML = `<span class="status-badge status-absent">Absent</span>`;
                    actionHTML = `<button class="btn-icon" onclick="UI.resetStatus('${classId}', '${student.id}')" title="Reset">↩️</button>`;
                } else if (student.status === 'exempt') {
                    badgeHTML = `<span class="status-badge status-exempt">Not Paying</span>`;
                    actionHTML = `<button class="btn-icon" onclick="UI.resetStatus('${classId}', '${student.id}')" title="Reset">↩️</button>`;
                }

                htmlContent += `
                    <div class="student-row">
                        <div class="student-info"><span class="student-name">${student.name}</span>${badgeHTML}</div>
                        <div class="student-actions">
                            ${actionHTML}
                            <button class="btn-icon" onclick="UI.markAbsent('${classId}', '${student.id}')" title="Mark Absent">🚫</button>
                            <button class="btn-icon" onclick="UI.markNotPaying('${classId}', '${student.id}')" title="Mark Not Paying">🆓</button>
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
    undoPayment(classId, studentId) { if(confirm(`Undo payment?`)) this.updateStudentStatus(classId, studentId, 'unpaid'); },
    markAbsent(classId, studentId) { this.updateStudentStatus(classId, studentId, 'absent'); },
    markNotPaying(classId, studentId) { this.updateStudentStatus(classId, studentId, 'exempt'); },
    resetStatus(classId, studentId) { if(confirm(`Reset to Unpaid?`)) this.updateStudentStatus(classId, studentId, 'unpaid'); },
    
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

    removeStudentToday(classId, studentId) {
        if (!confirm("Remove this student from today's list?")) return;
        const dateStr = this.getLocalDateStr();
        const roster = Store.get(`roster_${dateStr}`);
        const cls = roster.find(c => c.classId === classId);
        cls.students = cls.students.filter(s => s.id !== studentId);
        Store.set(`roster_${dateStr}`, roster); 
        const currentQuery = document.getElementById('student-search').value;
        this.renderClassPortal(classId, currentQuery);
    },

    openAdminSettings() {
        this.navigateTo('admin-settings-screen');
        this.renderAdminSettings();
        this.renderReportsList();
    },

    goBackFromSettings() { history.back(); },

    renderAdminSettings() {
        const cashierData = Store.get('cashier_user');
        if (cashierData) document.getElementById('cashier-username').value = cashierData.username;
        else document.getElementById('cashier-username').value = '';
        document.getElementById('cashier-password').value = '';

        const classes = Store.get('classes');
        const container = document.getElementById('settings-list-container');
        
        // FIX: Build HTML string first
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
        if (!confirm("Are you sure you want to FINISH the day? This will save a report and reset the board for tomorrow.")) return;

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
    }
};