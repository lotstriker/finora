// ============================================
// FINORA — Main Application (COMPLETE)
// ============================================

// ----- App State -----
const App = {
    currentPage: 'dashboard',
    initialized: false,
    theme: 'light'
};

// ----- Page Handlers -----
const PAGE_HANDLERS = {
    'dashboard': loadDashboard,
    'transactions': loadTransactions,
    'accounts': loadAccounts,
    'income': loadIncome,
    'expenses': loadExpenses,
    'transfers': loadTransfers,
    'people': loadPeople,
    'loans': loadLoans,
    'bid-save': loadBidSave,
    'savings': loadSavings,
    'recurring': loadRecurring,
    'reports': loadReports,
    'settings': loadSettings
};

// ============================================
// INITIALIZE APP
// ============================================
async function initApp() {
    console.log('🚀 FINORA Initializing...');
    
    try {
        // Show loading state
        const container = document.getElementById('pageContainer');
        if (container) {
            container.innerHTML = `
                <div style="text-align:center;padding:60px 20px;">
                    <h2>⏳ Loading FINORA...</h2>
                    <p class="text-muted">Please wait...</p>
                </div>
            `;
        }
        
        // Initialize database
        console.log('📦 Initializing database...');
        await initDB();
        console.log('✅ Database initialized!');
        
        // Load settings
        await loadAppSettings();
        console.log('✅ Settings loaded!');
        
        // Setup event listeners
        setupEventListeners();
        console.log('✅ Event listeners setup!');
        
        // Load default page
        await navigateTo('dashboard');
        console.log('✅ Dashboard loaded!');
        
        // Update date
        const dateEl = document.getElementById('currentDate');
        if (dateEl) dateEl.textContent = formatDate(new Date());
        
        App.initialized = true;
        showToast('Welcome to FINORA! 🚀', 'success');
        
        console.log('🎉 FINORA is ready!');
        
    } catch (error) {
        console.error('❌ App initialization failed:', error);
        showToast('Failed to load FINORA. Please refresh.', 'error', 5000);
        
        // Show error on page
        const container = document.getElementById('pageContainer');
        if (container) {
            container.innerHTML = `
                <div style="text-align:center;padding:60px 20px;color:var(--danger);">
                    <h2>⚠️ Something went wrong</h2>
                    <p style="color:var(--text-secondary);">${error.message}</p>
                    <button class="btn btn-primary" onclick="location.reload()" style="margin-top:16px;">
                        <i class="fas fa-sync"></i> Refresh
                    </button>
                </div>
            `;
        }
    }
}

// ============================================
// LOAD APP SETTINGS
// ============================================
async function loadAppSettings() {
    try {
        const db = getDB();
        const settings = await db.readAll('settings');
        
        settings.forEach(s => {
            if (s.key === 'theme') {
                document.documentElement.setAttribute('data-theme', s.value);
                App.theme = s.value;
            }
            if (s.key === 'currency') {
                document.querySelectorAll('.currency-symbol').forEach(el => {
                    el.textContent = s.value;
                });
            }
        });
        
        updateThemeIcon();
    } catch (e) {
        console.warn('Settings load error:', e);
        // Default settings
        document.documentElement.setAttribute('data-theme', 'light');
        updateThemeIcon();
    }
}

// ============================================
// SETUP EVENT LISTENERS
// ============================================
function setupEventListeners() {
    // Sidebar navigation
    document.querySelectorAll('.sidebar-nav a').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const page = link.dataset.page;
            navigateTo(page);
        });
    });
    
    // Hamburger menu
    const hamburger = document.getElementById('hamburger');
    if (hamburger) {
        hamburger.addEventListener('click', () => {
            const sidebar = document.getElementById('sidebar');
            if (sidebar) sidebar.classList.toggle('open');
        });
    }
    
    // Close sidebar on outside click (mobile)
    document.addEventListener('click', (e) => {
        const sidebar = document.getElementById('sidebar');
        if (window.innerWidth <= 768 && sidebar && sidebar.classList.contains('open')) {
            if (!sidebar.contains(e.target) && !e.target.closest('.hamburger')) {
                sidebar.classList.remove('open');
            }
        }
    });
    
    // Theme toggle
    const themeBtn = document.getElementById('themeToggle');
    if (themeBtn) {
        themeBtn.addEventListener('click', () => {
            toggleTheme();
            try {
                const db = getDB();
                const theme = getTheme();
                db.update('settings', { key: 'theme', value: theme });
            } catch (e) {
                // DB not ready yet
            }
        });
    }
    
    // Modal close
    const modalClose = document.getElementById('modalClose');
    if (modalClose) {
        modalClose.addEventListener('click', closeModal);
    }
    const modalOverlay = document.getElementById('modalOverlay');
    if (modalOverlay) {
        modalOverlay.addEventListener('click', (e) => {
            if (e.target === e.currentTarget) closeModal();
        });
    }
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeModal();
    });
}

// ============================================
// NAVIGATE TO PAGE
// ============================================
async function navigateTo(page) {
    console.log(`📄 Navigating to: ${page}`);
    
    if (!PAGE_HANDLERS[page]) {
        console.warn(`⚠️ Page not found: ${page}`);
        showToast('Page not found', 'error');
        return;
    }
    
    // Update active state
    document.querySelectorAll('.sidebar-nav a').forEach(link => {
        link.classList.toggle('active', link.dataset.page === page);
    });
    
    // Update title
    const titles = {
        'dashboard': 'Dashboard',
        'transactions': 'Transactions',
        'accounts': 'Accounts',
        'income': 'Income',
        'expenses': 'Expenses',
        'transfers': 'Transfers',
        'people': 'People',
        'loans': 'Loans',
        'bid-save': 'Bid & Save',
        'savings': 'Savings',
        'recurring': 'Recurring',
        'reports': 'Reports',
        'settings': 'Settings'
    };
    const titleEl = document.getElementById('pageTitle');
    if (titleEl) titleEl.textContent = titles[page] || page;
    
    App.currentPage = page;
    
    // Close sidebar on mobile
    if (window.innerWidth <= 768) {
        const sidebar = document.getElementById('sidebar');
        if (sidebar) sidebar.classList.remove('open');
    }
    
    // Load page content
    try {
        await PAGE_HANDLERS[page]();
    } catch (error) {
        console.error(`❌ Error loading ${page}:`, error);
        const container = document.getElementById('pageContainer');
        if (container) {
            container.innerHTML = `
                <div style="text-align:center;padding:40px 20px;color:var(--danger);">
                    <h3>⚠️ Error loading page</h3>
                    <p style="color:var(--text-secondary);">${error.message}</p>
                </div>
            `;
        }
    }
}

// ============================================
// RENDER PAGE HELPER
// ============================================
function renderPage(html, afterRender = null) {
    const container = document.getElementById('pageContainer');
    if (!container) {
        console.error('❌ pageContainer not found!');
        return;
    }
    container.innerHTML = html;
    if (afterRender) afterRender();
}

// ============================================
// START APP — DOM Content Loaded
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    console.log('📄 DOM Content Loaded');
    console.log('🔍 Checking DOM elements...');
    console.log('  - pageContainer:', document.getElementById('pageContainer'));
    console.log('  - sidebar:', document.getElementById('sidebar'));
    console.log('  - pageTitle:', document.getElementById('pageTitle'));
    
    // Start app
    initApp();
});

// Make functions globally accessible
window.navigateTo = navigateTo;
window.openModal = openModal;
window.closeModal = closeModal;
window.showToast = showToast;
window.loadExpenses = loadExpenses;