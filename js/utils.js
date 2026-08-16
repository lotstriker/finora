// ============================================
// FINORA — Utilities
// ============================================

// ----- FORMATTERS -----

function formatCurrency(amount) {
    const currency = localStorage.getItem('finora_currency') || '₹';
    const formatted = Math.abs(amount).toLocaleString('en-IN', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    });
    return `${currency} ${formatted}`;
}

function formatDate(dateStr) {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    });
}

function formatDateShort(dateStr) {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}

function formatDateTime(dateStr) {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function formatMonth(dateStr) {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
}

function getMonthYear(dateStr) {
    const d = new Date(dateStr);
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
}

function getCurrentMonth() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
}

function getMonthStart(dateStr) {
    const d = new Date(dateStr);
    d.setDate(1);
    d.setHours(0,0,0,0);
    return d.toISOString();
}

function getMonthEnd(dateStr) {
    const d = new Date(dateStr);
    d.setMonth(d.getMonth() + 1);
    d.setDate(0);
    d.setHours(23,59,59,999);
    return d.toISOString();
}

// ----- ID GENERATORS -----

function generateId(prefix) {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `${prefix}-${timestamp}-${random}`;
}

function generateTxnId() {
    const d = new Date();
    const year = d.getFullYear();
    const random = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
    return `TXN-${year}-${random}`;
}

function generateAccountId() {
    return `ACC-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

function generateLoanId() {
    return `LOAN-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

function generateCommitteeId() {
    return `COM-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

// ----- VALIDATORS -----

function isValidAmount(amount) {
    return amount > 0 && !isNaN(amount);
}

function isValidDate(dateStr) {
    const d = new Date(dateStr);
    return d instanceof Date && !isNaN(d);
}

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isInsufficientBalance(balance, amount) {
    return balance < amount;
}

// ----- TOAST NOTIFICATIONS -----

function showToast(message, type = 'info', duration = 3000) {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(40px)';
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

// ----- MODAL HELPERS -----

function openModal(title, content) {
    const overlay = document.getElementById('modalOverlay');
    const titleEl = document.getElementById('modalTitle');
    const bodyEl = document.getElementById('modalBody');
    
    titleEl.textContent = title;
    bodyEl.innerHTML = content;
    overlay.classList.add('active');
}

function closeModal() {
    document.getElementById('modalOverlay').classList.remove('active');
}

// ----- DOM HELPERS -----

function $(selector) {
    return document.querySelector(selector);
}

function $$(selector) {
    return document.querySelectorAll(selector);
}

function createElement(tag, className, html) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (html) el.innerHTML = html;
    return el;
}

// ----- DEBOUNCE -----

function debounce(fn, delay) {
    let timer;
    return function(...args) {
        clearTimeout(timer);
        timer = setTimeout(() => fn.apply(this, args), delay);
    };
}

// ----- GROUP BY -----

function groupBy(array, key) {
    return array.reduce((acc, item) => {
        const group = item[key];
        if (!acc[group]) acc[group] = [];
        acc[group].push(item);
        return acc;
    }, {});
}

// ----- SUM -----

function sum(array, key) {
    return array.reduce((acc, item) => acc + (item[key] || 0), 0);
}

// ----- DARK MODE -----

function getTheme() {
    return localStorage.getItem('finora_theme') || 'light';
}

function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('finora_theme', theme);
}

function toggleTheme() {
    const current = getTheme();
    setTheme(current === 'light' ? 'dark' : 'light');
    updateThemeIcon();
}

function updateThemeIcon() {
    const btn = document.getElementById('themeToggle');
    if (!btn) return;
    const isDark = getTheme() === 'dark';
    btn.innerHTML = `<i class="fas fa-${isDark ? 'sun' : 'moon'}"></i>`;
}

// ----- CURRENCY -----

function getCurrency() {
    return localStorage.getItem('finora_currency') || '₹';
}

function setCurrency(currency) {
    localStorage.setItem('finora_currency', currency);
}

// ----- EXPORT -----

function downloadFile(content, filename, mimeType = 'application/json') {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

// ----- CONFIRM DIALOG -----

function confirmAction(message, callback) {
    if (confirm(message)) {
        callback();
    }
}

// ----- LOGGING (dev only) -----

function log(...args) {
    if (localStorage.getItem('finora_debug') === 'true') {
        console.log(...args);
    }
}