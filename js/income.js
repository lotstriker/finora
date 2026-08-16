// ============================================
// FINORA — Income
// ============================================

async function loadIncome() {
    const container = document.getElementById('pageContainer');
    const db = getDB();
    const accounts = await db.readAll('accounts');
    const categories = await db.readAll('categories');
    const incomeCats = categories.filter(c => c.type === 'income');
    
    // Get income transactions
    const entries = await getLedgerEntries({ type: 'income' });
    
    const totalIncome = entries.reduce((s, e) => s + e.amount, 0);
    
    const html = `
        <div class="income-page">
            <div class="page-header">
                <h2>Income</h2>
                <button class="btn btn-primary" onclick="openAddIncomeModal()">
                    <i class="fas fa-plus"></i> Add Income
                </button>
            </div>
            
            <div class="summary-card card">
                <span class="text-muted">Total Income</span>
                <h1>${formatCurrency(totalIncome)}</h1>
                <span class="text-muted">${entries.length} transactions</span>
            </div>
            
            <div class="income-list">
                ${entries.length > 0 ? entries.map(e => `
                    <div class="income-item">
                        <div class="income-item-left">
                            <div class="income-icon">
                                <i class="fas fa-arrow-down"></i>
                            </div>
                            <div class="income-details">
                                <div class="income-desc">${e.description || e.type}</div>
                                <div class="income-meta">
                                    <span>${formatDate(e.date)}</span>
                                    <span>·</span>
                                    <span>${getAccountName(e.accountId)}</span>
                                    ${e.categoryId ? `<span>·</span><span>${getCategoryName(e.categoryId)}</span>` : ''}
                                </div>
                            </div>
                        </div>
                        <div class="income-amount text-success">
                            + ${formatCurrency(e.amount)}
                        </div>
                    </div>
                `).join('') : `
                    <div class="empty-state">
                        <i class="fas fa-arrow-down"></i>
                        <p>No income recorded yet</p>
                        <button class="btn btn-primary" onclick="openAddIncomeModal()">Add Income</button>
                    </div>
                `}
            </div>
        </div>
    `;
    
    container.innerHTML = html;
    
    // Helper functions for display
    window._incomeHelpers = { accounts, categories: incomeCats };
}

// Helper functions for income page
async function getAccountName(accountId) {
    const db = getDB();
    const acc = await db.read('accounts', accountId);
    return acc ? acc.name : 'Unknown';
}

async function getCategoryName(categoryId) {
    const db = getDB();
    const cat = await db.read('categories', categoryId);
    return cat ? cat.name : 'Uncategorized';
}

async function openAddIncomeModal() {
    const db = getDB();
    const accounts = await db.readAll('accounts');
    const categories = await db.readAll('categories');
    const incomeCats = categories.filter(c => c.type === 'income');
    
    openModal('Add Income', `
        <form id="incomeForm">
            <div class="form-group">
                <label>Amount</label>
                <input type="number" class="form-control" id="incAmount" placeholder="₹ 0" required />
            </div>
            <div class="form-group">
                <label>Account</label>
                <select class="form-control" id="incAccount">
                    ${accounts.map(a => `<option value="${a.id}">${a.name} (${formatCurrency(a.balance || 0)})</option>`).join('')}
                </select>
            </div>
            <div class="form-group">
                <label>Source / Category</label>
                <select class="form-control" id="incCategory">
                    ${incomeCats.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
                </select>
            </div>
            <div class="form-group">
                <label>Date</label>
                <input type="date" class="form-control" id="incDate" value="${new Date().toISOString().split('T')[0]}" />
            </div>
            <div class="form-group">
                <label>Description</label>
                <input type="text" class="form-control" id="incDescription" placeholder="Salary, Freelance, etc." />
            </div>
            <button type="submit" class="btn btn-primary btn-block">Add Income</button>
        </form>
    `);
    
    document.getElementById('incomeForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        await handleAddIncome();
    });
}

async function handleAddIncome() {
    const amount = parseFloat(document.getElementById('incAmount').value);
    const accountId = document.getElementById('incAccount').value;
    const categoryId = document.getElementById('incCategory').value;
    const date = document.getElementById('incDate').value;
    const description = document.getElementById('incDescription').value;
    
    if (!amount || amount <= 0) {
        showToast('Please enter a valid amount', 'error');
        return;
    }
    
    try {
        await createLedgerEntry({
            type: 'income',
            direction: 'in',
            amount: amount,
            accountId: accountId,
            categoryId: categoryId,
            date: date,
            description: description || 'Income',
            status: 'completed'
        });
        
        closeModal();
        showToast('Income added successfully!', 'success');
        await loadIncome();
    } catch (error) {
        showToast('Failed to add income: ' + error.message, 'error');
    }
}