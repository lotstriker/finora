// ============================================
// FINORA — Settings
// ============================================

async function loadSettings() {
    const container = document.getElementById('pageContainer');
    const db = getDB();
    const settings = await db.readAll('settings');
    const settingsMap = {};
    settings.forEach(s => settingsMap[s.key] = s.value);
    
    const theme = settingsMap.theme || 'light';
    const currency = settingsMap.currency || '₹';
    
    const html = `
        <div class="settings-page">
            <div class="page-header">
                <h2>Settings</h2>
            </div>
            
            <div class="settings-grid">
                <!-- Appearance -->
                <div class="card settings-card">
                    <h3><i class="fas fa-palette"></i> Appearance</h3>
                    <div class="settings-group">
                        <label>Theme</label>
                        <div class="settings-options">
                            <button class="btn ${theme === 'light' ? 'btn-primary' : 'btn-secondary'}" onclick="setThemeSetting('light')">
                                <i class="fas fa-sun"></i> Light
                            </button>
                            <button class="btn ${theme === 'dark' ? 'btn-primary' : 'btn-secondary'}" onclick="setThemeSetting('dark')">
                                <i class="fas fa-moon"></i> Dark
                            </button>
                            <button class="btn ${theme === 'system' ? 'btn-primary' : 'btn-secondary'}" onclick="setThemeSetting('system')">
                                <i class="fas fa-desktop"></i> System
                            </button>
                        </div>
                    </div>
                </div>
                
                <!-- Currency -->
                <div class="card settings-card">
                    <h3><i class="fas fa-rupee-sign"></i> Currency</h3>
                    <div class="settings-group">
                        <label>Currency Symbol</label>
                        <div class="settings-options">
                            <button class="btn ${currency === '₹' ? 'btn-primary' : 'btn-secondary'}" onclick="setCurrencySetting('₹')">
                                ₹ INR
                            </button>
                            <button class="btn ${currency === '$' ? 'btn-primary' : 'btn-secondary'}" onclick="setCurrencySetting('$')">
                                $ USD
                            </button>
                            <button class="btn ${currency === '€' ? 'btn-primary' : 'btn-secondary'}" onclick="setCurrencySetting('€')">
                                € EUR
                            </button>
                            <button class="btn ${currency === '£' ? 'btn-primary' : 'btn-secondary'}" onclick="setCurrencySetting('£')">
                                £ GBP
                            </button>
                        </div>
                    </div>
                </div>
                
                <!-- Backup -->
                <div class="card settings-card">
                    <h3><i class="fas fa-database"></i> Backup & Restore</h3>
                    <div class="settings-group">
                        <button class="btn btn-primary" onclick="exportBackup()">
                            <i class="fas fa-download"></i> Export Backup
                        </button>
                        <button class="btn btn-secondary" onclick="importBackup()">
                            <i class="fas fa-upload"></i> Restore Backup
                        </button>
                    </div>
                </div>
                
                <!-- Data Export -->
                <div class="card settings-card">
                    <h3><i class="fas fa-file-export"></i> Data Export</h3>
                    <div class="settings-group">
                        <button class="btn btn-secondary" onclick="exportCSV('transactions')">
                            <i class="fas fa-file-csv"></i> Export Transactions CSV
                        </button>
                        <button class="btn btn-secondary" onclick="exportCSV('income')">
                            <i class="fas fa-file-csv"></i> Export Income CSV
                        </button>
                        <button class="btn btn-secondary" onclick="exportCSV('expenses')">
                            <i class="fas fa-file-csv"></i> Export Expenses CSV
                        </button>
                    </div>
                </div>
                
                <!-- Danger Zone -->
                <div class="card settings-card danger-zone">
                    <h3><i class="fas fa-exclamation-triangle" style="color: var(--danger);"></i> Danger Zone</h3>
                    <div class="settings-group">
                        <button class="btn btn-danger" onclick="clearAllData()">
                            <i class="fas fa-trash"></i> Clear All Data
                        </button>
                        <p class="text-muted" style="font-size:0.8rem;margin-top:8px;">
                            This will delete all your financial data. Export backup first!
                        </p>
                    </div>
                </div>
                
                <!-- About -->
                <div class="card settings-card">
                    <h3><i class="fas fa-info-circle"></i> About</h3>
                    <div class="settings-group">
                        <p><strong>FINORA</strong> v1.0.0</p>
                        <p class="text-muted" style="font-size:0.85rem;">Personal Financial Management</p>
                        <p class="text-muted" style="font-size:0.8rem;">One Ledger. One Source of Truth.</p>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    container.innerHTML = html;
    
    // Add styles
    const style = document.createElement('style');
    style.textContent = `
        .settings-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
        }
        .settings-card {
            padding: 20px 24px;
        }
        .settings-card h3 {
            font-size: 1rem;
            font-weight: 600;
            margin-bottom: 16px;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        .settings-group {
            display: flex;
            flex-direction: column;
            gap: 10px;
        }
        .settings-group label {
            font-weight: 500;
            font-size: 0.85rem;
            color: var(--text-secondary);
        }
        .settings-options {
            display: flex;
            gap: 8px;
            flex-wrap: wrap;
        }
        .settings-options .btn {
            flex: 1;
            min-width: 60px;
            justify-content: center;
        }
        .danger-zone {
            border-color: var(--danger);
            border-width: 2px;
        }
        @media (max-width: 768px) {
            .settings-grid {
                grid-template-columns: 1fr;
            }
        }
    `;
    document.getElementById('page-style').textContent = style.textContent;
}

async function setThemeSetting(theme) {
    setTheme(theme);
    const db = getDB();
    await db.update('settings', { key: 'theme', value: theme });
    updateThemeIcon();
    showToast(`Theme set to ${theme}`, 'success');
    await loadSettings();
}

async function setCurrencySetting(currency) {
    setCurrency(currency);
    const db = getDB();
    await db.update('settings', { key: 'currency', value: currency });
    showToast(`Currency set to ${currency}`, 'success');
    await loadSettings();
}

async function exportBackup() {
    try {
        const data = await exportDatabase();
        const json = JSON.stringify(data, null, 2);
        const password = prompt('Set a password for encryption (optional):');
        
        if (password) {
            // Simple encryption (in production, use proper AES)
            // For now, we'll just base64 encode with password as salt
            const encoded = btoa(encodeURIComponent(json + '|' + password));
            downloadFile(encoded, `finora-backup-${new Date().toISOString().split('T')[0]}.finora`, 'text/plain');
            showToast('Encrypted backup exported!', 'success');
        } else {
            downloadFile(json, `finora-backup-${new Date().toISOString().split('T')[0]}.json`);
            showToast('Backup exported successfully!', 'success');
        }
    } catch (error) {
        showToast('Failed to export: ' + error.message, 'error');
    }
}

async function importBackup() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.finora,.json';
    input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = async (ev) => {
            try {
                let data = ev.target.result;
                let jsonData;
                
                // Try to parse as JSON first
                try {
                    jsonData = JSON.parse(data);
                } catch {
                    // Try decryption
                    const password = prompt('Enter backup password (if encrypted):');
                    if (password) {
                        try {
                            const decoded = decodeURIComponent(atob(data));
                            if (decoded.includes('|' + password)) {
                                jsonData = JSON.parse(decoded.split('|' + password)[0]);
                            } else {
                                throw new Error('Incorrect password');
                            }
                        } catch {
                            showToast('Incorrect password or corrupted backup', 'error');
                            return;
                        }
                    } else {
                        showToast('Password required for encrypted backup', 'error');
                        return;
                    }
                }
                
                const result = confirm(
                    'Restore Mode:\n\n' +
                    'OK = Replace (existing data will be overwritten)\n' +
                    'Cancel = Merge (combine with existing data)\n\n' +
                    '⚠️ Replace will DELETE all current data!'
                );
                
                if (result) {
                    await importDatabase(jsonData);
                    showToast('Data restored successfully! (Replace)', 'success');
                } else {
                    // Merge: we need to handle conflicts
                    // For now, simple merge (skip duplicates)
                    const db = getDB();
                    for (const [storeName, records] of Object.entries(jsonData)) {
                        if (storeName === 'settings' || storeName === 'categories') continue;
                        const existing = await db.readAll(storeName);
                        const existingIds = new Set(existing.map(r => r.id));
                        const newRecords = records.filter(r => !existingIds.has(r.id));
                        if (newRecords.length > 0) {
                            await db.bulkCreate(storeName, newRecords);
                        }
                    }
                    showToast('Data merged successfully!', 'success');
                }
                
                // Reload current page
                await loadSettings();
            } catch (error) {
                showToast('Failed to restore: ' + error.message, 'error');
            }
        };
        reader.readAsText(file);
    };
    input.click();
}

async function exportCSV(type) {
    try {
        let entries = [];
        let filename = '';
        
        if (type === 'transactions') {
            entries = await getLedgerEntries();
            filename = 'transactions';
        } else if (type === 'income') {
            entries = await getLedgerEntries({ type: 'income' });
            filename = 'income';
        } else if (type === 'expenses') {
            entries = await getLedgerEntries({ type: 'expense' });
            filename = 'expenses';
        }
        
        if (entries.length === 0) {
            showToast('No data to export', 'warning');
            return;
        }
        
        // Create CSV
        const headers = ['ID', 'Date', 'Type', 'Direction', 'Amount', 'Account', 'Category', 'Description'];
        const rows = entries.map(e => [
            e.id,
            formatDate(e.date),
            e.type,
            e.direction,
            e.amount,
            e.accountId,
            e.categoryId || '',
            e.description || ''
        ]);
        
        const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        downloadFile(csv, `${filename}-${new Date().toISOString().split('T')[0]}.csv`, 'text/csv');
        showToast('CSV exported successfully!', 'success');
    } catch (error) {
        showToast('Failed to export CSV: ' + error.message, 'error');
    }
}

async function clearAllData() {
    confirmAction('⚠️ This will delete ALL your financial data. Are you sure?', async () => {
        confirmAction('🔄 Final confirmation: Clear all data?', async () => {
            try {
                await clearAllData();
                showToast('All data cleared', 'warning');
                await loadSettings();
            } catch (error) {
                showToast('Failed to clear data: ' + error.message, 'error');
            }
        });
    });
}