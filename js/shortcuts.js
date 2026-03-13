/* ========================================
   Opus CRM — Keyboard Shortcuts
   Global shortcut handler for all pages
   ======================================== */

(function () {
  // Page detection
  const path = window.location.pathname;
  const pageName = path.includes('leads') ? 'leads'
    : path.includes('lead-detail') ? 'lead-detail'
    : path.includes('client-detail') ? 'client-detail'
    : path.includes('clients') ? 'clients'
    : path.includes('tasks') ? 'tasks'
    : path.includes('settings') ? 'settings'
    : 'dashboard';

  // Nav links for number-key navigation
  const NAV_MAP = {
    '1': 'index.html',
    '2': 'leads.html',
    '3': 'clients.html',
    '4': 'tasks.html',
  };

  // Shortcut definitions for help overlay
  const SHORTCUT_LIST = [
    { key: 'N', desc: '新規作成（リード / クライアント / タスク）' },
    { key: '/', desc: '検索フィールドにフォーカス' },
    { key: 'Esc', desc: 'モーダルを閉じる / フォーカス解除' },
    { key: '1〜4', desc: 'ページ移動（1=ダッシュボード 2=リード 3=クライアント 4=タスク）' },
    { key: '?', desc: 'このヘルプを表示' },
  ];

  document.addEventListener('keydown', (e) => {
    // Skip when typing in form fields
    const tag = (e.target.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select') {
      // Only handle Esc in form fields
      if (e.key === 'Escape') {
        e.target.blur();
        e.preventDefault();
      }
      return;
    }

    // Skip when modal is open (except Esc)
    const modal = document.getElementById('crmModal');
    if (modal && e.key !== 'Escape') return;

    // Skip when help overlay is open (except Esc and ?)
    const help = document.getElementById('shortcutHelp');
    if (help && e.key !== 'Escape' && e.key !== '?') return;

    switch (e.key) {
      // --- New item ---
      case 'n':
      case 'N':
        e.preventDefault();
        triggerNewAction();
        break;

      // --- Search focus ---
      case '/':
        e.preventDefault();
        focusSearch();
        break;

      // --- Close modal / help ---
      case 'Escape':
        if (help) {
          closeHelp();
        }
        // Modal Esc is handled by ui.js
        break;

      // --- Navigation ---
      case '1':
      case '2':
      case '3':
      case '4':
        e.preventDefault();
        navigateTo(e.key);
        break;

      // --- Help ---
      case '?':
        e.preventDefault();
        toggleHelp();
        break;
    }
  });

  // Trigger new action based on current page
  function triggerNewAction() {
    // Find primary button with new-item text
    const btn = document.querySelector('.btn--primary');
    if (btn) {
      btn.click();
      return;
    }
  }

  // Focus search input
  function focusSearch() {
    const search = document.querySelector('.filter-search')
      || document.querySelector('input[type="text"][placeholder*="検索"]');
    if (search) {
      search.focus();
      search.select();
    }
  }

  // Navigate to page
  function navigateTo(key) {
    const href = NAV_MAP[key];
    if (!href) return;
    // Don't navigate if already on that page
    if (window.location.pathname.endsWith(href)) return;
    window.location.href = href;
  }

  // Toggle help overlay
  function toggleHelp() {
    const existing = document.getElementById('shortcutHelp');
    if (existing) {
      closeHelp();
    } else {
      openHelp();
    }
  }

  function openHelp() {
    const overlay = document.createElement('div');
    overlay.id = 'shortcutHelp';
    overlay.className = 'shortcut-help-overlay';

    const rows = SHORTCUT_LIST.map(s => `
      <div class="shortcut-help__row">
        <kbd class="shortcut-help__key">${s.key}</kbd>
        <span class="shortcut-help__desc">${s.desc}</span>
      </div>
    `).join('');

    overlay.innerHTML = `
      <div class="shortcut-help">
        <div class="shortcut-help__header">
          <h3 class="shortcut-help__title">キーボードショートカット</h3>
          <button class="shortcut-help__close" data-action="close-help">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div class="shortcut-help__body">
          ${rows}
        </div>
        <div class="shortcut-help__footer">
          <span style="color:var(--color-text-tertiary); font-size:var(--text-xs);">Esc で閉じる</span>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    // Animate in
    requestAnimationFrame(() => overlay.classList.add('is-visible'));

    // Close handlers
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay || e.target.closest('[data-action="close-help"]')) {
        closeHelp();
      }
    });
  }

  function closeHelp() {
    const overlay = document.getElementById('shortcutHelp');
    if (!overlay) return;
    overlay.classList.remove('is-visible');
    overlay.addEventListener('transitionend', () => overlay.remove(), { once: true });
    setTimeout(() => { if (document.getElementById('shortcutHelp')) overlay.remove(); }, 300);
  }
})();
