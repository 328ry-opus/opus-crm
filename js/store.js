/* ========================================
   Opus CRM — Data Store (localStorage)
   All CRUD operations and data persistence
   ======================================== */

const Store = {
  // --- Cache ---
  _cache: {},

  // --- localStorage keys ---
  KEYS: {
    leads: 'opus_crm_leads',
    clients: 'opus_crm_clients',
    tasks: 'opus_crm_tasks',
    activities: 'opus_crm_activities',
    settings: 'opus_crm_settings',
    counters: 'opus_crm_counters',
    initialized: 'opus_crm_initialized',
  },

  // ============================================
  // Initialization
  // ============================================
  init() {
    if (!localStorage.getItem(this.KEYS.initialized)) {
      this._seed();
      localStorage.setItem(this.KEYS.initialized, 'true');
    }
  },

  // ============================================
  // Internal helpers
  // ============================================
  _getAll(key) {
    if (this._cache[key]) return this._cache[key];
    const raw = localStorage.getItem(this.KEYS[key]);
    const data = raw ? JSON.parse(raw) : [];
    this._cache[key] = data;
    return data;
  },

  _saveAll(key, data) {
    this._cache[key] = data;
    localStorage.setItem(this.KEYS[key], JSON.stringify(data));
  },

  _generateId(type) {
    const counters = JSON.parse(localStorage.getItem(this.KEYS.counters) || '{}');
    const current = counters[type] || 0;
    const next = current + 1;
    counters[type] = next;
    localStorage.setItem(this.KEYS.counters, JSON.stringify(counters));
    return `${type}_${String(next).padStart(4, '0')}`;
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
    const plan = CRM.PLANS.find(p => p.value === contractData.plan);
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
    let activities = this._getAll('activities');
    activities = activities.filter(a => !(a.entity_type === 'client' && a.entity_id === id));
    this._saveAll('activities', activities);
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
  // Settings
  // ============================================
  getSettings() {
    const raw = localStorage.getItem(this.KEYS.settings);
    return raw ? JSON.parse(raw) : {
      profile_name: '上田 琉',
      profile_role: 'admin',
      profile_email: 'ueda@opus-net.co.jp',
      profile_phone: '',
    };
  },

  saveSettings(data) {
    localStorage.setItem(this.KEYS.settings, JSON.stringify(data));
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

    // Count actions due today or overdue
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

    // Active pipeline leads (not list-added, won, lost)
    const activeStages = ['dm-sent', 'replied', 'appointment-set', 'in-meeting', 'proposal-sent'];
    const pipelineLeads = leads.filter(l => activeStages.includes(l.stage));

    // Active clients
    const activeClients = clients.filter(c => c.status === 'active');
    const snsClients = activeClients.filter(c => c.business_type === 'sns' || c.business_type === 'both').length;
    const webClients = activeClients.filter(c => c.business_type === 'web' || c.business_type === 'both').length;

    // Pipeline value
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

    // Leads with next_date <= today
    leads.forEach(l => {
      if (l.stage === 'won' || l.stage === 'lost') return;
      if (!l.next_date) return;
      const d = new Date(l.next_date); d.setHours(0, 0, 0, 0);
      if (d <= today) {
        const stage = CRM.LEAD_STAGES.find(s => s.value === l.stage);
        items.push({
          type: 'lead',
          id: l.id,
          name: l.store_name,
          sub: `${l.store_type ? (CRM.STORE_TYPES.find(t => t.value === l.store_type)?.label || '') : ''}${l.area ? '・' + l.area : ''}`,
          status: stage ? stage.label : '',
          statusBadge: l.stage,
          date: l.next_date,
          action: l.next_action || '',
          isOverdue: d < today,
        });
      }
    });

    // Tasks with due_date <= today and not done
    tasks.forEach(t => {
      if (t.status === 'done') return;
      if (!t.due_date) return;
      const d = new Date(t.due_date); d.setHours(0, 0, 0, 0);
      if (d <= today) {
        // Find related entity name
        let entityName = '';
        if (t.client_id) {
          const c = this.getClient(t.client_id);
          if (c) entityName = c.store_name;
        } else if (t.lead_id) {
          const l = this.getLead(t.lead_id);
          if (l) entityName = l.store_name + '（リード）';
        }
        items.push({
          type: 'task',
          id: t.id,
          name: t.title,
          sub: entityName,
          status: t.status === 'in-progress' ? '進行中' : 'Todo',
          statusBadge: t.status,
          date: t.due_date,
          action: '',
          isOverdue: d < today,
          client_id: t.client_id,
          lead_id: t.lead_id,
        });
      }
    });

    // Clients with next_date <= today
    const clients = this._getAll('clients');
    clients.forEach(c => {
      if (c.status !== 'active') return;
      if (!c.next_date) return;
      const d = new Date(c.next_date); d.setHours(0, 0, 0, 0);
      if (d <= today) {
        const biz = CRM.BUSINESS_TYPES.find(b => b.value === c.business_type);
        items.push({
          type: 'client',
          id: c.id,
          name: c.store_name,
          sub: `${c.store_type ? (CRM.STORE_TYPES.find(t => t.value === c.store_type)?.label || '') : ''}${biz ? '・' + biz.label : ''}`,
          status: '契約中',
          statusBadge: 'active',
          date: c.next_date,
          action: c.next_action || '',
          isOverdue: d < today,
        });
      }
    });

    // Sort: overdue first, then by date
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
    Object.values(this.KEYS).forEach(key => localStorage.removeItem(key));
    this._cache = {};
    this._seed();
    localStorage.setItem(this.KEYS.initialized, 'true');
  },

  // ============================================
  // Seed Data
  // ============================================
  _seed() {
    // Reset counters
    localStorage.setItem(this.KEYS.counters, JSON.stringify({
      lead: 12, client: 3, task: 10, activity: 14
    }));

    // --- Leads ---
    const leads = [
      { id: 'lead_0001', store_name: 'Cafe LUNA', company_name: '', business_type: 'sns', store_type: 'concept-cafe', contact_name: '', contact_phone: '', contact_email: '', contact_line: '', sns_instagram: '', sns_tiktok: '', source: 'dm', estimated_plan: 'light', estimated_fee: 150000, area: '新宿', stage: 'list-added', next_date: '', next_action: '', notes: '', assigned_to: 'ueda', converted_to_client: null, created_at: '2026-02-10T10:00:00.000Z', updated_at: '2026-02-10T10:00:00.000Z' },
      { id: 'lead_0002', store_name: 'Bar GLITCH', company_name: '', business_type: 'sns', store_type: 'bar', contact_name: '', contact_phone: '', contact_email: '', contact_line: '', sns_instagram: '', sns_tiktok: '', source: 'dm', estimated_plan: '', estimated_fee: 0, area: '池袋', stage: 'list-added', next_date: '', next_action: '', notes: '', assigned_to: 'ueda', converted_to_client: null, created_at: '2026-02-11T10:00:00.000Z', updated_at: '2026-02-11T10:00:00.000Z' },
      { id: 'lead_0003', store_name: 'ガレージK', company_name: '', business_type: 'web', store_type: 'car-dealer', contact_name: '', contact_phone: '', contact_email: '', contact_line: '', sns_instagram: '', sns_tiktok: '', source: 'phone', estimated_plan: '', estimated_fee: 0, area: '埼玉', stage: 'list-added', next_date: '', next_action: '', notes: '', assigned_to: 'ueda', converted_to_client: null, created_at: '2026-02-12T10:00:00.000Z', updated_at: '2026-02-12T10:00:00.000Z' },
      { id: 'lead_0004', store_name: 'Salon de Noir', company_name: '', business_type: 'sns', store_type: 'concept-cafe', contact_name: '', contact_phone: '', contact_email: '', contact_line: '', sns_instagram: '', sns_tiktok: '', source: 'dm', estimated_plan: '', estimated_fee: 0, area: '歌舞伎町', stage: 'list-added', next_date: '', next_action: '', notes: '', assigned_to: 'ueda', converted_to_client: null, created_at: '2026-02-13T10:00:00.000Z', updated_at: '2026-02-13T10:00:00.000Z' },
      { id: 'lead_0005', store_name: 'Bar Nocturne', company_name: '', business_type: 'sns', store_type: 'concept-cafe', contact_name: '', contact_phone: '', contact_email: '', contact_line: '', sns_instagram: '', sns_tiktok: '', source: 'dm', estimated_plan: 'light', estimated_fee: 150000, area: '渋谷', stage: 'dm-sent', next_date: '2026-02-23', next_action: 'フォローDM送信', notes: '', assigned_to: 'ueda', converted_to_client: null, created_at: '2026-02-14T10:00:00.000Z', updated_at: '2026-02-20T10:00:00.000Z' },
      { id: 'lead_0006', store_name: 'Cafe BLOOM', company_name: '', business_type: 'sns', store_type: 'concept-cafe', contact_name: '', contact_phone: '', contact_email: '', contact_line: '', sns_instagram: '', sns_tiktok: '', source: 'dm', estimated_plan: 'light', estimated_fee: 150000, area: '新宿', stage: 'dm-sent', next_date: '2026-02-27', next_action: '返信確認', notes: '', assigned_to: 'ueda', converted_to_client: null, created_at: '2026-02-15T10:00:00.000Z', updated_at: '2026-02-20T10:00:00.000Z' },
      { id: 'lead_0007', store_name: 'FIT STUDIO 恵比寿', company_name: '', business_type: 'sns', store_type: 'gym', contact_name: '', contact_phone: '', contact_email: '', contact_line: '', sns_instagram: '', sns_tiktok: '', source: 'dm', estimated_plan: 'regular', estimated_fee: 300000, area: '恵比寿', stage: 'dm-sent', next_date: '2026-02-28', next_action: '返信待ち', notes: '', assigned_to: 'ueda', converted_to_client: null, created_at: '2026-02-16T10:00:00.000Z', updated_at: '2026-02-21T10:00:00.000Z' },
      { id: 'lead_0008', store_name: 'Night Owl', company_name: '', business_type: 'sns', store_type: 'bar', contact_name: '', contact_phone: '', contact_email: '', contact_line: '', sns_instagram: '', sns_tiktok: '', source: 'dm', estimated_plan: 'light', estimated_fee: 150000, area: '六本木', stage: 'replied', next_date: '2026-02-26', next_action: 'アポ打診', notes: '', assigned_to: 'ueda', converted_to_client: null, created_at: '2026-02-12T10:00:00.000Z', updated_at: '2026-02-22T10:00:00.000Z' },
      { id: 'lead_0009', store_name: 'BODY LAB 横浜', company_name: '', business_type: 'sns', store_type: 'gym', contact_name: '', contact_phone: '', contact_email: '', contact_line: '', sns_instagram: '', sns_tiktok: '', source: 'dm', estimated_plan: 'light', estimated_fee: 150000, area: '横浜', stage: 'replied', next_date: '2026-03-01', next_action: 'ヒアリング', notes: '', assigned_to: 'ueda', converted_to_client: null, created_at: '2026-02-13T10:00:00.000Z', updated_at: '2026-02-23T10:00:00.000Z' },
      { id: 'lead_0010', store_name: 'Lounge VELVET', company_name: '株式会社VELVET', business_type: 'sns', store_type: 'bar', contact_name: '山田 健太', contact_phone: '03-1234-5678', contact_email: 'yamada@velvet-lounge.com', contact_line: '@velvet-lounge', sns_instagram: '@lounge_velvet', sns_tiktok: '@loungevlvet', source: 'dm', estimated_plan: 'regular', estimated_fee: 300000, area: '六本木', stage: 'appointment-set', next_date: '2026-02-25', next_action: '初回商談（15:00〜）', notes: '六本木エリアのラウンジバー。内装がおしゃれでTikTok映えする空間。\nInstagram投稿は月2-3回程度で不定期。TikTokアカウントは作成済みだが投稿なし。\nターゲット客層は20代後半〜30代の女性グループ。\n\n山田さん（オーナー兼店長）は30代前半。SNSの重要性は理解しているが、運用リソースがないとのこと。\nレギュラープラン（30万/月）に興味を示している。', assigned_to: 'ueda', converted_to_client: null, created_at: '2026-02-15T00:00:00.000Z', updated_at: '2026-02-22T18:30:00.000Z' },
      { id: 'lead_0011', store_name: 'GLAM BAR 新宿', company_name: '', business_type: 'sns', store_type: 'bar', contact_name: '', contact_phone: '', contact_email: '', contact_line: '', sns_instagram: '', sns_tiktok: '', source: 'dm', estimated_plan: 'full', estimated_fee: 500000, area: '新宿', stage: 'in-meeting', next_date: '2026-02-28', next_action: '提案書準備', notes: '', assigned_to: 'ueda', converted_to_client: null, created_at: '2026-02-08T10:00:00.000Z', updated_at: '2026-02-24T10:00:00.000Z' },
      { id: 'lead_0012', store_name: 'AXIS AUTO 町田', company_name: '', business_type: 'web', store_type: 'car-dealer', contact_name: '', contact_phone: '', contact_email: '', contact_line: '', sns_instagram: '', sns_tiktok: '', source: 'phone', estimated_plan: 'webcm', estimated_fee: 200000, area: '町田', stage: 'proposal-sent', next_date: '2026-02-25', next_action: '提案書フォローアップ電話', notes: '', assigned_to: 'ueda', converted_to_client: null, created_at: '2026-02-05T10:00:00.000Z', updated_at: '2026-02-23T10:00:00.000Z' },
    ];
    this._saveAll('leads', leads);

    // --- Clients ---
    const clients = [
      { id: 'client_0001', store_name: 'ふららぼ', company_name: '株式会社SRC', business_type: 'sns', store_type: 'concept-cafe', contact_name: 'SRC担当', contact_phone: '03-0000-0000', contact_email: 'info@src.co.jp', contact_line: '', sns_instagram: '@furarabo', sns_tiktok: '@furarabo', plan: 'regular', monthly_fee: 300000, contract_start: '2025-09-01', contract_end: '', status: 'active', next_date: '2026-03-01', next_action: '月次MTG実施', notes: '', assigned_to: 'ueda', area: '', converted_from_lead: null, created_at: '2025-09-01T00:00:00.000Z', updated_at: '2026-02-25T14:00:00.000Z' },
      { id: 'client_0002', store_name: 'さいたまブロンコス', company_name: 'OMGスポンサー', business_type: 'sns', store_type: 'other', contact_name: '', contact_phone: '', contact_email: '', contact_line: '', sns_instagram: '', sns_tiktok: '', plan: 'light', monthly_fee: 150000, contract_start: '2025-11-01', contract_end: '', status: 'active', next_date: '2026-03-05', next_action: '3月撮影スケジュール確認', notes: '', assigned_to: 'ueda', area: '', converted_from_lead: null, created_at: '2025-11-01T00:00:00.000Z', updated_at: '2026-02-23T09:00:00.000Z' },
      { id: 'client_0003', store_name: 'Roen', company_name: '', business_type: 'sns', store_type: 'other', contact_name: '', contact_phone: '', contact_email: '', contact_line: '', sns_instagram: '', sns_tiktok: '', plan: 'light', monthly_fee: 150000, contract_start: '2026-01-15', contract_end: '', status: 'active', next_date: '2026-03-10', next_action: '企画確認', notes: '', assigned_to: 'ueda', area: '', converted_from_lead: null, created_at: '2026-01-15T00:00:00.000Z', updated_at: '2026-02-20T10:00:00.000Z' },
    ];
    this._saveAll('clients', clients);

    // --- Tasks ---
    const tasks = [
      { id: 'task_0001', title: '月次レポート作成・送付', client_id: 'client_0001', lead_id: '', task_type: 'report', status: 'todo', priority: 'high', due_date: '2026-02-24', completed_date: '', assigned_to: 'ueda', notes: '', created_at: '2026-02-20T10:00:00.000Z', updated_at: '2026-02-20T10:00:00.000Z' },
      { id: 'task_0002', title: '月次MTG実施', client_id: 'client_0001', lead_id: '', task_type: 'meeting', status: 'todo', priority: 'high', due_date: '2026-03-01', completed_date: '', assigned_to: 'ueda', notes: '', created_at: '2026-02-20T10:00:00.000Z', updated_at: '2026-02-20T10:00:00.000Z' },
      { id: 'task_0003', title: '3月リール撮影スケジュール確定', client_id: 'client_0002', lead_id: '', task_type: 'shoot', status: 'todo', priority: 'medium', due_date: '2026-02-28', completed_date: '', assigned_to: 'ueda', notes: '', created_at: '2026-02-20T10:00:00.000Z', updated_at: '2026-02-20T10:00:00.000Z' },
      { id: 'task_0004', title: '3月分 企画・台本作成', client_id: 'client_0003', lead_id: '', task_type: 'general', status: 'todo', priority: 'medium', due_date: '2026-03-05', completed_date: '', assigned_to: 'ueda', notes: '', created_at: '2026-02-20T10:00:00.000Z', updated_at: '2026-02-20T10:00:00.000Z' },
      { id: 'task_0005', title: '提案書フォローアップ電話', client_id: '', lead_id: 'lead_0012', task_type: 'general', status: 'todo', priority: 'medium', due_date: '2026-02-25', completed_date: '', assigned_to: 'ueda', notes: '', created_at: '2026-02-20T10:00:00.000Z', updated_at: '2026-02-20T10:00:00.000Z' },
      { id: 'task_0006', title: '2月分 動画編集（8本）', client_id: 'client_0001', lead_id: '', task_type: 'edit', status: 'in-progress', priority: 'medium', due_date: '2026-02-28', completed_date: '', assigned_to: 'kurihara', notes: '', created_at: '2026-02-15T10:00:00.000Z', updated_at: '2026-02-20T10:00:00.000Z' },
      { id: 'task_0007', title: 'Instagramリール 2月後半分', client_id: 'client_0002', lead_id: '', task_type: 'edit', status: 'in-progress', priority: 'low', due_date: '2026-02-28', completed_date: '', assigned_to: 'kurihara', notes: '', created_at: '2026-02-15T10:00:00.000Z', updated_at: '2026-02-20T10:00:00.000Z' },
      { id: 'task_0008', title: '2月分 企画・台本作成（8本）', client_id: 'client_0001', lead_id: '', task_type: 'general', status: 'done', priority: 'medium', due_date: '2026-02-10', completed_date: '2026-02-10', assigned_to: 'ueda', notes: '', created_at: '2026-02-01T10:00:00.000Z', updated_at: '2026-02-10T10:00:00.000Z' },
      { id: 'task_0009', title: '2月分 撮影（8本）', client_id: 'client_0001', lead_id: '', task_type: 'shoot', status: 'done', priority: 'medium', due_date: '2026-02-15', completed_date: '2026-02-15', assigned_to: 'ueda', notes: '', created_at: '2026-02-01T10:00:00.000Z', updated_at: '2026-02-15T10:00:00.000Z' },
      { id: 'task_0010', title: 'Roenアカウント初期設定', client_id: 'client_0003', lead_id: '', task_type: 'general', status: 'done', priority: 'medium', due_date: '2026-02-05', completed_date: '2026-02-05', assigned_to: 'ueda', notes: '', created_at: '2026-01-20T10:00:00.000Z', updated_at: '2026-02-05T10:00:00.000Z' },
    ];
    this._saveAll('tasks', tasks);

    // --- Activities ---
    const activities = [
      // Lounge VELVET
      { id: 'activity_0001', entity_type: 'lead', entity_id: 'lead_0010', activity_type: 'meeting', summary: 'Instagram DMで商談日程を確定。2/25 15:00〜 六本木の店舗で初回商談。レギュラープランに興味あり。', next_date: '2026-02-25', next_action: '初回商談', created_by: 'ueda', created_at: '2026-02-22T18:30:00.000Z' },
      { id: 'activity_0002', entity_type: 'lead', entity_id: 'lead_0010', activity_type: 'dm', summary: '先方から返信あり。「TikTokの運用に興味がある。一度話を聞きたい」とのこと。', next_date: '', next_action: '', created_by: 'ueda', created_at: '2026-02-20T14:00:00.000Z' },
      { id: 'activity_0003', entity_type: 'lead', entity_id: 'lead_0010', activity_type: 'dm', summary: 'Instagramから初回営業DM送信。アカウント分析に基づく具体的な改善提案を添付。', next_date: '', next_action: '', created_by: 'ueda', created_at: '2026-02-18T10:00:00.000Z' },
      { id: 'activity_0004', entity_type: 'lead', entity_id: 'lead_0010', activity_type: 'note', summary: 'TikTokで発見。六本木エリアのラウンジバー。Instagram投稿は不定期、TikTokはアカウントあるが未運用。ポテンシャルあり。', next_date: '', next_action: '', created_by: 'ueda', created_at: '2026-02-15T00:00:00.000Z' },
      // ふららぼ
      { id: 'activity_0005', entity_type: 'client', entity_id: 'client_0001', activity_type: 'meeting', summary: '撮影日程の調整MTG。3/5に撮影確定。3月の企画案も共有済み。', next_date: '2026-03-01', next_action: '月次MTG', created_by: 'ueda', created_at: '2026-02-25T14:00:00.000Z' },
      { id: 'activity_0006', entity_type: 'client', entity_id: 'client_0001', activity_type: 'note', summary: '2月分の撮影完了（8本）。栗原さんに編集依頼済み。', next_date: '', next_action: '', created_by: 'ueda', created_at: '2026-02-15T00:00:00.000Z' },
      { id: 'activity_0007', entity_type: 'client', entity_id: 'client_0001', activity_type: 'meeting', summary: '1月分のレポート報告。TikTokフォロワー+320、エンゲージメント率4.2%。先方満足度高い。', next_date: '', next_action: '', created_by: 'ueda', created_at: '2026-02-03T15:00:00.000Z' },
      { id: 'activity_0008', entity_type: 'client', entity_id: 'client_0001', activity_type: 'email', summary: '月次レポート送付。1月の実績まとめと2月の企画案を添付。', next_date: '', next_action: '', created_by: 'ueda', created_at: '2026-01-28T00:00:00.000Z' },
      // Other leads
      { id: 'activity_0009', entity_type: 'lead', entity_id: 'lead_0001', activity_type: 'dm', summary: '初回DM送信。TikTok運用の提案', next_date: '2026-02-27', next_action: '返信確認', created_by: 'ueda', created_at: '2026-02-27T10:30:00.000Z' },
      { id: 'activity_0010', entity_type: 'lead', entity_id: 'lead_0012', activity_type: 'call', summary: '提案書送付後のフォロー電話。来週返答予定', next_date: '2026-02-25', next_action: 'フォローアップ電話', created_by: 'ueda', created_at: '2026-02-26T16:45:00.000Z' },
      { id: 'activity_0011', entity_type: 'lead', entity_id: 'lead_0005', activity_type: 'dm', summary: 'DM返信あり。興味ありとのこと', next_date: '2026-02-23', next_action: 'フォローDM送信', created_by: 'ueda', created_at: '2026-02-26T11:20:00.000Z' },
      { id: 'activity_0012', entity_type: 'client', entity_id: 'client_0002', activity_type: 'note', summary: '3月のリール撮影スケジュール確認', next_date: '', next_action: '', created_by: 'ueda', created_at: '2026-02-23T09:00:00.000Z' },
      // Additional for completeness
      { id: 'activity_0013', entity_type: 'lead', entity_id: 'lead_0008', activity_type: 'dm', summary: 'DM返信あり。興味あるが今月は忙しいとのこと。来月アポ打診予定。', next_date: '2026-02-26', next_action: 'アポ打診', created_by: 'ueda', created_at: '2026-02-21T10:00:00.000Z' },
      { id: 'activity_0014', entity_type: 'lead', entity_id: 'lead_0011', activity_type: 'meeting', summary: '初回商談実施。フルプランで検討中。来週提案書を準備する。', next_date: '2026-02-28', next_action: '提案書準備', created_by: 'ueda', created_at: '2026-02-24T10:00:00.000Z' },
    ];
    this._saveAll('activities', activities);
  },
};
