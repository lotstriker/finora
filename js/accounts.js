// ============================================
// FINORA — Accounts
// ============================================

const ACCOUNT_TYPES = [
    'Bank Account',
    'Cash',
    'Savings Account',
    'Credit Card',
    'Digital Wallet',
    'Other'
];

async function loadAccounts() {
    const container = document.getElementById('pageContainer');
    const db = getDB();
    const accounts = await db.readAll('accounts');
    
    // Calculate total balance
    const totalBalance = accounts.reduce((sum, a) => sum + (a.balance || 0), 0);
    
    const html = `
        <div class="accounts-page">
            <div class="page-header">
                <h2>Accounts</h2>
                <button class="btn btn-primary" onclick="openAddAccountModal()">
                    <i class="fas fa-plus"></i> Add Account
                </button>
            </div>
            
            <div class="total-balance-card card">
                <span class="text-muted">Total Balance</span>
                <h1>${formatCurrency(totalBalance)}</h1>
            </div>
            
            <div class="accounts-grid">
                ${accounts.length > 0 ? accounts.map(acc => `
                    <div class="account-card card">
                        <div class="account-icon">
                            <i class="fas ${getAccountIcon(acc.type)}"></i>
                        </div>
                        <div class="account-info">
                            <h3>${acc.name}</h3>
                            <span class="account-type">${acc.type}</span>
                        </div>
                        <div class="account-balance">
                            <span class="balance ${acc.balance >= 0 ? 'text-success' : 'text-danger'}">
                                ${formatCurrency(acc.balance || 0)}
                            </span>
                        </div>
                        <div class="account-actions">
                            <button class="btn btn-sm btn-secondary" onclick="viewAccountDetails('${acc.id}')">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button class="btn btn-sm btn-danger" onclick="deleteAccount('${acc.id}')">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                `).join('') : `
                    <div class="empty-state">
                        <i class="fas fa-wallet"></i>
                        <p>No accounts yet</p>
                        <button class="btn btn-primary" onclick="openAddAccountModal()">Add your first account</button>
                    </div>
                `}
            </div>
        </div>
    `;
    
    container.innerHTML = html;
    
    // Add styles
    const style = document.createElement('style');
    style.textContent = `
        .page-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
        }
        .page-header h2 {
            font-size: 1.5rem;
            font-weight: 700;
        }
        .total-balance-card {
            margin-bottom: 24px;
            text-align: center;
            padding: 24px;
        }
        .total-balance-card h1 {
            font-size: 2.5rem;
            font-weight: 700;
            margin-top: 4px;
        }
        .accounts-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
            gap: 16px;
        }
        .account-card {
            display: flex;
            align-items: center;
            gap: 16px;
            padding: 16px 20px;
        }
        .account-icon {
            width: 44px;
            height: 44px;
            border-radius: 12px;
            background: var(--primary-light);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1.2rem;
            color: var(--primary);
            flex-shrink: 0;
        }
        .account-info {
            flex: 1;
        }
        .account-info h3 {
            font-size: 1rem;
            font-weight: 600;
        }
        .account-type {
            font-size: 0.75rem;
            color: var(--text-muted);
        }
        .account-balance {
            text-align: right;
        }
        .balance {
            font-weight: 700;
            font-size: 1.1rem;
        }
        .account-actions {
            display: flex;
            gap: 6px;
        }
        .empty-state {
            grid-column: 1 / -1;
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

function getAccountIcon(type) {
    const icons = {
        'Bank Account': 'fa-university',
        'Cash': 'fa-money-bill-wave',
        'Savings Account': 'fa-piggy-bank',
        'Credit Card': 'fa-credit-card',
        'Digital Wallet': 'fa-mobile-alt',
        'Other': 'fa-circle'
    };
    return icons[type] || 'fa-circle';
}

async function openAddAccountModal() {
    openModal('Add Account', `
        <form id="accountForm">
            <div class="form-group">
                <label>Account Name</label>
                <input type="text" class="form-control" id="accName" placeholder="HDFC, SBI, Cash, etc." required />
            </div>
            <div class="form-group">
                <label>Account Type</label>
                <select class="form-control" id="accType">
                    ${ACCOUNT_TYPES.map(t => `<option value="${t}">${t}</option>`).join('')}
                </select>
            </div>
            <div class="form-group">
                <label>Initial Balance</label>
                <input type="number" class="form-control" id="accBalance" placeholder="0" value="0" />
            </div>
            <button type="submit" class="btn btn-primary btn-block">Create Account</button>
        </form>
    `);
    
    document.getElementById('accountForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        await handleAddAccount();
    });
}

async function handleAddAccount() {
    const name = document.getElementById('accName').value.trim();
    const type = document.getElementById('accType').value;
    const balance = parseFloat(document.getElementById('accBalance').value) || 0;
    
    if (!name) {
        showToast('Please enter an account name', 'error');
        return;
    }
    
    try {
        const db = getDB();
        const account = {
            id: generateAccountId(),
            name: name,
            type: type,
            balance: balance,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        await db.create('accounts', account);
        
        // If initial balance > 0, create a ledger entry for opening balance
        if (balance > 0) {
            await createLedgerEntry({
                type: 'income',
                direction: 'in',
                amount: balance,
                accountId: account.id,
                date: new Date().toISOString(),
                description: 'Opening Balance',
                categoryId: 'cat-inc-other',
                status: 'completed'
            });
        }
        
        closeModal();
        showToast('Account created successfully!', 'success');
        await loadAccounts();
    } catch (error) {
        showToast('Failed to create account: ' + error.message, 'error');
    }
}

async function viewAccountDetails(accountId) {
    const db = getDB();
    const account = await db.read('accounts', accountId);
    if (!account) {
        showToast('Account not found', 'error');
        return;
    }
    
    const transactions = await getLedgerEntries({ accountId });
    
    openModal(`Account: ${account.name}`, `
        <div class="account-detail">
            <div class="account-detail-balance">
                <span>Balance</span>
                <h2>${formatCurrency(account.balance || 0)}</h2>
            </div>
            <div class="account-detail-info">
                <div><span>Type</span> ${account.type}</div>
                <div><span>Created</span> ${formatDate(account.createdAt)}</div>
                <div><span>Transactions</span> ${transactions.length}</div>
            </div>
            <hr />
            <h4>Recent Transactions</h4>
            <div class="account-txns">
                ${transactions.slice(0, 10).map(t => `
                    <div class="txn-item-small">
                        <span>${t.description || t.type}</span>
                        <span class="${t.direction === 'in' ? 'text-success' : 'text-danger'}">
                            ${t.direction === 'in' ? '+' : '-'} ${formatCurrency(t.amount)}
                        </span>
                    </div>
                `).join('')}
                ${transactions.length === 0 ? '<span class="text-muted">No transactions</span>' : ''}
            </div>
        </div>
    `);
}

async function deleteAccount(accountId) {
    confirmAction('Delete this account? All transactions will remain but account will be removed.', async () => {
        try {
            const db = getDB();
            await db.delete('accounts', accountId);
            showToast('Account deleted', 'warning');
            await loadAccounts();
        } catch (error) {
            showToast('Failed to delete: ' + error.message, 'error');
        }
    });
}