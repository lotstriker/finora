// ============================================
// FINORA — Recurring Calculator (Complete)
// ============================================

/**
 * Calculate next due date for fixed schedule
 * @param {string} lastDate - Last payment date
 * @param {string} frequency - 'weekly', 'monthly', 'quarterly', 'yearly'
 * @param {number} day - Day of month (for monthly)
 * @returns {Date} Next due date
 */
function calculateNextDueFixed(lastDate, frequency, day = null) {
    const d = new Date(lastDate);
    
    switch(frequency) {
        case 'weekly':
            d.setDate(d.getDate() + 7);
            break;
        case 'monthly':
            d.setMonth(d.getMonth() + 1);
            if (day && day > 0 && day <= 31) {
                // Set to the specified day, but handle month boundaries
                const maxDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
                d.setDate(Math.min(day, maxDay));
            }
            break;
        case 'quarterly':
            d.setMonth(d.getMonth() + 3);
            break;
        case 'yearly':
            d.setFullYear(d.getFullYear() + 1);
            break;
        default:
            d.setMonth(d.getMonth() + 1);
    }
    
    // Normalize time
    d.setHours(0, 0, 0, 0);
    return d;
}

/**
 * Calculate next due date for validity-based schedule
 * @param {string} lastDate - Last payment date
 * @param {number} validityDays - Number of days validity
 * @returns {Date} Next due date
 */
function calculateNextDueValidity(lastDate, validityDays) {
    const d = new Date(lastDate);
    d.setDate(d.getDate() + validityDays);
    d.setHours(0, 0, 0, 0);
    return d;
}

/**
 * Check if payment is due (with optional buffer)
 * @param {string} nextDue - Next due date
 * @param {number} bufferDays - Days before due to consider as due
 * @returns {boolean} Whether payment is due
 */
function isPaymentDue(nextDue, bufferDays = 0) {
    if (!nextDue) return false;
    const today = new Date();
    const due = new Date(nextDue);
    today.setHours(0, 0, 0, 0);
    due.setHours(0, 0, 0, 0);
    const diffDays = (today - due) / (1000 * 60 * 60 * 24);
    return diffDays >= -bufferDays;
}

/**
 * Get days until payment is due
 * @param {string} nextDue - Next due date
 * @returns {number} Days until due (negative if overdue)
 */
function getDaysUntilDue(nextDue) {
    if (!nextDue) return Infinity;
    const today = new Date();
    const due = new Date(nextDue);
    today.setHours(0, 0, 0, 0);
    due.setHours(0, 0, 0, 0);
    return Math.ceil((due - today) / (1000 * 60 * 60 * 24));
}

/**
 * Check if payment is overdue
 * @param {string} nextDue - Next due date
 * @returns {boolean} Whether payment is overdue
 */
function isOverdue(nextDue) {
    if (!nextDue) return false;
    const today = new Date();
    const due = new Date(nextDue);
    today.setHours(0, 0, 0, 0);
    due.setHours(0, 0, 0, 0);
    return today > due;
}

/**
 * Calculate next payment date from a given date
 * @param {string|Date} currentDate - Current date
 * @param {Object} rule - Recurring rule object
 * @returns {Date} Next payment date
 */
function calculateNextPayment(currentDate, rule) {
    const date = new Date(currentDate);
    date.setHours(0, 0, 0, 0);
    
    if (rule.type === 'fixed') {
        return calculateNextDueFixed(date, rule.frequency, rule.day);
    } else if (rule.type === 'validity') {
        return calculateNextDueValidity(date, rule.validityDays);
    }
    return calculateNextDueFixed(date, 'monthly');
}

/**
 * Get payment status text for display
 * @param {string} nextDue - Next due date
 * @returns {string} Status text
 */
function getPaymentStatusText(nextDue) {
    if (!nextDue) return '⚪ No due date';
    
    const days = getDaysUntilDue(nextDue);
    
    if (days < -30) return '🔴 Severely Overdue';
    if (days < 0) return `🔴 Overdue by ${Math.abs(days)} days`;
    if (days === 0) return '🟡 Due Today';
    if (days <= 3) return `🟠 Due in ${days} days`;
    if (days <= 7) return `🟡 Due in ${days} days`;
    if (days <= 30) return `⚪ Due in ${days} days`;
    return `⚪ Due in ${days} days`;
}

/**
 * Format frequency for display
 * @param {Object} rule - Recurring rule
 * @returns {string} Human-readable frequency
 */
function formatFrequency(rule) {
    if (rule.type === 'fixed') {
        const map = {
            'weekly': 'Weekly',
            'monthly': 'Monthly',
            'quarterly': 'Quarterly',
            'yearly': 'Yearly'
        };
        return map[rule.frequency] || rule.frequency;
    } else if (rule.type === 'validity') {
        return `Every ${rule.validityDays} days`;
    }
    return 'Unknown';
}

/**
 * Get next occurrence count
 * @param {Array} history - Payment history
 * @returns {number} Next occurrence number
 */
function getNextOccurrence(history) {
    return (history || []).length + 1;
}

/**
 * Calculate total paid for a recurring rule
 * @param {Array} payments - Payment history
 * @returns {number} Total amount paid
 */
function getTotalPaidForRule(payments) {
    return payments.reduce((sum, p) => sum + p.amount, 0);
}

/**
 * Get payment history with dates
 * @param {Array} payments - Payment history
 * @returns {Array} Formatted payment history
 */
function formatPaymentHistory(payments) {
    return payments.map(p => ({
        ...p,
        dateFormatted: formatDate(p.date),
        amountFormatted: formatCurrency(p.amount)
    }));
}

/**
 * Check if a rule should be marked as completed
 * @param {string} status - Current status
 * @param {number} endDate - End date (if any)
 * @returns {boolean} Whether rule is completed
 */
function isRuleCompleted(status, endDate) {
    if (status === 'completed') return true;
    if (!endDate) return false;
    const today = new Date();
    const end = new Date(endDate);
    today.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);
    return today > end;
}

/**
 * Estimate next payment date based on history
 * @param {Array} history - Payment history
 * @param {Object} rule - Recurring rule
 * @returns {Date|null} Estimated next payment
 */
function estimateNextPayment(history, rule) {
    if (history.length === 0) {
        return rule.startDate ? new Date(rule.startDate) : null;
    }
    
    const last = history[history.length - 1];
    return calculateNextPayment(last.date, rule);
}

/**
 * Get payment urgency level
 * @param {string} nextDue - Next due date
 * @returns {string} Urgency level: 'critical', 'warning', 'info', 'none'
 */
function getPaymentUrgency(nextDue) {
    if (!nextDue) return 'none';
    const days = getDaysUntilDue(nextDue);
    
    if (days < 0) return 'critical';
    if (days <= 3) return 'warning';
    if (days <= 7) return 'info';
    return 'none';
}