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
  initCsvImport();
  initJsonImport();
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

// --- CSV Import ---
function initCsvImport() {
  const fileInput = document.getElementById('csvFileInput');
  if (!fileInput) return;

  fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      let text = evt.target.result;
      // Remove BOM
      if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);
      parseCsvAndShowPreview(text);
    };
    reader.readAsText(file, 'UTF-8');
  });
}

function parseCsvAndShowPreview(csvText) {
  const lines = csvText.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) {
    showToast('CSVにデータがありません', 'error');
    return;
  }

  const headers = parseCSVLine(lines[0]);
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i]);
    if (cols.length > 0 && cols.some(c => c.trim())) {
      rows.push(cols);
    }
  }

  if (rows.length === 0) {
    showToast('CSVにデータ行がありません', 'error');
    return;
  }

  // Show preview with column mapping
  showCsvPreview(headers, rows);
}

// Simple CSV line parser (handles quoted fields)
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        result.push(current.trim());
        current = '';
      } else {
        current += ch;
      }
    }
  }
  result.push(current.trim());
  return result;
}

function showCsvPreview(headers, rows) {
  const preview = document.getElementById('csvPreview');
  if (!preview) return;

  const target = document.getElementById('importTarget')?.value || 'leads';

  // Available CRM fields based on target
  const fieldOptions = target === 'leads'
    ? [
        { value: '', label: '（スキップ）' },
        { value: 'store_name', label: '店舗名 *' },
        { value: 'company_name', label: '企業名' },
        { value: 'business_type', label: '事業種別' },
        { value: 'store_type', label: '業種' },
        { value: 'contact_name', label: '担当者名' },
        { value: 'contact_phone', label: '電話番号' },
        { value: 'contact_email', label: 'メール' },
        { value: 'contact_line', label: 'LINE' },
        { value: 'sns_instagram', label: 'Instagram' },
        { value: 'sns_tiktok', label: 'TikTok' },
        { value: 'source', label: 'ソース' },
        { value: 'area', label: 'エリア' },
        { value: 'notes', label: 'メモ' },
      ]
    : [
        { value: '', label: '（スキップ）' },
        { value: 'store_name', label: '店舗名 *' },
        { value: 'company_name', label: '企業名' },
        { value: 'business_type', label: '事業種別' },
        { value: 'store_type', label: '業種' },
        { value: 'contact_name', label: '担当者名' },
        { value: 'contact_phone', label: '電話番号' },
        { value: 'contact_email', label: 'メール' },
        { value: 'plan', label: 'プラン' },
        { value: 'monthly_fee', label: '月額' },
        { value: 'area', label: 'エリア' },
        { value: 'notes', label: 'メモ' },
      ];

  // Auto-detect mapping by header name
  const autoMap = headers.map(h => {
    const lower = h.toLowerCase().replace(/[\s_-]/g, '');
    const match = fieldOptions.find(f => {
      if (!f.value) return false;
      const fLower = f.value.replace(/_/g, '');
      const fLabel = f.label.replace(/[\s*]/g, '').toLowerCase();
      return fLower === lower || fLabel === lower || h === f.label.replace(' *', '');
    });
    return match ? match.value : '';
  });

  // Build mapping selects
  const mappingHtml = headers.map((h, i) => {
    const options = fieldOptions.map(f =>
      `<option value="${f.value}"${autoMap[i] === f.value ? ' selected' : ''}>${f.label}</option>`
    ).join('');
    return `
      <div style="display:flex; align-items:center; gap:var(--space-3); padding:var(--space-2) 0; border-bottom:1px solid var(--color-border);">
        <span style="flex:1; font-size:var(--text-sm); font-weight:var(--font-medium); color:var(--color-text-secondary);">${h}</span>
        <span style="color:var(--color-text-tertiary);">→</span>
        <select class="form-input csv-mapping" data-col="${i}" style="flex:1; font-size:var(--text-xs);">${options}</select>
      </div>
    `;
  }).join('');

  // Preview first 3 rows
  const previewRows = rows.slice(0, 3).map(row =>
    `<tr>${row.map(cell => `<td style="font-size:var(--text-xs); padding:var(--space-1) var(--space-2); max-width:120px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${cell}</td>`).join('')}</tr>`
  ).join('');

  preview.innerHTML = `
    <div style="font-size:var(--text-sm); font-weight:var(--font-semibold); margin-bottom:var(--space-3);">
      カラムマッピング（${rows.length}件のデータ）
    </div>
    <div style="max-height:300px; overflow-y:auto; margin-bottom:var(--space-3);">
      ${mappingHtml}
    </div>
    <div style="margin-bottom:var(--space-3);">
      <div style="font-size:var(--text-xs); color:var(--color-text-tertiary); margin-bottom:var(--space-2);">プレビュー（最初の3行）</div>
      <div style="overflow-x:auto;">
        <table class="data-table" style="font-size:var(--text-xs);">
          <thead><tr>${headers.map(h => `<th style="padding:var(--space-1) var(--space-2); white-space:nowrap;">${h}</th>`).join('')}</tr></thead>
          <tbody>${previewRows}</tbody>
        </table>
      </div>
    </div>
    <div style="display:flex; gap:var(--space-3);">
      <button class="btn btn--primary btn--sm" id="csvImportBtn">
        ${rows.length}件をインポート
      </button>
      <button class="btn btn--ghost btn--sm" id="csvCancelBtn">キャンセル</button>
    </div>
  `;

  preview.style.display = '';

  // Store rows for import
  preview._csvRows = rows;
  preview._csvHeaders = headers;

  // Bind import button
  document.getElementById('csvImportBtn')?.addEventListener('click', () => executeCsvImport());
  document.getElementById('csvCancelBtn')?.addEventListener('click', () => {
    preview.style.display = 'none';
    preview.innerHTML = '';
    document.getElementById('csvFileInput').value = '';
  });
}

function executeCsvImport() {
  const preview = document.getElementById('csvPreview');
  const target = document.getElementById('importTarget')?.value || 'leads';
  const rows = preview._csvRows;
  if (!rows || rows.length === 0) return;

  // Read column mapping
  const mappings = {};
  document.querySelectorAll('.csv-mapping').forEach(sel => {
    const col = parseInt(sel.getAttribute('data-col'));
    const field = sel.value;
    if (field) mappings[col] = field;
  });

  // Check if store_name is mapped
  const hasStoreName = Object.values(mappings).includes('store_name');
  if (!hasStoreName) {
    showToast('「店舗名」のマッピングが必要です', 'error');
    return;
  }

  let successCount = 0;
  let skipCount = 0;

  rows.forEach(row => {
    const data = {};
    for (const [colStr, field] of Object.entries(mappings)) {
      const col = parseInt(colStr);
      if (col < row.length) {
        data[field] = row[col];
      }
    }

    // Skip if no store_name
    if (!data.store_name || !data.store_name.trim()) {
      skipCount++;
      return;
    }

    // Parse numeric fields
    if (data.monthly_fee) data.monthly_fee = parseInt(data.monthly_fee) || 0;
    if (data.estimated_fee) data.estimated_fee = parseInt(data.estimated_fee) || 0;

    if (target === 'leads') {
      Store.addLead(data);
    } else {
      Store.addClient(data);
    }
    successCount++;
  });

  // Reset UI
  preview.style.display = 'none';
  preview.innerHTML = '';
  document.getElementById('csvFileInput').value = '';

  const typeLabel = target === 'leads' ? 'リード' : 'クライアント';
  let msg = `${successCount}件の${typeLabel}をインポートしました`;
  if (skipCount > 0) msg += `（${skipCount}件スキップ）`;
  showToast(msg);
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

// --- JSON Import (Restore from backup) ---
function initJsonImport() {
  const fileInput = document.getElementById('jsonImportInput');
  if (!fileInput) return;

  fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = JSON.parse(evt.target.result);
        // Validate structure
        if (!data.leads && !data.clients && !data.tasks) {
          showToast('無効なバックアップファイルです', 'error');
          return;
        }

        const counts = [];
        if (data.leads) counts.push(`リード ${data.leads.length}件`);
        if (data.clients) counts.push(`クライアント ${data.clients.length}件`);
        if (data.tasks) counts.push(`タスク ${data.tasks.length}件`);
        if (data.activities) counts.push(`履歴 ${data.activities.length}件`);

        if (!confirm(`以下のデータを復元します。現在のデータは上書きされます。\n\n${counts.join('\n')}\n\n続行しますか？`)) {
          fileInput.value = '';
          return;
        }

        // Restore each data type
        if (data.leads) localStorage.setItem(Store.KEYS.leads, JSON.stringify(data.leads));
        if (data.clients) localStorage.setItem(Store.KEYS.clients, JSON.stringify(data.clients));
        if (data.tasks) localStorage.setItem(Store.KEYS.tasks, JSON.stringify(data.tasks));
        if (data.activities) localStorage.setItem(Store.KEYS.activities, JSON.stringify(data.activities));
        if (data.settings) localStorage.setItem(Store.KEYS.settings, JSON.stringify(data.settings));

        // Recalculate counters from restored data
        const counters = {};
        if (data.leads) counters.lead = Math.max(...data.leads.map(l => parseInt(l.id.split('_')[1]) || 0), 0);
        if (data.clients) counters.client = Math.max(...data.clients.map(c => parseInt(c.id.split('_')[1]) || 0), 0);
        if (data.tasks) counters.task = Math.max(...data.tasks.map(t => parseInt(t.id.split('_')[1]) || 0), 0);
        if (data.activities) counters.activity = Math.max(...data.activities.map(a => parseInt(a.id.split('_')[1]) || 0), 0);
        localStorage.setItem(Store.KEYS.counters, JSON.stringify(counters));

        // Clear cache
        Store._cache = {};

        fileInput.value = '';
        showToast('バックアップから復元しました。ページを再読込します...');
        setTimeout(() => window.location.reload(), 1000);
      } catch (err) {
        showToast('ファイルの読み込みに失敗しました', 'error');
      }
    };
    reader.readAsText(file, 'UTF-8');
  });
}
