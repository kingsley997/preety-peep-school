    // ==========================================
    // SCHOOL FEES MODULE FUNCTIONS (ULTIMATE WORKFLOW)
    // ==========================================
    switchSchoolFeesTab(tabName) {
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        document.getElementById(`tab-fees-${tabName}`).classList.add('active');
        
        document.getElementById('school-fees-setup-view').style.display = tabName === 'setup' ? 'block' : 'none';
        document.getElementById('school-fees-payment-view').style.display = tabName === 'payment' ? 'block' : 'none';
        document.getElementById('school-fees-ledger-view').style.display = tabName === 'ledger' ? 'block' : 'none';
        document.getElementById('school-fees-reports-view').style.display = tabName === 'reports' ? 'block' : 'none';
        
        if (tabName === 'setup') this.renderFeeTypesSetup();
        if (tabName === 'payment') this.initializePaymentView();
        if (tabName === 'ledger') this.initializeLedgerView();
        if (tabName === 'reports') this.initializeReportsView();
    },

    renderFeeTypesSetup() {
        const feeTypes = Store.get('school_fee_types') || [];
        const container = document.getElementById('school-fees-setup-list');
        if (feeTypes.length === 0) {
            container.innerHTML = '<p style="color: var(--color-text-muted); text-align: center; padding: 2rem;">No fee types set yet. Click "+ Add Fee Type" to start.</p>';
            return;
        }
        let html = '';
        feeTypes.forEach(fee => {
            html += `<div class="fee-card">
                <div class="fee-header">
                    <span class="fee-name">${fee.name}</span>
                    <span class="fee-amount">GHS ${(fee.amount / 100).toFixed(2)}</span>
                </div>
                <div class="fee-actions">
                    <button class="btn-edit-fee" onclick="UI.editFeeType('${fee.id}')">✏️ Edit</button>
                    <button class="btn-delete-fee" onclick="UI.deleteFeeType('${fee.id}')">🗑️ Delete</button>
                </div>
            </div>`;
        });
        container.innerHTML = html;
    },

    showAddFeeTypeModal() {
        document.getElementById('fee-type-modal-title').textContent = 'Add Fee Type';
        document.getElementById('fee-type-name').value = '';
        document.getElementById('fee-type-amount').value = '';
        document.getElementById('fee-type-modal').dataset.editId = '';
        document.getElementById('fee-type-modal').style.display = 'flex';
    },

    editFeeType(feeId) {
        const feeTypes = Store.get('school_fee_types') || [];
        const fee = feeTypes.find(f => f.id === feeId);
        if (!fee) return;
        document.getElementById('fee-type-modal-title').textContent = 'Edit Fee Type';
        document.getElementById('fee-type-name').value = fee.name;
        document.getElementById('fee-type-amount').value = (fee.amount / 100).toFixed(2);
        document.getElementById('fee-type-modal').dataset.editId = feeId;
        document.getElementById('fee-type-modal').style.display = 'flex';
    },

    closeFeeTypeModal() { document.getElementById('fee-type-modal').style.display = 'none'; },

    saveFeeType() {
        const name = document.getElementById('fee-type-name').value.trim();
        const amountGhs = parseFloat(document.getElementById('fee-type-amount').value);
        const editId = document.getElementById('fee-type-modal').dataset.editId;
        if (!name) return alert("Please enter a fee name.");
        if (isNaN(amountGhs) || amountGhs < 0) return alert("Please enter a valid amount.");

        const amountPesewas = Math.round(amountGhs * 100);
        let feeTypes = Store.get('school_fee_types') || [];

        if (editId) {
            const index = feeTypes.findIndex(f => f.id === editId);
            if (index !== -1) { feeTypes[index].name = name; feeTypes[index].amount = amountPesewas; }
        } else {
            feeTypes.push({ id: 'fee_' + Date.now(), name, amount: amountPesewas });
        }

        Store.set('school_fee_types', feeTypes);
        this.closeFeeTypeModal();
        this.renderFeeTypesSetup();
    },

    deleteFeeType(feeId) {
        this.showConfirm("Delete this fee type? This cannot be undone.", () => {
            let feeTypes = Store.get('school_fee_types') || [];
            feeTypes = feeTypes.filter(f => f.id !== feeId);
            Store.set('school_fee_types', feeTypes);
            this.renderFeeTypesSetup();
        });
    },

    initializePaymentView() {
        document.getElementById('payment-class-select').value = '';
        document.getElementById('payment-student-list-container').style.display = 'none';
        document.getElementById('school-fees-student-search').value = '';
        document.getElementById('school-fees-student-list').innerHTML = '';
        document.getElementById('school-fees-payment-details').style.display = 'none';
        
        const classes = Store.get('classes') || [];
        const select = document.getElementById('payment-class-select');
        select.innerHTML = '<option value="">-- Select a Class First --</option>';
        classes.forEach(cls => { select.innerHTML += `<option value="${cls.id}">${cls.name}</option>`; });
    },

    onPaymentClassChange() {
        const classId = document.getElementById('payment-class-select').value;
        if (classId) {
            document.getElementById('payment-student-list-container').style.display = 'block';
            document.getElementById('school-fees-student-search').value = '';
            this.renderPaymentStudentList(classId);
            document.getElementById('school-fees-payment-details').style.display = 'none';
        } else {
            document.getElementById('payment-student-list-container').style.display = 'none';
            document.getElementById('school-fees-payment-details').style.display = 'none';
        }
    },

    renderPaymentStudentList(classId) {
        const classes = Store.get('classes') || [];
        const cls = classes.find(c => c.id === classId);
        if (!cls) return;

        const sortedStudents = [...cls.students].sort((a, b) => a.name.localeCompare(b.name));
        const listContainer = document.getElementById('school-fees-student-list');
        
        if (sortedStudents.length === 0) {
            listContainer.innerHTML = '<div style="padding: 1rem; text-align: center; color: var(--color-text-muted);">No students in this class.</div>';
            return;
        }

        let html = '';
        sortedStudents.forEach(student => {
            html += `<div class="student-search-result" data-name="${student.name.toLowerCase()}" onclick="UI.selectStudentForPayment('${student.id}', '${classId}')">
                <div class="student-search-name">${student.name}</div>
            </div>`;
        });
        listContainer.innerHTML = html;
    },

    filterPaymentStudents() {
        const query = document.getElementById('school-fees-student-search').value.trim().toLowerCase();
        const results = document.querySelectorAll('#school-fees-student-list .student-search-result');
        
        results.forEach(el => {
            const name = el.getAttribute('data-name');
            el.style.display = name.includes(query) ? 'block' : 'none';
        });
    },

    selectStudentForPayment(studentId, classId) {
        const classes = Store.get('classes') || [];
        const cls = classes.find(c => c.id === classId);
        if (!cls) return;
        const student = cls.students.find(s => s.id === studentId);
        if (!student) return;

        document.getElementById('school-fees-student-list').style.display = 'none'; // Hide list after selection
        this.renderPaymentDetails(student, cls);
    },

    renderPaymentDetails(student, cls) {
        const feeTypes = Store.get('school_fee_types') || [];
        const payments = Store.get('student_fee_payments') || [];
        
        let totalExpected = 0, totalPaid = 0;
        feeTypes.forEach(fee => {
            totalExpected += fee.amount;
            const studentPayments = payments.filter(p => p.studentId === student.id && p.feeId === fee.id);
            studentPayments.forEach(p => { totalPaid += p.amount; });
        });

        const totalOutstanding = totalExpected - totalPaid;

        let html = `
            <div class="payment-student-card">
                <div class="payment-student-header">
                    <div>
                        <div class="payment-student-name">${student.name}</div>
                        <div class="payment-student-class">${cls.name}</div>
                    </div>
                    <button class="btn" style="background: #f1f5f9; color: var(--color-text-main);" onclick="UI.resetPaymentView('${cls.id}')">↩️ Change Student</button>
                </div>
                <div class="payment-summary">
                    <div class="payment-summary-item"><div class="payment-summary-label">Total Expected</div><div class="payment-summary-value">GHS ${(totalExpected / 100).toFixed(2)}</div></div>
                    <div class="payment-summary-item"><div class="payment-summary-label">Total Paid</div><div class="payment-summary-value paid">GHS ${(totalPaid / 100).toFixed(2)}</div></div>
                    <div class="payment-summary-item"><div class="payment-summary-label">Outstanding</div><div class="payment-summary-value outstanding">GHS ${(totalOutstanding / 100).toFixed(2)}</div></div>
                </div>
                <button class="btn-record-payment" onclick="UI.showRecordPaymentModal('${student.id}', '${cls.id}')">💵 Record Payment</button>
            </div>
        `;

        document.getElementById('school-fees-payment-details').innerHTML = html;
        document.getElementById('school-fees-payment-details').style.display = 'block';
    },

    resetPaymentView(classId) {
        document.getElementById('school-fees-payment-details').style.display = 'none';
        document.getElementById('school-fees-student-list').style.display = 'block';
        document.getElementById('school-fees-student-search').value = '';
        this.filterPaymentStudents(); // Reset filter
    },

    showRecordPaymentModal(studentId, classId) {
        const classes = Store.get('classes') || [];
        const cls = classes.find(c => c.id === classId);
        if (!cls) return;
        const student = cls.students.find(s => s.id === studentId);
        if (!student) return;

        const feeTypes = Store.get('school_fee_types') || [];
        const payments = Store.get('student_fee_payments') || [];

        let feesHtml = '';
        let totalOutstanding = 0;

        feeTypes.forEach(fee => {
            const studentPayments = payments.filter(p => p.studentId === studentId && p.feeId === fee.id);
            const totalPaidForFee = studentPayments.reduce((sum, p) => sum + p.amount, 0);
            const outstanding = Math.max(0, fee.amount - totalPaidForFee);
            totalOutstanding += outstanding;

            if (outstanding > 0) {
                feesHtml += `<label class="fee-checkbox-item" style="cursor: pointer;" onclick="UI.updatePaymentAmount('${studentId}')">
                    <div class="fee-checkbox-left">
                        <input type="checkbox" class="fee-checkbox-input" value="${fee.id}" data-amount="${outstanding}" onchange="UI.updatePaymentAmount('${studentId}')">
                        <div class="fee-checkbox-name">${fee.name}</div>
                    </div>
                    <div class="fee-checkbox-amount">Outstanding: GHS ${(outstanding / 100).toFixed(2)}</div>
                </label>`;
            }
        });

        if (feesHtml === '') feesHtml = '<p style="text-align: center; color: var(--color-accent); font-weight: 700;">✅ This student has fully paid all fees!</p>';

        const modal = document.getElementById('record-payment-modal');
        modal.innerHTML = `
            <div style="background: white; padding: 2rem; border-radius: var(--radius-lg); max-width: 500px; width: 90%; box-shadow: var(--shadow-lg); max-height: 90vh; overflow-y: auto;">
                <h3 style="color: var(--color-primary); margin-bottom: 1rem;">Record Payment for ${student.name}</h3>
                <div style="background: var(--color-bg); padding: 1rem; border-radius: var(--radius-md); margin-bottom: 1.5rem;">
                    <strong>Class:</strong> ${cls.name} <br>
                    <strong>Total Outstanding:</strong> <span style="color: var(--color-danger); font-weight: 700;">GHS ${(totalOutstanding / 100).toFixed(2)}</span>
                </div>
                <div style="margin-bottom: 1.5rem;">
                    <label style="font-weight: 600; margin-bottom: 0.5rem; display: block;">Select Fees to Pay:</label>
                    <div id="payment-fees-list" style="display: flex; flex-direction: column; gap: 0.75rem;">${feesHtml}</div>
                </div>
                <div class="form-group">
                    <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer; font-weight: 600;">
                        <input type="checkbox" id="pay-full-balance" onchange="UI.toggleFullPayment('${studentId}', ${totalOutstanding})">
                        Pay Full Outstanding Balance for Selected Fees
                    </label>
                </div>
                <div class="form-group"><label>Amount Paid (GHS)</label><input type="number" id="payment-amount-input" class="form-input" placeholder="0.00" step="0.01" min="0"></div>
                <div class="form-group">
                    <label>Payment Method</label>
                    <select id="payment-method" class="form-select">
                        <option value="Cash">Cash</option><option value="MoMo">Mobile Money (MoMo)</option><option value="Bank">Bank Transfer</option>
                    </select>
                </div>
                <div class="form-group"><label>Note (Optional)</label><input type="text" id="payment-note" class="form-input" placeholder="e.g., Paid by parent in person"></div>
                <div style="display: flex; gap: 1rem; margin-top: 1.5rem;">
                    <button onclick="UI.closeRecordPaymentModal()" class="btn" style="background: #f1f5f9; color: var(--color-text-main); flex: 1;">Cancel</button>
                    <button onclick="UI.confirmRecordPayment('${studentId}', '${classId}')" class="btn btn-primary" style="flex: 1;">💾 Save & Issue Receipt</button>
                </div>
            </div>
        `;
        modal.style.display = 'flex';
    },

    toggleFullPayment(studentId, totalOutstanding) {
        const isFull = document.getElementById('pay-full-balance').checked;
        const amountInput = document.getElementById('payment-amount-input');
        if (isFull) {
            const checkboxes = document.querySelectorAll('.fee-checkbox-input:checked');
            let selectedOutstanding = 0;
            checkboxes.forEach(cb => { selectedOutstanding += parseInt(cb.dataset.amount); });
            amountInput.value = (selectedOutstanding / 100).toFixed(2);
            amountInput.readOnly = true;
        } else {
            amountInput.readOnly = false;
            amountInput.value = '';
        }
    },

    updatePaymentAmount(studentId) {
        if (document.getElementById('pay-full-balance').checked) {
            const checkboxes = document.querySelectorAll('.fee-checkbox-input:checked');
            let selectedOutstanding = 0;
            checkboxes.forEach(cb => { selectedOutstanding += parseInt(cb.dataset.amount); });
            document.getElementById('payment-amount-input').value = (selectedOutstanding / 100).toFixed(2);
        }
    },

    closeRecordPaymentModal() { document.getElementById('record-payment-modal').style.display = 'none'; },

    confirmRecordPayment(studentId, classId) {
        const checkboxes = document.querySelectorAll('.fee-checkbox-input:checked');
        if (checkboxes.length === 0) return alert("Please select at least one fee to pay.");

        const amountGhs = parseFloat(document.getElementById('payment-amount-input').value);
        if (isNaN(amountGhs) || amountGhs <= 0) return alert("Please enter a valid payment amount greater than 0.");

        const method = document.getElementById('payment-method').value;
        const note = document.getElementById('payment-note').value.trim();
        const dateStr = this.getLocalDateStr();
        const timeStr = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

        const payments = Store.get('student_fee_payments') || [];
        const feeTypes = Store.get('school_fee_types') || [];

        let remainingAmount = Math.round(amountGhs * 100);
        const paymentDetails = [];

        checkboxes.forEach(cb => {
            const feeId = cb.value;
            const fee = feeTypes.find(f => f.id === feeId);
            if (!fee) return;

            const studentPayments = payments.filter(p => p.studentId === studentId && p.feeId === feeId);
            const totalPaidForFee = studentPayments.reduce((sum, p) => sum + p.amount, 0);
            const outstanding = Math.max(0, fee.amount - totalPaidForFee);

            if (outstanding > 0 && remainingAmount > 0) {
                const amountToPay = Math.min(remainingAmount, outstanding);
                payments.push({
                    id: 'pay_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
                    studentId: studentId, feeId: feeId, amount: amountToPay,
                    date: dateStr, time: timeStr, method: method, note: note,
                    officer: this.currentSession ? this.currentSession.username : 'Unknown'
                });
                remainingAmount -= amountToPay;
                paymentDetails.push(`${fee.name}: GHS ${(amountToPay / 100).toFixed(2)}`);
            }
        });

        if (remainingAmount > 0) alert(`⚠️ Warning: The amount entered (GHS ${amountGhs.toFixed(2)}) is greater than the outstanding balance of the selected fees. The excess will not be recorded.`);

        Store.set('student_fee_payments', payments);
        this.closeRecordPaymentModal();
        this.showPaymentReceipt(studentId, classId, Math.round(amountGhs * 100) - remainingAmount, paymentDetails, method, note, dateStr, timeStr);
        
        // FIX: Reset the view so the student card "leaves" and it's ready for the next person
        this.initializePaymentView();
    },

    showPaymentReceipt(studentId, classId, totalAmountPesewas, paymentDetails, method, note, dateStr, timeStr) {
        const classes = Store.get('classes') || [];
        const cls = classes.find(c => c.id === classId);
        if (!cls) return;
        const student = cls.students.find(s => s.id === studentId);
        if (!student) return;

        const receiptText = `🧾 PAYMENT RECEIPT\n========================\nPreety Peep School\nDate: ${dateStr} | Time: ${timeStr}\n\nStudent: ${student.name}\nClass: ${cls.name}\n\nPayment Details:\n${paymentDetails.join('\n')}\n\nTotal Amount Paid: GHS ${(totalAmountPesewas / 100).toFixed(2)}\nPayment Method: ${method}\n${note ? `Note: ${note}` : ''}\n\nReceived by: ${this.currentSession ? this.currentSession.username : 'Unknown'}\n========================\nThank you for your payment!`.trim();

        document.getElementById('report-content').textContent = receiptText;
        this.currentReportText = receiptText;
        document.getElementById('report-modal').style.display = 'flex';
    },

    initializeLedgerView() {
        document.getElementById('ledger-class-select').value = '';
        document.getElementById('school-fees-ledger-list').style.display = 'none';
        document.getElementById('school-fees-ledger-list').innerHTML = '';
        
        const classes = Store.get('classes') || [];
        const select = document.getElementById('ledger-class-select');
        select.innerHTML = '<option value="">-- Select a Class --</option>';
        classes.forEach(cls => { select.innerHTML += `<option value="${cls.id}">${cls.name}</option>`; });
    },

    onLedgerClassChange() {
        const classId = document.getElementById('ledger-class-select').value;
        const listContainer = document.getElementById('school-fees-ledger-list');
        
        if (!classId) {
            listContainer.style.display = 'none';
            return;
        }

        const classes = Store.get('classes') || [];
        const cls = classes.find(c => c.id === classId);
        if (!cls) return;

        const feeTypes = Store.get('school_fee_types') || [];
        const payments = Store.get('student_fee_payments') || [];
        const sortedStudents = [...cls.students].sort((a, b) => a.name.localeCompare(b.name));

        let html = '';
        sortedStudents.forEach(student => {
            let totalExpected = 0, totalPaid = 0, totalOutstanding = 0;
            let feeBreakdownHtml = '';

            feeTypes.forEach(fee => {
                totalExpected += fee.amount;
                const studentPayments = payments.filter(p => p.studentId === student.id && p.feeId === fee.id);
                const paidForFee = studentPayments.reduce((sum, p) => sum + p.amount, 0);
                const outstanding = Math.max(0, fee.amount - paidForFee);
                totalPaid += paidForFee;
                totalOutstanding += outstanding;

                let status = outstanding === 0 && paidForFee > 0 ? '✅' : (paidForFee > 0 ? '⚠️' : '❌');
                feeBreakdownHtml += `<div style="display: flex; justify-content: space-between; padding: 0.5rem 0; border-bottom: 1px solid var(--color-border); font-size: 0.9rem;">
                    <span>${status} ${fee.name}</span>
                    <span style="font-weight: 600;">GHS ${(paidForFee / 100).toFixed(2)} / GHS ${(fee.amount / 100).toFixed(2)}</span>
                </div>`;
            });

            const studentPayments = payments.filter(p => p.studentId === student.id).sort((a, b) => new Date(b.date + 'T' + b.time) - new Date(a.date + 'T' + a.time));
            let historyHtml = '';
            if (studentPayments.length > 0) {
                historyHtml = '<div style="margin-top: 1rem; padding-top: 1rem; border-top: 2px solid var(--color-border);"><strong style="font-size: 0.85rem; color: var(--color-text-muted);">PAYMENT HISTORY:</strong>';
                studentPayments.forEach(p => {
                    const feeType = feeTypes.find(f => f.id === p.feeId);
                    historyHtml += `<div style="font-size: 0.85rem; padding: 0.5rem 0; color: var(--color-text-main);">📅 ${p.date} ${p.time} | <strong>${feeType ? feeType.name : 'Fee'}</strong> via ${p.method} | <span style="color: var(--color-accent); font-weight: 700;">+GHS ${(p.amount / 100).toFixed(2)}</span></div>`;
                });
                historyHtml += '</div>';
            }

            const outstandingColor = totalOutstanding > 0 ? 'var(--color-danger)' : 'var(--color-accent)';

            html += `<details class="report-accordion" style="margin-bottom: 1rem;">
                <summary class="report-summary" style="padding: 1rem;">
                    <div style="display: flex; justify-content: space-between; width: 100%; align-items: center;">
                        <strong>${student.name}</strong>
                        <span style="font-size: 0.9rem; color: ${outstandingColor}; font-weight: 700;">Outstanding: GHS ${(totalOutstanding / 100).toFixed(2)}</span>
                    </div>
                </summary>
                <div class="report-body">
                    <div style="margin-bottom: 1rem;"><strong style="font-size: 0.85rem; color: var(--color-text-muted);">FEE BREAKDOWN (Paid / Expected):</strong>${feeBreakdownHtml}</div>
                    ${historyHtml || '<p style="font-size: 0.85rem; color: var(--color-text-muted);">No payments recorded yet.</p>'}
                </div>
            </details>`;
        });

        listContainer.innerHTML = html;
        listContainer.style.display = 'block';
    },

    initializeReportsView() {
        document.getElementById('report-class-select').value = '';
        document.getElementById('school-fees-reports-list').innerHTML = '<p style="color: var(--color-text-muted); text-align: center;">Select a class above to view students with outstanding balances.</p>';
        
        const classes = Store.get('classes') || [];
        const select = document.getElementById('report-class-select');
        select.innerHTML = '<option value="">-- Select a Class to View Debtors --</option>';
        classes.forEach(cls => { select.innerHTML += `<option value="${cls.id}">${cls.name}</option>`; });

        // Calculate global stats
        const feeTypes = Store.get('school_fee_types') || [];
        const payments = Store.get('student_fee_payments') || [];
        let totalExpected = 0, totalCollected = 0;
        
        classes.forEach(cls => {
            cls.students.forEach(student => {
                feeTypes.forEach(fee => {
                    totalExpected += fee.amount;
                    const studentPayments = payments.filter(p => p.studentId === student.id && p.feeId === fee.id);
                    studentPayments.forEach(p => { totalCollected += p.amount; });
                });
            });
        });

        document.getElementById('fees-stat-expected').textContent = `GHS ${(totalExpected / 100).toFixed(2)}`;
        document.getElementById('fees-stat-collected').textContent = `GHS ${(totalCollected / 100).toFixed(2)}`;
        document.getElementById('fees-stat-outstanding').textContent = `GHS ${((totalExpected - totalCollected) / 100).toFixed(2)}`;
    },

    onReportClassChange() {
        const classId = document.getElementById('report-class-select').value;
        const container = document.getElementById('school-fees-reports-list');
        
        if (!classId) {
            container.innerHTML = '<p style="color: var(--color-text-muted); text-align: center;">Select a class above to view students with outstanding balances.</p>';
            return;
        }

        const classes = Store.get('classes') || [];
        const cls = classes.find(c => c.id === classId);
        if (!cls) return;

        const feeTypes = Store.get('school_fee_types') || [];
        const payments = Store.get('student_fee_payments') || [];
        
        // Get students with outstanding > 0, sorted alphabetically
        const debtors = cls.students.map(student => {
            let studentExpected = 0, studentPaid = 0;
            feeTypes.forEach(fee => {
                studentExpected += fee.amount;
                const studentPayments = payments.filter(p => p.studentId === student.id && p.feeId === fee.id);
                studentPayments.forEach(p => { studentPaid += p.amount; });
            });
            return { ...student, expected: studentExpected, paid: studentPaid, outstanding: studentExpected - studentPaid };
        }).filter(s => s.outstanding > 0).sort((a, b) => a.name.localeCompare(b.name));

        if (debtors.length === 0) {
            container.innerHTML = '<p style="color: var(--color-accent); text-align: center; font-weight: 700; padding: 2rem;">🎉 Excellent! All students in this class have fully paid.</p>';
            return;
        }

        let html = '';
        debtors.forEach(s => {
            html += `<div class="settings-row">
                <div>
                    <strong style="color: var(--color-primary);">${s.name}</strong>
                </div>
                <div style="text-align: right;">
                    <div style="font-size: 0.85rem; color: var(--color-text-muted);">Expected: GHS ${(s.expected / 100).toFixed(2)} | Paid: GHS ${(s.paid / 100).toFixed(2)}</div>
                    <div style="font-weight: 700; color: var(--color-danger); font-size: 1.1rem;">Owes: GHS ${(s.outstanding / 100).toFixed(2)}</div>
                </div>
            </div>`;
        });

        container.innerHTML = html;
    }
};