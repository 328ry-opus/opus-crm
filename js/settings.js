/* ========================================
   Opus CRM — Settings Page Logic
   (Store-backed persistence + export)
   ======================================== */

document.addEventListener('DOMContentLoaded', () => {
  Store.init();
  initSettingsNav();
  loadProfile();
  renderPipelineStages();
  renderTaskStatuses();
  renderPlans();
  renderStoreTypes();
  renderSourceTypes();
  initSettingsActions();
});

// --- Settings Navigation ---
function initSettingsNav() {
  document.querySelectorAll('.settings-nav__item').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.settings-nav__item').forEach(b => b.classList.remove('is-active'));
      btn.classList.add('is-active');

      const target = btn.getAttribute('data-target');
      document.querySelectorAll('.settings-panel').forEach(p => p.style.display = 'none');
      const panel = document.getElementById('panel-' + target);
      if (panel) panel.style.display = '';
    });
  });
}

// --- Load/Save Profile ---
function loadProfile() {
  const settings = Store.getSettings();
  const nameInput = document.querySelector('#profileName');
  const roleInput = document.querySelector('#profileRole');
  const emailInput = document.querySelector('#profileEmail');
  const phoneInput = document.querySelector('#profilePhone');

  if (nameInput) nameInput.value = settings.profile_name || '';
  if (roleInput) roleInput.value = settings.profile_role || 'admin';
  if (emailInput) emailInput.value = settings.profile_email || '';
  if (phoneInput) phoneInput.value = settings.profile_phone || '';
}

function saveProfile() {
  const settings = Store.getSettings();
  settings.profile_name = document.querySelector('#profileName')?.value || '';
  settings.profile_role = document.querySelector('#profileRole')?.value || 'admin';
  settings.profile_email = document.querySelector('#profileEmail')?.value || '';
  settings.profile_phone = document.querySelector('#profilePhone')?.value || '';
  Store.saveSettings(settings);
  showToast('プロフィールを保存しました');
}

// --- Render Pipeline Stages ---
function renderPipelineStages() {
  const container = document.getElementById('pipelineStages');
  if (!container) return;

  container.innerHTML = CRM.LEAD_STAGES.map(stage => `
    <div class="tag-item">
      <span class="tag-item__dot" style="background:${stage.color}"></span>
      ${stage.label}
    </div>
  `).join('');
}

// --- Render Task Statuses ---
function renderTaskStatuses() {
  const container = document.getElementById('taskStatuses');
  if (!container) return;

  const colors = { todo: '#64748b', 'in-progress': '#f59e0b', done: '#16a34a' };
  container.innerHTML = CRM.TASK_STATUSES.map(s => `
    <div class="tag-item">
      <span class="tag-item__dot" style="background:${colors[s.value] || '#94a3b8'}"></span>
      ${s.label}
    </div>
  `).join('');
}

// --- Render Plans ---
function renderPlans() {
  const tbody = document.getElementById('planTableBody');
  if (!tbody) return;

  tbody.innerHTML = CRM.PLANS.map(plan => `
    <tr>
      <td style="font-weight:var(--font-medium)">${plan.label}</td>
      <td class="plan-table__fee">${plan.fee ? formatCurrency(plan.fee) + '/月' : '従量制'}</td>
      <td style="text-align:right">
        <button class="btn btn--ghost btn--sm">編集</button>
      </td>
    </tr>
  `).join('');
}

// --- Render Store Types ---
function renderStoreTypes() {
  const container = document.getElementById('storeTypes');
  if (!container) return;

  container.innerHTML = CRM.STORE_TYPES.map(t => `
    <div class="tag-item">${t.label}</div>
  `).join('');
}

// --- Render Source Types ---
function renderSourceTypes() {
  const container = document.getElementById('sourceTypes');
  if (!container) return;

  container.innerHTML = CRM.SOURCES.map(s => `
    <div class="tag-item">${s.label}</div>
  `).join('');
}

// --- Actions ---
function initSettingsActions() {
  // Save profile
  document.querySelector('[data-action="save-profile"]')?.addEventListener('click', saveProfile);

  // Add member
  document.querySelector('[data-action="add-member"]')?.addEventListener('click', () => {
    openModal({
      title: 'メンバーを追加',
      body: `
        ${formGroup('名前 *', formInput('name', '例: 田中太郎'))}
        ${formGroup('役割', formSelect('role', [
          { value: 'member', label: 'メンバー' },
          { value: 'admin', label: '管理者' },
        ]))}
        ${formGroup('担当領域', formInput('area', '例: 撮影・編集'))}
      `,
      submitLabel: '追加',
      onSubmit: (form) => {
        const data = getFormData(form);
        if (!data.name) {
          showToast('名前を入力してください', 'error');
          return;
        }
        addMemberItem(data);
        closeModal();
        showToast(`${data.name} を追加しました`);
      }
    });
  });

  // Export CSV — show type selection
  document.querySelector('[data-action="export-csv"]')?.addEventListener('click', () => {
    openModal({
      title: 'CSVエクスポート',
      body: `
        ${formGroup('エクスポート対象', formSelect('export_type', [
          { value: 'leads', label: 'リード' },
          { value: 'clients', label: 'クライアント' },
          { value: 'tasks', label: 'タスク' },
          { value: 'activities', label: '対応履歴' },
        ]))}
      `,
      submitLabel: 'エクスポート',
      onSubmit: (form) => {
        const data = getFormData(form);
        Store.exportCSV(data.export_type);
        closeModal();
        showToast('CSVをダウンロードしました');
      }
    });
  });

  // Export JSON
  document.querySelector('[data-action="export-json"]')?.addEventListener('click', () => {
    Store.exportJSON();
    showToast('JSONバックアップをダウンロードしました');
  });

  // Reset data
  document.querySelector('[data-action="reset-data"]')?.addEventListener('click', () => {
    if (confirm('本当にすべてのデータをリセットしますか？\nこの操作は取り消せません。')) {
      Store.resetAll();
      showToast('データをリセットしました。ページを再読込します...');
      setTimeout(() => window.location.reload(), 1000);
    }
  });
}

// --- Add Member to List ---
function addMemberItem(data) {
  const list = document.querySelector('.member-list');
  if (!list) return;

  const initial = data.name.charAt(0);
  const roleLabel = data.role === 'admin' ? '管理者' : 'メンバー';
  const area = data.area ? ' ・ ' + data.area : '';

  const item = document.createElement('div');
  item.className = 'member-item';
  item.innerHTML = `
    <div class="member-avatar member-avatar--purple">${initial}</div>
    <div class="member-info">
      <div class="member-name">${data.name}</div>
      <div class="member-role">${roleLabel}${area}</div>
    </div>
    <div class="member-actions">
      <button class="btn btn--ghost btn--sm">編集</button>
    </div>
  `;
  list.appendChild(item);
}
