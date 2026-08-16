// ============================================
// FINORA — Committee Calculator (Complete)
// ============================================

/**
 * Calculate base contribution per member
 * @param {number} totalAmount - Total committee amount
 * @param {number} members - Number of members
 * @returns {number} Base contribution per member
 */
function calculateBaseContribution(totalAmount, members) {
    if (members <= 0) return 0;
    return totalAmount / members;
}

/**
 * Calculate discount from winning bid
 * @param {number} winningBid - Winning bid amount
 * @param {number} members - Number of members
 * @returns {number} Discount per member
 */
function calculateBidDiscount(winningBid, members) {
    if (members <= 0) return 0;
    return winningBid / members;
}

/**
 * Calculate actual contribution after discount
 * @param {number} baseContribution - Base contribution per member
 * @param {number} winningBid - Winning bid amount
 * @param {number} members - Number of members
 * @returns {number} Actual contribution per member
 */
function calculateActualContribution(baseContribution, winningBid, members) {
    const discount = calculateBidDiscount(winningBid, members);
    return Math.max(0, baseContribution - discount);
}

/**
 * Calculate total payable for a user with multiple memberships
 * @param {number} actualContribution - Contribution per membership
 * @param {number} memberships - Number of memberships held by user
 * @returns {number} Total payable
 */
function calculateTotalPayable(actualContribution, memberships) {
    return actualContribution * memberships;
}

/**
 * Calculate payout to the winner
 * @param {number} totalAmount - Total committee amount
 * @param {number} winningBid - Winning bid amount
 * @returns {number} Payout amount
 */
function calculatePayout(totalAmount, winningBid) {
    return Math.max(0, totalAmount - winningBid);
}

/**
 * Calculate contribution gain for a month
 * @param {number} baseContribution - Base contribution per member
 * @param {number} actualContribution - Actual contribution per member
 * @returns {number} Contribution gain
 */
function calculateContributionGain(baseContribution, actualContribution) {
    return baseContribution - actualContribution;
}

/**
 * Calculate net gain/loss for a user in a cycle
 * @param {number} previousTotalGain - Cumulative gain before this cycle
 * @param {number} contributionGain - Gain from this month's contribution
 * @param {number} winningBid - Winning bid (cost to win)
 * @param {boolean} userWon - Whether user won this month
 * @returns {number} New total gain/loss
 */
function calculateCycleNetGain(previousTotalGain, contributionGain, winningBid, userWon) {
    const bidCost = userWon ? winningBid : 0;
    return previousTotalGain + contributionGain - bidCost;
}

/**
 * Calculate cumulative gain over multiple cycles
 * @param {Array} cycleGains - Array of gains per cycle
 * @returns {number} Cumulative gain
 */
function calculateCumulativeGain(cycleGains) {
    return cycleGains.reduce((sum, gain) => sum + gain, 0);
}

/**
 * Check if user can win this month (max 1 win per month)
 * @param {Object} userWinsByMonth - Object tracking wins per month
 * @param {string} month - Month string (YYYY-MM)
 * @returns {boolean} Whether user can win
 */
function canUserWinThisMonth(userWinsByMonth, month) {
    return !userWinsByMonth[month];
}

/**
 * Check if user has reached maximum allowed wins
 * @param {number} totalWins - Total wins so far
 * @param {number} memberships - Number of memberships held
 * @returns {boolean} Whether user has reached max wins
 */
function hasReachedMaxWins(totalWins, memberships) {
    return totalWins >= memberships;
}

/**
 * Validate bid against limits
 * @param {number} bid - Bid amount
 * @param {number} minBid - Minimum allowed bid (optional)
 * @param {number} maxBid - Maximum allowed bid (optional)
 * @returns {Object} Validation result
 */
function validateBid(bid, minBid = null, maxBid = null) {
    const result = { valid: true, warnings: [] };
    
    if (bid < 0) {
        result.valid = false;
        result.warnings.push('Bid cannot be negative');
    }
    
    if (minBid !== null && bid < minBid) {
        result.warnings.push(`Bid is below minimum allowed (${formatCurrency(minBid)})`);
    }
    
    if (maxBid !== null && bid > maxBid) {
        result.warnings.push(`Bid exceeds maximum allowed (${formatCurrency(maxBid)})`);
    }
    
    return result;
}

/**
 * Get committee progress summary
 * @param {number} completedCycles - Number of completed cycles
 * @param {number} totalCycles - Total number of cycles
 * @returns {Object} Progress summary
 */
function getCommitteeProgress(completedCycles, totalCycles) {
    const remaining = Math.max(0, totalCycles - completedCycles);
    const progress = totalCycles > 0 ? (completedCycles / totalCycles * 100) : 0;
    
    return {
        completed: completedCycles,
        remaining: remaining,
        total: totalCycles,
        progress: Math.min(progress, 100),
        status: completedCycles >= totalCycles ? 'completed' : 'active'
    };
}

/**
 * Format committee month for display
 * @param {string} monthStr - ISO date string
 * @returns {string} Formatted month
 */
function formatCommitteeMonth(monthStr) {
    return formatMonth(monthStr);
}

/**
 * Get status label for committee cycle
 * @param {string} status - Cycle status
 * @returns {string} Human-readable status
 */
function getCycleStatusLabel(status) {
    const labels = {
        'pending': '⏳ Pending',
        'completed': '✅ Completed',
        'skipped': '⏭️ Skipped',
        'no_bid': '🚫 No Bid'
    };
    return labels[status] || status;
}

/**
 * Check if a cycle has a valid bid
 * @param {Object} cycle - Cycle object
 * @returns {boolean} Whether bid exists
 */
function hasValidBid(cycle) {
    return cycle.winningBid !== null && cycle.winningBid > 0;
}

/**
 * Calculate total gain from all completed cycles
 * @param {Array} cycles - Array of cycles
 * @returns {number} Total gain
 */
function calculateTotalGain(cycles) {
    return cycles
        .filter(c => c.status === 'completed')
        .reduce((sum, c) => sum + (c.netGain || 0), 0);
}

/**
 * Calculate total paid so far
 * @param {Array} cycles - Array of cycles
 * @returns {number} Total paid
 */
function calculateTotalPaid(cycles) {
    return cycles
        .filter(c => c.status === 'completed')
        .reduce((sum, c) => sum + (c.payable || 0), 0);
}

/**
 * Calculate total received so far
 * @param {Array} cycles - Array of cycles
 * @returns {number} Total received
 */
function calculateTotalReceived(cycles) {
    return cycles
        .filter(c => c.status === 'completed' && c.userWon)
        .reduce((sum, c) => sum + (c.payout || 0), 0);
}

/**
 * Get best gain cycle
 * @param {Array} cycles - Array of cycles
 * @returns {Object|null} Best gain cycle
 */
function getBestGainCycle(cycles) {
    const completed = cycles.filter(c => c.status === 'completed' && c.contributionGain > 0);
    if (completed.length === 0) return null;
    return completed.reduce((best, c) => 
        (c.contributionGain > best.contributionGain) ? c : best
    );
}

/**
 * Get highest bid cycle
 * @param {Array} cycles - Array of cycles
 * @returns {Object|null} Highest bid cycle
 */
function getHighestBidCycle(cycles) {
    const withBid = cycles.filter(c => c.winningBid > 0);
    if (withBid.length === 0) return null;
    return withBid.reduce((best, c) => 
        (c.winningBid > best.winningBid) ? c : best
    );
}