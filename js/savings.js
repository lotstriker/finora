// ============================================
// FINORA — Savings Goals (COMPLETE)
// ============================================

async function loadSavings() {
    const container = document.getElementById('pageContainer');
    const db = getDB();
    const goals = await db.readAll('savings_goals');

    // Calculate saved amounts for each goal
    const goalData = [];
    for (const goal of goals) {
        const contributions = await getSavingsContributions(goal.id);
        const saved = contributions.reduce((s, c) => s + (c.amount || 0), 0);
        goalData.push({ ...goal, saved, contributions });
    }

    const totalSaved = goalData.reduce((s, g) => s + g.saved, 0);

    const html = `
        <div class="savings-page">
            <div class="page-header">
                <h2>Savings Goals</h2>
                <button class="btn btn-primary" onclick="openAddSavingsModal()">
                    <i class="fas fa-plus"></i> New Goal
                </button>
            </div>

            <div class="savings-summary card">
                <span class="text-muted">Total Saved</span>
                <h1>${formatCurrency(totalSaved)}</h1>
                <span class="text-muted">${goalData.length} goals</span>
            </div>

            <div class="savings-grid">
                ${goalData.length > 0 ? goalData.map(g => {
                    const progress = g.target > 0 ? (g.saved / g.target * 100) : 0;
                    return `
                        <div class="savings-card card" onclick="viewSavingsDetails('${g.id}')">
                            <div class="savings-header">
                                <h3>${g.name}</h3>
                                <span class="savings-status ${g.status}">${g.status}</span>
                            </div>
                            <div class="savings-amounts">
                                <div>
                                    <span class="text-muted">Saved</span>
                                    <strong>${formatCurrency(g.saved)}</strong>
                                </div>
                                <div>
                                    <span class="text-muted">Target</span>
                                    <strong>${formatCurrency(g.target)}</strong>
                                </div>
                            </div>
                            <div class="savings-progress">
                                <div class="progress-bar" style="width: ${Math.min(progress, 100)}%"></div>
                                <span>${Math.round(progress)}%</span>
                            </div>
                            ${g.targetDate ? `
                                <div class="savings-date">
                                    <i class="fas fa-calendar"></i>
                                    Target: ${formatDate(g.targetDate)}
                                </div>
                            ` : ''}
                            <div class="savings-actions">
                                <button class="btn btn-sm btn-primary" onclick="event.stopPropagation();openAddSavingsContribution('${g.id}')">
                                    <i class="fas fa-plus"></i> Add Money
                                </button>
                            </div>
                        </div>
                    `;
                }).join('') : `
                    <div class="empty-state" style="grid-column:1/-1">
                        <i class="fas fa-piggy-bank"></i>
                        <p>No savings goals yet</p>
                        <button class="btn btn-primary" onclick="openAddSavingsModal()">Create a goal</button>
                    </div>
                `}
            </div>
        </div>
    `;

    container.innerHTML = html;

    const style = document.createElement('style');
    style.textContent = `
        .savings-summary {
            text-align: center;
            padding: 24px;
            margin-bottom: 24px;
        }
        .savings-summary h1 {
            font-size: 2.5rem;
            font-weight: 700;
        }
        .savings-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
            gap: 16px;
        }
        .savings-card {
            padding: 20px 24px;
            cursor: pointer;
            transition: all var(--transition);
        }
        .savings-card:hover {
            transform: translateY(-2px);
            box-shadow: var(--shadow-lg);
        }
        .savings-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 12px;
        }
        .savings-header h3 {
            font-size: 1.05rem;
            font-weight: 600;
        }
        .savings-status {
            font-size: 0.7rem;
            padding: 2px 10px;
            border-radius: 12px;
            text-transform: uppercase;
            font-weight: 600;
        }
        .savings-status.active { background: #dcfce7; color: #22c55e; }
        .savings-status.completed { background: #dbeafe; color: #3b82f6; }
        .savings-amounts {
            display: flex;
            gap: 24px;
            margin: 8px 0;
        }
        .savings-amounts strong {
            font-size: 1.1rem;
        }
        .savings-progress {
            display: flex;
            align-items: center;
            gap: 12px;
            margin: 8px 0;
        }
        .savings-date {
            font-size: 0.8rem;
            color: var(--text-muted);
            margin: 4px 0;
        }
        .savings-actions {
            margin-top: 12px;
            display: flex;
            gap: 8px;
        }
    `;
    document.getElementById('page-style').textContent = style.textContent;
}

async function openAddSavingsModal() {
    openModal('New Savings Goal', `
        <form id="savingsForm">
            <div class="form-group">
                <label>Goal Name</label>
                <input type="text" class="form-control" id="savingsName" placeholder="PS5, Vacation, etc." required />
            </div>
            <div class="form-group">
                <label>Target Amount</label>
                <input type="number" class="form-control" id="savingsTarget" placeholder="₹ 50,000" required />
            </div>
            <div class="form-group">
                <label>Target Date (Optional)</label>
                <input type="date" class="form-control" id="savingsTargetDate" />
            </div>
            <div class="form-group">
                <label>Priority (Optional)</label>
                <select class="form-control" id="savingsPriority">
                    <option value="low">Low</option>
                    <option value="medium" selected>Medium</option>
                    <option value="high">High</option>
                </select>
            </div>
            <button type="submit" class="btn btn-primary btn-block">Create Goal</button>
        </form>
    `);

    document.getElementById('savingsForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        await handleAddSavingsGoal();
    });
}

async function handleAddSavingsGoal() {
    const name = document.getElementById('savingsName').value.trim();
    const target = parseFloat(document.getElementById('savingsTarget').value);
    const targetDate = document.getElementById('savingsTargetDate').value;
    const priority = document.getElementById('savingsPriority').value;

    if (!name || !target) {
        showToast('Please fill all required fields', 'error');
        return;
    }

    try {
        const db = getDB();
        await db.create('savings_goals', {
            id: `GOAL-${Date.now()}`,
            name,
            target,
            targetDate: targetDate || null,
            priority,
            status: 'active',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        });

        closeModal();
        showToast('Savings goal created!', 'success');
        await loadSavings();
    } catch (error) {
        showToast('Failed to create goal: ' + error.message, 'error');
    }
}

async function openAddSavingsContribution(goalId) {
    const db = getDB();
    const goal = await db.read('savings_goals', goalId);
    if (!goal) {
        showToast('Goal not found', 'error');
        return;
    }

    const accounts = await db.readAll('accounts');

    openModal(`Add to ${goal.name}`, `
        <form id="savingsContributionForm">
            <div class="form-group">
                <label>Amount</label>
                <input type="number" class="form-control" id="savingsContributionAmount" placeholder="₹ 0" required />
            </div>
            <div class="form-group">
                <label>From Account</label>
                <select class="form-control" id="savingsContributionAccount">
                    ${accounts.map(a => `<option value="${a.id}">${a.name} (${formatCurrency(a.balance || 0)})</option>`).join('')}
                </select>
            </div>
            <div class="form-group">
                <label>Date</label>
                <input type="date" class="form-control" id="savingsContributionDate" value="${new Date().toISOString().split('T')[0]}" />
            </div>
            <div class="form-group">
                <label>Note (Optional)</label>
                <input type="text" class="form-control" id="savingsContributionNote" placeholder="Monthly savings" />
            </div>
            <button type="submit" class="btn btn-primary btn-block">Add Money</button>
        </form>
    `);

    document.getElementById('savingsContributionForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        await handleAddSavingsContribution(goalId);
    });
}

async function handleAddSavingsContribution(goalId) {
    const amount = parseFloat(document.getElementById('savingsContributionAmount').value);
    const accountId = document.getElementById('savingsContributionAccount').value;
    const date = document.getElementById('savingsContributionDate').value;
    const note = document.getElementById('savingsContributionNote').value.trim();

    if (!amount || amount <= 0) {
        showToast('Please enter a valid amount', 'error');
        return;
    }

    try {
        const db = getDB();

        // Check balance
        const balance = await getAccountBalance(accountId);
        if (balance < amount) {
            if (!confirm(`⚠️ Insufficient balance! Recorded balance: ${formatCurrency(balance)}. Continue anyway?`)) {
                return;
            }
        }

        // Create ledger transaction (Savings Contribution - NOT expense)
        const txn = await createLedgerEntry({
            type: 'savings_contribution',
            direction: 'out',
            amount: amount,
            accountId: accountId,
            date: date,
            description: `Savings: ${note || 'Contribution'}`,
            module: 'savings',
            moduleRef: goalId,
            status: 'completed'
        });

        // Create contribution record
        await db.create('savings_contributions', {
            id: `SC-${Date.now()}`,
            goalId: goalId,
            amount: amount,
            accountId: accountId,
            date: date,
            note: note || null,
            transactionId: txn.id,
            createdAt: new Date().toISOString()
        });

        // Update goal progress
        const goal = await db.read('savings_goals', goalId);
        if (goal) {
            const contributions = await getSavingsContributions(goalId);
            const saved = contributions.reduce((s, c) => s + c.amount, 0);
            if (saved >= goal.target) {
                goal.status = 'completed';
                goal.completedAt = new Date().toISOString();
                await db.update('savings_goals', goal);
            }
        }

        closeModal();
        showToast('Money added to savings!', 'success');
        await loadSavings();
    } catch (error) {
        showToast('Failed to add savings: ' + error.message, 'error');
    }
}

async function viewSavingsDetails(goalId) {
    const db = getDB();
    const goal = await db.read('savings_goals', goalId);
    if (!goal) {
        showToast('Goal not found', 'error');
        return;
    }

    const contributions = await getSavingsContributions(goalId);
    const saved = contributions.reduce((s, c) => s + c.amount, 0);
    const progress = goal.target > 0 ? (saved / goal.target * 100) : 0;

    openModal(`Savings: ${goal.name}`, `
        <div class="savings-detail">
            <div class="savings-detail-summary">
                <div><span>Target</span> ${formatCurrency(goal.target)}</div>
                <div><span>Saved</span> <strong>${formatCurrency(saved)}</strong></div>
                <div><span>Remaining</span> <strong>${formatCurrency(goal.target - saved)}</strong></div>
                <div><span>Progress</span> ${Math.round(progress)}%</div>
                ${goal.targetDate ? `<div><span>Target Date</span> ${formatDate(goal.targetDate)}</div>` : ''}
                <div><span>Status</span> <span class="savings-status ${goal.status}">${goal.status}</span></div>
                <div><span>Priority</span> ${goal.priority || 'medium'}</div>
            </div>
            <hr />
            <h4>Contributions</h4>
            <div class="contribution-list">
                ${contributions.length > 0 ? contributions.map(c => `
                    <div class="contribution-item">
                        <span>${formatDate(c.date)}</span>
                        <span>${c.note || '—'}</span>
                        <span class="text-success">+${formatCurrency(c.amount)}</span>
                        ${c.transactionId ? `<span class="txn-link" onclick="viewTransaction('${c.transactionId}')">🔍</span>` : ''}
                    </div>
                `).join('') : '<span class="text-muted">No contributions yet</span>'}
            </div>
            <button class="btn btn-primary" onclick="closeModal();openAddSavingsContribution('${goalId}')">
                <i class="fas fa-plus"></i> Add Money
            </button>
        </div>
    `);

    const style = document.createElement('style');
    style.textContent = `
        .savings-detail-summary {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 8px 16px;
            font-size: 0.9rem;
        }
        .savings-detail-summary span {
            color: var(--text-muted);
        }
        .contribution-item {
            display: flex;
            justify-content: space-between;
            padding: 6px 0;
            border-bottom: 1px solid var(--border);
            font-size: 0.9rem;
            align-items: center;
        }
        .contribution-item:last-child {
            border-bottom: none;
        }
    `;
    document.getElementById('page-style').textContent = style.textContent;
}

// ============================================
// SAVINGS HELPER FUNCTIONS (ADDED FOR DASHBOARD)
// ============================================

async function getSavingsContributions(goalId) {
    const db = getDB();
    return await db.getByIndex('savings_contributions', 'idx_goalId', goalId);
}

async function getActiveSavingsGoals() {
    const db = getDB();
    const goals = await db.readAll('savings_goals');
    return goals.filter(g => g.status === 'active');
}

async function getTotalSavedForGoal(goalId) {
    const contributions = await getSavingsContributions(goalId);
    return contributions.reduce((sum, c) => sum + c.amount, 0);
}

async function updateSavingsGoal(id, data) {
    const db = getDB();
    const goal = await db.read('savings_goals', id);
    if (!goal) throw new Error('Goal not found');
    Object.assign(goal, data);
    goal.updatedAt = new Date().toISOString();
    await db.update('savings_goals', goal);
    return goal;
}

async function deleteSavingsGoal(id) {
    const db = getDB();
    const contributions = await getSavingsContributions(id);
    for (const c of contributions) {
        await db.delete('savings_contributions', c.id);
    }
    await db.delete('savings_goals', id);
}

// Make functions globally accessible
window.loadSavings = loadSavings;
window.openAddSavingsModal = openAddSavingsModal;
window.openAddSavingsContribution = openAddSavingsContribution;
window.viewSavingsDetails = viewSavingsDetails;
window.getSavingsContributions = getSavingsContributions;
window.getActiveSavingsGoals = getActiveSavingsGoals;
window.getTotalSavedForGoal = getTotalSavedForGoal;
window.updateSavingsGoal = updateSavingsGoal;
window.deleteSavingsGoal = deleteSavingsGoal;