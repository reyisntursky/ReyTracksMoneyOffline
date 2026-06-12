// State management
let state = {
  transactions: [],
  selectedMonth: null, // format: "YYYY-MM" (null means show all time data)
  currentFormType: 'income',
  selectedCategory: null
};

// Category Systems with Emojis and IDs
const categories = {
  income: [
    { id: 'salary', label: 'Salary', emoji: '💰' },
    { id: 'business', label: 'Business', emoji: '📈' },
    { id: 'investment', label: 'Investment', emoji: '🪙' },
    { id: 'gifts', label: 'Gifts', emoji: '🎁' },
    { id: 'other_in', label: 'Other', emoji: '💵' }
  ],
  expense: [
    { id: 'food', label: 'Food', emoji: '🍔' },
    { id: 'rent', label: 'Rent/Home', emoji: '🏠' },
    { id: 'utilities', label: 'Utilities', emoji: '🔌' },
    { id: 'transport', label: 'Transport', emoji: '🚗' },
    { id: 'entertainment', label: 'Entertainment', emoji: '🎬' },
    { id: 'shopping', label: 'Shopping', emoji: '🛍️' },
    { id: 'health', label: 'Health', emoji: '🏥' },
    { id: 'other_ex', label: 'Other', emoji: '💸' }
  ]
};

// DOM Elements
const elements = {
  logo: document.getElementById('app-logo'),
  overallSavings: document.getElementById('overall-savings'),
  savingsRate: document.getElementById('savings-rate'),
  monthIncome: document.getElementById('month-income'),
  monthExpense: document.getElementById('month-expense'),
  monthSavings: document.getElementById('month-savings'),
  incomeCardTitle: document.getElementById('income-card-title'),
  expenseCardTitle: document.getElementById('expense-card-title'),
  savingsCardTitle: document.getElementById('savings-card-title'),
  
  // Containers
  ledgerItems: document.getElementById('ledger-items-container'),
  historyMonths: document.getElementById('history-months-container'),
  barChart: document.getElementById('bar-chart-container'),
  categoryGrid: document.getElementById('category-grid-container'),
  toastWrapper: document.getElementById('toast-wrapper'),
  
  // Controls
  searchTx: document.getElementById('search-tx'),
  filterType: document.getElementById('filter-type'),
  btnResetFilters: document.getElementById('btn-reset-filters'),
  btnClearAll: document.getElementById('btn-clear-all'),
  
  // Actions
  btnExport: document.getElementById('btn-export'),
  btnImportTrigger: document.getElementById('btn-import-trigger'),
  importFileInput: document.getElementById('import-file-input'),
  btnAddTxTrigger: document.getElementById('btn-add-tx-trigger'),
  
  // Modal & Form
  txModal: document.getElementById('tx-modal'),
  txForm: document.getElementById('tx-form'),
  modalTitle: document.getElementById('modal-title'),
  modalClose: document.getElementById('modal-close'),
  modalCancel: document.getElementById('modal-cancel'),
  toggleIncome: document.getElementById('toggle-income'),
  toggleExpense: document.getElementById('toggle-expense'),
  txAmount: document.getElementById('tx-amount'),
  txDate: document.getElementById('tx-date'),
  txDesc: document.getElementById('tx-desc')
};

// Currency Formatter (Sri Lankan Rupees)
const formatLKR = (amount) => {
  return new Intl.NumberFormat('en-LK', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
};

// Toast Notification Helper
const showToast = (message, type = 'success') => {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  
  const icon = type === 'success' ? 
    `<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7"/></svg>` :
    `<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>`;
  
  toast.innerHTML = `${icon}<span>${message}</span>`;
  elements.toastWrapper.appendChild(toast);
  
  setTimeout(() => {
    toast.style.animation = 'none'; // reset animation for exit if needed
    toast.remove();
  }, 4000);
};

// Init application state
const init = () => {
  const CURRENT_DB_VERSION = 3;
  const dbVersion = localStorage.getItem('rupee_save_db_version');
  const storedData = localStorage.getItem('rupee_save_data');
  
  if (storedData && dbVersion && parseInt(dbVersion) === CURRENT_DB_VERSION) {
    try {
      state.transactions = JSON.parse(storedData);
    } catch (e) {
      showToast('Error loading saved records, starting fresh.', 'error');
      state.transactions = [];
    }
  } else {
    // If the database version is missing or outdated, load the new 735,000 LKR configuration
    injectMockData();
    localStorage.setItem('rupee_save_db_version', CURRENT_DB_VERSION.toString());
  }
  
  // Set default date in form to today
  elements.txDate.value = new Date().toISOString().split('T')[0];
  
  // Add listeners
  setupEventListeners();
  
  // Initial render
  render();
  showToast('Welcome to RupeeSave! Ready offline.');
};

// Inject elegant default mock data so app doesn't look empty on startup
const injectMockData = () => {
  const today = new Date();
  const getPrevMonthDate = (monthsAgo, day) => {
    const d = new Date(today.getFullYear(), today.getMonth() - monthsAgo, day);
    return d.toISOString().split('T')[0];
  };

  state.transactions = [
    // Starting Savings Balance (end of May)
    { id: 'm1', type: 'income', amount: 735000, date: getPrevMonthDate(1, 31), category: 'other_in', description: 'Starting Savings Balance' }
  ];
  saveToLocalStorage();
};

const saveToLocalStorage = () => {
  localStorage.setItem('rupee_save_data', JSON.stringify(state.transactions));
};

// Core Render function
const render = () => {
  calculateSavingsMetrics();
  renderChart();
  renderLedger();
  renderTimeline();
};

// Calculate all numerical figures
const calculateSavingsMetrics = () => {
  // 1. Overall Metrics (All time)
  let totalIncome = 0;
  let totalExpense = 0;

  state.transactions.forEach(t => {
    if (t.type === 'income') totalIncome += t.amount;
    else totalExpense += t.amount;
  });

  const cumulativeSavings = totalIncome - totalExpense;
  elements.overallSavings.textContent = formatLKR(cumulativeSavings);
  
  // Savings Rate
  const rate = totalIncome > 0 ? Math.round((cumulativeSavings / totalIncome) * 100) : 0;
  elements.savingsRate.textContent = `${rate}%`;

  // 2. Focused Context Metrics (Focused Month or Fallback to current month if exists, otherwise show All-Time)
  let focusedMonthText = 'All-Time';
  let focusedIncome = 0;
  let focusedExpense = 0;

  const currentYearMonth = new Date().toISOString().substring(0, 7); // Default current month if no transactions
  
  let targetMonth = state.selectedMonth;
  
  if (targetMonth) {
    const [year, month] = targetMonth.split('-');
    const dateObj = new Date(year, month - 1);
    focusedMonthText = dateObj.toLocaleString('default', { month: 'long', year: 'numeric' });
    
    state.transactions.forEach(t => {
      if (t.date.substring(0, 7) === targetMonth) {
        if (t.type === 'income') focusedIncome += t.amount;
        else focusedExpense += t.amount;
      }
    });
  } else {
    // If no month is selected, compute average or show all-time
    focusedMonthText = 'All Records';
    focusedIncome = totalIncome;
    focusedExpense = totalExpense;
  }

  const focusedSavings = focusedIncome - focusedExpense;
  
  elements.monthIncome.textContent = formatLKR(focusedIncome);
  elements.monthExpense.textContent = formatLKR(focusedExpense);
  elements.monthSavings.textContent = formatLKR(focusedSavings);
  
  // Style focused savings net display based on positive/negative
  const savingsValEl = elements.monthSavings.parentElement;
  if (focusedSavings >= 0) {
    elements.monthSavings.style.color = 'var(--income)';
  } else {
    elements.monthSavings.style.color = 'var(--expense)';
  }

  // Update card labels to reflect selected period
  elements.incomeCardTitle.textContent = `Income (${focusedMonthText})`;
  elements.expenseCardTitle.textContent = `Expenses (${focusedMonthText})`;
  elements.savingsCardTitle.textContent = `Net Savings (${focusedMonthText})`;
};

// Render custom responsive graph
const renderChart = () => {
  // Aggregate transactions by month
  const monthlyData = {};
  
  state.transactions.forEach(t => {
    const monthKey = t.date.substring(0, 7); // "YYYY-MM"
    if (!monthlyData[monthKey]) {
      monthlyData[monthKey] = { income: 0, expense: 0 };
    }
    if (t.type === 'income') {
      monthlyData[monthKey].income += t.amount;
    } else {
      monthlyData[monthKey].expense += t.amount;
    }
  });

  // Sort months chronologically
  const sortedMonths = Object.keys(monthlyData).sort();
  
  // Keep last 6 or 12 months
  const monthsToShow = sortedMonths.slice(-6); // last 6 months

  if (monthsToShow.length === 0) {
    elements.barChart.innerHTML = `
      <div class="empty-state" style="padding: 1rem; width: 100%;">
        <svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2m0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 002 2h2a2 2 0 002-2"/></svg>
        <span>No transaction flow history to chart. Add transactions first!</span>
      </div>
    `;
    return;
  }

  // Find max income/expense to scale heights
  let maxAmount = 0;
  monthsToShow.forEach(m => {
    const data = monthlyData[m];
    maxAmount = Math.max(maxAmount, data.income, data.expense);
  });

  elements.barChart.innerHTML = '';

  monthsToShow.forEach(m => {
    const data = monthlyData[m];
    const incomeHeight = maxAmount > 0 ? (data.income / maxAmount) * 100 : 0;
    const expenseHeight = maxAmount > 0 ? (data.expense / maxAmount) * 100 : 0;
    
    const [year, monthVal] = m.split('-');
    const dateObj = new Date(year, monthVal - 1);
    const label = dateObj.toLocaleString('default', { month: 'short' });
    const fullLabel = dateObj.toLocaleString('default', { month: 'long', year: 'numeric' });

    const netSavings = data.income - data.expense;

    const barGroup = document.createElement('div');
    barGroup.className = `chart-bar-group ${state.selectedMonth === m ? 'focused' : ''}`;
    barGroup.style.cursor = 'pointer';
    barGroup.addEventListener('click', () => {
      selectMonthFocus(m);
    });

    barGroup.innerHTML = `
      <div class="chart-tooltip">
        <span class="tooltip-title">${fullLabel}</span>
        <span class="tooltip-val" style="color: var(--income);">+ Rs. ${formatLKR(data.income)}</span>
        <span class="tooltip-val" style="color: var(--expense);">- Rs. ${formatLKR(data.expense)}</span>
        <span class="tooltip-val" style="border-top: 1px dashed rgba(255,255,255,0.2); margin-top: 4px; padding-top: 2px; color: ${netSavings >= 0 ? 'var(--income)' : 'var(--expense)'};">
          Net: Rs. ${formatLKR(netSavings)}
        </span>
      </div>
      
      <!-- Side by side columns styling inside stacked structure -->
      <div style="display: flex; gap: 4px; height: 100%; align-items: flex-end; width: 100%; max-width: 48px;">
        <div style="flex: 1; height: ${incomeHeight}%; min-height: 2px; border-radius: 3px 3px 0 0;" class="bar-income-part"></div>
        <div style="flex: 1; height: ${expenseHeight}%; min-height: 2px; border-radius: 3px 3px 0 0;" class="bar-expense-part"></div>
      </div>
      
      <div class="chart-label">${label}</div>
    `;

    elements.barChart.appendChild(barGroup);
  });
};

// Render transaction logs / ledger list
const renderLedger = () => {
  const query = elements.searchTx.value.toLowerCase();
  const typeFilter = elements.filterType.value;
  
  // Filter by selected month, query description, and category
  let filtered = state.transactions;

  if (state.selectedMonth) {
    filtered = filtered.filter(t => t.date.substring(0, 7) === state.selectedMonth);
  }

  if (typeFilter !== 'all') {
    filtered = filtered.filter(t => t.type === typeFilter);
  }

  if (query) {
    filtered = filtered.filter(t => {
      const descMatch = t.description && t.description.toLowerCase().includes(query);
      const catMatch = getCategoryLabel(t.type, t.category).toLowerCase().includes(query);
      return descMatch || catMatch;
    });
  }

  // Sort descending by date (most recent first)
  filtered.sort((a, b) => new Date(b.date) - new Date(a.date));

  elements.ledgerItems.innerHTML = '';

  if (filtered.length === 0) {
    elements.ledgerItems.innerHTML = `
      <div class="empty-state">
        <svg width="32" height="32" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
        <span>No matching ledger items found.</span>
      </div>
    `;
    return;
  }

  filtered.forEach(t => {
    const item = document.createElement('div');
    item.className = 'ledger-item';
    
    const catObj = getCategoryObject(t.type, t.category);
    const emoji = catObj ? catObj.emoji : '💵';
    const label = catObj ? catObj.label : 'Other';
    
    const amountPrefix = t.type === 'income' ? '+' : '-';
    const amountClass = t.type === 'income' ? 'type-income' : 'type-expense';
    
    const dateFormatted = new Date(t.date).toLocaleDateString('en-LK', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });

    item.innerHTML = `
      <div class="ledger-left">
        <div class="category-badge ${t.type === 'income' ? 'income-badge' : 'expense-badge'}">
          ${emoji}
        </div>
        <div class="ledger-details">
          <span class="ledger-title">${t.description || label}</span>
          <span class="ledger-meta">
            <span>${label}</span>
            <span class="meta-dot"></span>
            <span>${dateFormatted}</span>
          </span>
        </div>
      </div>
      
      <div class="ledger-right">
        <span class="ledger-amount ${amountClass}">
          ${amountPrefix} Rs. ${formatLKR(t.amount)}
        </span>
        <button class="btn-delete" data-id="${t.id}" title="Delete record">
          <svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
        </button>
      </div>
    `;

    // Hook up delete listener
    item.querySelector('.btn-delete').addEventListener('click', (e) => {
      e.stopPropagation();
      deleteTransaction(t.id);
    });

    elements.ledgerItems.appendChild(item);
  });
};

// Render Month timeline sidebar
const renderTimeline = () => {
  // Gather summaries grouped by month
  const monthlyData = {};
  
  state.transactions.forEach(t => {
    const monthKey = t.date.substring(0, 7); // "YYYY-MM"
    if (!monthlyData[monthKey]) {
      monthlyData[monthKey] = { income: 0, expense: 0 };
    }
    if (t.type === 'income') {
      monthlyData[monthKey].income += t.amount;
    } else {
      monthlyData[monthKey].expense += t.amount;
    }
  });

  // Sort descending (most recent months first)
  const sortedMonths = Object.keys(monthlyData).sort((a, b) => b.localeCompare(a));
  
  elements.historyMonths.innerHTML = '';
  
  if (sortedMonths.length === 0) {
    elements.historyMonths.innerHTML = `
      <div class="empty-state" style="padding: 1.5rem 0.5rem;">
        <span>No timeline history yet.</span>
      </div>
    `;
    return;
  }

  sortedMonths.forEach(m => {
    const data = monthlyData[m];
    const netSavings = data.income - data.expense;
    const isPositive = netSavings >= 0;
    
    const [year, monthVal] = m.split('-');
    const dateObj = new Date(year, monthVal - 1);
    const monthName = dateObj.toLocaleString('default', { month: 'long', year: 'numeric' });

    const card = document.createElement('div');
    card.className = `history-month-card ${state.selectedMonth === m ? 'active' : ''}`;
    
    card.innerHTML = `
      <div class="month-card-header">
        <span class="month-name">${monthName}</span>
        <span class="month-net-savings ${isPositive ? 'positive' : 'negative'}">
          ${isPositive ? '+' : ''}Rs. ${formatLKR(netSavings)}
        </span>
      </div>
      <div class="month-card-details">
        <div class="month-detail-item">
          <span class="lbl">In:</span>
          <span class="val" style="color: var(--income);">Rs. ${formatLKR(data.income)}</span>
        </div>
        <div class="month-detail-item">
          <span class="lbl">Out:</span>
          <span class="val" style="color: var(--expense);">Rs. ${formatLKR(data.expense)}</span>
        </div>
      </div>
    `;

    card.addEventListener('click', () => {
      selectMonthFocus(m);
    });

    elements.historyMonths.appendChild(card);
  });
};

// Select month action
const selectMonthFocus = (monthKey) => {
  if (state.selectedMonth === monthKey) {
    state.selectedMonth = null; // Toggle off if clicked again
    showToast('Viewing overall transaction summaries');
  } else {
    state.selectedMonth = monthKey;
    const [year, mVal] = monthKey.split('-');
    const mName = new Date(year, mVal - 1).toLocaleString('default', { month: 'long', year: 'numeric' });
    showToast(`Focused on dashboard details for ${mName}`);
  }
  render();
};

// Helper mapping functions
const getCategoryObject = (type, categoryId) => {
  return categories[type].find(c => c.id === categoryId);
};

const getCategoryLabel = (type, categoryId) => {
  const cat = getCategoryObject(type, categoryId);
  return cat ? cat.label : 'Other';
};

// Toggle forms and popups
const showAddTxModal = () => {
  elements.txModal.classList.add('active');
  elements.txAmount.focus();
};

const hideAddTxModal = () => {
  elements.txModal.classList.remove('active');
  elements.txForm.reset();
  elements.txDate.value = new Date().toISOString().split('T')[0];
  setFormType('income');
};

const setFormType = (type) => {
  state.currentFormType = type;
  if (type === 'income') {
    elements.toggleIncome.classList.add('active');
    elements.toggleExpense.classList.remove('active');
    elements.modalTitle.textContent = 'Add Income Record';
  } else {
    elements.toggleIncome.classList.remove('active');
    elements.toggleExpense.classList.add('active');
    elements.modalTitle.textContent = 'Add Expense Record';
  }
  renderCategorySelectionGrid();
};

const renderCategorySelectionGrid = () => {
  elements.categoryGrid.innerHTML = '';
  const currentCategories = categories[state.currentFormType];
  
  // Set default selection
  state.selectedCategory = currentCategories[0].id;
  
  currentCategories.forEach(c => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `category-select-btn ${state.selectedCategory === c.id ? 'selected' : ''}`;
    btn.innerHTML = `
      <span style="font-size: 1.4rem;">${c.emoji}</span>
      <span>${c.label}</span>
    `;
    
    btn.addEventListener('click', () => {
      // Unselect previous
      const selectedBtn = elements.categoryGrid.querySelector('.category-select-btn.selected');
      if (selectedBtn) selectedBtn.classList.remove('selected');
      
      btn.classList.add('selected');
      state.selectedCategory = c.id;
    });
    
    elements.categoryGrid.appendChild(btn);
  });
};

// CRUD Transactions
const addTransaction = (amount, date, category, description, type) => {
  const tx = {
    id: Date.now().toString(),
    amount: parseFloat(amount),
    date,
    category,
    description: description.trim(),
    type
  };
  
  state.transactions.push(tx);
  saveToLocalStorage();
  
  // Set selectedMonth focus to the month of the added transaction so the user sees it immediately!
  state.selectedMonth = date.substring(0, 7);
  
  render();
  showToast('Record saved successfully!');
};

const deleteTransaction = (id) => {
  state.transactions = state.transactions.filter(t => t.id !== id);
  saveToLocalStorage();
  render();
  showToast('Record removed.', 'error');
};

// Backup operations
const exportData = () => {
  if (state.transactions.length === 0) {
    showToast('No transaction data to export.', 'error');
    return;
  }
  
  const backup = {
    appName: 'RupeeSave',
    version: '1.0.0',
    exportDate: new Date().toISOString(),
    transactions: state.transactions
  };
  
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `rupeesave_backup_${new Date().toISOString().substring(0,10)}.json`;
  
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  
  showToast('Database exported successfully!');
};

const handleImport = (event) => {
  const file = event.target.files[0];
  if (!file) return;
  
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target.result);
      
      if (data.appName === 'RupeeSave' && Array.isArray(data.transactions)) {
        // Simple confirmation before overwrite
        if (confirm(`Found ${data.transactions.length} records in backup. Overwrite existing current database?`)) {
          state.transactions = data.transactions;
          state.selectedMonth = null;
          saveToLocalStorage();
          render();
          showToast('Database imported & restored successfully!');
        }
      } else {
        showToast('Invalid backup file structure.', 'error');
      }
    } catch (err) {
      showToast('Error reading or parsing JSON file.', 'error');
    }
  };
  reader.readAsText(file);
  
  // Reset file input so same file can be imported again if needed
  elements.importFileInput.value = '';
};

// Event Listeners Configuration
const setupEventListeners = () => {
  // Modal opening
  elements.btnAddTxTrigger.addEventListener('click', () => {
    showAddTxModal();
    setFormType('income');
  });
  
  elements.modalClose.addEventListener('click', hideAddTxModal);
  elements.modalCancel.addEventListener('click', hideAddTxModal);
  
  // Toggle form Type
  elements.toggleIncome.addEventListener('click', () => setFormType('income'));
  elements.toggleExpense.addEventListener('click', () => setFormType('expense'));
  
  // Form submission
  elements.txForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const amount = elements.txAmount.value;
    const date = elements.txDate.value;
    const desc = elements.txDesc.value;
    
    if (!amount || !date || !state.selectedCategory) {
      showToast('Please fill all required fields.', 'error');
      return;
    }
    
    addTransaction(amount, date, state.selectedCategory, desc, state.currentFormType);
    hideAddTxModal();
  });
  
  // Ledger filtering and search
  elements.searchTx.addEventListener('input', () => {
    renderLedger();
  });
  
  elements.filterType.addEventListener('change', () => {
    renderLedger();
  });
  
  elements.btnResetFilters.addEventListener('click', () => {
    state.selectedMonth = null;
    elements.searchTx.value = '';
    elements.filterType.value = 'all';
    render();
    showToast('Reset monthly focus and search queries.');
  });
  
  // Reset Database
  elements.btnClearAll.addEventListener('click', () => {
    if (confirm('Are you absolutely sure you want to clear all data? This cannot be undone.')) {
      state.transactions = [];
      state.selectedMonth = null;
      saveToLocalStorage();
      render();
      showToast('All data cleared. Database is empty.', 'error');
    }
  });
  
  // Export/Import
  elements.btnExport.addEventListener('click', exportData);
  
  elements.btnImportTrigger.addEventListener('click', () => {
    elements.importFileInput.click();
  });
  
  elements.importFileInput.addEventListener('change', handleImport);
};

// Run on window load
window.addEventListener('DOMContentLoaded', init);
