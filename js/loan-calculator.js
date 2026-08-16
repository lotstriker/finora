// ============================================
// FINORA — Loan Calculator (Complete)
// ============================================

/**
 * Calculate EMI using standard formula
 * EMI = P * r * (1+r)^n / ((1+r)^n - 1)
 * @param {number} principal - Loan principal amount
 * @param {number} annualRate - Annual interest rate in percentage
 * @param {number} months - Number of months
 * @returns {number} Monthly EMI amount
 */
function calculateEMI(principal, annualRate, months) {
    if (!principal || principal <= 0) return 0;
    if (!months || months <= 0) return 0;
    
    // If rate is 0 or not provided, simple division
    if (!annualRate || annualRate === 0) {
        return principal / months;
    }
    
    const monthlyRate = annualRate / 12 / 100;
    const power = Math.pow(1 + monthlyRate, months);
    return (principal * monthlyRate * power) / (power - 1);
}

/**
 * Calculate total interest payable over loan tenure
 * @param {number} principal - Loan principal amount
 * @param {number} emi - Monthly EMI amount
 * @param {number} months - Number of months
 * @returns {number} Total interest
 */
function calculateTotalInterest(principal, emi, months) {
    if (!principal || !emi || !months) return 0;
    return Math.max(0, (emi * months) - principal);
}

/**
 * Calculate total payment over loan tenure
 * @param {number} emi - Monthly EMI amount
 * @param {number} months - Number of months
 * @returns {number} Total payment
 */
function calculateTotalPayment(emi, months) {
    return emi * months;
}

/**
 * Get remaining balance after N payments
 * @param {number} principal - Original principal
 * @param {number} annualRate - Annual interest rate
 * @param {number} emi - Monthly EMI
 * @param {number} paidMonths - Number of months paid
 * @returns {number} Remaining balance
 */
function getRemainingBalance(principal, annualRate, emi, paidMonths) {
    if (!principal || paidMonths <= 0) return principal;
    
    // If rate is 0, simple subtraction
    if (!annualRate || annualRate === 0) {
        return Math.max(0, principal - (emi * paidMonths));
    }
    
    const monthlyRate = annualRate / 12 / 100;
    const power = Math.pow(1 + monthlyRate, paidMonths);
    const balance = (principal * power) - (emi * (power - 1) / monthlyRate);
    return Math.max(0, balance);
}

/**
 * Check if current payment is the final EMI
 * @param {number} remainingBalance - Remaining loan balance
 * @param {number} monthlyEMI - Scheduled monthly EMI
 * @returns {boolean} Whether this is the final EMI
 */
function isFinalEMI(remainingBalance, monthlyEMI) {
    return remainingBalance <= monthlyEMI && remainingBalance > 0;
}

/**
 * Calculate final EMI amount
 * @param {number} remainingBalance - Remaining loan balance
 * @param {number} monthlyEMI - Scheduled monthly EMI
 * @returns {number} Final EMI amount
 */
function calculateFinalEMI(remainingBalance, monthlyEMI) {
    if (remainingBalance <= 0) return 0;
    return Math.min(remainingBalance, monthlyEMI);
}

/**
 * Calculate remaining months based on current balance
 * @param {number} remainingBalance - Remaining loan balance
 * @param {number} emi - Monthly EMI
 * @returns {number} Remaining months
 */
function calculateRemainingMonths(remainingBalance, emi) {
    if (remainingBalance <= 0) return 0;
    if (!emi || emi <= 0) return 0;
    return Math.ceil(remainingBalance / emi);
}

/**
 * Generate amortization schedule
 * @param {number} principal - Loan principal
 * @param {number} annualRate - Annual interest rate
 * @param {number} months - Number of months
 * @returns {Array} Amortization schedule
 */
function generateAmortizationSchedule(principal, annualRate, months) {
    if (!principal || !months) return [];
    
    const monthlyRate = annualRate ? annualRate / 12 / 100 : 0;
    const emi = calculateEMI(principal, annualRate, months);
    const schedule = [];
    
    let balance = principal;
    let totalInterest = 0;
    let totalPrincipal = 0;
    
    for (let i = 1; i <= months; i++) {
        const interest = balance * monthlyRate;
        const principalPaid = emi - interest;
        balance -= principalPaid;
        totalInterest += interest;
        totalPrincipal += principalPaid;
        
        schedule.push({
            installment: i,
            emi: Math.round(emi * 100) / 100,
            principalPaid: Math.round(Math.max(0, principalPaid) * 100) / 100,
            interestPaid: Math.round(Math.max(0, interest) * 100) / 100,
            remainingBalance: Math.round(Math.max(0, balance) * 100) / 100,
            totalInterest: Math.round(totalInterest * 100) / 100,
            totalPaid: Math.round((totalPrincipal + totalInterest) * 100) / 100,
            interestPercentage: emi > 0 ? Math.round((interest / emi) * 100) : 0
        });
        
        if (balance <= 0) break;
    }
    
    return schedule;
}

/**
 * Get payment status label
 * @param {string} status - Payment status
 * @param {string} dueDate - Due date
 * @param {string} paidDate - Paid date (if any)
 * @returns {string} Human-readable status
 */
function getPaymentStatusLabel(status, dueDate, paidDate) {
    if (status === 'paid') {
        return paidDate ? `✅ Paid on ${formatDate(paidDate)}` : '✅ Paid';
    }
    if (status === 'pending' && dueDate) {
        const days = getDaysUntil(dueDate);
        if (days < 0) return '🔴 Overdue';
        if (days === 0) return '🟡 Due Today';
        if (days <= 7) return `🟠 Due in ${days} days`;
        return `⚪ Due in ${days} days`;
    }
    return '⏸️ Unknown';
}

/**
 * Get days until a date
 * @param {string} dateStr - Date string
 * @returns {number} Days until date
 */
function getDaysUntil(dateStr) {
    const today = new Date();
    const target = new Date(dateStr);
    return Math.ceil((target - today) / (1000 * 60 * 60 * 24));
}

/**
 * Check if an installment is overdue
 * @param {string} dueDate - Due date
 * @param {string} status - Payment status
 * @returns {boolean} Whether installment is overdue
 */
function isInstallmentOverdue(dueDate, status) {
    if (status === 'paid') return false;
    const today = new Date();
    const due = new Date(dueDate);
    return today > due;
}

/**
 * Calculate loan progress
 * @param {number} paidMonths - Number of months paid
 * @param {number} totalMonths - Total months
 * @returns {Object} Progress info
 */
function getLoanProgress(paidMonths, totalMonths) {
    const remaining = Math.max(0, totalMonths - paidMonths);
    const progress = totalMonths > 0 ? (paidMonths / totalMonths * 100) : 0;
    
    return {
        paidMonths: paidMonths,
        remainingMonths: remaining,
        totalMonths: totalMonths,
        progress: Math.min(progress, 100)
    };
}

/**
 * Get next payment date based on payment history
 * @param {Array} installments - Array of installment objects
 * @returns {string|null} Next due date
 */
function getNextPaymentDate(installments) {
    const pending = installments.filter(i => i.status === 'pending');
    if (pending.length === 0) return null;
    pending.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
    return pending[0].dueDate;
}

/**
 * Get number of installments remaining
 * @param {Array} installments - Array of installment objects
 * @returns {number} Number of pending installments
 */
function getRemainingInstallments(installments) {
    return installments.filter(i => i.status === 'pending').length;
}