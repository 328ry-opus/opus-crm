/* ========================================
   Opus CRM — Data Store
   Business logic layer. Delegates storage to Repository.
   Currently synchronous (localStorage). When migrating to
   Supabase, make these methods async and await Repository calls.
   ======================================== */

const Store = {
  // Expose KEYS for backward compatibility (settings import/export)
  get KEYS() { return Repository.KEYS; },

  // ============================================
  // Initialization
  // ============================================
  init() {
    if (!Repository.isInitialized()) {
      this._seed();
      Repository.markInitialized();
    }
  },

  // ============================================
  // Internal helpers (delegate to Repository)
  // ============================================
  _getAll(key) {
    return Repository.getAllSync(key);
  },

  _saveAll(key, data) {
    Repository.saveAllSync(key, data);
  },

  _generateId(type) {
    return Repository.generateIdSync(type);
  },

  _now() {
    return new Date().toISOString();
  },

  _matchesFilter(item, filters) {
    if (!filters) return true;
    for (const [key, val] of Object.entries(filters)) {
      if (!val || val === '') continue;
      if (key === 'search') {
        const q = val.toLowerCase();
        const searchable = [
          item.store_name, item.company_name, item.title,
          item.contact_name, item.area, item.notes
        ].filter(Boolean).join(' ').toLowerCase();
        if (!searchable.includes(q)) return false;
      } else {
        if (item[key] !== val) return false;
      }
    }
    return true;
  },

  // ============================================
  // Leads CRUD
  // ============================================
  getLeads(filters) {
    const all = this._getAll('leads');
    if (!filters) return all;
    return all.filter(l => this._matchesFilter(l, filters));
  },

  getLead(id) {
    return this._getAll('leads').find(l => l.id === id) || null;
  },

  addLead(data) {
    const leads = this._getAll('leads');
    const lead = {
      id: this._generateId('lead'),
      store_name: data.store_name || '',
      company_name: data.company_name || '',
      business_type: data.business_type || 'sns',
      store_type: data.store_type || '',
      contact_name: data.contact_name || '',
      contact_phone: data.contact_phone || '',
      contact_email: data.contact_email || '',
      contact_line: data.contact_line || '',
      sns_instagram: data.sns_instagram || '',
      sns_tiktok: data.sns_tiktok || '',
      source: data.source || 'dm',
      estimated_plan: data.estimated_plan || '',
      estimated_fee: parseInt(data.estimated_fee) || 0,
      area: data.area || '',
      stage: data.stage || 'list-added',
      next_date: data.next_date || '',
      next_action: data.next_action || '',
      notes: data.notes || '',
      assigned_to: data.assigned_to || 'ueda',
      converted_to_client: null,
      created_at: this._now(),
      updated_at: this._now(),
    };
    leads.push(lead);
    this._saveAll('leads', leads);
    return lead;
  },

  updateLead(id, data) {
    const leads = this._getAll('leads');
    const idx = leads.findIndex(l => l.id === id);
    if (idx === -1) return null;
    Object.assign(leads[idx], data, { updated_at: this._now() });
    this._saveAll('leads', leads);
    return leads[idx];
  },

  deleteLead(id) {
    let leads = this._getAll('leads');
    leads = leads.filter(l => l.id !== id);
    this._saveAll('leads', leads);
    // Clean up related data
    let activities = this._getAll('activities');
    activities = activities.filter(a => !(a.entity_type === 'lead' && a.entity_id === id));
    this._saveAll('activities', activities);
    let tasks = this._getAll('tasks');
    tasks = tasks.filter(t => t.lead_id !== id);
    this._saveAll('tasks', tasks);
  },

  getLeadsByStage() {
    const leads = this._getAll('leads');
    const grouped = {};
    CRM.LEAD_STAGES.forEach(s => { grouped[s.value] = []; });
    leads.forEach(l => {
      if (grouped[l.stage]) grouped[l.stage].push(l);
    });
    return grouped;
  },

  convertLeadToClient(leadId, contractData) {
    const lead = this.getLead(leadId);
    if (!lead) return null;

    // Create client from lead data
    const plan = getAllPlans().find(p => p.value === contractData.plan);
    const client = this.addClient({
      store_name: lead.store_name,
      company_name: lead.company_name,
      business_type: lead.business_type,
      store_type: lead.store_type,
      contact_name: lead.contact_name,
      contact_phone: lead.contact_phone,
      contact_email: lead.contact_email,
      contact_line: lead.contact_line,
      sns_instagram: lead.sns_instagram,
      sns_tiktok: lead.sns_tiktok,
      plan: contractData.plan || '',
      monthly_fee: contractData.monthly_fee || (plan ? plan.fee : 0),
      contract_start: contractData.contract_start || '',
      status: 'active',
      area: lead.area,
      assigned_to: lead.assigned_to,
      notes: contractData.notes || lead.notes,
      converted_from_lead: leadId,
    });

    // Update lead
    this.updateLead(leadId, {
      stage: 'won',
      converted_to_client: client.id,
    });

    // Transfer tasks
    const tasks = this._getAll('tasks');
    tasks.forEach(t => {
      if (t.lead_id === leadId) {
        t.lead_id = '';
        t.client_id = client.id;
      }
    });
    this._saveAll('tasks', tasks);

    // Add activity
    this.addActivity({
      entity_type: 'client',
      entity_id: client.id,
      activity_type: 'note',
      summary: `リードから成約・クライアント登録完了`,
      created_by: 'ueda',
    });

    return client;
  },

  // ============================================
  // Clients CRUD
  // ============================================
  getClients(filters) {
    const all = this._getAll('clients');
    if (!filters) return all;
    return all.filter(c => this._matchesFilter(c, filters));
  },

  getClient(id) {
    return this._getAll('clients').find(c => c.id === id) || null;
  },

  addClient(data) {
    const clients = this._getAll('clients');
    const client = {
      id: this._generateId('client'),
      store_name: data.store_name || '',
      company_name: data.company_name || '',
      business_type: data.business_type || 'sns',
      store_type: data.store_type || '',
      contact_name: data.contact_name || '',
      contact_phone: data.contact_phone || '',
      contact_email: data.contact_email || '',
      contact_line: data.contact_line || '',
      sns_instagram: data.sns_instagram || '',
      sns_tiktok: data.sns_tiktok || '',
      plan: data.plan || '',
      monthly_fee: parseInt(data.monthly_fee) || 0,
      contract_start: data.contract_start || '',
      contract_end: data.contract_end || '',
      status: data.status || 'active',
      next_date: data.next_date || '',
      next_action: data.next_action || '',
      notes: data.notes || '',
      assigned_to: data.assigned_to || 'ueda',
      area: data.area || '',
      converted_from_lead: data.converted_from_lead || null,
      created_at: this._now(),
      updated_at: this._now(),
    };
    clients.push(client);
    this._saveAll('clients', clients);
    return client;
  },

  updateClient(id, data) {
    const clients = this._getAll('clients');
    const idx = clients.findIndex(c => c.id === id);
    if (idx === -1) return null;
    Object.assign(clients[idx], data, { updated_at: this._now() });
    this._saveAll('clients', clients);
    return clients[idx];
  },

  deleteClient(id) {
    let clients = this._getAll('clients');
    clients = clients.filter(c => c.id !== id);
    this._saveAll('clients', clients);
    // Clean up related data
    let activities = this._getAll('activities');
    activities = activities.filter(a => !(a.entity_type === 'client' && a.entity_id === id));
    this._saveAll('activities', activities);
    let tasks = this._getAll('tasks');
    tasks = tasks.filter(t => t.client_id !== id);
    this._saveAll('tasks', tasks);
  },

  // ============================================
  // Tasks CRUD
  // ============================================
  getTasks(filters) {
    const all = this._getAll('tasks');
    if (!filters) return all;
    return all.filter(t => this._matchesFilter(t, filters));
  },

  getTask(id) {
    return this._getAll('tasks').find(t => t.id === id) || null;
  },

  addTask(data) {
    const tasks = this._getAll('tasks');
    const task = {
      id: this._generateId('task'),
      title: data.title || '',
      client_id: data.client_id || '',
      lead_id: data.lead_id || '',
      task_type: data.task_type || 'general',
      status: data.status || 'todo',
      priority: data.priority || 'medium',
      due_date: data.due_date || '',
      completed_date: data.completed_date || '',
      assigned_to: data.assigned_to || 'ueda',
      notes: data.notes || '',
      created_at: this._now(),
      updated_at: this._now(),
    };
    tasks.push(task);
    this._saveAll('tasks', tasks);
    return task;
  },

  updateTask(id, data) {
    const tasks = this._getAll('tasks');
    const idx = tasks.findIndex(t => t.id === id);
    if (idx === -1) return null;
    Object.assign(tasks[idx], data, { updated_at: this._now() });
    this._saveAll('tasks', tasks);
    return tasks[idx];
  },

  deleteTask(id) {
    let tasks = this._getAll('tasks');
    tasks = tasks.filter(t => t.id !== id);
    this._saveAll('tasks', tasks);
  },

  getTasksByStatus() {
    const tasks = this._getAll('tasks');
    const grouped = {};
    CRM.TASK_STATUSES.forEach(s => { grouped[s.value] = []; });
    tasks.forEach(t => {
      if (grouped[t.status]) grouped[t.status].push(t);
    });
    return grouped;
  },

  getTasksForClient(clientId) {
    return this._getAll('tasks').filter(t => t.client_id === clientId);
  },

  getTasksForLead(leadId) {
    return this._getAll('tasks').filter(t => t.lead_id === leadId);
  },

  // ============================================
  // Activities
  // ============================================
  getActivities(entityType, entityId) {
    return this._getAll('activities')
      .filter(a => a.entity_type === entityType && a.entity_id === entityId)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  },

  addActivity(data) {
    const activities = this._getAll('activities');
    const activity = {
      id: this._generateId('activity'),
      entity_type: data.entity_type || '',
      entity_id: data.entity_id || '',
      activity_type: data.activity_type || 'note',
      summary: data.summary || '',
      next_date: data.next_date || '',
      next_action: data.next_action || '',
      created_by: data.created_by || 'ueda',
      created_at: data.created_at || this._now(),
    };
    activities.push(activity);
    this._saveAll('activities', activities);
    return activity;
  },

  getRecentActivities(limit = 6) {
    const all = this._getAll('activities');
    return all
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, limit);
  },

  // ============================================
  // Settings (delegate to Repository)
  // ============================================
  getSettings() {
    return Repository.getSettingsSync();
  },

  saveSettings(data) {
    Repository.saveSettingsSync(data);
  },

  // ============================================
  // Dashboard helpers
  // ============================================
  getDashboardMetrics() {
    const leads = this._getAll('leads');
    const clients = this._getAll('clients');
    const tasks = this._getAll('tasks');
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let actionCount = 0;
    let overdueCount = 0;
    leads.forEach(l => {
      if (l.stage === 'won' || l.stage === 'lost') return;
      if (l.next_date) {
        const d = new Date(l.next_date); d.setHours(0, 0, 0, 0);
        if (d <= today) { actionCount++; if (d < today) overdueCount++; }
      }
    });
    tasks.forEach(t => {
      if (t.status === 'done') return;
      if (t.due_date) {
        const d = new Date(t.due_date); d.setHours(0, 0, 0, 0);
        if (d <= today) { actionCount++; if (d < today) overdueCount++; }
      }
    });

    const activeStages = ['dm-sent', 'replied', 'appointment-set', 'in-meeting', 'proposal-sent'];
    const pipelineLeads = leads.filter(l => activeStages.includes(l.stage));
    const activeClients = clients.filter(c => c.status === 'active');
    const snsClients = activeClients.filter(c => c.business_type === 'sns' || c.business_type === 'both').length;
    const webClients = activeClients.filter(c => c.business_type === 'web' || c.business_type === 'both').length;

    const leadValue = leads
      .filter(l => !['won', 'lost'].includes(l.stage))
      .reduce((sum, l) => sum + (l.estimated_fee || 0), 0);
    const clientValue = activeClients.reduce((sum, c) => sum + (c.monthly_fee || 0), 0);

    return {
      actionCount,
      overdueCount,
      pipelineLeadCount: pipelineLeads.length,
      activeClientCount: activeClients.length,
      snsClients,
      webClients,
      totalPipelineValue: leadValue + clientValue,
    };
  },

  getTodayActions() {
    const leads = this._getAll('leads');
    const tasks = this._getAll('tasks');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const items = [];

    leads.forEach(l => {
      if (l.stage === 'won' || l.stage === 'lost') return;
      if (!l.next_date) return;
      const d = new Date(l.next_date); d.setHours(0, 0, 0, 0);
      if (d <= today) {
        const stage = CRM.LEAD_STAGES.find(s => s.value === l.stage);
        items.push({
          type: 'lead', id: l.id, name: l.store_name,
          sub: `${l.store_type ? (getAllStoreTypes().find(t => t.value === l.store_type)?.label || '') : ''}${l.area ? '・' + l.area : ''}`,
          status: stage ? stage.label : '', statusBadge: l.stage,
          date: l.next_date, action: l.next_action || '', isOverdue: d < today,
        });
      }
    });

    tasks.forEach(t => {
      if (t.status === 'done') return;
      if (!t.due_date) return;
      const d = new Date(t.due_date); d.setHours(0, 0, 0, 0);
      if (d <= today) {
        let entityName = '';
        if (t.client_id) {
          const c = this.getClient(t.client_id);
          if (c) entityName = c.store_name;
        } else if (t.lead_id) {
          const l = this.getLead(t.lead_id);
          if (l) entityName = l.store_name + '（リード）';
        }
        items.push({
          type: 'task', id: t.id, name: t.title, sub: entityName,
          status: t.status === 'in-progress' ? '進行中' : 'Todo', statusBadge: t.status,
          date: t.due_date, action: '', isOverdue: d < today,
          client_id: t.client_id, lead_id: t.lead_id,
        });
      }
    });

    const clients = this._getAll('clients');
    clients.forEach(c => {
      if (c.status !== 'active') return;
      if (!c.next_date) return;
      const d = new Date(c.next_date); d.setHours(0, 0, 0, 0);
      if (d <= today) {
        const biz = CRM.BUSINESS_TYPES.find(b => b.value === c.business_type);
        items.push({
          type: 'client', id: c.id, name: c.store_name,
          sub: `${c.store_type ? (getAllStoreTypes().find(t => t.value === c.store_type)?.label || '') : ''}${biz ? '・' + biz.label : ''}`,
          status: '契約中', statusBadge: 'active',
          date: c.next_date, action: c.next_action || '', isOverdue: d < today,
        });
      }
    });

    items.sort((a, b) => {
      if (a.isOverdue !== b.isOverdue) return a.isOverdue ? -1 : 1;
      return new Date(a.date) - new Date(b.date);
    });
    return items;
  },

  // ============================================
  // Lookup helpers
  // ============================================
  getEntityName(entityType, entityId) {
    if (entityType === 'lead') {
      const l = this.getLead(entityId);
      return l ? l.store_name : '';
    }
    if (entityType === 'client') {
      const c = this.getClient(entityId);
      return c ? c.store_name : '';
    }
    return '';
  },

  // ============================================
  // Data management
  // ============================================
  exportJSON() {
    const data = {
      leads: this._getAll('leads'),
      clients: this._getAll('clients'),
      tasks: this._getAll('tasks'),
      activities: this._getAll('activities'),
      settings: this.getSettings(),
      exported_at: this._now(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `opus-crm-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  },

  exportCSV(type) {
    const items = this._getAll(type);
    if (!items.length) { showToast('エクスポートするデータがありません', 'error'); return; }

    const headers = Object.keys(items[0]);
    const rows = items.map(item => headers.map(h => {
      const val = item[h];
      if (val === null || val === undefined) return '';
      const str = String(val);
      return str.includes(',') || str.includes('"') || str.includes('\n')
        ? '"' + str.replace(/"/g, '""') + '"' : str;
    }).join(','));

    const csv = [headers.join(','), ...rows].join('\n');
    const bom = '\uFEFF';
    const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `opus-crm-${type}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  },

  resetAll() {
    Repository.resetAll();
    this._seed();
    Repository.markInitialized();
  },

  // ============================================
  // Seed Data
  // ============================================
  _seed() {
    Repository.saveCountersSync({
      lead: 0, client: 3, task: 0, activity: 6
    });

    this._saveAll('leads', []);

    const clients = [
      { id: 'client_0001', store_name: 'ふららぼ', company_name: '株式会社SRC', business_type: 'sns', store_type: 'concept-cafe', contact_name: 'SRC担当', contact_phone: '03-0000-0000', contact_email: 'info@src.co.jp', contact_line: '', sns_instagram: '@furarabo', sns_tiktok: '@furarabo', plan: 'regular', monthly_fee: 300000, contract_start: '2025-09-01', contract_end: '', status: 'active', next_date: '2026-03-01', next_action: '月次MTG実施', notes: '', assigned_to: 'ueda', area: '', converted_from_lead: null, created_at: '2025-09-01T00:00:00.000Z', updated_at: '2026-02-25T14:00:00.000Z' },
      { id: 'client_0002', store_name: 'さいたまブロンコス', company_name: 'OMGスポンサー', business_type: 'sns', store_type: 'other', contact_name: '', contact_phone: '', contact_email: '', contact_line: '', sns_instagram: '', sns_tiktok: '', plan: 'light', monthly_fee: 150000, contract_start: '2025-11-01', contract_end: '', status: 'active', next_date: '2026-03-05', next_action: '3月撮影スケジュール確認', notes: '', assigned_to: 'ueda', area: '', converted_from_lead: null, created_at: '2025-11-01T00:00:00.000Z', updated_at: '2026-02-23T09:00:00.000Z' },
      { id: 'client_0003', store_name: 'Roen', company_name: '', business_type: 'sns', store_type: 'other', contact_name: '', contact_phone: '', contact_email: '', contact_line: '', sns_instagram: '', sns_tiktok: '', plan: 'light', monthly_fee: 150000, contract_start: '2026-01-15', contract_end: '', status: 'active', next_date: '2026-03-10', next_action: '企画確認', notes: '', assigned_to: 'ueda', area: '', converted_from_lead: null, created_at: '2026-01-15T00:00:00.000Z', updated_at: '2026-02-20T10:00:00.000Z' },
    ];
    this._saveAll('clients', clients);
    this._saveAll('tasks', []);

    const activities = [
      { id: 'activity_0001', entity_type: 'client', entity_id: 'client_0001', activity_type: 'meeting', summary: '撮影日程の調整MTG。3/5に撮影確定。3月の企画案も共有済み。', next_date: '2026-03-01', next_action: '月次MTG', created_by: 'ueda', created_at: '2026-02-25T14:00:00.000Z' },
      { id: 'activity_0002', entity_type: 'client', entity_id: 'client_0001', activity_type: 'note', summary: '2月分の撮影完了（8本）。栗原さんに編集依頼済み。', next_date: '', next_action: '', created_by: 'ueda', created_at: '2026-02-15T00:00:00.000Z' },
      { id: 'activity_0003', entity_type: 'client', entity_id: 'client_0001', activity_type: 'meeting', summary: '1月分のレポート報告。TikTokフォロワー+320、エンゲージメント率4.2%。先方満足度高い。', next_date: '', next_action: '', created_by: 'ueda', created_at: '2026-02-03T15:00:00.000Z' },
      { id: 'activity_0004', entity_type: 'client', entity_id: 'client_0001', activity_type: 'email', summary: '月次レポート送付。1月の実績まとめと2月の企画案を添付。', next_date: '', next_action: '', created_by: 'ueda', created_at: '2026-01-28T00:00:00.000Z' },
      { id: 'activity_0005', entity_type: 'client', entity_id: 'client_0002', activity_type: 'note', summary: '3月のリール撮影スケジュール確認', next_date: '', next_action: '', created_by: 'ueda', created_at: '2026-02-23T09:00:00.000Z' },
      { id: 'activity_0006', entity_type: 'client', entity_id: 'client_0003', activity_type: 'note', summary: 'Roenアカウント初期設定完了', next_date: '', next_action: '', created_by: 'ueda', created_at: '2026-02-05T00:00:00.000Z' },
    ];
    this._saveAll('activities', activities);
  },
};
