// ============================================
// FINORA — Central Ledger
// ============================================

const LEDGER_TYPES = {
    INCOME: 'income',
    EXPENSE: 'expense',
    TRANSFER: 'transfer',
    COMMITTEE_PAYMENT: 'committee_payment',
    COMMITTEE_PAYOUT: 'committee_payout',
    LOAN_EMI: 'loan_emi',
    SAVINGS_CONTRIBUTION: 'savings_contribution',
    SAVINGS_WITHDRAWAL: 'savings_withdrawal'
};

const LEDGER_DIRECTIONS = {
    IN: 'in',
    OUT: 'out',
    TRANSFER: 'transfer'
};

const LEDGER_STATUS = {
    PENDING: 'pending',
    COMPLETED: 'completed',
    FAILED: 'failed',
    CANCELLED: 'cancelled',
    REVERSED: 'reversed'
};

// ----- Create Ledger Entry -----

async function createLedgerEntry(data) {
    const db = getDB();
    
    const entry = {
        id: generateTxnId(),
        date: data.date || new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        type: data.type,
        direction: data.direction,
        status: data.status || LEDGER_STATUS.COMPLETED,
        amount: data.amount,
        accountId: data.accountId,
        toAccountId: data.toAccountId || null,
        categoryId: data.categoryId || null,
        module: data.module || null,
        moduleRef: data.moduleRef || null,
        personId: data.personId || null,
        description: data.description || '',
        tags: data.tags || [],
        parentTransactionId: data.parentTransactionId || null
    };
    
    const id = await db.create('ledger', entry);
    
    // Update account balance
    await updateAccountBalance(entry);
    
    return { ...entry, id };
}

// ----- Update Account Balance -----

async function updateAccountBalance(entry) {
    const db = getDB();
    const account = await db.read('accounts', entry.accountId);
    if (!account) return;
    
    let balanceChange = 0;
    
    if (entry.direction === LEDGER_DIRECTIONS.IN) {
        balanceChange = entry.amount;
    } else if (entry.direction === LEDGER_DIRECTIONS.OUT) {
        balanceChange = -entry.amount;
    } else if (entry.direction === LEDGER_DIRECTIONS.TRANSFER) {
        // For transfer, fromAccount decreases, toAccount increases
        // This is handled separately
        return;
    }
    
    account.balance = (account.balance || 0) + balanceChange;
    account.updatedAt = new Date().toISOString();
    await db.update('accounts', account);
}

// ----- Handle Transfer (two ledger entries) -----

async function createTransferLedger(fromAccountId, toAccountId, amount, date, description, moduleRef = null) {
    const db = getDB();
    
    // Entry 1: Out from fromAccount
    const outEntry = {
        type: LEDGER_TYPES.TRANSFER,
        direction: LEDGER_DIRECTIONS.OUT,
        amount: amount,
        accountId: fromAccountId,
        toAccountId: toAccountId,
        date: date,
        description: description || `Transfer to ${toAccountId}`,
        module: 'transfer',
        moduleRef: moduleRef,
        status: LEDGER_STATUS.COMPLETED
    };
    
    // Entry 2: In to toAccount
    const inEntry = {
        type: LEDGER_TYPES.TRANSFER,
        direction: LEDGER_DIRECTIONS.IN,
        amount: amount,
        accountId: toAccountId,
        toAccountId: fromAccountId,
        date: date,
        description: description || `Transfer from ${fromAccountId}`,
        module: 'transfer',
        moduleRef: moduleRef,
        status: LEDGER_STATUS.COMPLETED
    };
    
    // Create both entries
    const outTxn = await createLedgerEntry(outEntry);
    const inTxn = await createLedgerEntry(inEntry);
    
    // Update both account balances
    const fromAccount = await db.read('accounts', fromAccountId);
    const toAccount = await db.read('accounts', toAccountId);
    
    if (fromAccount) {
        fromAccount.balance = (fromAccount.balance || 0) - amount;
        await db.update('accounts', fromAccount);
    }
    
    if (toAccount) {
        toAccount.balance = (toAccount.balance || 0) + amount;
        await db.update('accounts', toAccount);
    }
    
    return { outTxn, inTxn };
}

// ----- Get Ledger Entries -----

async function getLedgerEntries(filters = {}) {
    const db = getDB();
    let entries = await db.readAll('ledger');
    
    // Apply filters
    if (filters.accountId) {
        entries = entries.filter(e => 
            e.accountId === filters.accountId || e.toAccountId === filters.accountId
        );
    }
    
    if (filters.type) {
        entries = entries.filter(e => e.type === filters.type);
    }
    
    if (filters.module) {
        entries = entries.filter(e => e.module === filters.module);
    }
    
    if (filters.moduleRef) {
        entries = entries.filter(e => e.moduleRef === filters.moduleRef);
    }
    
    if (filters.personId) {
        entries = entries.filter(e => e.personId === filters.personId);
    }
    
    if (filters.categoryId) {
        entries = entries.filter(e => e.categoryId === filters.categoryId);
    }
    
    if (filters.status) {
        entries = entries.filter(e => e.status === filters.status);
    }
    
    if (filters.dateFrom) {
        entries = entries.filter(e => e.date >= filters.dateFrom);
    }
    
    if (filters.dateTo) {
        entries = entries.filter(e => e.date <= filters.dateTo);
    }
    
    if (filters.search) {
        const search = filters.search.toLowerCase();
        entries = entries.filter(e => 
            e.description.toLowerCase().includes(search) ||
            e.id.toLowerCase().includes(search) ||
            (e.tags && e.tags.some(t => t.toLowerCase().includes(search)))
        );
    }
    
    // Sort by date descending
    entries.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    return entries;
}

// ----- Get Ledger Entry by ID -----

async function getLedgerEntry(id) {
    const db = getDB();
    return await db.read('ledger', id);
}

// ----- Get Account Balance -----

async function getAccountBalance(accountId) {
    const db = getDB();
    const account = await db.read('accounts', accountId);
    return account ? account.balance || 0 : 0;
}

// ----- Get Total Balance (all accounts) -----

async function getTotalBalance() {
    const db = getDB();
    const accounts = await db.readAll('accounts');
    return accounts.reduce((sum, acc) => sum + (acc.balance || 0), 0);
}

// ----- Get Income/Expense Summary for Period -----

async function getPeriodSummary(dateFrom, dateTo) {
    const entries = await getLedgerEntries({ dateFrom, dateTo });
    
    let income = 0;
    let expense = 0;
    let transfers = 0;
    
    for (const e of entries) {
        if (e.type === LEDGER_TYPES.INCOME) {
            income += e.amount;
        } else if (e.type === LEDGER_TYPES.EXPENSE) {
            expense += e.amount;
        } else if (e.type === LEDGER_TYPES.TRANSFER) {
            transfers += e.amount;
        }
    }
    
    return {
        income,
        expense,
        transfers,
        net: income - expense,
        count: entries.length
    };
}

// ----- Get Category Breakdown -----

async function getCategoryBreakdown(type, dateFrom, dateTo) {
    const entries = await getLedgerEntries({ 
        type, 
        dateFrom, 
        dateTo 
    });
    
    const breakdown = {};
    for (const e of entries) {
        const catId = e.categoryId || 'uncategorized';
        if (!breakdown[catId]) {
            breakdown[catId] = { amount: 0, count: 0 };
        }
        breakdown[catId].amount += e.amount;
        breakdown[catId].count += 1;
    }
    
    // Get category names
    const db = getDB();
    const categories = await db.readAll('categories');
    const catMap = {};
    categories.forEach(c => catMap[c.id] = c.name);
    
    const result = [];
    for (const [id, data] of Object.entries(breakdown)) {
        result.push({
            id,
            name: catMap[id] || 'Uncategorized',
            amount: data.amount,
            count: data.count
        });
    }
    
    result.sort((a, b) => b.amount - a.amount);
    return result;
}

// ----- Get Top Transactions -----

async function getTopTransactions(type, limit = 10) {
    const entries = await getLedgerEntries({ type });
    entries.sort((a, b) => b.amount - a.amount);
    return entries.slice(0, limit);
}

// ----- Reverse Transaction (correction) -----

async function reverseTransaction(txnId, reason = 'Correction') {
    const db = getDB();
    const original = await db.read('ledger', txnId);
    if (!original) {
        throw new Error('Transaction not found');
    }
    
    // Mark original as reversed
    original.status = LEDGER_STATUS.REVERSED;
    original.updatedAt = new Date().toISOString();
    await db.update('ledger', original);
    
    // Create reversal entry
    const reversal = {
        type: original.type,
        direction: original.direction === LEDGER_DIRECTIONS.IN ? LEDGER_DIRECTIONS.OUT : LEDGER_DIRECTIONS.IN,
        amount: original.amount,
        accountId: original.accountId,
        toAccountId: original.toAccountId,
        date: new Date().toISOString(),
        description: `Reversal: ${original.description} (${reason})`,
        module: original.module,
        moduleRef: original.moduleRef,
        personId: original.personId,
        categoryId: original.categoryId,
        parentTransactionId: original.id,
        status: LEDGER_STATUS.COMPLETED
    };
    
    const reversalEntry = await createLedgerEntry(reversal);
    return reversalEntry;
}

// ----- Get Monthly Summary -----

async function getMonthlySummary() {
    const entries = await getLedgerEntries();
    const summary = {};
    
    for (const e of entries) {
        const month = getMonthYear(e.date);
        if (!summary[month]) {
            summary[month] = { income: 0, expense: 0, count: 0 };
        }
        if (e.type === LEDGER_TYPES.INCOME) {
            summary[month].income += e.amount;
        } else if (e.type === LEDGER_TYPES.EXPENSE) {
            summary[month].expense += e.amount;
        }
        summary[month].count += 1;
    }
    
    return summary;
}