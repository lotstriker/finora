// ============================================
// FINORA — Transactions
// ============================================

let currentTxnFilters = {};

async function loadTransactions() {
    const container = document.getElementById('pageContainer');
    
    // Get all transactions
    const entries = await getLedgerEntries();
    
    // Get accounts for filter
    const db = getDB();
    const accounts = await db.readAll('accounts');
    const accountMap = {};
    accounts.forEach(a => accountMap[a.id] = a.name);
    
    // Get categories for filter
    const categories = await db.readAll('categories');
    const catMap = {};
    categories.forEach(c => catMap[c.id] = c.name);
    
    const html = `
        <div class="transactions-page">
            <!-- Filters -->
            <div class="filters-bar">
                <div class="filter-group">
                    <input type="text" id="txnSearch" class="form-control" placeholder="Search transactions..." />
                </div>
                <div class="filter-group">
                    <select id="txnTypeFilter" class="form-control">
                        <option value="">All Types</option>
                        <option value="income">Income</option>
                        <option value="expense">Expense</option>
                        <option value="transfer">Transfer</option>
                    </select>
                </div>
                <div class="filter-group">
                    <select id="txnAccountFilter" class="form-control">
                        <option value="">All Accounts</option>
                        ${accounts.map(a => `<option value="${a.id}">${a.name}</option>`).join('')}
                    </select>
                </div>
                <button class="btn btn-primary" onclick="openAddTransaction()">
                    <i class="fas fa-plus"></i> Add
                </button>
            </div>
            
            <!-- Summary -->
            <div class="txn-summary">
                <span>Total: <strong>${entries.length}</strong> transactions</span>
                <span>Income: <strong class="text-success">${formatCurrency(entries.filter(e => e.type === 'income').reduce((s, e) => s + e.amount, 0))}</strong></span>
                <span>Expense: <strong class="text-danger">${formatCurrency(entries.filter(e => e.type === 'expense').reduce((s, e) => s + e.amount, 0))}</strong></span>
            </div>
            
            <!-- Transaction List -->
            <div class="txn-list">
                ${entries.length > 0 ? entries.map(txn => `
                    <div class="txn-item" onclick="viewTransaction('${txn.id}')">
                        <div class="txn-item-left">
                            <div class="txn-icon ${txn.type}">
                                <i class="fas ${getTxnIcon(txn.type)}"></i>
                            </div>
                            <div class="txn-details">
                                <div class="txn-desc">${txn.description || txn.type}</div>
                                <div class="txn-meta">
                                    <span>${formatDate(txn.date)}</span>
                                    <span>·</span>
                                    <span>${accountMap[txn.accountId] || 'Unknown'}</span>
                                    ${txn.categoryId ? `<span>·</span><span>${catMap[txn.categoryId] || ''}</span>` : ''}
                                    ${txn.module ? `<span>·</span><span class="txn-module">${txn.module}</span>` : ''}
                                </div>
                            </div>
                        </div>
                        <div class="txn-item-right">
                            <span class="txn-amount ${txn.direction === 'in' ? 'text-success' : 'text-danger'}">
                                ${txn.direction === 'in' ? '+' : '-'} ${formatCurrency(txn.amount)}
                            </span>
                            ${txn.toAccountId ? `
                                <span class="txn-transfer-detail">
                                    <i class="fas fa-arrow-right"></i>
                                    ${accountMap[txn.toAccountId] || 'Unknown'}
                                </span>
                            ` : ''}
                        </div>
                    </div>
                `).join('') : `
                    <div class="empty-state">
                        <i class="fas fa-inbox"></i>
                        <p>No transactions yet</p>
                        <button class="btn btn-primary" onclick="openAddTransaction()">Add your first transaction</button>
                    </div>
                `}
            </div>
        </div>
    `;
    
    container.innerHTML = html;
    
    // Add styles
    const style = document.createElement('style');
    style.textContent = `
        .filters-bar {
            display: flex;
            gap: 12px;
            margin-bottom: 16px;
            flex-wrap: wrap;
            align-items: center;
        }
        .filter-group {
            flex: 1;
            min-width: 150px;
        }
        .filter-group .form-control {
            width: 100%;
        }
        .txn-summary {
            display: flex;
            gap: 24px;
            padding: 12px 16px;
            background: var(--bg-card);
            border-radius: var(--radius);
            border: 1px solid var(--border);
            margin-bottom: 16px;
            font-size: 0.9rem;
            flex-wrap: wrap;
        }
        .txn-summary strong {
            font-weight: 600;
        }
        .txn-list {
            display: flex;
            flex-direction: column;
            gap: 8px;
        }
        .txn-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 12px 16px;
            background: var(--bg-card);
            border-radius: var(--radius-sm);
            border: 1px solid var(--border);
            cursor: pointer;
            transition: all var(--transition);
        }
        .txn-item:hover {
            box-shadow: var(--shadow);
            transform: translateX(4px);
        }
        .txn-item-left {
            display: flex;
            align-items: center;
            gap: 14px;
            flex: 1;
        }
        .txn-icon {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            flex-shrink: 0;
        }
        .txn-icon.income { background: #22c55e; }
        .txn-icon.expense { background: #ef4444; }
        .txn-icon.transfer { background: #3b82f6; }
        .txn-icon.committee_payment { background: #8b5cf6; }
        .txn-icon.committee_payout { background: #8b5cf6; }
        .txn-icon.loan_emi { background: #f59e0b; }
        .txn-icon.savings_contribution { background: #06b6d4; }
        .txn-details {
            flex: 1;
        }
        .txn-desc {
            font-weight: 500;
        }
        .txn-meta {
            font-size: 0.75rem;
            color: var(--text-muted);
            display: flex;
            gap: 4px;
            flex-wrap: wrap;
        }
        .txn-module {
            background: var(--primary-light);
            color: var(--primary);
            padding: 0 6px;
            border-radius: 4px;
            font-size: 0.7rem;
        }
        .txn-item-right {
            text-align: right;
            flex-shrink: 0;
        }
        .txn-amount {
            font-weight: 600;
            font-size: 1rem;
        }
        .txn-transfer-detail {
            font-size: 0.75rem;
            color: var(--text-muted);
            display: block;
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
        .txn-item .btn {
            margin-left: auto;
        }
    `;
    document.getElementById('page-style').textContent = style.textContent;
    
    // Setup filters
    document.getElementById('txnSearch').addEventListener('input', debounce(applyTxnFilters, 300));
    document.getElementById('txnTypeFilter').addEventListener('change', applyTxnFilters);
    document.getElementById('txnAccountFilter').addEventListener('change', applyTxnFilters);
}

function getTxnIcon(type) {
    const icons = {
        'income': 'fa-arrow-down',
        'expense': 'fa-arrow-up',
        'transfer': 'fa-exchange-alt',
        'committee_payment': 'fa-handshake',
        'committee_payout': 'fa-hand-holding-usd',
        'loan_emi': 'fa-credit-card',
        'savings_contribution': 'fa-piggy-bank',
        'savings_withdrawal': 'fa-piggy-bank'
    };
    return icons[type] || 'fa-circle';
}

function applyTxnFilters() {
    const search = document.getElementById('txnSearch').value;
    const type = document.getElementById('txnTypeFilter').value;
    const account = document.getElementById('txnAccountFilter').value;
    
    const items = document.querySelectorAll('.txn-item');
    items.forEach(item => {
        let show = true;
        const desc = item.querySelector('.txn-desc')?.textContent?.toLowerCase() || '';
        const meta = item.querySelector('.txn-meta')?.textContent?.toLowerCase() || '';
        const amountText = item.querySelector('.txn-amount')?.textContent || '';
        
        // Search filter
        if (search) {
            const searchLower = search.toLowerCase();
            if (!desc.includes(searchLower) && !meta.includes(searchLower) && !amountText.includes(search)) {
                show = false;
            }
        }
        
        // Type filter
        if (type) {
            const txnType = item.querySelector('.txn-icon')?.className?.includes(type) || false;
            if (!txnType) show = false;
        }
        
        // Account filter - skip for now, complex to implement
        // We'll implement in future
        
        item.style.display = show ? 'flex' : 'none';
    });
}

async function viewTransaction(txnId) {
    const txn = await getLedgerEntry(txnId);
    if (!txn) {
        showToast('Transaction not found', 'error');
        return;
    }
    
    const db = getDB();
    const account = await db.read('accounts', txn.accountId);
    const toAccount = txn.toAccountId ? await db.read('accounts', txn.toAccountId) : null;
    const category = txn.categoryId ? await db.read('categories', txn.categoryId) : null;
    
    openModal('Transaction Details', `
        <div class="txn-detail">
            <div class="txn-detail-header">
                <span class="txn-detail-id">${txn.id}</span>
                <span class="txn-detail-status ${txn.status}">${txn.status}</span>
            </div>
            <div class="txn-detail-row">
                <span>Amount</span>
                <strong class="${txn.direction === 'in' ? 'text-success' : 'text-danger'}">
                    ${txn.direction === 'in' ? '+' : '-'} ${formatCurrency(txn.amount)}
                </strong>
            </div>
            <div class="txn-detail-row">
                <span>Type</span>
                <span>${txn.type}</span>
            </div>
            <div class="txn-detail-row">
                <span>Account</span>
                <span>${account ? account.name : 'Unknown'}</span>
            </div>
            ${toAccount ? `
                <div class="txn-detail-row">
                    <span>To Account</span>
                    <span>${toAccount.name}</span>
                </div>
            ` : ''}
            ${category ? `
                <div class="txn-detail-row">
                    <span>Category</span>
                    <span>${category.name}</span>
                </div>
            ` : ''}
            <div class="txn-detail-row">
                <span>Date</span>
                <span>${formatDateTime(txn.date)}</span>
            </div>
            <div class="txn-detail-row">
                <span>Description</span>
                <span>${txn.description || '—'}</span>
            </div>
            ${txn.module ? `
                <div class="txn-detail-row">
                    <span>Module</span>
                    <span>${txn.module}</span>
                </div>
            ` : ''}
            ${txn.moduleRef ? `
                <div class="txn-detail-row">
                    <span>Reference</span>
                    <span>${txn.moduleRef}</span>
                </div>
            ` : ''}
            <div class="txn-detail-actions">
                <button class="btn btn-danger" onclick="reverseTxn('${txn.id}')">
                    <i class="fas fa-undo"></i> Reverse
                </button>
                <button class="btn btn-secondary" onclick="closeModal()">Close</button>
            </div>
        </div>
    `);
    
    // Add styles
    const style = document.createElement('style');
    style.textContent = `
        .txn-detail-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 16px;
        }
        .txn-detail-id {
            font-size: 0.8rem;
            color: var(--text-muted);
            font-family: monospace;
        }
        .txn-detail-status {
            font-size: 0.75rem;
            padding: 2px 10px;
            border-radius: 12px;
            text-transform: uppercase;
        }
        .txn-detail-status.completed { background: #dcfce7; color: #22c55e; }
        .txn-detail-status.pending { background: #fef3c7; color: #f59e0b; }
        .txn-detail-status.failed { background: #fee2e2; color: #ef4444; }
        .txn-detail-status.reversed { background: #f3e8ff; color: #8b5cf6; }
        .txn-detail-row {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            border-bottom: 1px solid var(--border);
            font-size: 0.9rem;
        }
        .txn-detail-row:last-child {
            border-bottom: none;
        }
        .txn-detail-row span:first-child {
            color: var(--text-secondary);
        }
        .txn-detail-actions {
            display: flex;
            gap: 12px;
            margin-top: 16px;
            justify-content: flex-end;
        }
    `;
    const existingStyle = document.getElementById('txn-detail-style');
    if (existingStyle) existingStyle.remove();
    style.id = 'txn-detail-style';
    document.head.appendChild(style);
}

async function reverseTxn(txnId) {
    if (confirm('Are you sure you want to reverse this transaction? This will create a reversal entry.')) {
        try {
            await reverseTransaction(txnId);
            showToast('Transaction reversed successfully', 'success');
            closeModal();
            await loadTransactions();
        } catch (error) {
            showToast('Failed to reverse: ' + error.message, 'error');
        }
    }
}