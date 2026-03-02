/* ========================================
   Opus CRM — Dashboard Logic (Data-Driven)
   ======================================== */

document.addEventListener('DOMContentLoaded', () => {
  Store.init();
  renderMetrics();
  renderTodayActions();
  renderActivityFeed();
  initDashboardActions();
});

// --- Render 4 metric cards ---
function renderMetrics() {
  const m = Store.getDashboardMetrics();
  const grid = document.querySelector('.metric-grid');
  if (!grid) return;

  const totalValue = m.totalPipelineValue;
  const valueStr = totalValue >= 10000
    ? '¥' + Math.round(totalValue / 10000) + '<span class="metric-card__unit">万/月</span>'
    : formatCurrency(totalValue) + '<span class="metric-card__unit">/月</span>';

  grid.innerHTML = `
    <div class="metric-card ${m.actionCount > 0 ? 'metric-card--danger' : ''}">
      <div class="metric-card__label">本日の要対応</div>
      <div class="metric-card__value">${m.actionCount}<span class="metric-card__unit">件</span></div>
      <div class="metric-card__trend">${m.overdueCount > 0 ? '期限切れ ' + m.overdueCount + '件含む' : 'すべて期限内'}</div>
    </div>
    <div class="metric-card">
      <div class="metric-card__label">商談中リード</div>
      <div class="metric-card__value">${m.pipelineLeadCount}<span class="metric-card__unit">件</span></div>
      <div class="metric-card__trend">DM〜提案済</div>
    </div>
    <div class="metric-card">
      <div class="metric-card__label">契約中クライアント</div>
      <div class="metric-card__value">${m.activeClientCount}<span class="metric-card__unit">件</span></div>
      <div class="metric-card__trend">SNS ${m.snsClients} / Web ${m.webClients}</div>
    </div>
    <div class="metric-card metric-card--accent">
      <div class="metric-card__label">パイプライン月額合計</div>
      <div class="metric-card__value">${valueStr}</div>
      <div class="metric-card__trend">見込み含む</div>
    </div>
  `;
}

// --- Render today's action table ---
function renderTodayActions() {
  const items = Store.getTodayActions();
  const section = document.querySelector('.dashboard-grid__main .section');
  if (!section) return;

  // SVG icons for row type
  const typeIcons = {
    lead: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>',
    client: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>',
    task: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>',
  };

  // Build detail link
  function buildLink(item) {
    if (item.type === 'lead') return `lead-detail.html?id=${item.id}`;
    if (item.type === 'client') return `client-detail.html?id=${item.id}`;
    // Task: link to related entity if possible
    if (item.client_id) return `client-detail.html?id=${item.client_id}`;
    if (item.lead_id) return `lead-detail.html?id=${item.lead_id}`;
    return 'tasks.html';
  }

  // Badge class
  function badgeClass(item) {
    if (item.type === 'client') return 'badge--success';
    if (item.type === 'task') {
      return item.statusBadge === 'in-progress' ? 'badge--warning' : 'badge--default';
    }
    // Lead stage badge
    const stageMap = {
      'dm-sent': 'badge--info', 'replied': 'badge--purple',
      'appointment-set': 'badge--purple', 'in-meeting': 'badge--warning',
      'proposal-sent': 'badge--primary', 'list-added': 'badge--default',
    };
    return stageMap[item.statusBadge] || 'badge--default';
  }

  // Date class
  function dateClass(item) {
    if (item.isOverdue) return 'next-date--overdue';
    if (isToday(item.date)) return 'next-date--today';
    return 'next-date--upcoming';
  }

  const rowsHtml = items.length
    ? items.map(item => `
      <tr class="${item.isOverdue ? 'is-overdue' : ''}">
        <td>
          <div class="action-name">
            <div class="action-name__type action-name__type--${item.type}">
              ${typeIcons[item.type] || typeIcons.task}
            </div>
          </div>
        </td>
        <td>
          <div class="action-name__text">${esc(item.name)}</div>
          <div class="action-name__sub">${esc(item.sub)}</div>
        </td>
        <td><span class="badge ${badgeClass(item)}">${esc(item.status)}</span></td>
        <td><span class="next-date ${dateClass(item)}">${formatDate(item.date)}</span></td>
        <td>${esc(item.action)}</td>
        <td><a href="${buildLink(item)}" class="btn btn--ghost btn--sm">詳細</a></td>
      </tr>
    `).join('')
    : `<tr><td colspan="6" style="text-align:center; color:var(--color-text-tertiary); padding:var(--space-6);">本日の要対応はありません</td></tr>`;

  section.innerHTML = `
    <div class="section__header">
      <h2 class="section__title">今日のやること<span class="section__subtitle">${items.length}件</span></h2>
    </div>
    <div class="table-wrapper">
      <table class="data-table">
        <thead>
          <tr>
            <th>種別</th>
            <th>名前</th>
            <th>ステータス</th>
            <th>NEXT</th>
            <th>アクション</th>
            <th></th>
          </tr>
        </thead>
        <tbody>${rowsHtml}</tbody>
      </table>
    </div>
  `;

  // Row click
  section.querySelectorAll('.data-table tbody tr').forEach(row => {
    row.style.cursor = 'pointer';
    row.addEventListener('click', (e) => {
      if (e.target.closest('a, button')) return;
      const link = row.querySelector('a[href]');
      if (link) window.location.href = link.href;
    });
  });
}

// --- Render activity feed ---
function renderActivityFeed() {
  const activities = Store.getRecentActivities(6);
  const container = document.querySelector('.dashboard-grid__side .section');
  if (!container) return;

  const dotClass = {
    dm: 'activity-feed__dot--dm',
    call: 'activity-feed__dot--call',
    email: 'activity-feed__dot--email',
    meeting: 'activity-feed__dot--meeting',
    line: 'activity-feed__dot--dm',
    note: 'activity-feed__dot--note',
  };

  const feedHtml = activities.length
    ? activities.map(a => {
        const entityName = Store.getEntityName(a.entity_type, a.entity_id);
        const timeStr = formatActivityTime(a.created_at);
        return `
          <div class="activity-feed__item">
            <div class="activity-feed__dot ${dotClass[a.activity_type] || 'activity-feed__dot--note'}"></div>
            <div class="activity-feed__content">
              <div class="activity-feed__text"><strong>${esc(entityName)}</strong> — ${esc(a.summary)}</div>
              <div class="activity-feed__time">${timeStr}</div>
            </div>
          </div>
        `;
      }).join('')
    : '<div style="padding:var(--space-4); color:var(--color-text-tertiary); font-size:var(--text-sm);">まだ対応記録がありません</div>';

  container.innerHTML = `
    <div class="section__header">
      <h2 class="section__title">最近の対応</h2>
    </div>
    <div class="card card--flush">
      <div class="activity-feed">${feedHtml}</div>
    </div>
  `;
}

// --- Format relative time for activity ---
function formatActivityTime(isoStr) {
  const d = new Date(isoStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
  const target = new Date(d.getFullYear(), d.getMonth(), d.getDate());

  const time = `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;

  if (target.getTime() === today.getTime()) return `今日 ${time}`;
  if (target.getTime() === yesterday.getTime()) return `昨日 ${time}`;
  return `${d.getMonth() + 1}/${d.getDate()} ${time}`;
}

// --- Dashboard button actions ---
function initDashboardActions() {
  // "新規リード" button
  document.querySelectorAll('.btn--primary').forEach(btn => {
    if (btn.textContent.includes('新規リード')) {
      btn.addEventListener('click', () => {
        window.location.href = 'leads.html';
      });
    }
  });
}

// --- Escape HTML ---
function esc(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
