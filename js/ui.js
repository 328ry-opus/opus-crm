/* ========================================
   Opus CRM — Shared UI Components
   ======================================== */

// --- Sidebar (mobile toggle) ---
function initSidebar() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebarOverlay');
  const menuBtn = document.getElementById('mobileMenuBtn');

  if (menuBtn) {
    menuBtn.addEventListener('click', () => sidebar.classList.toggle('is-open'));
  }
  if (overlay) {
    overlay.addEventListener('click', () => sidebar.classList.remove('is-open'));
  }

  // Dynamic badge counts
  updateSidebarBadges();
}

// --- Update sidebar nav badges from Store data ---
function updateSidebarBadges() {
  if (typeof Store === 'undefined') return;

  // Active leads (exclude won/lost)
  const leads = Store.getLeads();
  const activeLeads = leads.filter(l => l.stage !== 'won' && l.stage !== 'lost').length;

  // Pending tasks (todo + in-progress)
  const tasks = Store.getTasks();
  const pendingTasks = tasks.filter(t => t.status !== 'done').length;

  // Update lead badge
  const leadLink = document.querySelector('a[href="leads.html"]');
  if (leadLink) {
    let badge = leadLink.querySelector('.nav-item__badge');
    if (activeLeads > 0) {
      if (!badge) {
        badge = document.createElement('span');
        badge.className = 'nav-item__badge';
        leadLink.appendChild(badge);
      }
      badge.textContent = activeLeads;
    } else if (badge) {
      badge.remove();
    }
  }

  // Update task badge
  const taskLink = document.querySelector('a[href="tasks.html"]');
  if (taskLink) {
    let badge = taskLink.querySelector('.nav-item__badge');
    if (pendingTasks > 0) {
      if (!badge) {
        badge = document.createElement('span');
        badge.className = 'nav-item__badge';
        taskLink.appendChild(badge);
      }
      badge.textContent = pendingTasks;
    } else if (badge) {
      badge.remove();
    }
  }
}

// --- Tabs ---
function initTabs(container) {
  const root = container || document;
  root.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const parent = tab.closest('.tabs');
      const contentParent = parent.parentElement;
      // Deactivate all in this group
      parent.querySelectorAll('.tab').forEach(t => t.classList.remove('is-active'));
      contentParent.querySelectorAll('.tab-content').forEach(c => c.classList.remove('is-active'));
      // Activate clicked
      tab.classList.add('is-active');
      const target = tab.getAttribute('data-tab');
      const content = contentParent.querySelector(`[data-tab-content="${target}"]`);
      if (content) content.classList.add('is-active');
    });
  });
}

// --- Toast ---
let toastEl = null;
let toastTimer = null;

// Toast icon SVGs
const TOAST_ICONS = {
  success: '<svg class="toast__icon" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>',
  error: '<svg class="toast__icon" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>'
};

function showToast(message, type = 'success') {
  if (!toastEl) {
    toastEl = document.createElement('div');
    toastEl.className = 'toast';
    document.body.appendChild(toastEl);
  }

  clearTimeout(toastTimer);

  // Build content with icon
  const icon = TOAST_ICONS[type] || TOAST_ICONS.success;
  toastEl.innerHTML = icon + '<span>' + message + '</span>';
  toastEl.className = 'toast';
  if (type === 'error') toastEl.classList.add('toast--error');
  if (type === 'success') toastEl.classList.add('toast--success');

  // Force reflow then animate in
  toastEl.offsetHeight;
  toastEl.classList.add('is-visible');

  toastTimer = setTimeout(() => {
    toastEl.classList.remove('is-visible');
  }, 2500);
}

// --- Modal ---
function openModal(options) {
  // options: { title, body (html string), onSubmit, submitLabel, size }
  const existing = document.getElementById('crmModal');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'crmModal';

  const maxWidth = options.size === 'lg' ? '640px' : '520px';

  overlay.innerHTML = `
    <div class="modal" style="max-width:${maxWidth}">
      <div class="modal__header">
        <h2 class="modal__title">${options.title}</h2>
        <button class="modal__close" data-action="close-modal">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
      <div class="modal__body">${options.body}</div>
      <div class="modal__footer">
        <button class="btn btn--secondary" data-action="close-modal">キャンセル</button>
        <button class="btn btn--primary" data-action="submit-modal">${options.submitLabel || '保存'}</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  // Trigger entrance animation on next frame
  requestAnimationFrame(() => {
    overlay.classList.add('is-visible');
  });

  // Close handlers
  overlay.querySelectorAll('[data-action="close-modal"]').forEach(el => {
    el.addEventListener('click', closeModal);
  });
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeModal();
  });

  // Submit handler
  const submitBtn = overlay.querySelector('[data-action="submit-modal"]');
  if (options.onSubmit) {
    submitBtn.addEventListener('click', () => {
      const form = overlay.querySelector('.modal__body');
      options.onSubmit(form);
    });
  }

  // Focus first input after animation settles
  setTimeout(() => {
    const firstInput = overlay.querySelector('input, select, textarea');
    if (firstInput) firstInput.focus();
  }, 200);

  // Escape key
  const escHandler = (e) => {
    if (e.key === 'Escape') {
      closeModal();
      document.removeEventListener('keydown', escHandler);
    }
  };
  document.addEventListener('keydown', escHandler);

  return overlay;
}

function closeModal() {
  const modal = document.getElementById('crmModal');
  if (!modal) return;

  // Animate out then remove
  modal.classList.remove('is-visible');
  modal.addEventListener('transitionend', () => {
    modal.remove();
  }, { once: true });

  // Fallback removal in case transitionend doesn't fire
  setTimeout(() => {
    if (document.getElementById('crmModal')) {
      modal.remove();
    }
  }, 300);
}

// --- Form Builder Helpers ---
function formGroup(label, inputHtml, hint) {
  return `
    <div class="form-group">
      <label class="form-label">${label}</label>
      ${inputHtml}
      ${hint ? `<div class="form-hint">${hint}</div>` : ''}
    </div>
  `;
}

function formInput(name, placeholder, type = 'text', value = '') {
  return `<input type="${type}" name="${name}" class="form-input" placeholder="${placeholder}" value="${value}">`;
}

function formSelect(name, options, selected = '') {
  const opts = options.map(o =>
    `<option value="${o.value}" ${o.value === selected ? 'selected' : ''}>${o.label}</option>`
  ).join('');
  return `<select name="${name}" class="form-input">${opts}</select>`;
}

function formTextarea(name, placeholder, value = '') {
  return `<textarea name="${name}" class="form-input" placeholder="${placeholder}">${value}</textarea>`;
}

function getFormData(container) {
  const data = {};
  container.querySelectorAll('input, select, textarea').forEach(el => {
    if (el.name) data[el.name] = el.value;
  });
  return data;
}

// --- View Toggle ---
function initViewToggle(callback) {
  document.querySelectorAll('.view-toggle__btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.view-toggle__btn').forEach(b => b.classList.remove('is-active'));
      btn.classList.add('is-active');
      if (callback) callback(btn.textContent.trim());
    });
  });
}

// --- Dropdown ---
function initDropdowns() {
  document.addEventListener('click', (e) => {
    // Close all dropdowns when clicking outside
    if (!e.target.closest('.dropdown')) {
      document.querySelectorAll('.dropdown.is-open').forEach(d => d.classList.remove('is-open'));
    }
  });

  document.querySelectorAll('[data-action="toggle-dropdown"]').forEach(trigger => {
    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      const dropdown = trigger.closest('.dropdown');
      const wasOpen = dropdown.classList.contains('is-open');
      document.querySelectorAll('.dropdown.is-open').forEach(d => d.classList.remove('is-open'));
      if (!wasOpen) dropdown.classList.add('is-open');
    });
  });
}

// --- Init all shared UI ---
function initUI() {
  initSidebar();
  initTabs();
  initDropdowns();
}

// Auto-init on DOM ready
document.addEventListener('DOMContentLoaded', initUI);
