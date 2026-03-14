/* ========================================
   Opus CRM — Clients Page Logic
   ======================================== */

// Avatar color cycle
const AVATAR_COLORS = ['primary', 'warning', 'success', 'purple', 'info'];

// ============================================
// Initialization
// ============================================
document.addEventListener('DOMContentLoaded', () => {
  Store.init();
  initPlanFilter();
  initClientFilters();
  initNewClientButton();
  renderClients();
});

// ============================================
// Render Client Table
// ============================================
function renderClients() {
  const filters = getCurrentFilters();
  const clients = Store.getClients(filters);
  const tbody = document.getElementById('clientsTableBody');
  if (!tbody) return;

  let totalFee = 0;

  // Build all rows
  const rows = clients.map((client, index) => {
    const colorClass = AVATAR_COLORS[index % AVATAR_COLORS.length];
    const initial = client.store_name ? client.store_name.charAt(0) : '?';
    const subName = client.company_name || '';

    // Service badge
    const bizType = CRM.BUSINESS_TYPES.find(b => b.value === client.business_type);
    const bizLabel = bizType ? bizType.label : '';

    // Plan name (strip "プラン" suffix for compact display)
    const plan = getAllPlans().find(p => p.value === client.plan);
    const planLabel = plan ? plan.label.replace('プラン', '') : '';

    // Monthly fee
    const fee = client.monthly_fee || 0;
    totalFee += fee;

    // Contract start date
    const contractStart = client.contract_start
      ? formatContractDate(client.contract_start)
      : '';

    // Status badge
    const statusCfg = CRM.CLIENT_STATUSES.find(s => s.value === client.status);
    const statusLabel = statusCfg ? statusCfg.label : '';
    const statusBadge = statusCfg ? statusCfg.badge : 'default';

    // NEXT date with overdue/today/upcoming styling
    const nextDateHtml = buildNextDateHtml(client.next_date);

    return `<tr>
      <td>
        <div class="client-cell">
          <div class="client-avatar client-avatar--${colorClass}">${initial}</div>
          <div>
            <div class="client-cell__name">${escapeHtml(client.store_name)}</div>
            <div class="client-cell__sub">${escapeHtml(subName)}</div>
          </div>
        </div>
      </td>
      <td><span class="badge badge--default">${escapeHtml(bizLabel)}</span></td>
      <td>${escapeHtml(planLabel)}</td>
      <td class="data-table__price">${fee ? formatCurrency(fee) : ''}</td>
      <td>${contractStart}</td>
      <td><span class="badge badge--${statusBadge}"><span class="badge__dot"></span>${escapeHtml(statusLabel)}</span></td>
      <td>${nextDateHtml}</td>
      <td><a href="client-detail.html?id=${client.id}" class="btn btn--ghost btn--sm">詳細</a></td>
    </tr>`;
  });

  if (rows.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:var(--space-8) var(--space-4); color:var(--color-text-tertiary);">
      <div style="font-size:var(--text-lg); margin-bottom:var(--space-2);">まだクライアントがいません</div>
      <div style="font-size:var(--text-sm);">リードが成約するとクライアントとして登録されます</div>
    </td></tr>`;
  } else {
    tbody.innerHTML = rows.join('');
  }

  // Update footer stats
  const footerCount = document.getElementById('footerCount');
  const footerTotal = document.getElementById('footerTotal');
  if (footerCount) footerCount.textContent = clients.length + '件';
  if (footerTotal) footerTotal.textContent = formatCurrency(totalFee);

  // Make rows clickable for quick navigation
  initRowClick();
}

// ============================================
// Filters
// ============================================
function initPlanFilter() {
  const planSelect = document.getElementById('filterPlan');
  if (!planSelect) return;

  // Populate plan options (built-in + custom)
  getAllPlans().forEach(p => {
    const opt = document.createElement('option');
    opt.value = p.value;
    opt.textContent = p.label;
    planSelect.appendChild(opt);
  });
}

function initClientFilters() {
  const statusSelect = document.getElementById('filterStatus');
  const businessSelect = document.getElementById('filterBusiness');
  const planSelect = document.getElementById('filterPlan');
  const searchInput = document.getElementById('filterSearch');

  // Bind change/input events
  [statusSelect, businessSelect, planSelect].forEach(el => {
    if (el) el.addEventListener('change', () => renderClients());
  });
  if (searchInput) {
    searchInput.addEventListener('input', () => renderClients());
  }
}

function getCurrentFilters() {
  const filters = {};

  const statusVal = document.getElementById('filterStatus')?.value;
  if (statusVal) filters.status = statusVal;

  const bizVal = document.getElementById('filterBusiness')?.value;
  if (bizVal) filters.business_type = bizVal;

  const planVal = document.getElementById('filterPlan')?.value;
  if (planVal) filters.plan = planVal;

  const searchVal = document.getElementById('filterSearch')?.value?.trim();
  if (searchVal) filters.search = searchVal;

  return Object.keys(filters).length ? filters : undefined;
}

// ============================================
// New Client Modal
// ============================================
function initNewClientButton() {
  document.querySelectorAll('.btn--primary').forEach(btn => {
    if (btn.textContent.includes('新規登録')) {
      btn.addEventListener('click', openNewClientModal);
    }
  });
}

function openNewClientModal() {
  const body = `
    <div style="display:grid; grid-template-columns:1fr 1fr; gap:0 var(--space-4);">
      ${formGroup('店舗名 *', formInput('store_name', '例: Lounge VELVET'))}
      ${formGroup('企業名', formInput('company_name', '例: 株式会社VELVET'))}
    </div>
    <div style="display:grid; grid-template-columns:1fr 1fr; gap:0 var(--space-4);">
      ${formGroup('サービス', formSelect('business_type', CRM.BUSINESS_TYPES))}
      ${formGroup('プラン', formSelect('plan', [{ value: '', label: '選択してください' }, ...getAllPlans().map(p => ({ value: p.value, label: p.label + (p.fee ? ' (' + formatCurrency(p.fee) + ')' : '') }))]))}
    </div>
    <div style="display:grid; grid-template-columns:1fr 1fr; gap:0 var(--space-4);">
      ${formGroup('月額', formInput('monthly_fee', '例: 300000', 'number'))}
      ${formGroup('契約開始日', formInput('contract_start', '', 'date'))}
    </div>
    <div style="display:grid; grid-template-columns:1fr 1fr; gap:0 var(--space-4);">
      ${formGroup('担当者名', formInput('contact_name', ''))}
      ${formGroup('電話番号', formInput('contact_phone', '', 'tel'))}
    </div>
    ${formGroup('メール', formInput('contact_email', '', 'email'))}
    ${formGroup('メモ', formTextarea('notes', ''))}
  `;

  const modal = openModal({
    title: '新規クライアント登録',
    body,
    submitLabel: '登録',
    size: 'lg',
    onSubmit: (form) => {
      const data = getFormData(form);
      if (!data.store_name) {
        showToast('店舗名を入力してください', 'error');
        return;
      }

      // If no fee entered but plan selected, auto-fill from plan config
      if (!data.monthly_fee && data.plan) {
        const plan = getAllPlans().find(p => p.value === data.plan);
        if (plan && plan.fee) data.monthly_fee = plan.fee;
      }

      Store.addClient(data);
      closeModal();
      renderClients();
      showToast(`${data.store_name} を登録しました`);
    }
  });

  // Auto-fill monthly_fee when plan changes
  setupPlanAutoFill(modal);
}

function setupPlanAutoFill(modalEl) {
  if (!modalEl) return;
  const planSelect = modalEl.querySelector('select[name="plan"]');
  const feeInput = modalEl.querySelector('input[name="monthly_fee"]');
  if (!planSelect || !feeInput) return;

  planSelect.addEventListener('change', () => {
    const selected = getAllPlans().find(p => p.value === planSelect.value);
    if (selected && selected.fee) {
      feeInput.value = selected.fee;
    }
  });
}

// ============================================
// Row Click Navigation
// ============================================
function initRowClick() {
  const tbody = document.getElementById('clientsTableBody');
  if (!tbody) return;

  tbody.querySelectorAll('tr').forEach(row => {
    row.style.cursor = 'pointer';
    row.addEventListener('click', (e) => {
      // Don't navigate if clicking a link or button directly
      if (e.target.closest('a, button')) return;
      const link = row.querySelector('a[href]');
      if (link) window.location.href = link.href;
    });
  });
}

// ============================================
// Utility Helpers
// ============================================

// Format contract start date as YYYY/MM/DD
function formatContractDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}/${m}/${day}`;
}

// Build NEXT date HTML with appropriate styling
function buildNextDateHtml(dateStr) {
  if (!dateStr) return '';
  const formatted = formatDate(dateStr);

  if (isOverdue(dateStr)) {
    return `<span class="next-date next-date--overdue">${formatted}</span>`;
  }
  if (isToday(dateStr)) {
    return `<span class="next-date next-date--today">${formatted}</span>`;
  }
  return `<span class="next-date next-date--upcoming">${formatted}</span>`;
}

// escapeHtml() is defined in ui.js (shared)
