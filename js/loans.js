// ============================================
// FINORA — Loans & EMI
// ============================================

const LOAN_TYPES = [
    'Personal Loan',
    'Home Loan',
    'Car Loan',
    'Bike Loan',
    'Education Loan',
    'Other'
];

async function loadLoans() {
    const container = document.getElementById('pageContainer');
    const db = getDB();
    const loans = await db.readAll('loans');
    const accounts = await db.readAll('accounts');
    const accountMap = {};
    accounts.forEach(a => accountMap[a.id] = a.name);

    const html = `
        <div class="loans-page">
            <div class="page-header">
                <h2>Loans & EMI</h2>
                <button class="btn btn-primary" onclick="openAddLoanModal()">
                    <i class="fas fa-plus"></i> Add Loan
                </button>
            </div>

            ${loans.length > 0 ? loans.map(loan => `
                <div class="loan-card card" onclick="viewLoanDetails('${loan.id}')">
                    <div class="loan-header">
                        <div class="loan-info">
                            <h3>${loan.name}</h3>
                            <span class="loan-type">${loan.type}</span>
                            <span class="loan-status ${loan.status}">${loan.status}</span>
                        </div>
                        <div class="loan-amounts">
                            <div class="loan-total">
                                <span class="text-muted">Total</span>
                                <strong>${formatCurrency(loan.totalAmount)}</strong>
                            </div>
                            <div class="loan-remaining">
                                <span class="text-muted">Remaining</span>
                                <strong>${formatCurrency(loan.remaining || 0)}</strong>
                            </div>
                        </div>
                    </div>
                    <div class="loan-progress">
                        <div class="progress-bar" style="width: ${((loan.totalAmount - (loan.remaining || 0)) / loan.totalAmount * 100)}%"></div>
                        <span>${Math.round((loan.totalAmount - (loan.remaining || 0)) / loan.totalAmount * 100)}% paid</span>
                    </div>
                    <div class="loan-footer">
                        <span>EMI: ${formatCurrency(loan.monthlyEMI)}</span>
                        <span>·</span>
                        <span>${loan.paidInstallments || 0}/${loan.totalInstallments} paid</span>
                        <span>·</span>
                        <span>Next: ${loan.nextDue ? formatDate(loan.nextDue) : '—'}</span>
                    </div>
                    <div class="loan-actions">
                        <button class="btn btn-sm btn-primary" onclick="event.stopPropagation();openAddEMIModal('${loan.id}')">
                            <i class="fas fa-plus"></i> Pay EMI
                        </button>
                    </div>
                </div>
            `).join('') : `
                <div class="empty-state">
                    <i class="fas fa-hand-holding-usd"></i>
                    <p>No loans yet</p>
                    <button class="btn btn-primary" onclick="openAddLoanModal()">Add your first loan</button>
                </div>
            `}
        </div>
    `;

    container.innerHTML = html;

    // Add styles
    const style = document.createElement('style');
    style.textContent = `
        .loan-card {
            padding: 20px 24px;
            margin-bottom: 16px;
            cursor: pointer;
            transition: all var(--transition);
        }
        .loan-card:hover {
            box-shadow: var(--shadow-lg);
            transform: translateY(-2px);
        }
        .loan-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            flex-wrap: wrap;
            gap: 12px;
            margin-bottom: 12px;
        }
        .loan-info h3 {
            font-size: 1.1rem;
            font-weight: 600;
        }
        .loan-type {
            font-size: 0.8rem;
            color: var(--text-muted);
            margin-right: 8px;
        }
        .loan-status {
            font-size: 0.7rem;
            padding: 2px 10px;
            border-radius: 12px;
            text-transform: uppercase;
            font-weight: 600;
        }
        .loan-status.active { background: #dcfce7; color: #22c55e; }
        .loan-status.completed { background: #dbeafe; color: #3b82f6; }
        .loan-status.defaulted { background: #fee2e2; color: #ef4444; }
        .loan-amounts {
            display: flex;
            gap: 24px;
            text-align: right;
        }
        .loan-amounts strong {
            font-size: 1.1rem;
        }
        .loan-progress {
            display: flex;
            align-items: center;
            gap: 12px;
            margin: 8px 0;
        }
        .progress-bar {
            flex: 1;
            height: 6px;
            background: var(--primary);
            border-radius: 4px;
            transition: width 0.3s;
        }
        .loan-footer {
            font-size: 0.85rem;
            color: var(--text-muted);
            display: flex;
            gap: 8px;
            flex-wrap: wrap;
        }
        .loan-actions {
            margin-top: 12px;
            display: flex;
            gap: 8px;
        }
        .empty-state {
            text-align: center;
            padding: 60px 20px;
        }
        .empty-state i {
            font-size: 3rem;
            color: var(--text-muted);
        }
        .empty-state p {
            margin: 16px 0;
            color: var(--text-secondary);
        }
    `;
    document.getElementById('page-style').textContent = style.textContent;
}

async function openAddLoanModal() {
    const db = getDB();
    const accounts = await db.readAll('accounts');

    openModal('Add Loan', `
        <form id="loanForm">
            <div class="form-group">
                <label>Loan Name</label>
                <input type="text" class="form-control" id="loanName" placeholder="iPhone, Car, etc." required />
            </div>
            <div class="form-group">
                <label>Loan Type</label>
                <select class="form-control" id="loanType">
                    ${LOAN_TYPES.map(t => `<option value="${t}">${t}</option>`).join('')}
                </select>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Total Amount</label>
                    <input type="number" class="form-control" id="loanTotal" placeholder="₹ 0" required />
                </div>
                <div class="form-group">
                    <label>Monthly EMI</label>
                    <input type="number" class="form-control" id="loanEMI" placeholder="₹ 0" required />
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Total Installments</label>
                    <input type="number" class="form-control" id="loanInstallments" placeholder="e.g. 12" required />
                </div>
                <div class="form-group">
                    <label>Start Date</label>
                    <input type="date" class="form-control" id="loanStartDate" value="${new Date().toISOString().split('T')[0]}" />
                </div>
            </div>
            <div class="form-group">
                <label>Account (for EMI payments)</label>
                <select class="form-control" id="loanAccount">
                    ${accounts.map(a => `<option value="${a.id}">${a.name}</option>`).join('')}
                </select>
            </div>
            <div class="form-group">
                <label>Interest Rate (Optional)</label>
                <input type="number" class="form-control" id="loanInterest" placeholder="e.g. 12%" step="0.1" />
            </div>
            <button type="submit" class="btn btn-primary btn-block">Add Loan</button>
        </form>
    `);

    document.getElementById('loanForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        await handleAddLoan();
    });
}

async function handleAddLoan() {
    const name = document.getElementById('loanName').value.trim();
    const type = document.getElementById('loanType').value;
    const totalAmount = parseFloat(document.getElementById('loanTotal').value);
    const monthlyEMI = parseFloat(document.getElementById('loanEMI').value);
    const totalInstallments = parseInt(document.getElementById('loanInstallments').value);
    const startDate = document.getElementById('loanStartDate').value;
    const accountId = document.getElementById('loanAccount').value;
    const interestRate = document.getElementById('loanInterest').value;

    if (!name || !totalAmount || !monthlyEMI || !totalInstallments) {
        showToast('Please fill all required fields', 'error');
        return;
    }

    try {
        const db = getDB();
        const loan = {
            id: generateLoanId(),
            name,
            type,
            totalAmount,
            monthlyEMI,
            totalInstallments,
            paidInstallments: 0,
            remaining: totalAmount,
            startDate,
            accountId,
            interestRate: interestRate || null,
            status: 'active',
            nextDue: startDate,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        await db.create('loans', loan);
        
        // Create initial installment records
        const installments = [];
        let dueDate = new Date(startDate);
        for (let i = 1; i <= totalInstallments; i++) {
            const isFinal = i === totalInstallments;
            installments.push({
                id: `INST-${Date.now()}-${i}`,
                loanId: loan.id,
                installmentNo: i,
                scheduledEMI: isFinal ? 0 : monthlyEMI, // Final will be calculated
                dueDate: dueDate.toISOString(),
                status: 'pending',
                transactionId: null,
                isFinal: isFinal,
                createdAt: new Date().toISOString()
            });
            dueDate.setMonth(dueDate.getMonth() + 1);
        }
        await db.bulkCreate('loan_installments', installments);

        closeModal();
        showToast('Loan added successfully!', 'success');
        await loadLoans();
    } catch (error) {
        showToast('Failed to add loan: ' + error.message, 'error');
    }
}

async function openAddEMIModal(loanId) {
    const db = getDB();
    const loan = await db.read('loans', loanId);
    if (!loan) {
        showToast('Loan not found', 'error');
        return;
    }

    const installments = await db.getByIndex('loan_installments', 'idx_loanId', loanId);
    const pending = installments.filter(i => i.status === 'pending');
    
    if (pending.length === 0) {
        showToast('All installments are paid!', 'info');
        return;
    }

    const nextInstallment = pending[0];
    const isFinal = pending.length === 1;
    const emiAmount = isFinal ? loan.remaining : loan.monthlyEMI;

    openModal('Pay EMI', `
        <form id="emiForm">
            <div class="emi-details">
                <div><span>Loan</span> <strong>${loan.name}</strong></div>
                <div><span>Installment</span> <strong>#${nextInstallment.installmentNo} of ${loan.totalInstallments}</strong></div>
                <div><span>Due Date</span> <strong>${formatDate(nextInstallment.dueDate)}</strong></div>
                <div><span>Amount</span> <strong>${formatCurrency(emiAmount)}</strong></div>
                ${isFinal ? `<div class="text-warning" style="font-size:0.85rem;">⚠️ This is the final EMI. Amount: ${formatCurrency(loan.remaining)}</div>` : ''}
                <div><span>Remaining Balance</span> <strong>${formatCurrency(loan.remaining)}</strong></div>
            </div>
            <div class="form-group">
                <label>Payment Date</label>
                <input type="date" class="form-control" id="emiPaymentDate" value="${new Date().toISOString().split('T')[0]}" />
            </div>
            <div class="form-group">
                <label>Account</label>
                <select class="form-control" id="emiAccount">
                    ${(await db.readAll('accounts')).map(a => 
                        `<option value="${a.id}">${a.name} (${formatCurrency(a.balance || 0)})</option>`
                    ).join('')}
                </select>
            </div>
            <button type="submit" class="btn btn-primary btn-block">Pay EMI</button>
        </form>
    `);

    document.getElementById('emiForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        await handlePayEMI(loanId, nextInstallment.id, emiAmount, isFinal);
    });
}

async function handlePayEMI(loanId, installmentId, emiAmount, isFinal) {
    const paymentDate = document.getElementById('emiPaymentDate').value;
    const accountId = document.getElementById('emiAccount').value;

    try {
        const db = getDB();
        const loan = await db.read('loans', loanId);
        const installment = await db.read('loan_installments', installmentId);

        if (!loan || !installment) {
            showToast('Loan or installment not found', 'error');
            return;
        }

        // Check balance
        const balance = await getAccountBalance(accountId);
        if (balance < emiAmount) {
            if (!confirm(`⚠️ Insufficient balance! Recorded balance: ${formatCurrency(balance)}. Continue anyway?`)) {
                return;
            }
        }

        // Create ledger transaction
        const txn = await createLedgerEntry({
            type: 'loan_emi',
            direction: 'out',
            amount: emiAmount,
            accountId: accountId,
            date: paymentDate,
            description: `EMI #${installment.installmentNo} - ${loan.name}`,
            module: 'loan',
            moduleRef: loanId,
            status: 'completed'
        });

        // Update installment
        installment.status = 'paid';
        installment.paidDate = paymentDate;
        installment.paidAmount = emiAmount;
        installment.transactionId = txn.id;
        await db.update('loan_installments', installment);

        // Update loan
        loan.paidInstallments = (loan.paidInstallments || 0) + 1;
        loan.remaining -= emiAmount;
        
        if (isFinal || loan.remaining <= 0) {
            loan.remaining = 0;
            loan.status = 'completed';
            loan.completedDate = paymentDate;
        } else {
            // Find next pending installment for next due
            const pending = await db.getByIndex('loan_installments', 'idx_loanId', loanId);
            const nextPending = pending.filter(i => i.status === 'pending').sort((a, b) => a.installmentNo - b.installmentNo)[0];
            if (nextPending) {
                loan.nextDue = nextPending.dueDate;
            }
        }
        loan.updatedAt = new Date().toISOString();
        await db.update('loans', loan);

        closeModal();
        showToast('EMI paid successfully!', 'success');
        await loadLoans();
    } catch (error) {
        showToast('Failed to pay EMI: ' + error.message, 'error');
    }
}

async function viewLoanDetails(loanId) {
    const db = getDB();
    const loan = await db.read('loans', loanId);
    if (!loan) {
        showToast('Loan not found', 'error');
        return;
    }

    const installments = await db.getByIndex('loan_installments', 'idx_loanId', loanId);
    installments.sort((a, b) => a.installmentNo - b.installmentNo);

    const account = await db.read('accounts', loan.accountId);

    openModal(`Loan: ${loan.name}`, `
        <div class="loan-detail">
            <div class="loan-detail-summary">
                <div><span>Type</span> ${loan.type}</div>
                <div><span>Status</span> <span class="loan-status ${loan.status}">${loan.status}</span></div>
                <div><span>Account</span> ${account ? account.name : 'N/A'}</div>
                <div><span>Total</span> <strong>${formatCurrency(loan.totalAmount)}</strong></div>
                <div><span>Paid</span> <strong>${formatCurrency(loan.totalAmount - loan.remaining)}</strong></div>
                <div><span>Remaining</span> <strong>${formatCurrency(loan.remaining)}</strong></div>
                <div><span>EMI</span> ${formatCurrency(loan.monthlyEMI)}</div>
                <div><span>Progress</span> ${Math.round((loan.totalAmount - loan.remaining) / loan.totalAmount * 100)}%</div>
            </div>
            <hr />
            <h4>Installment History</h4>
            <div class="installment-list">
                ${installments.map(inst => `
                    <div class="installment-item ${inst.status}">
                        <span>#${inst.installmentNo}</span>
                        <span>${formatDate(inst.dueDate)}</span>
                        <span>${formatCurrency(inst.paidAmount || inst.scheduledEMI || 0)}</span>
                        <span class="inst-status ${inst.status}">${inst.status}</span>
                        ${inst.transactionId ? `<span class="inst-txn" onclick="viewTransaction('${inst.transactionId}')">🔍</span>` : ''}
                    </div>
                `).join('')}
            </div>
            <button class="btn btn-primary" onclick="closeModal();openAddEMIModal('${loanId}')">
                <i class="fas fa-plus"></i> Pay EMI
            </button>
        </div>
    `);
}