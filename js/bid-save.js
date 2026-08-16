// ============================================
// FINORA — Bid & Save (Committee)
// ============================================

async function loadBidSave() {
    const container = document.getElementById('pageContainer');
    const db = getDB();
    const committees = await db.readAll('committees');

    const html = `
        <div class="bid-save-page">
            <div class="page-header">
                <h2>Bid & Save</h2>
                <button class="btn btn-primary" onclick="openAddCommitteeModal()">
                    <i class="fas fa-plus"></i> New Committee
                </button>
            </div>

            ${committees.length > 0 ? committees.map(c => `
                <div class="committee-card card" onclick="viewCommitteeDetails('${c.id}')">
                    <div class="committee-header">
                        <div>
                            <h3>${c.name}</h3>
                            <span class="committee-status ${c.status}">${c.status}</span>
                        </div>
                        <div class="committee-amounts">
                            <div><span class="text-muted">Amount</span> ${formatCurrency(c.totalAmount)}</div>
                            <div><span class="text-muted">Members</span> ${c.members}</div>
                        </div>
                    </div>
                    <div class="committee-progress">
                        <div class="progress-bar" style="width: ${((c.completedCycles || 0) / c.duration * 100)}%"></div>
                        <span>${c.completedCycles || 0}/${c.duration} months</span>
                    </div>
                    <div class="committee-footer">
                        <span>Base: ${formatCurrency(c.baseContribution)}</span>
                        <span>·</span>
                        <span>Gain: <strong class="${(c.totalGain || 0) >= 0 ? 'text-success' : 'text-danger'}">${formatCurrency(c.totalGain || 0)}</strong></span>
                        <span>·</span>
                        <span>Next: ${c.nextCycle ? formatMonth(c.nextCycle) : '—'}</span>
                    </div>
                </div>
            `).join('') : `
                <div class="empty-state">
                    <i class="fas fa-handshake"></i>
                    <p>No committees yet</p>
                    <button class="btn btn-primary" onclick="openAddCommitteeModal()">Start a Committee</button>
                </div>
            `}
        </div>
    `;

    container.innerHTML = html;

    const style = document.createElement('style');
    style.textContent = `
        .committee-card {
            padding: 20px 24px;
            margin-bottom: 16px;
            cursor: pointer;
            transition: all var(--transition);
        }
        .committee-card:hover {
            box-shadow: var(--shadow-lg);
            transform: translateY(-2px);
        }
        .committee-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            flex-wrap: wrap;
            gap: 12px;
            margin-bottom: 12px;
        }
        .committee-header h3 {
            font-size: 1.1rem;
            font-weight: 600;
        }
        .committee-status {
            font-size: 0.7rem;
            padding: 2px 10px;
            border-radius: 12px;
            text-transform: uppercase;
            font-weight: 600;
        }
        .committee-status.active { background: #dcfce7; color: #22c55e; }
        .committee-status.completed { background: #dbeafe; color: #3b82f6; }
        .committee-amounts {
            display: flex;
            gap: 16px;
            font-size: 0.9rem;
        }
        .committee-amounts span {
            color: var(--text-muted);
        }
        .committee-progress {
            display: flex;
            align-items: center;
            gap: 12px;
            margin: 8px 0;
        }
        .committee-footer {
            font-size: 0.85rem;
            color: var(--text-muted);
            display: flex;
            gap: 8px;
            flex-wrap: wrap;
            margin-top: 4px;
        }
    `;
    document.getElementById('page-style').textContent = style.textContent;
}

async function openAddCommitteeModal() {
    openModal('New Committee', `
        <form id="committeeForm">
            <div class="form-group">
                <label>Committee Name</label>
                <input type="text" class="form-control" id="committeeName" placeholder="Saif Ki Committee" required />
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Total Amount</label>
                    <input type="number" class="form-control" id="committeeAmount" placeholder="₹ 2,00,000" required />
                </div>
                <div class="form-group">
                    <label>Number of Members</label>
                    <input type="number" class="form-control" id="committeeMembers" placeholder="20" required />
                </div>
            </div>
            <div class="form-group">
                <label>Start Date</label>
                <input type="date" class="form-control" id="committeeStartDate" value="${new Date().toISOString().split('T')[0]}" />
            </div>
            <div class="form-group">
                <label>Your Memberships</label>
                <input type="number" class="form-control" id="committeeMemberships" value="1" min="1" />
            </div>
            <div id="committeeCalculation" class="calculation-preview">
                <div><span>Base Contribution</span> <strong id="calcBaseContribution">₹ 0</strong></div>
                <div><span>Duration</span> <strong id="calcDuration">0 months</strong></div>
            </div>
            <button type="submit" class="btn btn-primary btn-block">Create Committee</button>
        </form>
    `);

    // Auto-calculate
    document.getElementById('committeeAmount').addEventListener('input', updateCommitteeCalc);
    document.getElementById('committeeMembers').addEventListener('input', updateCommitteeCalc);
    updateCommitteeCalc();

    document.getElementById('committeeForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        await handleAddCommittee();
    });
}

function updateCommitteeCalc() {
    const amount = parseFloat(document.getElementById('committeeAmount').value) || 0;
    const members = parseInt(document.getElementById('committeeMembers').value) || 0;
    const base = members > 0 ? amount / members : 0;
    document.getElementById('calcBaseContribution').textContent = formatCurrency(base);
    document.getElementById('calcDuration').textContent = `${members} months`;
}

async function handleAddCommittee() {
    const name = document.getElementById('committeeName').value.trim();
    const totalAmount = parseFloat(document.getElementById('committeeAmount').value);
    const members = parseInt(document.getElementById('committeeMembers').value);
    const startDate = document.getElementById('committeeStartDate').value;
    const memberships = parseInt(document.getElementById('committeeMemberships').value) || 1;

    if (!name || !totalAmount || !members) {
        showToast('Please fill all required fields', 'error');
        return;
    }

    try {
        const db = getDB();
        const baseContribution = totalAmount / members;
        const duration = members;

        const committee = {
            id: generateCommitteeId(),
            name,
            totalAmount,
            members,
            memberships,
            baseContribution,
            duration,
            startDate,
            completedCycles: 0,
            totalGain: 0,
            totalLoss: 0,
            status: 'active',
            nextCycle: startDate,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        await db.create('committees', committee);

        // Generate cycles
        const cycles = [];
        let cycleDate = new Date(startDate);
        for (let i = 1; i <= duration; i++) {
            cycles.push({
                id: `CYCLE-${Date.now()}-${i}`,
                committeeId: committee.id,
                cycleNo: i,
                month: cycleDate.toISOString(),
                status: 'pending',
                winningBid: null,
                discount: null,
                contribution: baseContribution,
                payable: baseContribution * memberships,
                userWon: false,
                payout: 0,
                contributionGain: 0,
                bidCost: 0,
                netGain: 0,
                winnerName: null,
                transactionId: null,
                payoutTransactionId: null,
                createdAt: new Date().toISOString()
            });
            cycleDate.setMonth(cycleDate.getMonth() + 1);
        }
        await db.bulkCreate('committee_cycles', cycles);

        closeModal();
        showToast('Committee created successfully!', 'success');
        await loadBidSave();
    } catch (error) {
        showToast('Failed to create committee: ' + error.message, 'error');
    }
}

async function viewCommitteeDetails(committeeId) {
    const db = getDB();
    const committee = await db.read('committees', committeeId);
    if (!committee) {
        showToast('Committee not found', 'error');
        return;
    }

    const cycles = await db.getByIndex('committee_cycles', 'idx_committeeId', committeeId);
    cycles.sort((a, b) => a.cycleNo - b.cycleNo);

    // Calculate totals
    const totalPaid = cycles.reduce((s, c) => s + (c.payable || 0), 0);
    const totalReceived = cycles.reduce((s, c) => s + (c.payout || 0), 0);
    const totalGain = cycles.reduce((s, c) => s + (c.netGain || 0), 0);

    const completed = cycles.filter(c => c.status === 'completed');
    const pending = cycles.filter(c => c.status === 'pending');

    openModal(`Committee: ${committee.name}`, `
        <div class="committee-detail">
            <div class="committee-detail-summary">
                <div><span>Amount</span> ${formatCurrency(committee.totalAmount)}</div>
                <div><span>Members</span> ${committee.members}</div>
                <div><span>Your Memberships</span> ${committee.memberships}</div>
                <div><span>Base Contribution</span> ${formatCurrency(committee.baseContribution)}</div>
                <div><span>Progress</span> ${completed.length}/${committee.duration} months</div>
                <div><span>Total Paid</span> <strong>${formatCurrency(totalPaid)}</strong></div>
                <div><span>Total Received</span> <strong>${formatCurrency(totalReceived)}</strong></div>
                <div><span>Net Gain</span> <strong class="${totalGain >= 0 ? 'text-success' : 'text-danger'}">${formatCurrency(totalGain)}</strong></div>
                <div><span>Status</span> <span class="committee-status ${committee.status}">${committee.status}</span></div>
            </div>
            <hr />
            <div class="cycle-list">
                <h4>Monthly Cycles</h4>
                ${cycles.map(cycle => `
                    <div class="cycle-item ${cycle.status}" onclick="viewCycleDetails('${cycle.id}')">
                        <span>Month ${cycle.cycleNo}: ${formatMonth(cycle.month)}</span>
                        <span>Bid: ${cycle.winningBid ? formatCurrency(cycle.winningBid) : '—'}</span>
                        <span>Payable: ${formatCurrency(cycle.payable || 0)}</span>
                        ${cycle.userWon ? `<span class="text-success">🏆 Won</span>` : ''}
                        <span class="cycle-status ${cycle.status}">${cycle.status}</span>
                    </div>
                `).join('')}
            </div>
            <button class="btn btn-primary" onclick="closeModal();openAddCycleModal('${committeeId}')">
                <i class="fas fa-plus"></i> Record Month
            </button>
        </div>
    `);

    // Add styles
    const style = document.createElement('style');
    style.textContent = `
        .committee-detail-summary {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 8px 16px;
            font-size: 0.9rem;
        }
        .committee-detail-summary span {
            color: var(--text-muted);
        }
        .cycle-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 8px 12px;
            border-bottom: 1px solid var(--border);
            cursor: pointer;
            transition: all var(--transition);
            flex-wrap: wrap;
            gap: 4px;
        }
        .cycle-item:hover {
            background: var(--primary-light);
        }
        .cycle-status {
            font-size: 0.7rem;
            padding: 2px 8px;
            border-radius: 10px;
            text-transform: uppercase;
        }
        .cycle-status.pending { background: #fef3c7; color: #f59e0b; }
        .cycle-status.completed { background: #dcfce7; color: #22c55e; }
        .cycle-status.skipped { background: #f3f4f6; color: #6b7280; }
    `;
    document.getElementById('page-style').textContent = style.textContent;
}

async function openAddCycleModal(committeeId) {
    const db = getDB();
    const committee = await db.read('committees', committeeId);
    if (!committee) return;

    const cycles = await db.getByIndex('committee_cycles', 'idx_committeeId', committeeId);
    const pending = cycles.filter(c => c.status === 'pending');
    
    if (pending.length === 0) {
        showToast('All cycles completed!', 'info');
        return;
    }

    const nextCycle = pending[0];

    openModal('Record Month', `
        <form id="cycleForm">
            <div class="cycle-form-info">
                <div><span>Committee</span> <strong>${committee.name}</strong></div>
                <div><span>Month</span> <strong>${formatMonth(nextCycle.month)}</strong></div>
                <div><span>Cycle</span> <strong>${nextCycle.cycleNo}/${committee.duration}</strong></div>
                <div><span>Base Contribution</span> ${formatCurrency(committee.baseContribution)}</div>
                <div><span>Your Memberships</span> ${committee.memberships}</div>
            </div>
            <div class="form-group">
                <label>Winning Bid</label>
                <input type="number" class="form-control" id="cycleBid" placeholder="₹ 0" value="0" />
            </div>
            <div class="form-group">
                <label>Did You Win?</label>
                <select class="form-control" id="cycleWon">
                    <option value="no">No</option>
                    <option value="yes">Yes</option>
                </select>
            </div>
            <div class="form-group">
                <label>Winner Name (Optional)</label>
                <input type="text" class="form-control" id="cycleWinnerName" placeholder="Name of winner" />
            </div>
            <div class="form-group">
                <label>Account (for payment)</label>
                <select class="form-control" id="cycleAccount">
                    ${(await db.readAll('accounts')).map(a => 
                        `<option value="${a.id}">${a.name} (${formatCurrency(a.balance || 0)})</option>`
                    ).join('')}
                </select>
            </div>
            <div id="cycleCalculation" class="calculation-preview">
                <div><span>Bid Discount</span> <strong id="calcDiscount">₹ 0</strong></div>
                <div><span>Your Contribution</span> <strong id="calcContribution">₹ 0</strong></div>
                <div><span>Payout (if won)</span> <strong id="calcPayout">₹ 0</strong></div>
            </div>
            <button type="submit" class="btn btn-primary btn-block">Save Month</button>
        </form>
    `);

    // Auto-calculate
    document.getElementById('cycleBid').addEventListener('input', updateCycleCalc);

    document.getElementById('cycleForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        await handleSaveCycle(committeeId, nextCycle.id);
    });
}

function updateCycleCalc() {
    const bid = parseFloat(document.getElementById('cycleBid').value) || 0;
    const members = 20; // This should come from committee
    const base = 10000; // This should come from committee
    
    const discount = members > 0 ? bid / members : 0;
    const contribution = base - discount;
    const payout = 200000 - bid; // This should come from committee
    
    document.getElementById('calcDiscount').textContent = formatCurrency(discount);
    document.getElementById('calcContribution').textContent = formatCurrency(contribution);
    document.getElementById('calcPayout').textContent = formatCurrency(payout);
}

async function handleSaveCycle(committeeId, cycleId) {
    const bid = parseFloat(document.getElementById('cycleBid').value) || 0;
    const userWon = document.getElementById('cycleWon').value === 'yes';
    const winnerName = document.getElementById('cycleWinnerName').value.trim();
    const accountId = document.getElementById('cycleAccount').value;

    try {
        const db = getDB();
        const committee = await db.read('committees', committeeId);
        const cycle = await db.read('committee_cycles', cycleId);

        if (!committee || !cycle) {
            showToast('Data not found', 'error');
            return;
        }

        // Calculate
        const discount = bid > 0 ? bid / committee.members : 0;
        const contribution = committee.baseContribution - discount;
        const payable = contribution * committee.memberships;
        const payout = bid > 0 ? committee.totalAmount - bid : 0;
        const contributionGain = committee.baseContribution - contribution;
        const bidCost = userWon ? bid : 0;
        const netGain = (committee.totalGain || 0) + contributionGain - bidCost;

        // Create ledger transaction for payment
        const txn = await createLedgerEntry({
            type: 'committee_payment',
            direction: 'out',
            amount: payable,
            accountId: accountId,
            date: cycle.month,
            description: `${committee.name} - Month ${cycle.cycleNo} Contribution`,
            module: 'bid_save',
            moduleRef: committeeId,
            status: 'completed'
        });

        let payoutTxn = null;
        if (userWon && payout > 0) {
            payoutTxn = await createLedgerEntry({
                type: 'committee_payout',
                direction: 'in',
                amount: payout,
                accountId: accountId,
                date: cycle.month,
                description: `${committee.name} - Month ${cycle.cycleNo} Payout`,
                module: 'bid_save',
                moduleRef: committeeId,
                status: 'completed'
            });
        }

        // Update cycle
        cycle.winningBid = bid;
        cycle.discount = discount;
        cycle.contribution = contribution;
        cycle.payable = payable;
        cycle.userWon = userWon;
        cycle.payout = payout;
        cycle.contributionGain = contributionGain;
        cycle.bidCost = bidCost;
        cycle.netGain = netGain - (committee.totalGain || 0);
        cycle.winnerName = winnerName || null;
        cycle.status = 'completed';
        cycle.transactionId = txn.id;
        cycle.payoutTransactionId = payoutTxn ? payoutTxn.id : null;
        cycle.updatedAt = new Date().toISOString();
        await db.update('committee_cycles', cycle);

        // Update committee
        committee.completedCycles = (committee.completedCycles || 0) + 1;
        committee.totalGain = netGain;
        committee.updatedAt = new Date().toISOString();

        // Check if complete
        if (committee.completedCycles >= committee.duration) {
            committee.status = 'completed';
        } else {
            // Set next cycle
            const remaining = await db.getByIndex('committee_cycles', 'idx_committeeId', committeeId);
            const nextPending = remaining.filter(c => c.status === 'pending').sort((a, b) => a.cycleNo - b.cycleNo)[0];
            if (nextPending) {
                committee.nextCycle = nextPending.month;
            }
        }
        await db.update('committees', committee);

        closeModal();
        showToast('Month recorded successfully!', 'success');
        await loadBidSave();
    } catch (error) {
        showToast('Failed to record month: ' + error.message, 'error');
    }
}

async function viewCycleDetails(cycleId) {
    const db = getDB();
    const cycle = await db.read('committee_cycles', cycleId);
    if (!cycle) {
        showToast('Cycle not found', 'error');
        return;
    }

    openModal('Cycle Details', `
        <div class="cycle-detail">
            <div><span>Month</span> ${formatMonth(cycle.month)}</div>
            <div><span>Cycle</span> ${cycle.cycleNo}</div>
            <div><span>Status</span> <span class="cycle-status ${cycle.status}">${cycle.status}</span></div>
            ${cycle.winningBid !== null && cycle.winningBid > 0 ? `
                <div><span>Winning Bid</span> ${formatCurrency(cycle.winningBid)}</div>
                <div><span>Discount</span> ${formatCurrency(cycle.discount || 0)}</div>
                <div><span>Contribution</span> ${formatCurrency(cycle.contribution || 0)}</div>
                <div><span>Your Payable</span> ${formatCurrency(cycle.payable || 0)}</div>
                <div><span>Payout</span> ${formatCurrency(cycle.payout || 0)}</div>
                <div><span>User Won</span> ${cycle.userWon ? '✅ Yes' : '❌ No'}</div>
                ${cycle.winnerName ? `<div><span>Winner</span> ${cycle.winnerName}</div>` : ''}
                <div><span>Net Gain</span> <strong class="${(cycle.netGain || 0) >= 0 ? 'text-success' : 'text-danger'}">${formatCurrency(cycle.netGain || 0)}</strong></div>
            ` : `
                <div class="text-muted">No bid recorded for this month (Skipped)</div>
            `}
            ${cycle.transactionId ? `
                <div><span>Transaction</span> <span class="txn-link" onclick="viewTransaction('${cycle.transactionId}')">${cycle.transactionId}</span></div>
            ` : ''}
            ${cycle.payoutTransactionId ? `
                <div><span>Payout Transaction</span> <span class="txn-link" onclick="viewTransaction('${cycle.payoutTransactionId}')">${cycle.payoutTransactionId}</span></div>
            ` : ''}
        </div>
    `);

    const style = document.createElement('style');
    style.textContent = `
        .txn-link {
            color: var(--primary);
            cursor: pointer;
            font-family: monospace;
        }
        .txn-link:hover {
            text-decoration: underline;
        }
        .cycle-detail div {
            padding: 6px 0;
            border-bottom: 1px solid var(--border);
            display: flex;
            justify-content: space-between;
        }
        .cycle-detail div:last-child {
            border-bottom: none;
        }
        .cycle-detail span:first-child {
            color: var(--text-muted);
        }
    `;
    document.getElementById('page-style').textContent = style.textContent;
}