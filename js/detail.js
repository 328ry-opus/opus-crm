/* ========================================
   Opus CRM — Detail Page Logic
   Data-driven via Store module.
   Shared by lead-detail.html & client-detail.html.
   ======================================== */

// --- Module state ---
let currentId = null;
let currentType = null; // 'lead' or 'client'
let currentRecord = null;

// escapeHtml() is defined in ui.js (shared)

// --- SVG icon constants ---
const ICON_SVGS = {
  dm: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
  call: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72"/></svg>',
  email: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>',
  meeting: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>',
  note: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>',
};

// Info section header icons
const SECTION_ICONS = {
  store: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>',
  contact: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>',
  sns: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>',
  finance: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>',
  contract: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>',
};

// Calendar icon for NEXT date badges
const CALENDAR_ICON = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>';


// ============================================
// Entry Point
// ============================================
document.addEventListener('DOMContentLoaded', () => {
  Store.init();

  // Read entity ID from URL query string
  currentId = new URLSearchParams(window.location.search).get('id');
  if (!currentId) {
    window.location.href = 'leads.html';
    return;
  }

  // Detect page type from pathname
  const pathname = window.location.pathname;
  if (pathname.includes('lead-detail')) {
    currentType = 'lead';
    currentRecord = Store.getLead(currentId);
    if (!currentRecord) { window.location.href = 'leads.html'; return; }
    renderLeadDetail(currentRecord);
  } else {
    currentType = 'client';
    currentRecord = Store.getClient(currentId);
    if (!currentRecord) { window.location.href = 'clients.html'; return; }
    renderClientDetail(currentRecord);
  }

  // Wire up header buttons (edit / delete)
  setupHeaderButtons();

  // Wire up quick actions via event delegation
  setupQuickActions();

  // Re-init tabs after dynamic render
  initTabs();
});


// ============================================
// Helpers: lookup, date formatting, badges
// ============================================
function lookupLabel(arr, value) {
  const item = arr.find(i => i.value === value);
  return item ? item.label : value || '';
}

// Format ISO datetime for timeline display
function formatDateTime(isoStr) {
  if (!isoStr) return '';
  const d = new Date(isoStr);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const h = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  if (h === '00' && min === '00') return `${y}/${m}/${day}`;
  return `${y}/${m}/${day} ${h}:${min}`;
}

// Format YYYY-MM-DD to readable YYYY/MM/DD
function formatFullDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
}

// Build NEXT date badge
function buildNextDateBadge(nextDate) {
  if (!nextDate) return '';
  const d = new Date(nextDate);
  let cls = 'next-date--upcoming';
  let suffix = '';
  if (isOverdue(nextDate)) cls = 'next-date--overdue';
  else if (isToday(nextDate)) { cls = 'next-date--today'; suffix = '（今日）'; }
  return `<span class="next-date ${cls}">${CALENDAR_ICON} NEXT: ${d.getMonth() + 1}/${d.getDate()}${suffix}</span>`;
}

// Build lead stage badge
function buildStageBadge(stageValue) {
  const stage = CRM.LEAD_STAGES.find(s => s.value === stageValue);
  if (!stage) return '';
  const badgeMap = {
    'list-added': 'default', 'dm-sent': 'info', 'replied': 'purple',
    'appointment-set': 'warning', 'in-meeting': 'orange', 'proposal-sent': 'primary',
    'won': 'success', 'lost': 'default',
  };
  const badgeCls = badgeMap[stageValue] || 'default';
  return `<span class="badge badge--${badgeCls}"><span class="badge__dot"></span>${escapeHtml(stage.label)}</span>`;
}

// Build client status badge
function buildStatusBadge(statusValue) {
  const status = CRM.CLIENT_STATUSES.find(s => s.value === statusValue);
  if (!status) return '';
  return `<span class="badge badge--${status.badge}"><span class="badge__dot"></span>${escapeHtml(status.label)}</span>`;
}


// ============================================
// Lead Detail Rendering
// ============================================
function renderLeadDetail(lead) {
  // Page title
  document.title = `${lead.store_name} - リード詳細 - Opus CRM`;

  // Breadcrumb
  const breadcrumbCurrent = document.querySelector('.page-header__breadcrumb-current');
  if (breadcrumbCurrent) breadcrumbCurrent.textContent = lead.store_name;

  // --- Detail Header ---
  const detailHeader = document.querySelector('.detail-header');
  if (detailHeader) {
    const storeType = lookupLabel(getAllStoreTypes(), lead.store_type);
    const bizType = lookupLabel(CRM.BUSINESS_TYPES, lead.business_type);
    const source = lookupLabel(getAllSources(), lead.source);
    const feeLabel = lead.estimated_fee ? `見込み ${formatCurrency(lead.estimated_fee)}/月` : '';

    detailHeader.innerHTML = `
      <div class="detail-header__top">
        <h1 class="detail-header__name">
          ${escapeHtml(lead.store_name)}
          ${buildStageBadge(lead.stage)}
        </h1>
        ${buildNextDateBadge(lead.next_date)}
      </div>
      <div class="detail-header__meta">
        ${lead.area ? `<span class="detail-header__meta-item"><span class="detail-header__meta-icon"><svg viewBox="0 0 24 24"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg></span>${escapeHtml(lead.area)}</span>` : ''}
        ${storeType ? `<span class="detail-header__meta-item"><span class="detail-header__meta-icon">${SECTION_ICONS.store}</span>${escapeHtml(storeType)}</span>` : ''}
        ${bizType ? `<span class="detail-header__meta-item"><span class="badge badge--default badge--xs">${escapeHtml(bizType)}</span></span>` : ''}
        ${feeLabel ? `<span class="detail-header__meta-item"><span class="detail-header__meta-icon">${SECTION_ICONS.finance}</span>${feeLabel}</span>` : ''}
        ${source ? `<span class="detail-header__meta-item"><span class="detail-header__meta-icon">${ICON_SVGS.email}</span>${escapeHtml(source)}</span>` : ''}
      </div>
    `;
  }

  // --- Tabs & Tab Content ---
  const mainArea = document.querySelector('.detail-body__main');
  if (mainArea) {
    const activities = Store.getActivities('lead', lead.id);

    mainArea.innerHTML = `
      <div class="tabs">
        <div class="tab is-active" data-tab="info">基本情報</div>
        <div class="tab" data-tab="activity">対応履歴</div>
        <div class="tab" data-tab="notes">メモ</div>
      </div>

      <!-- Tab: Basic Info -->
      <div class="tab-content is-active" data-tab-content="info">
        ${buildInfoSection(SECTION_ICONS.store, '店舗情報', [
          ['店舗名', escapeHtml(lead.store_name)],
          ['企業名', escapeHtml(lead.company_name) || '—'],
          ['業種', escapeHtml(lookupLabel(getAllStoreTypes(), lead.store_type)) || '—'],
          ['エリア', escapeHtml(lead.area) || '—'],
        ])}
        ${buildInfoSection(SECTION_ICONS.contact, '連絡先', [
          ['担当者', escapeHtml(lead.contact_name) || '—'],
          ['電話', lead.contact_phone ? `<a href="tel:${escapeHtml(lead.contact_phone)}">${escapeHtml(lead.contact_phone)}</a>` : '—'],
          ['メール', lead.contact_email ? `<a href="mailto:${escapeHtml(lead.contact_email)}">${escapeHtml(lead.contact_email)}</a>` : '—'],
          ['LINE', escapeHtml(lead.contact_line) || '—'],
        ])}
        ${buildInfoSection(SECTION_ICONS.sns, 'SNSアカウント', [
          ['Instagram', lead.sns_instagram ? `<a href="#">${escapeHtml(lead.sns_instagram)}</a>` : '—'],
          ['TikTok', lead.sns_tiktok ? `<a href="#">${escapeHtml(lead.sns_tiktok)}</a>` : '—'],
        ])}
        ${buildInfoSection(SECTION_ICONS.finance, '見込み情報', [
          ['見込みプラン', escapeHtml(lookupLabel(getAllPlans(), lead.estimated_plan)) || '未定'],
          ['見込み月額', lead.estimated_fee ? `<span class="info-grid__value--primary">${formatCurrency(lead.estimated_fee)}/月</span>` : '—'],
          ['ソース', escapeHtml(lookupLabel(getAllSources(), lead.source)) || '—'],
          ['リスト追加日', formatFullDate(lead.created_at)],
        ])}
      </div>

      <!-- Tab: Activity Timeline -->
      <div class="tab-content" data-tab-content="activity">
        <div class="section__header section__header--spaced">
          <h3 class="section__title">対応履歴</h3>
          <button class="btn btn--secondary btn--sm" data-action="add-activity">
            <span class="btn__icon"><svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg></span>
            記録を追加
          </button>
        </div>
        <div class="timeline">
          ${renderTimeline(activities)}
        </div>
      </div>

      <!-- Tab: Notes -->
      <div class="tab-content" data-tab-content="notes">
        <div class="info-section">
          <div class="info-section__body">
            <p class="detail-notes">${lead.notes ? escapeHtml(lead.notes).replace(/\n/g, '<br>') : '<span style="color:var(--color-text-tertiary)">メモはありません</span>'}</p>
          </div>
        </div>
      </div>
    `;

    // Bind "add activity" button inside activity tab
    mainArea.querySelectorAll('[data-action="add-activity"]').forEach(btn => {
      btn.addEventListener('click', openActivityModal);
    });
  }

  // --- Quick Actions Sidebar ---
  const sidebar = document.querySelector('.detail-body__sidebar');
  if (sidebar) {
    sidebar.innerHTML = `
      <div class="quick-actions">
        <div class="quick-actions__title">クイックアクション</div>
        <div class="quick-actions__list">
          <button class="quick-action-btn" data-action="qa-activity">
            <span class="quick-action-btn__icon"><svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg></span>
            対応記録を追加
          </button>
          <button class="quick-action-btn" data-action="qa-stage">
            <span class="quick-action-btn__icon"><svg viewBox="0 0 24 24"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg></span>
            ステージを変更
          </button>
          <button class="quick-action-btn" data-action="qa-next-date">
            <span class="quick-action-btn__icon"><svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg></span>
            NEXT日付を変更
          </button>
          <button class="quick-action-btn" data-action="qa-phone">
            <span class="quick-action-btn__icon"><svg viewBox="0 0 24 24"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg></span>
            電話する
          </button>
          <button class="quick-action-btn quick-action-btn--primary quick-action-btn--spaced" data-action="qa-convert">
            <span class="quick-action-btn__icon"><svg viewBox="0 0 24 24"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg></span>
            成約 → クライアント登録
          </button>
        </div>
      </div>
    `;
  }
}


// ============================================
// Client Detail Rendering
// ============================================
function renderClientDetail(client) {
  // Page title
  document.title = `${client.store_name} - クライアント詳細 - Opus CRM`;

  // Breadcrumb
  const breadcrumbCurrent = document.querySelector('.page-header__breadcrumb-current');
  if (breadcrumbCurrent) breadcrumbCurrent.textContent = client.store_name;

  // --- Detail Header ---
  const detailHeader = document.querySelector('.detail-header');
  if (detailHeader) {
    const bizType = lookupLabel(CRM.BUSINESS_TYPES, client.business_type);
    const storeType = lookupLabel(getAllStoreTypes(), client.store_type);
    const feeLabel = client.monthly_fee ? formatCurrency(client.monthly_fee) + '/月' : '';

    detailHeader.innerHTML = `
      <div class="detail-header__top">
        <h1 class="detail-header__name">
          ${escapeHtml(client.store_name)}
          ${buildStatusBadge(client.status)}
        </h1>
        ${buildNextDateBadge(client.next_date)}
      </div>
      <div class="detail-header__meta">
        ${bizType ? `<span class="detail-header__meta-item"><span class="badge badge--default badge--xs">${escapeHtml(bizType)}</span></span>` : ''}
        ${storeType ? `<span class="detail-header__meta-item">${escapeHtml(storeType)}</span>` : ''}
        ${client.company_name ? `<span class="detail-header__meta-item">${escapeHtml(client.company_name)}</span>` : ''}
        ${feeLabel ? `<span class="detail-header__meta-item detail-header__meta-item--primary">${feeLabel}</span>` : ''}
      </div>
    `;
  }

  // --- Contract Summary Cards ---
  const pageContent = document.querySelector('.page-content');
  const detailBody = document.querySelector('.detail-body');
  if (pageContent && detailBody) {
    const plan = getAllPlans().find(p => p.value === client.plan);
    const planLabel = plan ? plan.label.replace('プラン', '') : '—';
    const feeVal = client.monthly_fee ? formatCurrency(client.monthly_fee) : '—';
    const startStr = client.contract_start ? formatFullDate(client.contract_start).slice(0, 7).replace('-', '/') : '';
    const endStr = client.contract_end ? formatFullDate(client.contract_end).slice(0, 7).replace('-', '/') : '継続中';
    const periodStr = startStr ? `${startStr} 〜 ${endStr}` : '—';

    // Insert or update contract summary before detail-body
    let contractSummary = document.querySelector('.contract-summary');
    if (!contractSummary) {
      contractSummary = document.createElement('div');
      contractSummary.className = 'contract-summary';
      pageContent.insertBefore(contractSummary, detailBody);
    }
    contractSummary.innerHTML = `
      <div class="contract-summary__item">
        <div class="contract-summary__label">プラン</div>
        <div class="contract-summary__value">${escapeHtml(planLabel)}</div>
      </div>
      <div class="contract-summary__item">
        <div class="contract-summary__label">月額</div>
        <div class="contract-summary__value contract-summary__value--primary">${feeVal}</div>
      </div>
      <div class="contract-summary__item">
        <div class="contract-summary__label">契約期間</div>
        <div class="contract-summary__value contract-summary__value--sm">${periodStr}</div>
      </div>
    `;
  }

  // --- Tabs & Tab Content ---
  const mainArea = document.querySelector('.detail-body__main');
  if (mainArea) {
    const activities = Store.getActivities('client', client.id);
    const tasks = Store.getTasksForClient(client.id);
    const plan = getAllPlans().find(p => p.value === client.plan);

    mainArea.innerHTML = `
      <div class="tabs">
        <div class="tab is-active" data-tab="contract">契約情報</div>
        <div class="tab" data-tab="projects">案件・タスク</div>
        <div class="tab" data-tab="activity">対応履歴</div>
      </div>

      <!-- Tab: Contract Info -->
      <div class="tab-content is-active" data-tab-content="contract">
        ${buildInfoSection(SECTION_ICONS.store, '基本情報', [
          ['店舗名', escapeHtml(client.store_name)],
          ['運営会社', escapeHtml(client.company_name) || '—'],
          ['業種', escapeHtml(lookupLabel(getAllStoreTypes(), client.store_type)) || '—'],
          ['担当者', escapeHtml(client.contact_name) || '—'],
          ['電話', client.contact_phone ? `<a href="tel:${escapeHtml(client.contact_phone)}">${escapeHtml(client.contact_phone)}</a>` : '—'],
          ['メール', client.contact_email ? `<a href="mailto:${escapeHtml(client.contact_email)}">${escapeHtml(client.contact_email)}</a>` : '—'],
        ])}
        ${buildInfoSection(SECTION_ICONS.contract, '契約詳細', [
          ['サービス', escapeHtml(lookupLabel(CRM.BUSINESS_TYPES, client.business_type)) || '—'],
          ['プラン', plan ? escapeHtml(plan.label) : '—'],
          ['月額', client.monthly_fee ? `<span class="info-grid__value--primary">${formatCurrency(client.monthly_fee)}</span>` : '—'],
          ['契約開始日', formatFullDate(client.contract_start) || '—'],
          ['契約終了日', client.contract_end ? formatFullDate(client.contract_end) : 'なし（自動更新）'],
          ['契約書', '<a href="#">Google Drive で開く</a>'],
        ])}
        ${buildInfoSection(SECTION_ICONS.sns, 'SNSアカウント', [
          ['Instagram', client.sns_instagram ? `<a href="#">${escapeHtml(client.sns_instagram)}</a>` : '—'],
          ['TikTok', client.sns_tiktok ? `<a href="#">${escapeHtml(client.sns_tiktok)}</a>` : '—'],
        ])}
      </div>

      <!-- Tab: Tasks -->
      <div class="tab-content" data-tab-content="projects">
        <div class="section__header section__header--spaced">
          <h3 class="section__title">タスク一覧</h3>
          <button class="btn btn--secondary btn--sm" data-action="add-task">
            <span class="btn__icon"><svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg></span>
            タスク追加
          </button>
        </div>
        <div class="task-list">
          ${renderTaskList(tasks)}
        </div>
      </div>

      <!-- Tab: Activity Timeline -->
      <div class="tab-content" data-tab-content="activity">
        <div class="section__header section__header--spaced">
          <h3 class="section__title">対応履歴</h3>
          <button class="btn btn--secondary btn--sm" data-action="add-activity">
            <span class="btn__icon"><svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg></span>
            記録を追加
          </button>
        </div>
        <div class="timeline">
          ${renderTimeline(activities)}
        </div>
      </div>
    `;

    // Bind activity add button
    mainArea.querySelectorAll('[data-action="add-activity"]').forEach(btn => {
      btn.addEventListener('click', openActivityModal);
    });

    // Bind task add button
    mainArea.querySelectorAll('[data-action="add-task"]').forEach(btn => {
      btn.addEventListener('click', openQuickTaskModal);
    });

    // Bind task checkboxes
    bindTaskCheckboxes();
  }

  // --- Quick Actions Sidebar ---
  const sidebar = document.querySelector('.detail-body__sidebar');
  if (sidebar) {
    sidebar.innerHTML = `
      <div class="quick-actions">
        <div class="quick-actions__title">クイックアクション</div>
        <div class="quick-actions__list">
          <button class="quick-action-btn" data-action="qa-activity">
            <span class="quick-action-btn__icon"><svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg></span>
            対応記録を追加
          </button>
          <button class="quick-action-btn" data-action="qa-add-task">
            <span class="quick-action-btn__icon"><svg viewBox="0 0 24 24"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg></span>
            タスクを追加
          </button>
          <button class="quick-action-btn" data-action="qa-next-date">
            <span class="quick-action-btn__icon"><svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg></span>
            NEXT日付を変更
          </button>
          <button class="quick-action-btn" data-action="qa-phone">
            <span class="quick-action-btn__icon"><svg viewBox="0 0 24 24"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg></span>
            電話する
          </button>
          <button class="quick-action-btn" data-action="qa-contract-doc">
            <span class="quick-action-btn__icon"><svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg></span>
            契約書を確認
          </button>
        </div>
      </div>
    `;
  }
}


// ============================================
// Shared Rendering Helpers
// ============================================

// Build an info-section block with label/value grid
function buildInfoSection(iconSvg, title, rows) {
  const gridRows = rows.map(([label, value]) =>
    `<div class="info-grid__label">${label}</div><div class="info-grid__value">${value}</div>`
  ).join('');

  return `
    <div class="info-section">
      <div class="info-section__header">${iconSvg} ${title}</div>
      <div class="info-section__body">
        <div class="info-grid">${gridRows}</div>
      </div>
    </div>
  `;
}

// Build timeline HTML from activity array
function renderTimeline(activities) {
  if (!activities || activities.length === 0) {
    return '<p style="color:var(--color-text-tertiary); font-size:var(--text-sm); padding:var(--space-4) 0;">対応履歴はまだありません</p>';
  }
  return activities.map(a => {
    const actType = CRM.ACTIVITY_TYPES.find(t => t.value === a.activity_type) || CRM.ACTIVITY_TYPES[5];
    const iconKey = actType.icon || 'note';
    const iconSvg = ICON_SVGS[iconKey] || ICON_SVGS.note;
    return `
      <div class="timeline-item">
        <div class="timeline-item__icon timeline-item__icon--${iconKey}">${iconSvg}</div>
        <div class="timeline-item__content">
          <div class="timeline-item__header">
            <span class="timeline-item__type">${escapeHtml(actType.label)}</span>
            <span class="timeline-item__date">${formatDateTime(a.created_at)}</span>
          </div>
          <div class="timeline-item__summary">${escapeHtml(a.summary)}</div>
        </div>
      </div>
    `;
  }).join('');
}

// Build task list HTML for client detail
function renderTaskList(tasks) {
  if (!tasks || tasks.length === 0) {
    return '<p style="color:var(--color-text-tertiary); font-size:var(--text-sm); padding:var(--space-4) 0;">タスクはまだありません</p>';
  }

  // Sort: done at bottom, then by due_date ascending
  const sorted = [...tasks].sort((a, b) => {
    if (a.status === 'done' && b.status !== 'done') return 1;
    if (a.status !== 'done' && b.status === 'done') return -1;
    return (a.due_date || '').localeCompare(b.due_date || '');
  });

  return sorted.map(t => {
    const isDone = t.status === 'done';
    const priority = CRM.PRIORITIES.find(p => p.value === t.priority);
    const taskType = CRM.TASK_TYPES.find(tt => tt.value === t.task_type);
    const assignee = getAllAssignees().find(a => a.value === t.assigned_to);
    const dateLabel = isDone && t.completed_date
      ? `完了: ${formatDate(t.completed_date)}`
      : (t.due_date ? `期限: ${formatDate(t.due_date)}` : '');
    const checkSvg = isDone ? '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>' : '';

    return `
      <div class="task-item${isDone ? ' is-done' : ''}" data-task-id="${escapeHtml(t.id)}">
        <div class="task-item__check${isDone ? ' is-done' : ''}">${checkSvg}</div>
        <div class="task-item__content">
          <div class="task-item__title">${escapeHtml(t.title)}</div>
          <div class="task-item__meta">
            ${taskType ? `<span>${escapeHtml(taskType.label)}</span>` : ''}
            ${dateLabel ? `<span>${dateLabel}</span>` : ''}
            ${assignee ? `<span>担当: ${escapeHtml(assignee.label)}</span>` : ''}
          </div>
        </div>
        ${!isDone && priority ? `<span class="task-item__priority task-item__priority--${priority.cssClass}">${escapeHtml(priority.label)}</span>` : ''}
      </div>
    `;
  }).join('');
}

// Bind click handlers to task checkboxes for toggling done/undone
function bindTaskCheckboxes() {
  document.querySelectorAll('.task-item').forEach(item => {
    const check = item.querySelector('.task-item__check');
    if (!check) return;

    check.addEventListener('click', () => {
      const taskId = item.getAttribute('data-task-id');
      if (!taskId) return;

      const isDone = check.classList.contains('is-done');

      if (isDone) {
        // Toggle back to todo
        Store.updateTask(taskId, { status: 'todo', completed_date: '' });
        check.classList.remove('is-done');
        check.innerHTML = '';
        item.classList.remove('is-done');
        showToast('タスクを未完了に戻しました');
      } else {
        // Mark done
        const today = new Date().toISOString().slice(0, 10);
        Store.updateTask(taskId, { status: 'done', completed_date: today });
        check.classList.add('is-done');
        check.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>';
        item.classList.add('is-done');
        showToast('タスクを完了にしました');
      }
    });
  });
}


// ============================================
// Header Buttons (Edit / Delete)
// ============================================
function setupHeaderButtons() {
  const headerRight = document.querySelector('.page-header__right');
  if (!headerRight) return;

  // Edit button
  const editBtn = headerRight.querySelector('.btn--secondary');
  if (editBtn) {
    editBtn.addEventListener('click', () => {
      if (currentType === 'lead') openEditLeadModal();
      else openEditClientModal();
    });
  }

  // Delete button — add dynamically if not present
  let deleteBtn = headerRight.querySelector('.btn--ghost-danger');
  if (!deleteBtn) {
    deleteBtn = document.createElement('button');
    deleteBtn.className = 'btn btn--ghost btn--sm btn--ghost-danger';
    deleteBtn.textContent = '削除';
    headerRight.appendChild(deleteBtn);
  }
  deleteBtn.addEventListener('click', handleDelete);
}


// ============================================
// Quick Actions Setup (event delegation)
// ============================================
function setupQuickActions() {
  const sidebar = document.querySelector('.detail-body__sidebar');
  if (!sidebar) return;

  sidebar.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const action = btn.getAttribute('data-action');

    switch (action) {
      case 'qa-activity': openActivityModal(); break;
      case 'qa-stage': openStageChangeModal(); break;
      case 'qa-next-date': openNextDateModal(); break;
      case 'qa-phone': handlePhoneCall(); break;
      case 'qa-convert': openConvertModal(); break;
      case 'qa-add-task': openQuickTaskModal(); break;
      case 'qa-contract-doc': showToast('Google Driveを開きます...'); break;
    }
  });
}

// Phone action
function handlePhoneCall() {
  const phone = currentRecord.contact_phone;
  if (phone) {
    window.location.href = `tel:${phone}`;
  } else {
    showToast('電話番号が登録されていません', 'error');
  }
}


// ============================================
// Re-render helper: re-render page and re-bind
// ============================================
function refreshPage() {
  if (currentType === 'lead') {
    currentRecord = Store.getLead(currentId);
    renderLeadDetail(currentRecord);
  } else {
    currentRecord = Store.getClient(currentId);
    renderClientDetail(currentRecord);
  }
  setupQuickActions();
  initTabs();
}


// ============================================
// Edit Lead Modal
// ============================================
function openEditLeadModal() {
  const lead = currentRecord;
  const body = `
    <div style="display:grid; grid-template-columns:1fr 1fr; gap:0 var(--space-4);">
      ${formGroup('店舗名 *', formInput('store_name', '例: Bar Nocturne', 'text', lead.store_name))}
      ${formGroup('企業名', formInput('company_name', '例: 株式会社ABC', 'text', lead.company_name))}
    </div>
    <div style="display:grid; grid-template-columns:1fr 1fr; gap:0 var(--space-4);">
      ${formGroup('事業種別', formSelect('business_type', CRM.BUSINESS_TYPES, lead.business_type))}
      ${formGroup('業種', formSelect('store_type', [{ value: '', label: '選択してください' }, ...getAllStoreTypes()], lead.store_type))}
    </div>
    <div style="display:grid; grid-template-columns:1fr 1fr; gap:0 var(--space-4);">
      ${formGroup('担当者名', formInput('contact_name', '例: 山田太郎', 'text', lead.contact_name))}
      ${formGroup('電話番号', formInput('contact_phone', '例: 03-1234-5678', 'tel', lead.contact_phone))}
    </div>
    <div style="display:grid; grid-template-columns:1fr 1fr; gap:0 var(--space-4);">
      ${formGroup('メール', formInput('contact_email', '例: info@example.com', 'email', lead.contact_email))}
      ${formGroup('LINE', formInput('contact_line', '例: @bar-nocturne', 'text', lead.contact_line))}
    </div>
    <div style="display:grid; grid-template-columns:1fr 1fr; gap:0 var(--space-4);">
      ${formGroup('Instagram', formInput('sns_instagram', '例: @bar_nocturne', 'text', lead.sns_instagram))}
      ${formGroup('TikTok', formInput('sns_tiktok', '例: @bar.nocturne', 'text', lead.sns_tiktok))}
    </div>
    <div style="display:grid; grid-template-columns:1fr 1fr; gap:0 var(--space-4);">
      ${formGroup('ソース', formSelect('source', getAllSources(), lead.source))}
      ${formGroup('見込みプラン', formSelect('estimated_plan', [{ value: '', label: '未定' }, ...getAllPlans().map(p => ({ value: p.value, label: p.label + (p.fee ? ` (${formatCurrency(p.fee)})` : '') }))], lead.estimated_plan))}
    </div>
    <div style="display:grid; grid-template-columns:1fr 1fr; gap:0 var(--space-4);">
      ${formGroup('見込み月額', formInput('estimated_fee', '例: 300000', 'number', lead.estimated_fee || ''))}
      ${formGroup('担当', formSelect('assigned_to', getAllAssignees().map(a => ({ value: a.value, label: a.label })), lead.assigned_to))}
    </div>
    ${formGroup('エリア', formInput('area', '例: 渋谷、六本木', 'text', lead.area))}
    ${formGroup('メモ', formTextarea('notes', 'リードに関するメモを入力...', lead.notes))}
  `;

  openModal({
    title: 'リード情報を編集',
    body,
    submitLabel: '保存',
    size: 'lg',
    onSubmit: (form) => {
      const data = getFormData(form);
      if (!data.store_name) {
        showToast('店舗名を入力してください', 'error');
        return;
      }
      if (data.estimated_fee) data.estimated_fee = parseInt(data.estimated_fee) || 0;
      Store.updateLead(currentId, data);
      closeModal();
      refreshPage();
      showToast('リード情報を更新しました');
    }
  });
}


// ============================================
// Edit Client Modal
// ============================================
function openEditClientModal() {
  const client = currentRecord;
  const body = `
    <div style="display:grid; grid-template-columns:1fr 1fr; gap:0 var(--space-4);">
      ${formGroup('店舗名 *', formInput('store_name', '例: Lounge VELVET', 'text', client.store_name))}
      ${formGroup('企業名', formInput('company_name', '例: 株式会社VELVET', 'text', client.company_name))}
    </div>
    <div style="display:grid; grid-template-columns:1fr 1fr; gap:0 var(--space-4);">
      ${formGroup('事業種別', formSelect('business_type', CRM.BUSINESS_TYPES, client.business_type))}
      ${formGroup('業種', formSelect('store_type', [{ value: '', label: '選択してください' }, ...getAllStoreTypes()], client.store_type))}
    </div>
    <div style="display:grid; grid-template-columns:1fr 1fr; gap:0 var(--space-4);">
      ${formGroup('担当者名', formInput('contact_name', '', 'text', client.contact_name))}
      ${formGroup('電話番号', formInput('contact_phone', '', 'tel', client.contact_phone))}
    </div>
    <div style="display:grid; grid-template-columns:1fr 1fr; gap:0 var(--space-4);">
      ${formGroup('メール', formInput('contact_email', '', 'email', client.contact_email))}
      ${formGroup('LINE', formInput('contact_line', '', 'text', client.contact_line))}
    </div>
    <div style="display:grid; grid-template-columns:1fr 1fr; gap:0 var(--space-4);">
      ${formGroup('Instagram', formInput('sns_instagram', '', 'text', client.sns_instagram))}
      ${formGroup('TikTok', formInput('sns_tiktok', '', 'text', client.sns_tiktok))}
    </div>
    <div style="display:grid; grid-template-columns:1fr 1fr; gap:0 var(--space-4);">
      ${formGroup('プラン', formSelect('plan', getAllPlans().map(p => ({ value: p.value, label: p.label })), client.plan))}
      ${formGroup('月額', formInput('monthly_fee', '例: 300000', 'number', client.monthly_fee || ''))}
    </div>
    <div style="display:grid; grid-template-columns:1fr 1fr; gap:0 var(--space-4);">
      ${formGroup('契約開始日', formInput('contract_start', '', 'date', client.contract_start))}
      ${formGroup('契約終了日', formInput('contract_end', '', 'date', client.contract_end))}
    </div>
    <div style="display:grid; grid-template-columns:1fr 1fr; gap:0 var(--space-4);">
      ${formGroup('ステータス', formSelect('status', CRM.CLIENT_STATUSES.map(s => ({ value: s.value, label: s.label })), client.status))}
      ${formGroup('担当', formSelect('assigned_to', getAllAssignees().map(a => ({ value: a.value, label: a.label })), client.assigned_to))}
    </div>
    ${formGroup('エリア', formInput('area', '', 'text', client.area))}
    ${formGroup('メモ', formTextarea('notes', '', client.notes))}
  `;

  openModal({
    title: 'クライアント情報を編集',
    body,
    submitLabel: '保存',
    size: 'lg',
    onSubmit: (form) => {
      const data = getFormData(form);
      if (!data.store_name) {
        showToast('店舗名を入力してください', 'error');
        return;
      }
      if (data.monthly_fee) data.monthly_fee = parseInt(data.monthly_fee) || 0;
      Store.updateClient(currentId, data);
      closeModal();
      refreshPage();
      showToast('クライアント情報を更新しました');
    }
  });
}


// ============================================
// Delete Handler
// ============================================
function handleDelete() {
  const name = currentRecord.store_name;
  if (currentType === 'lead') {
    if (!confirm(`「${name}」を削除しますか？\nこの操作は取り消せません。`)) return;
    Store.deleteLead(currentId);
    showToast(`${name} を削除しました`);
    window.location.href = 'leads.html';
  } else {
    if (!confirm(`「${name}」を削除しますか？\nこの操作は取り消せません。`)) return;
    Store.deleteClient(currentId);
    showToast(`${name} を削除しました`);
    window.location.href = 'clients.html';
  }
}


// ============================================
// Activity Modal
// ============================================
function openActivityModal() {
  const body = `
    ${formGroup('種別', formSelect('activity_type', CRM.ACTIVITY_TYPES))}
    ${formGroup('内容 *', formTextarea('summary', '対応内容を入力...'))}
    ${formGroup('次回アクション日', formInput('next_date', '', 'date'))}
    ${formGroup('次回アクション', formInput('next_action', '例: フォローDM送信'))}
  `;

  openModal({
    title: '対応記録を追加',
    body,
    submitLabel: '記録する',
    onSubmit: (form) => {
      const data = getFormData(form);
      if (!data.summary) {
        showToast('内容を入力してください', 'error');
        return;
      }

      // Save activity
      Store.addActivity({
        entity_type: currentType,
        entity_id: currentId,
        activity_type: data.activity_type,
        summary: data.summary,
        next_date: data.next_date || '',
        next_action: data.next_action || '',
        created_by: 'ueda',
      });

      // Update record's next_date/next_action if provided
      if (data.next_date) {
        const updateData = { next_date: data.next_date, next_action: data.next_action || '' };
        if (currentType === 'lead') {
          Store.updateLead(currentId, updateData);
        } else {
          Store.updateClient(currentId, updateData);
        }
      }

      closeModal();
      refreshPage();

      // Switch to activity tab
      activateTab('activity');

      showToast('対応記録を追加しました');
    }
  });
}


// ============================================
// Stage Change Modal (Lead only)
// ============================================
function openStageChangeModal() {
  const body = `
    ${formGroup('新しいステージ', formSelect('stage',
      CRM.LEAD_STAGES.map(s => ({ value: s.value, label: s.label })),
      currentRecord.stage
    ))}
  `;

  openModal({
    title: 'ステージを変更',
    body,
    submitLabel: '変更する',
    onSubmit: (form) => {
      const data = getFormData(form);
      const stage = CRM.LEAD_STAGES.find(s => s.value === data.stage);

      Store.updateLead(currentId, { stage: data.stage });
      currentRecord = Store.getLead(currentId);

      // Re-render header only to preserve current tab state
      renderLeadHeader(currentRecord);

      closeModal();
      showToast(`ステージを「${stage ? stage.label : ''}」に変更しました`);
    }
  });
}

// Re-render only the lead header (used after stage change to preserve tab)
function renderLeadHeader(lead) {
  const detailHeader = document.querySelector('.detail-header');
  if (!detailHeader) return;

  const storeType = lookupLabel(getAllStoreTypes(), lead.store_type);
  const bizType = lookupLabel(CRM.BUSINESS_TYPES, lead.business_type);
  const source = lookupLabel(getAllSources(), lead.source);
  const feeLabel = lead.estimated_fee ? `見込み ${formatCurrency(lead.estimated_fee)}/月` : '';

  detailHeader.innerHTML = `
    <div class="detail-header__top">
      <h1 class="detail-header__name">
        ${escapeHtml(lead.store_name)}
        ${buildStageBadge(lead.stage)}
      </h1>
      ${buildNextDateBadge(lead.next_date)}
    </div>
    <div class="detail-header__meta">
      ${lead.area ? `<span class="detail-header__meta-item"><span class="detail-header__meta-icon"><svg viewBox="0 0 24 24"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg></span>${escapeHtml(lead.area)}</span>` : ''}
      ${storeType ? `<span class="detail-header__meta-item"><span class="detail-header__meta-icon">${SECTION_ICONS.store}</span>${escapeHtml(storeType)}</span>` : ''}
      ${bizType ? `<span class="detail-header__meta-item"><span class="badge badge--default badge--xs">${escapeHtml(bizType)}</span></span>` : ''}
      ${feeLabel ? `<span class="detail-header__meta-item"><span class="detail-header__meta-icon">${SECTION_ICONS.finance}</span>${feeLabel}</span>` : ''}
      ${source ? `<span class="detail-header__meta-item"><span class="detail-header__meta-icon">${ICON_SVGS.email}</span>${escapeHtml(source)}</span>` : ''}
    </div>
  `;
}


// ============================================
// NEXT Date Modal
// ============================================
function openNextDateModal() {
  const body = `
    ${formGroup('次回アクション日', formInput('next_date', '', 'date', currentRecord.next_date || ''))}
    ${formGroup('次回アクション', formInput('next_action', '例: フォロー電話', 'text', currentRecord.next_action || ''))}
  `;

  openModal({
    title: 'NEXT日付を変更',
    body,
    submitLabel: '変更する',
    onSubmit: (form) => {
      const data = getFormData(form);
      const updateData = { next_date: data.next_date, next_action: data.next_action || '' };

      if (currentType === 'lead') {
        Store.updateLead(currentId, updateData);
      } else {
        Store.updateClient(currentId, updateData);
      }

      closeModal();
      refreshPage();
      showToast('NEXT日付を更新しました');
    }
  });
}


// ============================================
// Convert to Client Modal (Lead only)
// ============================================
function openConvertModal() {
  const lead = currentRecord;

  const body = `
    <p style="color:var(--color-text-secondary); margin-bottom:var(--space-4); font-size:var(--text-sm);">
      <strong>${escapeHtml(lead.store_name)}</strong> を成約としてクライアントに登録します。
    </p>
    ${formGroup('契約プラン', formSelect('plan', getAllPlans().map(p => ({
      value: p.value,
      label: p.label + (p.fee ? ` (${formatCurrency(p.fee)}/月)` : '')
    })), lead.estimated_plan || ''))}
    ${formGroup('月額', formInput('monthly_fee', '自動入力されます', 'number', lead.estimated_fee || ''))}
    ${formGroup('契約開始日', formInput('contract_start', '', 'date'))}
    ${formGroup('メモ', formTextarea('notes', '契約に関するメモ...', lead.notes))}
  `;

  openModal({
    title: '成約 → クライアント登録',
    body,
    submitLabel: 'クライアントとして登録',
    onSubmit: (form) => {
      const data = getFormData(form);

      const contractData = {
        plan: data.plan,
        monthly_fee: parseInt(data.monthly_fee) || 0,
        contract_start: data.contract_start,
        notes: data.notes,
      };

      const newClient = Store.convertLeadToClient(currentId, contractData);
      if (!newClient) {
        showToast('変換に失敗しました', 'error');
        return;
      }

      closeModal();
      showToast(`${lead.store_name} をクライアントとして登録しました`);

      // Redirect to new client detail page
      window.location.href = `client-detail.html?id=${newClient.id}`;
    }
  });

  // Auto-fill monthly_fee when plan selection changes
  setTimeout(() => {
    const modal = document.getElementById('crmModal');
    if (!modal) return;
    const planSelect = modal.querySelector('[name="plan"]');
    const feeInput = modal.querySelector('[name="monthly_fee"]');
    if (planSelect && feeInput) {
      planSelect.addEventListener('change', () => {
        const plan = getAllPlans().find(p => p.value === planSelect.value);
        if (plan && plan.fee) feeInput.value = plan.fee;
      });
    }
  }, 250);
}


// ============================================
// Quick Task Modal (Client only)
// ============================================
function openQuickTaskModal() {
  const body = `
    ${formGroup('タスク名 *', formInput('title', '例: 月次レポート作成'))}
    <div style="display:grid; grid-template-columns:1fr 1fr; gap:0 var(--space-4);">
      ${formGroup('種別', formSelect('task_type', [{ value: '', label: '選択' }, ...CRM.TASK_TYPES]))}
      ${formGroup('優先度', formSelect('priority', CRM.PRIORITIES, 'medium'))}
    </div>
    <div style="display:grid; grid-template-columns:1fr 1fr; gap:0 var(--space-4);">
      ${formGroup('期限', formInput('due_date', '', 'date'))}
      ${formGroup('担当者', formSelect('assigned_to', [{ value: '', label: '未割当' }, ...getAllAssignees().map(a => ({ value: a.value, label: a.label }))]))}
    </div>
    ${formGroup('メモ', formTextarea('notes', ''))}
  `;

  openModal({
    title: `タスク追加 — ${currentRecord.store_name}`,
    body,
    submitLabel: '追加',
    onSubmit: (form) => {
      const data = getFormData(form);
      if (!data.title) {
        showToast('タスク名を入力してください', 'error');
        return;
      }

      Store.addTask({
        title: data.title,
        client_id: currentId,
        task_type: data.task_type || 'general',
        priority: data.priority || 'medium',
        due_date: data.due_date || '',
        assigned_to: data.assigned_to || '',
        notes: data.notes || '',
      });

      closeModal();
      refreshPage();

      // Switch to projects tab to show the new task
      activateTab('projects');

      showToast(`「${data.title}」を追加しました`);
    }
  });
}


// ============================================
// Tab helper: programmatically activate a tab
// ============================================
function activateTab(tabName) {
  const tabs = document.querySelectorAll('.tab');
  const contents = document.querySelectorAll('.tab-content');

  tabs.forEach(t => {
    t.classList.toggle('is-active', t.getAttribute('data-tab') === tabName);
  });
  contents.forEach(c => {
    c.classList.toggle('is-active', c.getAttribute('data-tab-content') === tabName);
  });
}
