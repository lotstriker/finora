// ============================================
// FINORA — Transfers
// ============================================

async function loadTransfers() {
    const container = document.getElementById('pageContainer');
    const db = getDB();
    const accounts = await db.readAll('accounts');
    const entries = await getLedgerEntries({ type: 'transfer' });
    
    // Group transfers by pair
    const transferPairs = [];
    const processed = new Set();
    
    for (const e of entries) {
        if (processed.has(e.id)) continue;
        if (e.toAccountId) {
            const pair = entries.find(x => 
                x.toAccountId === e.accountId && 
                x.accountId === e.toAccountId &&
                Math.abs(x.amount - e.amount) < 0.01 &&
                x.date === e.date
            );
            if (pair) {
                transferPairs.push({
                    from: e.accountId,
                    to: e.toAccountId,
                    amount: e.amount,
                    date: e.date,
                    description: e.description || pair.description,
                    txnId: e.id,
                    pairTxnId: pair.id
                });
                processed.add(e.id);
                processed.add(pair.id);
            }
        }
    }
    
    const totalTransfers = transferPairs.reduce((s, t) => s + t.amount, 0);
    
    const html = `
        <div class="transfers-page">
            <div class="page-header">
                <h2>Transfers</h2>
                <button class="btn btn-primary" onclick="openAddTransferModal()">
                    <i class="fas fa-plus"></i> New Transfer
                </button>
            </div>
            
            <div class="summary-card card">
                <span class="text-muted">Total Transfers</span>
                <h1>${formatCurrency(totalTransfers)}</h1>
                <span class="text-muted">${transferPairs.length} transfers</span>
            </div>
            
            <div class="transfer-list">
                ${transferPairs.length > 0 ? transferPairs.map(t => `
                    <div class="transfer-item">
                        <div class="transfer-item-left">
                            <div class="transfer-icon">
                                <i class="fas fa-exchange-alt"></i>
                            </div>
                            <div class="transfer-details">
                                <div class="transfer-desc">${t.description || 'Transfer'}</div>
                                <div class="transfer-meta">
                                    <span>${formatDate(t.date)}</span>
                                    <span>·</span>
                                    <span>${getAccountNameSync(t.from)}</span>
                                    <span><i class="fas fa-arrow-right"></i></span>
                                    <span>${getAccountNameSync(t.to)}</span>
                                </div>
                            </div>
                        </div>
                        <div class="transfer-amount">
                            ${formatCurrency(t.amount)}
                        </div>
                    </div>
                `).join('') : `
                    <div class="empty-state">
                        <i class="fas fa-exchange-alt"></i>
                        <p>No transfers yet</p>
                        <button class="btn btn-primary" onclick="openAddTransferModal()">Add Transfer</button>
                    </div>
                `}
            </div>
        </div>
    `;
    
    container.innerHTML = html;
}

// Synchronous helper for account names
function getAccountNameSync(accountId) {
    // This will be populated when page loads
    const db = getDB();
    return db.read('accounts', accountId).then(a => a ? a.name : 'Unknown');
}

async function openAddTransferModal() {
    const db = getDB();
    const accounts = await db.readAll('accounts');
    
    openModal('New Transfer', `
        <form id="transferForm">
            <div class="form-group">
                <label>From Account</label>
                <select class="form-control" id="transferFrom">
                    ${accounts.map(a => `<option value="${a.id}">${a.name} (${formatCurrency(a.balance || 0)})</option>`).join('')}
                </select>
            </div>
            <div class="form-group">
                <label>To Account</label>
                <select class="form-control" id="transferTo">
                    ${accounts.map(a => `<option value="${a.id}">${a.name}</option>`).join('')}
                </select>
            </div>
            <div class="form-group">
                <label>Amount</label>
                <input type="number" class="form-control" id="transferAmount" placeholder="₹ 0" required />
            </div>
            <div class="form-group">
                <label>Date</label>
                <input type="date" class="form-control" id="transferDate" value="${new Date().toISOString().split('T')[0]}" />
            </div>
            <div class="form-group">
                <label>Description (Optional)</label>
                <input type="text" class="form-control" id="transferDescription" placeholder="Why this transfer?" />
            </div>
            <button type="submit" class="btn btn-primary btn-block">Complete Transfer</button>
        </form>
    `);
    
    // Prevent transfer to same account
    document.getElementById('transferFrom').addEventListener('change', () => {
        const from = document.getElementById('transferFrom').value;
        const to = document.getElementById('transferTo');
        if (to.value === from) {
            to.value = '';
        }
    });
    
    document.getElementById('transferForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        await handleAddTransfer();
    });
}

async function handleAddTransfer() {
    const fromAccountId = document.getElementById('transferFrom').value;
    const toAccountId = document.getElementById('transferTo').value;
    const amount = parseFloat(document.getElementById('transferAmount').value);
    const date = document.getElementById('transferDate').value;
    const description = document.getElementById('transferDescription').value;
    
    if (!amount || amount <= 0) {
        showToast('Please enter a valid amount', 'error');
        return;
    }
    
    if (fromAccountId === toAccountId) {
        showToast('Cannot transfer to the same account', 'error');
        return;
    }
    
    try {
        // Check balance
        const balance = await getAccountBalance(fromAccountId);
        if (balance < amount) {
            if (!confirm(`⚠️ Insufficient balance! Recorded balance: ${formatCurrency(balance)}. Continue anyway?`)) {
                return;
            }
        }
        
        await createTransferLedger(
            fromAccountId,
            toAccountId,
            amount,
            date,
            description || `Transfer from ${await getAccountName(fromAccountId)} to ${await getAccountName(toAccountId)}`
        );
        
        closeModal();
        showToast('Transfer completed successfully!', 'success');
        await loadTransfers();
    } catch (error) {
        showToast('Failed to complete transfer: ' + error.message, 'error');
    }
}