/* ========================================
   Opus CRM — Repository Layer
   Abstracts storage backend (localStorage now, Supabase later).
   All methods return Promises for consistent async API.
   ======================================== */

const Repository = {
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

  // --- In-memory cache ---
  _cache: {},

  // --- Default settings ---
  _defaultSettings: {
    profile_name: '上田 琉',
    profile_role: 'admin',
    profile_email: 'ueda-r@opus-net.net',
    profile_phone: '',
  },

  // --- Read (sync) ---
  getAllSync(key) {
    if (this._cache[key]) return this._cache[key];
    const raw = localStorage.getItem(this.KEYS[key]);
    const data = raw ? JSON.parse(raw) : [];
    this._cache[key] = data;
    return data;
  },

  // --- Read (async — for Supabase migration) ---
  async getAll(key) {
    return this.getAllSync(key);
  },

  // --- Write (sync) ---
  saveAllSync(key, data) {
    this._cache[key] = data;
    localStorage.setItem(this.KEYS[key], JSON.stringify(data));
  },

  // --- Write (async) ---
  async saveAll(key, data) {
    this.saveAllSync(key, data);
  },

  // --- ID generation (sync) ---
  generateIdSync(type) {
    const raw = localStorage.getItem(this.KEYS.counters);
    const counters = raw ? JSON.parse(raw) : {};
    const next = (counters[type] || 0) + 1;
    counters[type] = next;
    localStorage.setItem(this.KEYS.counters, JSON.stringify(counters));
    return `${type}_${String(next).padStart(4, '0')}`;
  },

  // --- ID generation (async) ---
  async generateId(type) {
    return this.generateIdSync(type);
  },

  // --- Settings (sync) ---
  getSettingsSync() {
    const raw = localStorage.getItem(this.KEYS.settings);
    return raw ? JSON.parse(raw) : { ...this._defaultSettings };
  },

  saveSettingsSync(data) {
    localStorage.setItem(this.KEYS.settings, JSON.stringify(data));
  },

  // --- Settings (async) ---
  async getSettings() {
    return this.getSettingsSync();
  },

  async saveSettings(data) {
    this.saveSettingsSync(data);
  },

  // --- Counters (sync) ---
  getCountersSync() {
    const raw = localStorage.getItem(this.KEYS.counters);
    return raw ? JSON.parse(raw) : {};
  },

  saveCountersSync(counters) {
    localStorage.setItem(this.KEYS.counters, JSON.stringify(counters));
  },

  // --- Initialization check ---
  isInitialized() {
    return !!localStorage.getItem(this.KEYS.initialized);
  },

  markInitialized() {
    localStorage.setItem(this.KEYS.initialized, 'true');
  },

  // --- Reset ---
  resetAll() {
    Object.values(this.KEYS).forEach(key => localStorage.removeItem(key));
    this._cache = {};
  },

  // --- Cache invalidation ---
  clearCache() {
    this._cache = {};
  },
};
