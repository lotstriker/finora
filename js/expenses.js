// ============================================
// FINORA — Expenses (COMPLETE)
// ============================================

async function loadExpenses() {
    const container = document.getElementById('pageContainer');
    const entries = await getLedgerEntries({ type: 'expense' });
    
    const totalExpense = entries.reduce((s, e) => s + e.amount, 0);
    
    const html = `
        <div class="expenses-page">
            <div class="page-header">
                <h2>Expenses</h2>
                <button class="btn btn-primary" onclick="openAddExpenseModal()">
                    <i class="fas fa-plus"></i> Add Expense
                </button>
            </div>
            
            <div class="summary-card card">
                <span class="text-muted">Total Expenses</span>
                <h1>${formatCurrency(totalExpense)}</h1>
                <span class="text-muted">${entries.length} transactions</span>
            </div>
            
            <div class="expense-list">
                ${entries.length > 0 ? entries.map(e => `
                    <div class="expense-item">
                        <div class="expense-item-left">
                            <div class="expense-icon">
                                <i class="fas fa-arrow-up"></i>
                            </div>
                            <div class="expense-details">
                                <div class="expense-desc">${e.description || e.type}</div>
                                <div class="expense-meta">
                                    <span>${formatDate(e.date)}</span>
                                    <span>·</span>
                                    <span>${getAccountNameSync(e.accountId)}</span>
                                    ${e.categoryId ? `<span>·</span><span>${getCategoryNameSync(e.categoryId)}</span>` : ''}
                                </div>
                            </div>
                        </div>
                        <div class="expense-amount text-danger">
                            - ${formatCurrency(e.amount)}
                        </div>
                    </div>
                `).join('') : `
                    <div class="empty-state">
                        <i class="fas fa-arrow-up"></i>
                        <p>No expenses recorded yet</p>
                        <button class="btn btn-primary" onclick="openAddExpenseModal()">Add Expense</button>
                    </div>
                `}
            </div>
        </div>
    `;
    
    container.innerHTML = html;
}

// ----- Helper Functions -----
async function getAccountNameSync(accountId) {
    try {
        const db = getDB();
        const acc = await db.read('accounts', accountId);
        return acc ? acc.name : 'Unknown';
    } catch (e) {
        return 'Unknown';
    }
}

async function getCategoryNameSync(categoryId) {
    try {
        const db = getDB();
        const cat = await db.read('categories', categoryId);
        return cat ? cat.name : 'Uncategorized';
    } catch (e) {
        return 'Uncategorized';
    }
}

async function openAddExpenseModal() {
    const db = getDB();
    const accounts = await db.readAll('accounts');
    const categories = await db.readAll('categories');
    const expenseCats = categories.filter(c => c.type === 'expense');
    
    if (accounts.length === 0) {
        showToast('Please create an account first!', 'warning');
        return;
    }
    
    openModal('Add Expense', `
        <form id="expenseForm">
            <div class="form-group">
                <label>Amount</label>
                <input type="number" class="form-control" id="expAmount" placeholder="₹ 0" required />
            </div>
            <div class="form-group">
                <label>Account</label>
                <select class="form-control" id="expAccount">
                    ${accounts.map(a => `<option value="${a.id}">${a.name} (${formatCurrency(a.balance || 0)})</option>`).join('')}
                </select>
            </div>
            <div class="form-group">
                <label>Category</label>
                <select class="form-control" id="expCategory">
                    ${expenseCats.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
                </select>
            </div>
            <div class="form-group">
                <label>Date</label>
                <input type="date" class="form-control" id="expDate" value="${new Date().toISOString().split('T')[0]}" />
            </div>
            <div class="form-group">
                <label>Description</label>
                <input type="text" class="form-control" id="expDescription" placeholder="What did you buy?" />
            </div>
            <button type="submit" class="btn btn-primary btn-block">Add Expense</button>
        </form>
    `);
    
    document.getElementById('expenseForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        await handleAddExpense();
    });
}

async function handleAddExpense() {
    const amount = parseFloat(document.getElementById('expAmount').value);
    const accountId = document.getElementById('expAccount').value;
    const categoryId = document.getElementById('expCategory').value;
    const date = document.getElementById('expDate').value;
    const description = document.getElementById('expDescription').value;
    
    if (!amount || amount <= 0) {
        showToast('Please enter a valid amount', 'error');
        return;
    }
    
    try {
        // Check balance warning
        const balance = await getAccountBalance(accountId);
        if (balance < amount) {
            if (!confirm(`⚠️ Insufficient balance! Recorded balance: ${formatCurrency(balance)}. Continue anyway?`)) {
                return;
            }
        }
        
        await createLedgerEntry({
            type: 'expense',
            direction: 'out',
            amount: amount,
            accountId: accountId,
            categoryId: categoryId,
            date: date,
            description: description || 'Expense',
            status: 'completed'
        });
        
        closeModal();
        showToast('Expense added successfully!', 'success');
        await loadExpenses();
    } catch (error) {
        showToast('Failed to add expense: ' + error.message, 'error');
    }
}

// Make functions globally accessible
window.loadExpenses = loadExpenses;
window.openAddExpenseModal = openAddExpenseModal;