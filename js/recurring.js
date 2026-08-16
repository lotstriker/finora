// ============================================
// FINORA — Recurring Payments
// ============================================

async function loadRecurring() {
    const container = document.getElementById('pageContainer');
    const db = getDB();
    const rules = await db.readAll('recurring_rules');
    const accounts = await db.readAll('accounts');
    const accountMap = {};
    accounts.forEach(a => accountMap[a.id] = a.name);

    const html = `
        <div class="recurring-page">
            <div class="page-header">
                <h2>Recurring Payments</h2>
                <button class="btn btn-primary" onclick="openAddRecurringModal()">
                    <i class="fas fa-plus"></i> Add Rule
                </button>
            </div>

            ${rules.length > 0 ? rules.map(rule => `
                <div class="recurring-card card">
                    <div class="recurring-header">
                        <div>
                            <h3>${rule.name}</h3>
                            <span class="recurring-type">${rule.type}</span>
                            <span class="recurring-status ${rule.status}">${rule.status}</span>
                        </div>
                        <div class="recurring-amount">
                            <strong>${formatCurrency(rule.amount)}</strong>
                            <span class="text-muted">${rule.frequency}</span>
                        </div>
                    </div>
                    <div class="recurring-details">
                        <div><span>Account</span> ${accountMap[rule.accountId] || 'Unknown'}</div>
                        <div><span>Next Due</span> ${rule.nextDue ? formatDate(rule.nextDue) : '—'}</div>
                        ${rule.validityDays ? `<div><span>Validity</span> ${rule.validityDays} days</div>` : ''}
                        ${rule.day ? `<div><span>Day</span> ${rule.day}</div>` : ''}
                    </div>
                    <div class="recurring-actions">
                        <button class="btn btn-sm btn-primary" onclick="recordRecurringPayment('${rule.id}')">
                            <i class="fas fa-check"></i> Record Payment
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="deleteRecurringRule('${rule.id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `).join('') : `
                <div class="empty-state">
                    <i class="fas fa-sync-alt"></i>
                    <p>No recurring rules yet</p>
                    <button class="btn btn-primary" onclick="openAddRecurringModal()">Add a recurring rule</button>
                </div>
            `}
        </div>
    `;

    container.innerHTML = html;

    const style = document.createElement('style');
    style.textContent = `
        .recurring-card {
            padding: 20px 24px;
            margin-bottom: 16px;
        }
        .recurring-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            flex-wrap: wrap;
            gap: 12px;
            margin-bottom: 8px;
        }
        .recurring-header h3 {
            font-size: 1.05rem;
            font-weight: 600;
        }
        .recurring-type {
            font-size: 0.8rem;
            color: var(--text-muted);
            margin-right: 8px;
        }
        .recurring-status {
            font-size: 0.7rem;
            padding: 2px 10px;
            border-radius: 12px;
            text-transform: uppercase;
            font-weight: 600;
        }
        .recurring-status.active { background: #dcfce7; color: #22c55e; }
        .recurring-status.paused { background: #fef3c7; color: #f59e0b; }
        .recurring-status.completed { background: #dbeafe; color: #3b82f6; }
        .recurring-amount {
            text-align: right;
        }
        .recurring-amount strong {
            font-size: 1.2rem;
        }
        .recurring-details {
            display: flex;
            gap: 24px;
            flex-wrap: wrap;
            font-size: 0.85rem;
            color: var(--text-muted);
            margin: 8px 0;
        }
        .recurring-details span {
            color: var(--text-secondary);
        }
        .recurring-actions {
            margin-top: 12px;
            display: flex;
            gap: 8px;
            flex-wrap: wrap;
        }
    `;
    document.getElementById('page-style').textContent = style.textContent;
}

async function openAddRecurringModal() {
    const db = getDB();
    const accounts = await db.readAll('accounts');

    openModal('Add Recurring Rule', `
        <form id="recurringForm">
            <div class="form-group">
                <label>Name</label>
                <input type="text" class="form-control" id="recurringName" placeholder="Netflix, Mobile Recharge, etc." required />
            </div>
            <div class="form-group">
                <label>Amount</label>
                <input type="number" class="form-control" id="recurringAmount" placeholder="₹ 0" required />
            </div>
            <div class="form-group">
                <label>Account</label>
                <select class="form-control" id="recurringAccount">
                    ${accounts.map(a => `<option value="${a.id}">${a.name}</option>`).join('')}
                </select>
            </div>
            <div class="form-group">
                <label>Type</label>
                <select class="form-control" id="recurringType" onchange="toggleRecurringFields()">
                    <option value="fixed">Fixed Schedule (e.g., Monthly Subscription)</option>
                    <option value="validity">Validity Based (e.g., 28-day Recharge)</option>
                </select>
            </div>
            <div id="fixedFields">
                <div class="form-group">
                    <label>Frequency</label>
                    <select class="form-control" id="recurringFrequency">
                        <option value="monthly">Monthly</option>
                        <option value="weekly">Weekly</option>
                        <option value="quarterly">Quarterly</option>
                        <option value="yearly">Yearly</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Day of Month</label>
                    <input type="number" class="form-control" id="recurringDay" placeholder="e.g., 5" min="1" max="31" />
                </div>
            </div>
            <div id="validityFields" style="display:none;">
                <div class="form-group">
                    <label>Validity Period (Days)</label>
                    <input type="number" class="form-control" id="recurringValidity" placeholder="28, 84, etc." required />
                </div>
            </div>
            <div class="form-group">
                <label>Start Date</label>
                <input type="date" class="form-control" id="recurringStartDate" value="${new Date().toISOString().split('T')[0]}" />
            </div>
            <button type="submit" class="btn btn-primary btn-block">Create Rule</button>
        </form>
    `);

    toggleRecurringFields();

    document.getElementById('recurringForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        await handleAddRecurringRule();
    });
}

function toggleRecurringFields() {
    const type = document.getElementById('recurringType').value;
    document.getElementById('fixedFields').style.display = type === 'fixed' ? 'block' : 'none';
    document.getElementById('validityFields').style.display = type === 'validity' ? 'block' : 'none';
}

async function handleAddRecurringRule() {
    const name = document.getElementById('recurringName').value.trim();
    const amount = parseFloat(document.getElementById('recurringAmount').value);
    const accountId = document.getElementById('recurringAccount').value;
    const type = document.getElementById('recurringType').value;
    const startDate = document.getElementById('recurringStartDate').value;

    if (!name || !amount) {
        showToast('Please fill all required fields', 'error');
        return;
    }

    try {
        const db = getDB();
        const rule = {
            id: `REC-${Date.now()}`,
            name,
            amount,
            accountId,
            type,
            status: 'active',
            startDate,
            nextDue: startDate,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        if (type === 'fixed') {
            rule.frequency = document.getElementById('recurringFrequency').value;
            rule.day = parseInt(document.getElementById('recurringDay').value) || 1;
        } else {
            rule.validityDays = parseInt(document.getElementById('recurringValidity').value) || 28;
        }

        await db.create('recurring_rules', rule);

        closeModal();
        showToast('Recurring rule created!', 'success');
        await loadRecurring();
    } catch (error) {
        showToast('Failed to create rule: ' + error.message, 'error');
    }
}

async function recordRecurringPayment(ruleId) {
    const db = getDB();
    const rule = await db.read('recurring_rules', ruleId);
    if (!rule) {
        showToast('Rule not found', 'error');
        return;
    }

    const accounts = await db.readAll('accounts');

    openModal('Record Payment', `
        <form id="recordPaymentForm">
            <div class="form-info">
                <div><span>Rule</span> <strong>${rule.name}</strong></div>
                <div><span>Amount</span> <strong>${formatCurrency(rule.amount)}</strong></div>
                <div><span>Due</span> ${rule.nextDue ? formatDate(rule.nextDue) : '—'}</div>
            </div>
            <div class="form-group">
                <label>Payment Date</label>
                <input type="date" class="form-control" id="paymentDate" value="${new Date().toISOString().split('T')[0]}" />
            </div>
            <div class="form-group">
                <label>Account</label>
                <select class="form-control" id="paymentAccount">
                    ${accounts.map(a => `<option value="${a.id}" ${a.id === rule.accountId ? 'selected' : ''}>${a.name} (${formatCurrency(a.balance || 0)})</option>`).join('')}
                </select>
            </div>
            <button type="submit" class="btn btn-primary btn-block">Record Payment</button>
        </form>
    `);

    document.getElementById('recordPaymentForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        await handleRecordRecurringPayment(ruleId);
    });
}

async function handleRecordRecurringPayment(ruleId) {
    const paymentDate = document.getElementById('paymentDate').value;
    const accountId = document.getElementById('paymentAccount').value;

    try {
        const db = getDB();
        const rule = await db.read('recurring_rules', ruleId);
        if (!rule) {
            showToast('Rule not found', 'error');
            return;
        }

        // Check balance
        const balance = await getAccountBalance(accountId);
        if (balance < rule.amount) {
            if (!confirm(`⚠️ Insufficient balance! Recorded balance: ${formatCurrency(balance)}. Continue anyway?`)) {
                return;
            }
        }

        // Create ledger transaction
        const txn = await createLedgerEntry({
            type: 'expense',
            direction: 'out',
            amount: rule.amount,
            accountId: accountId,
            date: paymentDate,
            description: `Recurring: ${rule.name}`,
            module: 'recurring',
            moduleRef: rule.id,
            categoryId: 'cat-exp-subscriptions',
            status: 'completed'
        });

        // Update next due date
        let nextDue;
        if (rule.type === 'fixed') {
            const d = new Date(paymentDate);
            if (rule.frequency === 'monthly') d.setMonth(d.getMonth() + 1);
            else if (rule.frequency === 'weekly') d.setDate(d.getDate() + 7);
            else if (rule.frequency === 'quarterly') d.setMonth(d.getMonth() + 3);
            else if (rule.frequency === 'yearly') d.setFullYear(d.getFullYear() + 1);
            nextDue = d.toISOString();
        } else {
            // Validity based
            const d = new Date(paymentDate);
            d.setDate(d.getDate() + (rule.validityDays || 28));
            nextDue = d.toISOString();
        }

        rule.nextDue = nextDue;
        rule.lastPaid = paymentDate;
        rule.lastTransactionId = txn.id;
        rule.updatedAt = new Date().toISOString();
        await db.update('recurring_rules', rule);

        closeModal();
        showToast('Payment recorded successfully!', 'success');
        await loadRecurring();
    } catch (error) {
        showToast('Failed to record payment: ' + error.message, 'error');
    }
}

async function deleteRecurringRule(ruleId) {
    confirmAction('Delete this recurring rule?', async () => {
        try {
            const db = getDB();
            await db.delete('recurring_rules', ruleId);
            showToast('Rule deleted', 'warning');
            await loadRecurring();
        } catch (error) {
            showToast('Failed to delete: ' + error.message, 'error');
        }
    });
}