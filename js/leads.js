/* ========================================
   Opus CRM — Leads Page Logic
   ======================================== */

document.addEventListener('DOMContentLoaded', () => {
  Store.init();
  initFilters();
  renderPipeline();
  initNewLeadButton();
  initViewToggle(handleViewSwitch);
  updateSidebarBadges();
});

// ============================================
// Stage-to-CSS-modifier mapping
// ============================================
const STAGE_CSS_MAP = {
  'list-added': 'list',
  'dm-sent': 'dm',
  'replied': 'replied',
  'appointment-set': 'appointment',
  'in-meeting': 'meeting',
  'proposal-sent': 'proposal',
  'won': 'won',
  'lost': 'lost',
};

// Current filter state
let currentFilters = {};

// ============================================
// Filters
// ============================================
function initFilters() {
  const filtersContainer = document.querySelector('.filters');
  if (!filtersContainer) return;

  // Build filter selects dynamically
  const businessOpts = [{ value: '', label: 'すべての事業' }, ...CRM.BUSINESS_TYPES];
  const sourceOpts = [{ value: '', label: 'すべてのソース' }, ...CRM.SOURCES];
  const storeTypeOpts = [{ value: '', label: 'すべての業種' }, ...CRM.STORE_TYPES];

  filtersContainer.innerHTML = `
    <select class="filter-select" data-filter="business_type">
      ${businessOpts.map(o => `<option value="${o.value}">${o.label}</option>`).join('')}
    </select>
    <select class="filter-select" data-filter="source">
      ${sourceOpts.map(o => `<option value="${o.value}">${o.label}</option>`).join('')}
    </select>
    <select class="filter-select" data-filter="store_type">
      ${storeTypeOpts.map(o => `<option value="${o.value}">${o.label}</option>`).join('')}
    </select>
    <div class="filters__spacer"></div>
    <input type="text" class="filter-search" placeholder="リードを検索..." data-filter="search">
  `;

  // Bind events
  filtersContainer.querySelectorAll('.filter-select').forEach(select => {
    select.addEventListener('change', () => {
      applyFilters();
    });
  });

  const searchInput = filtersContainer.querySelector('.filter-search');
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      applyFilters();
    });
  }
}

function applyFilters() {
  const filters = {};
  document.querySelectorAll('.filter-select').forEach(select => {
    const key = select.getAttribute('data-filter');
    const val = select.value;
    if (key && val) filters[key] = val;
  });
  const searchInput = document.querySelector('.filter-search');
  if (searchInput && searchInput.value.trim()) {
    filters.search = searchInput.value.trim();
  }
  currentFilters = filters;
  renderPipeline();
}

// ============================================
// Pipeline Rendering
// ============================================
function renderPipeline() {
  const container = document.querySelector('.pipeline');
  if (!container) return;

  // Get leads (filtered or all)
  const filteredLeads = Store.getLeads(Object.keys(currentFilters).length ? currentFilters : null);

  // Group filtered leads by stage
  const grouped = {};
  CRM.LEAD_STAGES.forEach(s => { grouped[s.value] = []; });
  filteredLeads.forEach(l => {
    if (grouped[l.stage]) grouped[l.stage].push(l);
  });

  // Build all columns
  let html = '';
  CRM.LEAD_STAGES.forEach(stage => {
    const cssModifier = STAGE_CSS_MAP[stage.value] || stage.value;
    const leads = grouped[stage.value] || [];
    const count = leads.length;

    html += `
      <div class="pipeline__column pipeline__column--${cssModifier}" data-stage="${stage.value}">
        <div class="pipeline__column-header">
          <span class="pipeline__column-name">
            <span class="pipeline__column-dot"></span>
            ${stage.label}
          </span>
          <span class="pipeline__column-count">${count}</span>
        </div>
        <div class="pipeline__cards">
          ${leads.length > 0 ? leads.map(lead => buildCardHTML(lead)).join('') : buildEmptyState(stage.value)}
          ${buildAddButton(stage.value)}
        </div>
      </div>
    `;
  });

  container.innerHTML = html;

  // Attach drag & drop and click events
  initKanbanDragDrop();
  initPipelineAddButtons();
}

function buildCardHTML(lead) {
  const storeType = CRM.STORE_TYPES.find(t => t.value === lead.store_type);
  const businessType = CRM.BUSINESS_TYPES.find(t => t.value === lead.business_type);
  const storeTypeLabel = storeType ? storeType.label : '';
  const businessLabel = businessType ? businessType.label : '';

  const overdueClass = lead.next_date && isOverdue(lead.next_date) ? ' is-overdue' : '';

  // Format estimated fee for display
  let feeDisplay = '';
  if (lead.estimated_fee) {
    if (lead.estimated_fee >= 10000) {
      feeDisplay = '\u00a5' + Math.round(lead.estimated_fee / 10000) + '\u4e07';
    } else {
      feeDisplay = formatCurrency(lead.estimated_fee);
    }
  }

  // Build footer (next_date and/or fee)
  let footerHTML = '';
  if (lead.next_date || feeDisplay) {
    const dateClass = lead.next_date && isOverdue(lead.next_date) ? ' is-overdue' : '';
    footerHTML = `
      <div class="pipeline-card__footer">
        ${lead.next_date ? `<span class="pipeline-card__date${dateClass}">NEXT: ${formatDate(lead.next_date)}</span>` : '<span></span>'}
        ${feeDisplay ? `<span class="pipeline-card__value">${feeDisplay}</span>` : ''}
      </div>
    `;
  }

  return `
    <div class="pipeline-card${overdueClass}" draggable="true" data-lead-id="${lead.id}">
      <a href="lead-detail.html?id=${lead.id}" class="pipeline-card__name">${escapeHTML(lead.store_name)}</a>
      <div class="pipeline-card__meta">
        ${storeTypeLabel ? `<span class="pipeline-card__tag">${storeTypeLabel}</span>` : ''}
        ${storeTypeLabel && lead.area ? '<span>\u30FB</span>' : ''}
        ${lead.area ? `<span class="pipeline-card__tag">${escapeHTML(lead.area)}</span>` : ''}
      </div>
      <div class="pipeline-card__meta">
        <span class="badge badge--default badge--xs">${businessLabel}</span>
      </div>
      ${footerHTML}
    </div>
  `;
}

function buildEmptyState(stageValue) {
  if (stageValue === 'won') {
    return `
      <div class="empty-state empty-state--compact">
        <div class="empty-state__icon">
          <svg viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
        </div>
        <div class="empty-state__text">\u307E\u3060\u6210\u7D04\u306F\u3042\u308A\u307E\u305B\u3093</div>
        <div class="empty-state__hint">\u30EA\u30FC\u30C9\u304C\u6210\u7D04\u3057\u305F\u3089\u3053\u3053\u306B\u8868\u793A\u3055\u308C\u307E\u3059</div>
      </div>
    `;
  }
  if (stageValue === 'lost') {
    return `
      <div class="empty-state empty-state--compact">
        <div class="empty-state__icon">
          <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
        </div>
        <div class="empty-state__text">\u5931\u6CE8\u306F\u3042\u308A\u307E\u305B\u3093</div>
        <div class="empty-state__hint">\u826F\u3044\u8ABF\u5B50\u3067\u3059\uFF01</div>
      </div>
    `;
  }
  return '';
}

function buildAddButton(stageValue) {
  // Show add button on all non-terminal stages
  if (stageValue === 'won' || stageValue === 'lost') return '';
  return `<button class="pipeline__add" data-stage="${stageValue}">+ \u30EA\u30FC\u30C9\u3092\u8FFD\u52A0</button>`;
}

// ============================================
// Kanban Drag & Drop
// ============================================
function initKanbanDragDrop() {
  const cards = document.querySelectorAll('.pipeline-card[draggable]');
  const columns = document.querySelectorAll('.pipeline__cards');

  cards.forEach(card => {
    card.addEventListener('dragstart', (e) => {
      card.classList.add('is-dragging');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', card.getAttribute('data-lead-id'));
    });

    card.addEventListener('dragend', () => {
      card.classList.remove('is-dragging');
      document.querySelectorAll('.pipeline__cards').forEach(col => {
        col.classList.remove('is-drag-over');
      });
    });
  });

  columns.forEach(column => {
    column.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      column.classList.add('is-drag-over');

      const dragging = document.querySelector('.is-dragging');
      if (!dragging) return;

      const afterEl = getDragAfterElement(column, e.clientY);
      if (afterEl) {
        column.insertBefore(dragging, afterEl);
      } else {
        const addBtn = column.querySelector('.pipeline__add');
        if (addBtn) {
          column.insertBefore(dragging, addBtn);
        } else {
          column.appendChild(dragging);
        }
      }
    });

    column.addEventListener('dragleave', (e) => {
      if (!column.contains(e.relatedTarget)) {
        column.classList.remove('is-drag-over');
      }
    });

    column.addEventListener('drop', (e) => {
      e.preventDefault();
      column.classList.remove('is-drag-over');

      const dragging = document.querySelector('.is-dragging');
      if (!dragging) return;

      const leadId = dragging.getAttribute('data-lead-id');
      const colEl = column.closest('.pipeline__column');
      const newStage = colEl ? colEl.getAttribute('data-stage') : '';

      if (!leadId || !newStage) return;

      // Update in Store
      Store.updateLead(leadId, { stage: newStage });

      // Find stage label
      const stageObj = CRM.LEAD_STAGES.find(s => s.value === newStage);
      const stageLabel = stageObj ? stageObj.label : newStage;

      if (newStage === 'won') {
        showToast(`${stageLabel}\u306B\u79FB\u52D5\u3057\u307E\u3057\u305F\u3002\u304A\u3081\u3067\u3068\u3046\u3054\u3056\u3044\u307E\u3059\uFF01`);
      } else {
        showToast(`\u30B9\u30C6\u30FC\u30B8\u3092\u300C${stageLabel}\u300D\u306B\u5909\u66F4\u3057\u307E\u3057\u305F`);
      }

      // Re-render to refresh counts and styling
      renderPipeline();
      updateSidebarBadges();
    });
  });
}

function getDragAfterElement(container, y) {
  const draggableElements = [...container.querySelectorAll('.pipeline-card:not(.is-dragging)')];

  return draggableElements.reduce((closest, child) => {
    const box = child.getBoundingClientRect();
    const offset = y - box.top - box.height / 2;
    if (offset < 0 && offset > closest.offset) {
      return { offset, element: child };
    }
    return closest;
  }, { offset: Number.NEGATIVE_INFINITY }).element;
}

// ============================================
// Pipeline Add Buttons
// ============================================
function initPipelineAddButtons() {
  document.querySelectorAll('.pipeline__add').forEach(btn => {
    btn.addEventListener('click', () => {
      const stage = btn.getAttribute('data-stage') || 'list-added';
      openNewLeadModal(stage);
    });
  });
}

// ============================================
// New Lead Button (header)
// ============================================
function initNewLeadButton() {
  document.querySelectorAll('.btn--primary').forEach(btn => {
    if (btn.textContent.includes('\u65B0\u898F\u30EA\u30FC\u30C9')) {
      btn.addEventListener('click', () => openNewLeadModal('list-added'));
    }
  });
}

// ============================================
// New Lead Modal
// ============================================
function openNewLeadModal(defaultStage) {
  const stageOptions = CRM.LEAD_STAGES.map(s => ({ value: s.value, label: s.label }));

  const body = `
    <div style="display:grid; grid-template-columns:1fr 1fr; gap:0 var(--space-4);">
      ${formGroup('\u5E97\u8217\u540D *', formInput('store_name', '\u4F8B: Bar Nocturne'))}
      ${formGroup('\u4F01\u696D\u540D', formInput('company_name', '\u4F8B: \u682A\u5F0F\u4F1A\u793AABC'))}
    </div>
    <div style="display:grid; grid-template-columns:1fr 1fr; gap:0 var(--space-4);">
      ${formGroup('\u4E8B\u696D\u7A2E\u5225', formSelect('business_type', CRM.BUSINESS_TYPES))}
      ${formGroup('\u696D\u7A2E', formSelect('store_type', [{ value: '', label: '\u9078\u629E\u3057\u3066\u304F\u3060\u3055\u3044' }, ...CRM.STORE_TYPES]))}
    </div>
    <div style="display:grid; grid-template-columns:1fr 1fr; gap:0 var(--space-4);">
      ${formGroup('\u62C5\u5F53\u8005\u540D', formInput('contact_name', '\u4F8B: \u5C71\u7530\u592A\u90CE'))}
      ${formGroup('\u96FB\u8A71\u756A\u53F7', formInput('contact_phone', '\u4F8B: 03-1234-5678', 'tel'))}
    </div>
    <div style="display:grid; grid-template-columns:1fr 1fr; gap:0 var(--space-4);">
      ${formGroup('\u30E1\u30FC\u30EB', formInput('contact_email', '\u4F8B: info@example.com', 'email'))}
      ${formGroup('LINE', formInput('contact_line', '\u4F8B: @bar-nocturne'))}
    </div>
    <div style="display:grid; grid-template-columns:1fr 1fr; gap:0 var(--space-4);">
      ${formGroup('Instagram', formInput('sns_instagram', '\u4F8B: @bar_nocturne'))}
      ${formGroup('TikTok', formInput('sns_tiktok', '\u4F8B: @bar.nocturne'))}
    </div>
    <div style="display:grid; grid-template-columns:1fr 1fr; gap:0 var(--space-4);">
      ${formGroup('\u30BD\u30FC\u30B9', formSelect('source', CRM.SOURCES))}
      ${formGroup('\u898B\u8FBC\u307F\u30D7\u30E9\u30F3', formSelect('estimated_plan', [{ value: '', label: '\u672A\u5B9A' }, ...CRM.PLANS.map(p => ({ value: p.value, label: p.label + (p.fee ? ` (${formatCurrency(p.fee)})` : '') }))]))}
    </div>
    <div style="display:grid; grid-template-columns:1fr 1fr; gap:0 var(--space-4);">
      ${formGroup('\u30A8\u30EA\u30A2', formInput('area', '\u4F8B: \u6E0B\u8C37\u3001\u516D\u672C\u6728'))}
      ${formGroup('\u30B9\u30C6\u30FC\u30B8', formSelect('stage', stageOptions, defaultStage || 'list-added'))}
    </div>
    ${formGroup('\u30E1\u30E2', formTextarea('notes', '\u30EA\u30FC\u30C9\u306B\u95A2\u3059\u308B\u30E1\u30E2\u3092\u5165\u529B...'))}
  `;

  openModal({
    title: '\u65B0\u898F\u30EA\u30FC\u30C9\u8FFD\u52A0',
    body,
    submitLabel: '\u8FFD\u52A0',
    size: 'lg',
    onSubmit: (form) => {
      const data = getFormData(form);
      if (!data.store_name) {
        showToast('\u5E97\u8217\u540D\u3092\u5165\u529B\u3057\u3066\u304F\u3060\u3055\u3044', 'error');
        return;
      }

      // Resolve estimated_fee from the selected plan
      if (data.estimated_plan) {
        const plan = CRM.PLANS.find(p => p.value === data.estimated_plan);
        if (plan && plan.fee) {
          data.estimated_fee = plan.fee;
        }
      }

      Store.addLead(data);
      closeModal();
      renderPipeline();
      updateSidebarBadges();
      showToast(`${data.store_name} \u3092\u30EA\u30B9\u30C8\u306B\u8FFD\u52A0\u3057\u307E\u3057\u305F`);
    }
  });
}

// ============================================
// View Switch (Kanban / Table)
// ============================================
function handleViewSwitch(viewName) {
  const pipeline = document.querySelector('.pipeline');
  if (!pipeline) return;

  if (viewName === '\u30C6\u30FC\u30D6\u30EB') {
    pipeline.style.display = 'none';
    showTableView();
  } else {
    pipeline.style.display = '';
    hideTableView();
  }
}

function showTableView() {
  // Remove existing table if any
  const existing = document.getElementById('leadsTableView');
  if (existing) existing.remove();

  const leads = Store.getLeads(Object.keys(currentFilters).length ? currentFilters : null);

  const container = document.querySelector('.page-content--full') || document.querySelector('.page-content');
  if (!container) return;

  const tableEl = document.createElement('div');
  tableEl.id = 'leadsTableView';
  tableEl.className = 'table-wrapper';

  tableEl.innerHTML = `
    <table class="data-table">
      <thead>
        <tr>
          <th>\u5E97\u8217\u540D</th>
          <th>\u696D\u7A2E</th>
          <th>\u4E8B\u696D</th>
          <th>\u30B9\u30C6\u30FC\u30B8</th>
          <th>\u30BD\u30FC\u30B9</th>
          <th>NEXT</th>
          <th>\u898B\u8FBC\u307F\u6708\u984D</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        ${leads.map(lead => buildTableRow(lead)).join('')}
      </tbody>
    </table>
  `;

  container.appendChild(tableEl);
}

function buildTableRow(lead) {
  const storeType = CRM.STORE_TYPES.find(t => t.value === lead.store_type);
  const businessType = CRM.BUSINESS_TYPES.find(t => t.value === lead.business_type);
  const stage = CRM.LEAD_STAGES.find(s => s.value === lead.stage);
  const source = CRM.SOURCES.find(s => s.value === lead.source);

  const storeTypeLabel = storeType ? storeType.label : '';
  const areaStr = lead.area ? `\u30FB${escapeHTML(lead.area)}` : '';
  const businessLabel = businessType ? businessType.label : '';
  const stageLabel = stage ? stage.label : '';
  const sourceLabel = source ? source.label : '';

  const overdueAttr = lead.next_date && isOverdue(lead.next_date) ? ' class="is-overdue"' : '';
  const dateDisplay = lead.next_date ? formatDate(lead.next_date) : '';

  let feeDisplay = '';
  if (lead.estimated_fee) {
    feeDisplay = formatCurrency(lead.estimated_fee);
  }

  return `<tr${overdueAttr}>
    <td style="font-weight:var(--font-medium)">
      <a href="lead-detail.html?id=${lead.id}" style="color:inherit; text-decoration:none;">${escapeHTML(lead.store_name)}</a>
    </td>
    <td style="font-size:var(--text-xs); color:var(--color-text-tertiary)">${storeTypeLabel}${areaStr}</td>
    <td><span class="badge badge--default" style="font-size:10px">${businessLabel}</span></td>
    <td><span class="badge badge--primary">${stageLabel}</span></td>
    <td style="font-size:var(--text-xs)">${sourceLabel}</td>
    <td style="font-size:var(--text-xs)">${dateDisplay}</td>
    <td style="font-weight:var(--font-semibold); color:var(--color-primary)">${feeDisplay}</td>
    <td><a href="lead-detail.html?id=${lead.id}" class="btn btn--ghost btn--sm">\u8A73\u7D30</a></td>
  </tr>`;
}

function hideTableView() {
  const table = document.getElementById('leadsTableView');
  if (table) table.remove();
}

// ============================================
// Sidebar Badges
// ============================================
function updateSidebarBadges() {
  const allLeads = Store.getLeads();
  const activeLeads = allLeads.filter(l => l.stage !== 'won' && l.stage !== 'lost');

  // Update lead badge in sidebar
  const leadNavItem = document.querySelector('a[href="leads.html"] .nav-item__badge');
  if (leadNavItem) {
    leadNavItem.textContent = activeLeads.length;
  }
}

// ============================================
// Utility
// ============================================
function escapeHTML(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
