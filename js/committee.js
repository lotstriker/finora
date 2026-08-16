// ============================================
// FINORA — Committee (Bid & Save) - Complete
// ============================================

// ----- Committee CRUD -----

async function createCommittee(data) {
    const db = getDB();
    
    // Validate
    if (!data.name || !data.totalAmount || !data.members) {
        throw new Error('Please fill all required fields');
    }
    
    const baseContribution = data.totalAmount / data.members;
    const duration = data.members;
    
    const committee = {
        id: generateCommitteeId(),
        name: data.name,
        totalAmount: data.totalAmount,
        members: data.members,
        memberships: data.memberships || 1,
        baseContribution: baseContribution,
        duration: duration,
        startDate: data.startDate || new Date().toISOString(),
        completedCycles: 0,
        totalGain: 0,
        totalLoss: 0,
        status: 'active',
        nextCycle: data.startDate || new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    
    const id = await db.create('committees', committee);
    
    // Generate cycles
    await generateCommitteeCycles(id, duration, baseContribution, data.startDate, data.memberships);
    
    return id;
}

async function getCommittee(id) {
    const db = getDB();
    return await db.read('committees', id);
}

async function getAllCommittees() {
    const db = getDB();
    return await db.readAll('committees');
}

async function updateCommittee(id, data) {
    const db = getDB();
    const committee = await db.read('committees', id);
    if (!committee) throw new Error('Committee not found');
    
    Object.assign(committee, data);
    committee.updatedAt = new Date().toISOString();
    await db.update('committees', committee);
    return committee;
}

async function deleteCommittee(id) {
    const db = getDB();
    const cycles = await db.getByIndex('committee_cycles', 'idx_committeeId', id);
    for (const cycle of cycles) {
        await db.delete('committee_cycles', cycle.id);
    }
    await db.delete('committees', id);
    return true;
}

// ----- Committee Cycles -----

async function generateCommitteeCycles(committeeId, duration, baseContribution, startDate, memberships) {
    const db = getDB();
    const cycles = [];
    let cycleDate = new Date(startDate);
    
    for (let i = 1; i <= duration; i++) {
        cycles.push({
            id: `CYCLE-${Date.now()}-${i}`,
            committeeId: committeeId,
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
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        });
        cycleDate.setMonth(cycleDate.getMonth() + 1);
    }
    
    await db.bulkCreate('committee_cycles', cycles);
    return cycles;
}

async function getCommitteeCycles(committeeId) {
    const db = getDB();
    const cycles = await db.getByIndex('committee_cycles', 'idx_committeeId', committeeId);
    return cycles.sort((a, b) => a.cycleNo - b.cycleNo);
}

async function getNextPendingCycle(committeeId) {
    const cycles = await getCommitteeCycles(committeeId);
    return cycles.filter(c => c.status === 'pending')
        .sort((a, b) => a.cycleNo - b.cycleNo)[0] || null;
}

// ----- Record Committee Month -----

async function recordCommitteeMonth(committeeId, cycleId, data) {
    const db = getDB();
    const committee = await db.read('committees', committeeId);
    const cycle = await db.read('committee_cycles', cycleId);
    
    if (!committee || !cycle) {
        throw new Error('Committee or cycle not found');
    }
    
    const { winningBid, userWon, winnerName, accountId, paymentDate } = data;
    
    // Calculations
    const discount = winningBid > 0 ? winningBid / committee.members : 0;
    const contribution = committee.baseContribution - discount;
    const payable = contribution * committee.memberships;
    const payout = winningBid > 0 ? committee.totalAmount - winningBid : 0;
    const contributionGain = committee.baseContribution - contribution;
    const bidCost = userWon ? winningBid : 0;
    const netGain = (committee.totalGain || 0) + contributionGain - bidCost;
    
    // Create payment transaction
    const txn = await createLedgerEntry({
        type: 'committee_payment',
        direction: 'out',
        amount: payable,
        accountId: accountId,
        date: paymentDate || cycle.month,
        description: `${committee.name} - Month ${cycle.cycleNo} Contribution`,
        module: 'bid_save',
        moduleRef: committeeId,
        status: 'completed'
    });
    
    // Create payout transaction if user won
    let payoutTxn = null;
    if (userWon && payout > 0) {
        payoutTxn = await createLedgerEntry({
            type: 'committee_payout',
            direction: 'in',
            amount: payout,
            accountId: accountId,
            date: paymentDate || cycle.month,
            description: `${committee.name} - Month ${cycle.cycleNo} Payout`,
            module: 'bid_save',
            moduleRef: committeeId,
            status: 'completed'
        });
    }
    
    // Update cycle
    cycle.winningBid = winningBid;
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
        const nextPending = await getNextPendingCycle(committeeId);
        if (nextPending) {
            committee.nextCycle = nextPending.month;
        }
    }
    await db.update('committees', committee);
    
    return { cycle, committee, txn, payoutTxn };
}

// ----- Committee Statistics -----

async function getCommitteeStats(committeeId) {
    const cycles = await getCommitteeCycles(committeeId);
    const completed = cycles.filter(c => c.status === 'completed');
    const pending = cycles.filter(c => c.status === 'pending');
    
    const totalPaid = completed.reduce((s, c) => s + (c.payable || 0), 0);
    const totalReceived = completed.reduce((s, c) => s + (c.payout || 0), 0);
    const totalGain = completed.reduce((s, c) => s + (c.netGain || 0), 0);
    
    return {
        totalCycles: cycles.length,
        completed: completed.length,
        pending: pending.length,
        totalPaid: totalPaid,
        totalReceived: totalReceived,
        totalGain: totalGain,
        progress: cycles.length > 0 ? (completed.length / cycles.length * 100) : 0
    };
}

// ----- Skip Committee Month -----

async function skipCommitteeMonth(committeeId, cycleId) {
    const db = getDB();
    const cycle = await db.read('committee_cycles', cycleId);
    if (!cycle) throw new Error('Cycle not found');
    
    cycle.status = 'skipped';
    cycle.winningBid = 0;
    cycle.discount = 0;
    cycle.payable = 0;
    cycle.updatedAt = new Date().toISOString();
    await db.update('committee_cycles', cycle);
    
    // Update committee progress
    const committee = await db.read('committees', committeeId);
    if (committee) {
        committee.completedCycles = (committee.completedCycles || 0) + 1;
        committee.updatedAt = new Date().toISOString();
        
        if (committee.completedCycles >= committee.duration) {
            committee.status = 'completed';
        } else {
            const nextPending = await getNextPendingCycle(committeeId);
            if (nextPending) {
                committee.nextCycle = nextPending.month;
            }
        }
        await db.update('committees', committee);
    }
    
    return cycle;
}