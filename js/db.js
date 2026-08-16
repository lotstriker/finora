// ============================================
// FINORA — Database Schema & Initialization
// ============================================

const DB_NAME = 'FinoraDB';
const DB_VERSION = 1;

// ----- Object Store Definitions -----

const STORES = [
    {
        name: 'ledger',
        keyPath: 'id',
        indexes: [
            { name: 'idx_date', keyPath: 'date' },
            { name: 'idx_type', keyPath: 'type' },
            { name: 'idx_account', keyPath: 'accountId' },
            { name: 'idx_toAccount', keyPath: 'toAccountId' },
            { name: 'idx_module', keyPath: 'module' },
            { name: 'idx_moduleRef', keyPath: 'moduleRef' },
            { name: 'idx_person', keyPath: 'personId' },
            { name: 'idx_category', keyPath: 'categoryId' },
            { name: 'idx_status', keyPath: 'status' },
            { name: 'idx_parent', keyPath: 'parentTransactionId' }
        ]
    },
    {
        name: 'accounts',
        keyPath: 'id',
        indexes: [
            { name: 'idx_name', keyPath: 'name' },
            { name: 'idx_type', keyPath: 'type' }
        ]
    },
    {
        name: 'people',
        keyPath: 'id',
        indexes: [
            { name: 'idx_name', keyPath: 'name' }
        ]
    },
    {
        name: 'loans',
        keyPath: 'id',
        indexes: [
            { name: 'idx_name', keyPath: 'name' },
            { name: 'idx_status', keyPath: 'status' },
            { name: 'idx_account', keyPath: 'accountId' }
        ]
    },
    {
        name: 'loan_installments',
        keyPath: 'id',
        indexes: [
            { name: 'idx_loanId', keyPath: 'loanId' },
            { name: 'idx_installmentNo', keyPath: 'installmentNo' },
            { name: 'idx_status', keyPath: 'status' },
            { name: 'idx_dueDate', keyPath: 'dueDate' },
            { name: 'idx_txnId', keyPath: 'transactionId' }
        ]
    },
    {
        name: 'committees',
        keyPath: 'id',
        indexes: [
            { name: 'idx_name', keyPath: 'name' },
            { name: 'idx_status', keyPath: 'status' },
            { name: 'idx_startDate', keyPath: 'startDate' }
        ]
    },
    {
        name: 'committee_cycles',
        keyPath: 'id',
        indexes: [
            { name: 'idx_committeeId', keyPath: 'committeeId' },
            { name: 'idx_cycleNo', keyPath: 'cycleNo' },
            { name: 'idx_month', keyPath: 'month' },
            { name: 'idx_status', keyPath: 'status' },
            { name: 'idx_txnId', keyPath: 'transactionId' },
            { name: 'idx_payoutTxnId', keyPath: 'payoutTransactionId' }
        ]
    },
    {
        name: 'committee_memberships',
        keyPath: 'id',
        indexes: [
            { name: 'idx_committeeId', keyPath: 'committeeId' },
            { name: 'idx_userId', keyPath: 'userId' }
        ]
    },
    {
        name: 'savings_goals',
        keyPath: 'id',
        indexes: [
            { name: 'idx_name', keyPath: 'name' },
            { name: 'idx_status', keyPath: 'status' }
        ]
    },
    {
        name: 'savings_contributions',
        keyPath: 'id',
        indexes: [
            { name: 'idx_goalId', keyPath: 'goalId' },
            { name: 'idx_txnId', keyPath: 'transactionId' }
        ]
    },
    {
        name: 'recurring_rules',
        keyPath: 'id',
        indexes: [
            { name: 'idx_name', keyPath: 'name' },
            { name: 'idx_type', keyPath: 'type' },
            { name: 'idx_accountId', keyPath: 'accountId' },
            { name: 'idx_status', keyPath: 'status' },
            { name: 'idx_nextDue', keyPath: 'nextDue' }
        ]
    },
    {
        name: 'categories',
        keyPath: 'id',
        indexes: [
            { name: 'idx_name', keyPath: 'name' },
            { name: 'idx_type', keyPath: 'type' } // 'expense' or 'income'
        ]
    },
    {
        name: 'settings',
        keyPath: 'key'
    }
];

// ----- Database Instance -----

let dbHelper = null;

async function initDB() {
    dbHelper = new IndexedDBHelper(DB_NAME, DB_VERSION, STORES);
    await dbHelper.open();
    await initDefaultCategories();
    await initDefaultSettings();
    return dbHelper;
}

function getDB() {
    if (!dbHelper) {
        throw new Error('Database not initialized. Call initDB() first.');
    }
    return dbHelper;
}

// ----- Default Categories -----

async function initDefaultCategories() {
    const db = getDB();
    const existing = await db.readAll('categories');
    if (existing.length > 0) return;

    const defaultCategories = [
        // Expense Categories
        { id: 'cat-exp-food', name: 'Food', type: 'expense' },
        { id: 'cat-exp-groceries', name: 'Groceries', type: 'expense' },
        { id: 'cat-exp-transport', name: 'Transport', type: 'expense' },
        { id: 'cat-exp-shopping', name: 'Shopping', type: 'expense' },
        { id: 'cat-exp-bills', name: 'Bills', type: 'expense' },
        { id: 'cat-exp-entertainment', name: 'Entertainment', type: 'expense' },
        { id: 'cat-exp-health', name: 'Health', type: 'expense' },
        { id: 'cat-exp-education', name: 'Education', type: 'expense' },
        { id: 'cat-exp-travel', name: 'Travel', type: 'expense' },
        { id: 'cat-exp-rent', name: 'Rent', type: 'expense' },
        { id: 'cat-exp-utilities', name: 'Utilities', type: 'expense' },
        { id: 'cat-exp-subscriptions', name: 'Subscriptions', type: 'expense' },
        { id: 'cat-exp-other', name: 'Other', type: 'expense' },
        // Income Categories
        { id: 'cat-inc-salary', name: 'Salary', type: 'income' },
        { id: 'cat-inc-freelance', name: 'Freelance', type: 'income' },
        { id: 'cat-inc-business', name: 'Business', type: 'income' },
        { id: 'cat-inc-investment', name: 'Investment', type: 'income' },
        { id: 'cat-inc-rent', name: 'Rent Income', type: 'income' },
        { id: 'cat-inc-gift', name: 'Gift', type: 'income' },
        { id: 'cat-inc-refund', name: 'Refund', type: 'income' },
        { id: 'cat-inc-other', name: 'Other', type: 'income' }
    ];

    await db.bulkCreate('categories', defaultCategories);
}

// ----- Default Settings -----

async function initDefaultSettings() {
    const db = getDB();
    const settings = await db.readAll('settings');
    if (settings.length > 0) return;

    const defaults = [
        { key: 'theme', value: 'light' },
        { key: 'currency', value: '₹' },
        { key: 'defaultAccount', value: null },
        { key: 'appName', value: 'FINORA' }
    ];

    await db.bulkCreate('settings', defaults);
}

// ----- Export Database -----

async function exportDatabase() {
    const db = getDB();
    const data = await db.exportAll();
    return data;
}

// ----- Import Database -----

async function importDatabase(data) {
    const db = getDB();
    await db.importAll(data);
}

// ----- Clear All Data (with caution) -----

async function clearAllData() {
    const db = getDB();
    const stores = STORES.map(s => s.name);
    for (const store of stores) {
        if (store !== 'settings' && store !== 'categories') {
            await db.clearStore(store);
        }
    }
    return true;
}