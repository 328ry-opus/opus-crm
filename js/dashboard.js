/* ========================================
   Opus CRM — Dashboard Logic (Data-Driven)
   ======================================== */

document.addEventListener('DOMContentLoaded', () => {
  Store.init();
  renderMetrics();
  renderTodayActions();
  renderActivityFeed();
  renderAnalytics();
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
  // "新規リード" button — open modal directly
  document.querySelectorAll('.btn--primary').forEach(btn => {
    if (btn.textContent.includes('新規リード')) {
      btn.addEventListener('click', () => openNewLeadFromDashboard());
    }
  });
}

// --- New Lead Modal (dashboard version) ---
function openNewLeadFromDashboard() {
  const stageOptions = CRM.LEAD_STAGES.map(s => ({ value: s.value, label: s.label }));

  const body = `
    <div style="display:grid; grid-template-columns:1fr 1fr; gap:0 var(--space-4);">
      ${formGroup('店舗名 *', formInput('store_name', '例: Bar Nocturne'))}
      ${formGroup('企業名', formInput('company_name', '例: 株式会社ABC'))}
    </div>
    <div style="display:grid; grid-template-columns:1fr 1fr; gap:0 var(--space-4);">
      ${formGroup('事業種別', formSelect('business_type', CRM.BUSINESS_TYPES))}
      ${formGroup('業種', formSelect('store_type', [{ value: '', label: '選択してください' }, ...getAllStoreTypes()]))}
    </div>
    <div style="display:grid; grid-template-columns:1fr 1fr; gap:0 var(--space-4);">
      ${formGroup('担当者名', formInput('contact_name', '例: 山田太郎'))}
      ${formGroup('電話番号', formInput('contact_phone', '例: 03-1234-5678', 'tel'))}
    </div>
    <div style="display:grid; grid-template-columns:1fr 1fr; gap:0 var(--space-4);">
      ${formGroup('メール', formInput('contact_email', '例: info@example.com', 'email'))}
      ${formGroup('LINE', formInput('contact_line', '例: @bar-nocturne'))}
    </div>
    <div style="display:grid; grid-template-columns:1fr 1fr; gap:0 var(--space-4);">
      ${formGroup('Instagram', formInput('sns_instagram', '例: @bar_nocturne'))}
      ${formGroup('TikTok', formInput('sns_tiktok', '例: @bar.nocturne'))}
    </div>
    <div style="display:grid; grid-template-columns:1fr 1fr; gap:0 var(--space-4);">
      ${formGroup('ソース', formSelect('source', getAllSources()))}
      ${formGroup('見込みプラン', formSelect('estimated_plan', [{ value: '', label: '未定' }, ...getAllPlans().map(p => ({ value: p.value, label: p.label + (p.fee ? ' (' + formatCurrency(p.fee) + ')' : '') }))]))}
    </div>
    <div style="display:grid; grid-template-columns:1fr 1fr; gap:0 var(--space-4);">
      ${formGroup('エリア', formInput('area', '例: 渋谷、六本木'))}
      ${formGroup('ステージ', formSelect('stage', stageOptions, 'list-added'))}
    </div>
    ${formGroup('メモ', formTextarea('notes', 'リードに関するメモを入力...'))}
  `;

  openModal({
    title: '新規リード追加',
    body,
    submitLabel: '追加',
    size: 'lg',
    onSubmit: (form) => {
      const data = getFormData(form);
      if (!data.store_name) {
        showToast('店舗名を入力してください', 'error');
        return;
      }

      // Resolve estimated_fee from the selected plan
      if (data.estimated_plan) {
        const plan = getAllPlans().find(p => p.value === data.estimated_plan);
        if (plan && plan.fee) data.estimated_fee = plan.fee;
      }

      Store.addLead(data);
      closeModal();
      showToast(`${data.store_name} をリストに追加しました`);

      // Refresh dashboard data
      renderMetrics();
      renderTodayActions();
      renderActivityFeed();
    }
  });
}

// esc(): alias for escapeHtml (defined in ui.js)
function esc(str) { return escapeHtml(str); }


// ============================================
// Analytics Charts
// ============================================
function renderAnalytics() {
  // Wait for Chart.js to load
  if (typeof Chart === 'undefined') return;

  renderPipelineChart();
  renderRevenueChart();
  renderKpiTable();
}

// --- Pipeline Funnel (horizontal bar chart) ---
function renderPipelineChart() {
  const canvas = document.getElementById('chartPipeline');
  if (!canvas) return;

  const leads = Store.getLeads();
  const stages = CRM.LEAD_STAGES;

  // Count leads per stage
  const counts = stages.map(s => leads.filter(l => l.stage === s.value).length);
  const colors = stages.map(s => s.color);

  new Chart(canvas, {
    type: 'bar',
    data: {
      labels: stages.map(s => s.label),
      datasets: [{
        data: counts,
        backgroundColor: colors,
        borderRadius: 4,
        barThickness: 22,
      }],
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => `${ctx.raw}件`,
          },
        },
      },
      scales: {
        x: {
          beginAtZero: true,
          ticks: { stepSize: 1, font: { size: 11 } },
          grid: { color: 'rgba(0,0,0,0.05)' },
        },
        y: {
          ticks: { font: { size: 11 } },
          grid: { display: false },
        },
      },
    },
  });
}

// --- Revenue Donut (plan breakdown) ---
function renderRevenueChart() {
  const canvas = document.getElementById('chartRevenue');
  if (!canvas) return;

  const clients = Store.getClients().filter(c => c.status === 'active');

  // Group by plan
  const planMap = {};
  clients.forEach(c => {
    const plan = getAllPlans().find(p => p.value === c.plan);
    const label = plan ? plan.label : 'その他';
    planMap[label] = (planMap[label] || 0) + (c.monthly_fee || 0);
  });

  const labels = Object.keys(planMap);
  const values = Object.values(planMap);

  if (labels.length === 0) {
    canvas.parentElement.innerHTML = '<div style="display:flex; align-items:center; justify-content:center; height:100%; color:var(--color-text-tertiary); font-size:var(--text-sm);">契約中クライアントがありません</div>';
    return;
  }

  const palette = ['#6366f1', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#06b6d4'];

  new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data: values,
        backgroundColor: palette.slice(0, labels.length),
        borderWidth: 0,
        hoverOffset: 6,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '60%',
      plugins: {
        legend: {
          position: 'bottom',
          labels: { font: { size: 11 }, padding: 12, usePointStyle: true, pointStyleWidth: 8 },
        },
        tooltip: {
          callbacks: {
            label: (ctx) => {
              const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
              const pct = total > 0 ? Math.round((ctx.raw / total) * 100) : 0;
              return `${ctx.label}: ${formatCurrency(ctx.raw)}/月 (${pct}%)`;
            },
          },
        },
      },
    },
  });
}

// --- KPI Table (per assignee) ---
function renderKpiTable() {
  const container = document.getElementById('kpiTable');
  if (!container) return;

  const leads = Store.getLeads();
  const clients = Store.getClients();
  const allAssignees = getAllAssignees();

  const kpiRows = allAssignees.map(a => {
    const myLeads = leads.filter(l => l.assigned_to === a.value);
    const activeLeads = myLeads.filter(l => !['won', 'lost'].includes(l.stage));
    const wonLeads = myLeads.filter(l => l.stage === 'won');
    const myClients = clients.filter(c => c.assigned_to === a.value && c.status === 'active');
    const monthlyTotal = myClients.reduce((sum, c) => sum + (c.monthly_fee || 0), 0);
    const leadPipeline = activeLeads.reduce((sum, l) => sum + (l.estimated_fee || 0), 0);

    return {
      name: a.label,
      activeLeads: activeLeads.length,
      wonLeads: wonLeads.length,
      clients: myClients.length,
      monthly: monthlyTotal,
      pipeline: leadPipeline,
    };
  });

  // Totals row
  const totals = {
    name: '合計',
    activeLeads: kpiRows.reduce((s, r) => s + r.activeLeads, 0),
    wonLeads: kpiRows.reduce((s, r) => s + r.wonLeads, 0),
    clients: kpiRows.reduce((s, r) => s + r.clients, 0),
    monthly: kpiRows.reduce((s, r) => s + r.monthly, 0),
    pipeline: kpiRows.reduce((s, r) => s + r.pipeline, 0),
  };

  const rows = [...kpiRows, totals];

  container.innerHTML = `
    <table class="kpi-table">
      <thead>
        <tr>
          <th>担当者</th>
          <th>商談中リード</th>
          <th>成約</th>
          <th>契約中</th>
          <th>月額合計</th>
          <th>見込み月額</th>
        </tr>
      </thead>
      <tbody>
        ${rows.map(r => `
          <tr>
            <td>${esc(r.name)}</td>
            <td>${r.activeLeads}件</td>
            <td>${r.wonLeads}件</td>
            <td>${r.clients}件</td>
            <td class="kpi-value">${r.monthly ? formatCurrency(r.monthly) : '—'}</td>
            <td>${r.pipeline ? formatCurrency(r.pipeline) : '—'}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}
