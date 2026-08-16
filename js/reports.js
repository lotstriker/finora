// ============================================
// FINORA — Reports
// ============================================

async function loadReports() {
    const container = document.getElementById('pageContainer');
    
    // Default to current month
    const now = new Date();
    const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    
    const html = `
        <div class="reports-page">
            <div class="page-header">
                <h2>Reports</h2>
                <div class="report-controls">
                    <select class="form-control" id="reportPeriod" style="width:auto;">
                        <option value="month">Current Month</option>
                        <option value="lastmonth">Previous Month</option>
                        <option value="year">Current Year</option>
                        <option value="all">All Time</option>
                        <option value="custom">Custom Range</option>
                    </select>
                    <div id="customRange" style="display:none;display:flex;gap:8px;align-items:center;">
                        <input type="date" class="form-control" id="reportDateFrom" style="width:auto;" />
                        <span>to</span>
                        <input type="date" class="form-control" id="reportDateTo" style="width:auto;" />
                        <button class="btn btn-sm btn-primary" onclick="refreshReport()">Apply</button>
                    </div>
                    <button class="btn btn-sm btn-secondary" onclick="refreshReport()">
                        <i class="fas fa-sync"></i> Refresh
                    </button>
                </div>
            </div>
            
            <div id="reportContent">
                <!-- Report content will be loaded here -->
                <div class="text-center text-muted" style="padding:40px;">Loading reports...</div>
            </div>
        </div>
    `;
    
    container.innerHTML = html;
    
    // Add styles
    const style = document.createElement('style');
    style.textContent = `
        .report-controls {
            display: flex;
            gap: 12px;
            align-items: center;
            flex-wrap: wrap;
        }
        #customRange {
            display: none;
            align-items: center;
            gap: 8px;
        }
        .report-section {
            margin-bottom: 24px;
        }
        .report-section h3 {
            font-size: 1.1rem;
            font-weight: 600;
            margin-bottom: 12px;
        }
        .report-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
            gap: 12px;
        }
        .report-stat {
            background: var(--bg-card);
            padding: 16px 20px;
            border-radius: var(--radius);
            border: 1px solid var(--border);
        }
        .report-stat .label {
            font-size: 0.8rem;
            color: var(--text-muted);
        }
        .report-stat .value {
            font-size: 1.4rem;
            font-weight: 700;
        }
        .report-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 0.9rem;
        }
        .report-table th {
            text-align: left;
            padding: 8px 12px;
            border-bottom: 2px solid var(--border);
            font-weight: 600;
            color: var(--text-secondary);
        }
        .report-table td {
            padding: 8px 12px;
            border-bottom: 1px solid var(--border);
        }
        .report-table tr:hover {
            background: var(--primary-light);
        }
        .report-table .clickable {
            cursor: pointer;
            color: var(--primary);
        }
        .report-table .clickable:hover {
            text-decoration: underline;
        }
        .report-highlight {
            background: var(--bg-card);
            border-radius: var(--radius);
            padding: 16px 20px;
            border: 1px solid var(--border);
            margin-bottom: 12px;
        }
        .report-highlight .label {
            font-size: 0.8rem;
            color: var(--text-muted);
        }
        .report-highlight .value {
            font-size: 1.2rem;
            font-weight: 700;
        }
    `;
    document.getElementById('page-style').textContent = style.textContent;
    
    // Setup event listeners
    document.getElementById('reportPeriod').addEventListener('change', function() {
        const customRange = document.getElementById('customRange');
        if (this.value === 'custom') {
            customRange.style.display = 'flex';
        } else {
            customRange.style.display = 'none';
        }
        refreshReport();
    });
    
    // Load initial report
    setTimeout(refreshReport, 100);
}

async function refreshReport() {
    const container = document.getElementById('reportContent');
    container.innerHTML = '<div class="text-center text-muted" style="padding:40px;">Loading...</div>';
    
    try {
        // Get date range
        let dateFrom, dateTo;
        const period = document.getElementById('reportPeriod').value;
        const now = new Date();
        
        if (period === 'month') {
            dateFrom = getMonthStart(now);
            dateTo = getMonthEnd(now);
        } else if (period === 'lastmonth') {
            const lastMonth = new Date(now);
            lastMonth.setMonth(lastMonth.getMonth() - 1);
            dateFrom = getMonthStart(lastMonth);
            dateTo = getMonthEnd(lastMonth);
        } else if (period === 'year') {
            const year = now.getFullYear();
            dateFrom = `${year}-01-01`;
            dateTo = `${year}-12-31`;
        } else if (period === 'all') {
            dateFrom = '2000-01-01';
            dateTo = new Date().toISOString();
        } else if (period === 'custom') {
            dateFrom = document.getElementById('reportDateFrom').value;
            dateTo = document.getElementById('reportDateTo').value;
            if (!dateFrom || !dateTo) {
                container.innerHTML = '<div class="text-center text-muted" style="padding:40px;">Please select a date range</div>';
                return;
            }
        }
        
        // Get data
        const summary = await getPeriodSummary(dateFrom, dateTo);
        const incomeBreakdown = await getCategoryBreakdown('income', dateFrom, dateTo);
        const expenseBreakdown = await getCategoryBreakdown('expense', dateFrom, dateTo);
        const topIncome = await getTopTransactions('income', 10);
        const topExpenses = await getTopTransactions('expense', 10);
        const allTxns = await getLedgerEntries({ dateFrom, dateTo });
        
        // Get accounts
        const db = getDB();
        const accounts = await db.readAll('accounts');
        const accountMap = {};
        accounts.forEach(a => accountMap[a.id] = a.name);
        
        // Get categories
        const categories = await db.readAll('categories');
        const catMap = {};
        categories.forEach(c => catMap[c.id] = c.name);
        
        // Build report
        const periodLabel = getPeriodLabel(period, dateFrom, dateTo);
        
        let html = `
            <div class="report-header">
                <h3>${periodLabel}</h3>
                <span class="text-muted">${allTxns.length} transactions</span>
            </div>
            
            <!-- Summary Stats -->
            <div class="report-grid" style="margin-bottom:24px;">
                <div class="report-stat">
                    <div class="label">Total Income</div>
                    <div class="value text-success">${formatCurrency(summary.income)}</div>
                </div>
                <div class="report-stat">
                    <div class="label">Total Expenses</div>
                    <div class="value text-danger">${formatCurrency(summary.expense)}</div>
                </div>
                <div class="report-stat">
                    <div class="label">Net Cash Flow</div>
                    <div class="value ${summary.net >= 0 ? 'text-success' : 'text-danger'}">${formatCurrency(summary.net)}</div>
                </div>
                <div class="report-stat">
                    <div class="label">Transactions</div>
                    <div class="value">${allTxns.length}</div>
                </div>
            </div>
            
            <!-- Highlights -->
            ${allTxns.length > 0 ? `
                <div class="report-section">
                    <h3>🏆 Highlights</h3>
                    <div class="report-grid">
                        ${topIncome.length > 0 ? `
                            <div class="report-highlight" onclick="viewTransaction('${topIncome[0].id}')" style="cursor:pointer;">
                                <div class="label">Highest Income</div>
                                <div class="value text-success">${formatCurrency(topIncome[0].amount)}</div>
                                <div class="text-muted" style="font-size:0.8rem;">${topIncome[0].description || topIncome[0].type}</div>
                            </div>
                        ` : ''}
                        ${topExpenses.length > 0 ? `
                            <div class="report-highlight" onclick="viewTransaction('${topExpenses[0].id}')" style="cursor:pointer;">
                                <div class="label">Highest Expense</div>
                                <div class="value text-danger">${formatCurrency(topExpenses[0].amount)}</div>
                                <div class="text-muted" style="font-size:0.8rem;">${topExpenses[0].description || topExpenses[0].type}</div>
                            </div>
                        ` : ''}
                        ${allTxns.length > 0 ? `
                            <div class="report-highlight">
                                <div class="label">Average Transaction</div>
                                <div class="value">${formatCurrency(allTxns.reduce((s, t) => s + t.amount, 0) / allTxns.length)}</div>
                            </div>
                        ` : ''}
                    </div>
                </div>
            ` : ''}
            
            <!-- Income Breakdown -->
            <div class="report-section">
                <h3>💰 Income Breakdown</h3>
                ${incomeBreakdown.length > 0 ? `
                    <table class="report-table">
                        <thead>
                            <tr><th>Category</th><th>Amount</th><th>Count</th><th>%</th></tr>
                        </thead>
                        <tbody>
                            ${incomeBreakdown.map(c => `
                                <tr>
                                    <td>${c.name}</td>
                                    <td class="text-success">${formatCurrency(c.amount)}</td>
                                    <td>${c.count}</td>
                                    <td>${summary.income > 0 ? Math.round(c.amount / summary.income * 100) : 0}%</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                ` : '<div class="text-muted">No income transactions</div>'}
            </div>
            
            <!-- Expense Breakdown -->
            <div class="report-section">
                <h3>📊 Expense Breakdown</h3>
                ${expenseBreakdown.length > 0 ? `
                    <table class="report-table">
                        <thead>
                            <tr><th>Category</th><th>Amount</th><th>Count</th><th>%</th></tr>
                        </thead>
                        <tbody>
                            ${expenseBreakdown.map(c => `
                                <tr>
                                    <td>${c.name}</td>
                                    <td class="text-danger">${formatCurrency(c.amount)}</td>
                                    <td>${c.count}</td>
                                    <td>${summary.expense > 0 ? Math.round(c.amount / summary.expense * 100) : 0}%</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                ` : '<div class="text-muted">No expense transactions</div>'}
            </div>
            
            <!-- Top Expenses List -->
            <div class="report-section">
                <h3>🔝 Top Expenses</h3>
                ${topExpenses.length > 0 ? `
                    <table class="report-table">
                        <thead>
                            <tr><th>Description</th><th>Amount</th><th>Date</th><th>Account</th></tr>
                        </thead>
                        <tbody>
                            ${topExpenses.map(e => `
                                <tr onclick="viewTransaction('${e.id}')" style="cursor:pointer;">
                                    <td>${e.description || e.type}</td>
                                    <td class="text-danger">${formatCurrency(e.amount)}</td>
                                    <td>${formatDate(e.date)}</td>
                                    <td>${accountMap[e.accountId] || 'Unknown'}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                ` : '<div class="text-muted">No expenses to show</div>'}
            </div>
            
            <!-- Top Income List -->
            <div class="report-section">
                <h3>🔝 Top Income</h3>
                ${topIncome.length > 0 ? `
                    <table class="report-table">
                        <thead>
                            <tr><th>Description</th><th>Amount</th><th>Date</th><th>Account</th></tr>
                        </thead>
                        <tbody>
                            ${topIncome.map(e => `
                                <tr onclick="viewTransaction('${e.id}')" style="cursor:pointer;">
                                    <td>${e.description || e.type}</td>
                                    <td class="text-success">${formatCurrency(e.amount)}</td>
                                    <td>${formatDate(e.date)}</td>
                                    <td>${accountMap[e.accountId] || 'Unknown'}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                ` : '<div class="text-muted">No income to show</div>'}
            </div>
        `;
        
        container.innerHTML = html;
        
    } catch (error) {
        console.error('Report error:', error);
        container.innerHTML = `<div class="text-center text-danger" style="padding:40px;">Failed to load report: ${error.message}</div>`;
    }
}

function getPeriodLabel(period, dateFrom, dateTo) {
    if (period === 'month') {
        return `📅 ${formatMonth(dateFrom)}`;
    } else if (period === 'lastmonth') {
        return `📅 ${formatMonth(dateFrom)}`;
    } else if (period === 'year') {
        return `📅 ${new Date(dateFrom).getFullYear()}`;
    } else if (period === 'all') {
        return '📅 All Time';
    } else if (period === 'custom') {
        return `📅 ${formatDate(dateFrom)} - ${formatDate(dateTo)}`;
    }
    return '📅 Report';
}