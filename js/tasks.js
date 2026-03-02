/* ========================================
   Opus CRM — Tasks Page Logic
   ======================================== */

document.addEventListener('DOMContentLoaded', () => {
  Store.init();
  renderTasks();
  initTaskFilters();
  initNewTaskButton();
});

// ============================================
// Current filter state
// ============================================
let currentFilters = {
  client_id: '',
  assigned_to: '',
  task_type: '',
  search: '',
};

// ============================================
// Render — builds the entire kanban from Store
// ============================================
function renderTasks() {
  const grouped = Store.getTasksByStatus();

  // Apply filters: build a filtered version of grouped
  const filtered = {};
  for (const status of Object.keys(grouped)) {
    filtered[status] = grouped[status].filter(task => matchesFilters(task));
  }

  // Column mapping: status value -> CSS class suffix
  const columnMap = {
    'todo':        '.pipeline__column--todo',
    'in-progress': '.pipeline__column--progress',
    'done':        '.pipeline__column--done',
  };

  for (const [status, selector] of Object.entries(columnMap)) {
    const col = document.querySelector(selector);
    if (!col) continue;

    const cardsContainer = col.querySelector('.pipeline__cards');
    if (!cardsContainer) continue;

    // Clear existing cards (keep structure clean)
    cardsContainer.innerHTML = '';

    // Render each task card
    const tasks = filtered[status] || [];
    tasks.forEach(task => {
      const card = buildTaskCard(task);
      cardsContainer.appendChild(card);
    });

    // Add "+" button only in todo column
    if (status === 'todo') {
      const addBtn = document.createElement('button');
      addBtn.className = 'pipeline__add';
      addBtn.textContent = '+ タスクを追加';
      addBtn.addEventListener('click', () => openNewTaskModal());
      cardsContainer.appendChild(addBtn);
    }

    // Update column count
    const countEl = col.querySelector('.pipeline__column-count');
    if (countEl) countEl.textContent = tasks.length;
  }

  // Update nav badge (todo count, unfiltered)
  updateNavBadge();

  // Re-init drag & drop on freshly rendered cards
  initDragAndDrop();
}

// ============================================
// Filter matching
// ============================================
function matchesFilters(task) {
  const f = currentFilters;

  // Client / lead filter
  if (f.client_id) {
    // client_id filter can match either client_id or lead_id
    if (task.client_id !== f.client_id && task.lead_id !== f.client_id) {
      return false;
    }
  }

  // Assigned to
  if (f.assigned_to && task.assigned_to !== f.assigned_to) {
    return false;
  }

  // Task type
  if (f.task_type && task.task_type !== f.task_type) {
    return false;
  }

  // Search (title + entity name)
  if (f.search) {
    const q = f.search.toLowerCase();
    const entityName = getEntityName(task).toLowerCase();
    const title = (task.title || '').toLowerCase();
    const notes = (task.notes || '').toLowerCase();
    if (!title.includes(q) && !entityName.includes(q) && !notes.includes(q)) {
      return false;
    }
  }

  return true;
}

// ============================================
// Build a single task card element
// ============================================
function buildTaskCard(task) {
  const card = document.createElement('div');
  card.className = 'task-kanban-card';
  card.setAttribute('draggable', 'true');
  card.setAttribute('data-task-id', task.id);

  // Done styling
  if (task.status === 'done') {
    card.classList.add('is-done');
  }

  // Overdue styling (only for non-done tasks)
  if (task.status !== 'done' && isOverdue(task.due_date)) {
    card.classList.add('is-overdue');
  }

  // Entity name (client or lead)
  const entityName = getEntityName(task);
  const isLead = !task.client_id && task.lead_id;

  // Priority info
  const priority = CRM.PRIORITIES.find(p => p.value === task.priority) || CRM.PRIORITIES[1];

  // Assignee info
  const assignee = CRM.ASSIGNEES.find(a => a.value === task.assigned_to);

  // Date display
  let dateHtml = '';
  if (task.status === 'done' && task.completed_date) {
    dateHtml = `<span class="task-kanban-card__date">完了: ${formatDate(task.completed_date)}</span>`;
  } else if (task.due_date) {
    const overdueClass = (task.status !== 'done' && isOverdue(task.due_date)) ? ' is-overdue' : '';
    dateHtml = `<span class="task-kanban-card__date${overdueClass}">期限: ${formatDate(task.due_date)}</span>`;
  } else {
    dateHtml = `<span class="task-kanban-card__date"></span>`;
  }

  // Icon SVG based on entity type
  const clientIcon = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>';
  const leadIcon = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>';

  // Build priority badge (hide for done tasks)
  const priorityHtml = task.status !== 'done'
    ? `<span class="task-kanban-card__priority task-kanban-card__priority--${priority.cssClass}">${priority.label}</span>`
    : '';

  // Build assignee badge
  const assigneeAltClass = (assignee && assignee.value === 'kurihara') ? ' task-kanban-card__assignee--alt' : '';
  const assigneeHtml = assignee
    ? `<span class="task-kanban-card__assignee${assigneeAltClass}">${assignee.initial}</span>`
    : '';

  card.innerHTML = `
    <div class="task-kanban-card__title">${task.title}</div>
    ${entityName ? `<div class="task-kanban-card__client">
      ${isLead ? leadIcon : clientIcon}
      ${entityName}
    </div>` : ''}
    <div class="task-kanban-card__footer">
      ${dateHtml}
      <div class="task-kanban-card__actions">
        ${priorityHtml}
        ${assigneeHtml}
      </div>
    </div>
  `;

  // Click to edit
  card.addEventListener('click', (e) => {
    // Don't open edit if user is dragging
    if (card.classList.contains('is-dragging')) return;
    openEditTaskModal(task.id);
  });

  return card;
}

// ============================================
// Entity name lookup helper
// ============================================
function getEntityName(task) {
  if (task.client_id) {
    const client = Store.getClient(task.client_id);
    return client ? client.store_name : '';
  }
  if (task.lead_id) {
    const lead = Store.getLead(task.lead_id);
    return lead ? lead.store_name + '（リード）' : '';
  }
  return '';
}

// ============================================
// Nav badge update (unfiltered todo count)
// ============================================
function updateNavBadge() {
  const allTasks = Store.getTasksByStatus();
  const todoCount = (allTasks['todo'] || []).length;
  const badge = document.querySelector('.nav-item.is-active .nav-item__badge');
  if (badge) badge.textContent = todoCount;
}

// ============================================
// Drag & Drop
// ============================================
function initDragAndDrop() {
  const columns = document.querySelectorAll('.pipeline__cards');

  columns.forEach(column => {
    column.addEventListener('dragover', handleDragOver);
    column.addEventListener('dragleave', handleDragLeave);
    column.addEventListener('drop', handleDrop);
  });
}

function handleDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  this.classList.add('is-drag-over');

  const dragging = document.querySelector('.is-dragging');
  if (!dragging) return;

  const afterEl = getDragAfterElement(this, e.clientY);
  const addBtn = this.querySelector('.pipeline__add');
  if (afterEl) {
    this.insertBefore(dragging, afterEl);
  } else if (addBtn) {
    this.insertBefore(dragging, addBtn);
  } else {
    this.appendChild(dragging);
  }
}

function handleDragLeave(e) {
  if (!this.contains(e.relatedTarget)) {
    this.classList.remove('is-drag-over');
  }
}

function handleDrop(e) {
  e.preventDefault();
  this.classList.remove('is-drag-over');

  const dragging = document.querySelector('.is-dragging');
  if (!dragging) return;

  const taskId = dragging.getAttribute('data-task-id');
  if (!taskId) return;

  // Determine new status from the column's parent data
  const colParent = this.closest('.pipeline__column');
  if (!colParent) return;

  let newStatus = '';
  if (colParent.classList.contains('pipeline__column--todo')) {
    newStatus = 'todo';
  } else if (colParent.classList.contains('pipeline__column--progress')) {
    newStatus = 'in-progress';
  } else if (colParent.classList.contains('pipeline__column--done')) {
    newStatus = 'done';
  }

  if (!newStatus) return;

  // Build update payload
  const updateData = { status: newStatus };
  const today = new Date().toISOString().slice(0, 10);

  // Handle completed_date
  if (newStatus === 'done') {
    updateData.completed_date = today;
  } else {
    updateData.completed_date = '';
  }

  Store.updateTask(taskId, updateData);

  // Get status label for toast
  const statusLabel = CRM.TASK_STATUSES.find(s => s.value === newStatus);
  const stageName = statusLabel ? statusLabel.label : newStatus;
  showToast(`タスクを「${stageName}」に移動しました`);

  // Full re-render to keep everything in sync
  renderTasks();
}

function getDragAfterElement(container, y) {
  const elements = [...container.querySelectorAll('.task-kanban-card:not(.is-dragging)')];
  return elements.reduce((closest, child) => {
    const box = child.getBoundingClientRect();
    const offset = y - box.top - box.height / 2;
    if (offset < 0 && offset > closest.offset) {
      return { offset, element: child };
    }
    return closest;
  }, { offset: Number.NEGATIVE_INFINITY }).element;
}

// Drag start / end is attached per-card in buildTaskCard via event delegation
document.addEventListener('dragstart', (e) => {
  const card = e.target.closest('.task-kanban-card');
  if (!card) return;
  card.classList.add('is-dragging');
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', '');
});

document.addEventListener('dragend', (e) => {
  const card = e.target.closest('.task-kanban-card');
  if (!card) return;
  card.classList.remove('is-dragging');
  document.querySelectorAll('.pipeline__cards').forEach(col => col.classList.remove('is-drag-over'));
});

// ============================================
// Filters setup
// ============================================
function initTaskFilters() {
  const filtersContainer = document.querySelector('.filters');
  if (!filtersContainer) return;

  // Clear existing static filter elements
  filtersContainer.innerHTML = '';

  // Build client/lead select
  const clientSelect = document.createElement('select');
  clientSelect.className = 'filter-select';
  clientSelect.innerHTML = buildClientFilterOptions();
  clientSelect.addEventListener('change', () => {
    currentFilters.client_id = clientSelect.value;
    renderTasks();
  });

  // Build assignee select
  const assigneeSelect = document.createElement('select');
  assigneeSelect.className = 'filter-select';
  assigneeSelect.innerHTML = `<option value="">すべての担当者</option>` +
    CRM.ASSIGNEES.map(a => `<option value="${a.value}">${a.label}</option>`).join('');
  assigneeSelect.addEventListener('change', () => {
    currentFilters.assigned_to = assigneeSelect.value;
    renderTasks();
  });

  // Build task type select
  const typeSelect = document.createElement('select');
  typeSelect.className = 'filter-select';
  typeSelect.innerHTML = `<option value="">すべての種別</option>` +
    CRM.TASK_TYPES.map(t => `<option value="${t.value}">${t.label}</option>`).join('');
  typeSelect.addEventListener('change', () => {
    currentFilters.task_type = typeSelect.value;
    renderTasks();
  });

  // Spacer
  const spacer = document.createElement('div');
  spacer.className = 'filters__spacer';

  // Search input
  const searchInput = document.createElement('input');
  searchInput.type = 'text';
  searchInput.className = 'filter-search';
  searchInput.placeholder = 'タスクを検索...';
  searchInput.addEventListener('input', () => {
    currentFilters.search = searchInput.value;
    renderTasks();
  });

  filtersContainer.appendChild(clientSelect);
  filtersContainer.appendChild(assigneeSelect);
  filtersContainer.appendChild(typeSelect);
  filtersContainer.appendChild(spacer);
  filtersContainer.appendChild(searchInput);
}

// Build options for client/lead filter dropdown
function buildClientFilterOptions() {
  let html = '<option value="">すべてのクライアント</option>';

  // Active clients
  const clients = Store.getClients();
  clients.forEach(c => {
    html += `<option value="${c.id}">${c.store_name}</option>`;
  });

  // Leads that have tasks (avoid duplicates with clients)
  const allTasks = Store.getTasks();
  const leadIds = [...new Set(allTasks.filter(t => t.lead_id).map(t => t.lead_id))];
  leadIds.forEach(lid => {
    const lead = Store.getLead(lid);
    if (lead) {
      html += `<option value="${lid}">${lead.store_name}（リード）</option>`;
    }
  });

  return html;
}

// ============================================
// New Task button (header + pipeline "+" btn)
// ============================================
function initNewTaskButton() {
  document.querySelectorAll('.btn--primary').forEach(btn => {
    if (btn.textContent.includes('新規タスク')) {
      btn.addEventListener('click', () => openNewTaskModal());
    }
  });
}

// ============================================
// New Task Modal
// ============================================
function openNewTaskModal() {
  const clientOptions = buildClientSelectOptions();

  const body = `
    ${formGroup('タスク名 *', formInput('title', '例: 月次レポート作成'))}
    <div style="display:grid; grid-template-columns:1fr 1fr; gap:0 var(--space-4);">
      ${formGroup('クライアント', formSelect('client_id', clientOptions))}
      ${formGroup('種別', formSelect('task_type', [{ value: 'general', label: '汎用' }, ...CRM.TASK_TYPES.filter(t => t.value !== 'general')]))}
    </div>
    <div style="display:grid; grid-template-columns:1fr 1fr; gap:0 var(--space-4);">
      ${formGroup('期限', formInput('due_date', '', 'date'))}
      ${formGroup('優先度', formSelect('priority', CRM.PRIORITIES, 'medium'))}
    </div>
    ${formGroup('担当者', formSelect('assigned_to', [{ value: '', label: '未割当' }, ...CRM.ASSIGNEES.map(a => ({ value: a.value, label: a.label }))]))}
    ${formGroup('メモ', formTextarea('notes', 'タスクの詳細を入力...'))}
  `;

  openModal({
    title: '新規タスク追加',
    body,
    submitLabel: '追加',
    onSubmit: (form) => {
      const data = getFormData(form);
      if (!data.title) {
        showToast('タスク名を入力してください', 'error');
        return;
      }

      // Determine if selected entity is a client or lead
      const taskData = {
        title: data.title,
        client_id: '',
        lead_id: '',
        task_type: data.task_type || 'general',
        status: 'todo',
        priority: data.priority || 'medium',
        due_date: data.due_date || '',
        assigned_to: data.assigned_to || 'ueda',
        notes: data.notes || '',
      };

      // Resolve client_id vs lead_id
      if (data.client_id) {
        if (data.client_id.startsWith('lead_')) {
          taskData.lead_id = data.client_id;
        } else {
          taskData.client_id = data.client_id;
        }
      }

      Store.addTask(taskData);
      closeModal();
      showToast(`「${data.title}」を追加しました`);
      renderTasks();
    }
  });
}

// ============================================
// Edit Task Modal
// ============================================
function openEditTaskModal(taskId) {
  const task = Store.getTask(taskId);
  if (!task) return;

  const clientOptions = buildClientSelectOptions();
  const currentEntityId = task.client_id || task.lead_id || '';

  const body = `
    ${formGroup('タスク名 *', formInput('title', '', 'text', task.title))}
    <div style="display:grid; grid-template-columns:1fr 1fr; gap:0 var(--space-4);">
      ${formGroup('クライアント', formSelect('client_id', clientOptions, currentEntityId))}
      ${formGroup('種別', formSelect('task_type', [{ value: 'general', label: '汎用' }, ...CRM.TASK_TYPES.filter(t => t.value !== 'general')], task.task_type))}
    </div>
    <div style="display:grid; grid-template-columns:1fr 1fr; gap:0 var(--space-4);">
      ${formGroup('ステータス', formSelect('status', CRM.TASK_STATUSES.map(s => ({ value: s.value, label: s.label })), task.status))}
      ${formGroup('優先度', formSelect('priority', CRM.PRIORITIES, task.priority))}
    </div>
    <div style="display:grid; grid-template-columns:1fr 1fr; gap:0 var(--space-4);">
      ${formGroup('期限', formInput('due_date', '', 'date', task.due_date || ''))}
      ${formGroup('完了日', formInput('completed_date', '', 'date', task.completed_date || ''))}
    </div>
    ${formGroup('担当者', formSelect('assigned_to', [{ value: '', label: '未割当' }, ...CRM.ASSIGNEES.map(a => ({ value: a.value, label: a.label }))], task.assigned_to))}
    ${formGroup('メモ', formTextarea('notes', 'タスクの詳細を入力...', task.notes || ''))}
    <div style="margin-top:var(--space-4); padding-top:var(--space-4); border-top:1px solid var(--color-border);">
      <button class="btn btn--danger btn--sm" data-action="delete-task" style="width:100%;">
        このタスクを削除
      </button>
    </div>
  `;

  const modal = openModal({
    title: 'タスク編集',
    body,
    submitLabel: '保存',
    onSubmit: (form) => {
      const data = getFormData(form);
      if (!data.title) {
        showToast('タスク名を入力してください', 'error');
        return;
      }

      const updateData = {
        title: data.title,
        client_id: '',
        lead_id: '',
        task_type: data.task_type || 'general',
        status: data.status || task.status,
        priority: data.priority || 'medium',
        due_date: data.due_date || '',
        completed_date: data.completed_date || '',
        assigned_to: data.assigned_to || 'ueda',
        notes: data.notes || '',
      };

      // Resolve client_id vs lead_id
      if (data.client_id) {
        if (data.client_id.startsWith('lead_')) {
          updateData.lead_id = data.client_id;
        } else {
          updateData.client_id = data.client_id;
        }
      }

      // Auto-set completed_date when moving to done
      if (updateData.status === 'done' && !updateData.completed_date) {
        updateData.completed_date = new Date().toISOString().slice(0, 10);
      }
      // Clear completed_date when moving out of done
      if (updateData.status !== 'done') {
        updateData.completed_date = '';
      }

      Store.updateTask(taskId, updateData);
      closeModal();
      showToast(`「${data.title}」を更新しました`);
      renderTasks();
    }
  });

  // Delete button handler
  const deleteBtn = modal.querySelector('[data-action="delete-task"]');
  if (deleteBtn) {
    deleteBtn.addEventListener('click', () => {
      if (confirm(`「${task.title}」を削除しますか？`)) {
        Store.deleteTask(taskId);
        closeModal();
        showToast(`「${task.title}」を削除しました`);
        renderTasks();
      }
    });
  }
}

// ============================================
// Shared: build client/lead select options
// ============================================
function buildClientSelectOptions() {
  const options = [{ value: '', label: '選択してください' }];

  // Clients
  const clients = Store.getClients();
  clients.forEach(c => {
    options.push({ value: c.id, label: c.store_name });
  });

  // Leads that have tasks
  const allTasks = Store.getTasks();
  const leadIds = [...new Set(allTasks.filter(t => t.lead_id).map(t => t.lead_id))];
  leadIds.forEach(lid => {
    const lead = Store.getLead(lid);
    if (lead) {
      options.push({ value: lid, label: lead.store_name + '（リード）' });
    }
  });

  return options;
}
