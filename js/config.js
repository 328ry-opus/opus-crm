/* ========================================
   Opus CRM — Config & Constants
   ======================================== */

const CRM = {
  // Lead pipeline stages
  LEAD_STAGES: [
    { value: 'list-added', label: 'リスト追加', color: '#64748b' },
    { value: 'dm-sent', label: 'DM送信済', color: '#0ea5e9' },
    { value: 'replied', label: '返信あり', color: '#8b5cf6' },
    { value: 'appointment-set', label: 'アポ確定', color: '#f59e0b' },
    { value: 'in-meeting', label: '商談中', color: '#f97316' },
    { value: 'proposal-sent', label: '提案済', color: '#2563eb' },
    { value: 'won', label: '成約', color: '#16a34a' },
    { value: 'lost', label: '失注', color: '#94a3b8' },
  ],

  // Task statuses
  TASK_STATUSES: [
    { value: 'todo', label: 'Todo' },
    { value: 'in-progress', label: '進行中' },
    { value: 'done', label: '完了' },
  ],

  // Business types
  BUSINESS_TYPES: [
    { value: 'sns', label: 'SNS運用' },
    { value: 'web', label: 'Web制作' },
    { value: 'both', label: 'SNS + Web' },
  ],

  // Store types
  STORE_TYPES: [
    { value: 'bar', label: 'バー' },
    { value: 'concept-cafe', label: 'コンカフェ' },
    { value: 'gym', label: 'パーソナルジム' },
    { value: 'car-dealer', label: '中古車販売' },
    { value: 'seikotsu', label: '整骨院' },
    { value: 'other', label: 'その他' },
  ],

  // Sources
  SOURCES: [
    { value: 'dm', label: 'DM' },
    { value: 'phone', label: '電話' },
    { value: 'referral', label: '紹介' },
    { value: 'form', label: 'フォーム' },
    { value: 'other', label: 'その他' },
  ],

  // SNS Plans
  PLANS: [
    { value: 'trial', label: '体験パッケージ', fee: 10000 },
    { value: 'light', label: 'ライトプラン', fee: 150000 },
    { value: 'regular', label: 'レギュラープラン', fee: 300000 },
    { value: 'full', label: 'フルプラン', fee: 500000 },
    { value: 'support', label: 'サポート/保守', fee: 30000 },
    { value: 'webcm', label: 'WEB CM制作', fee: null },
  ],

  // Task types
  TASK_TYPES: [
    { value: 'general', label: '汎用' },
    { value: 'shoot', label: '撮影' },
    { value: 'edit', label: '編集' },
    { value: 'post', label: '投稿' },
    { value: 'report', label: 'レポート' },
    { value: 'meeting', label: 'MTG' },
    { value: 'design', label: 'デザイン' },
    { value: 'build', label: '構築' },
    { value: 'review', label: 'レビュー' },
    { value: 'delivery', label: '納品' },
  ],

  // Priority levels
  PRIORITIES: [
    { value: 'low', label: '低', cssClass: 'low' },
    { value: 'medium', label: '中', cssClass: 'medium' },
    { value: 'high', label: '高', cssClass: 'high' },
    { value: 'urgent', label: '緊急', cssClass: 'high' },
  ],

  // Activity types
  ACTIVITY_TYPES: [
    { value: 'dm', label: 'DM', icon: 'dm' },
    { value: 'call', label: '電話', icon: 'call' },
    { value: 'email', label: 'メール', icon: 'email' },
    { value: 'meeting', label: 'MTG', icon: 'meeting' },
    { value: 'line', label: 'LINE', icon: 'dm' },
    { value: 'note', label: 'メモ', icon: 'note' },
  ],

  // Client statuses
  CLIENT_STATUSES: [
    { value: 'active', label: '契約中', badge: 'success' },
    { value: 'paused', label: '休止中', badge: 'warning' },
    { value: 'cancelled', label: '解約済', badge: 'default' },
  ],

  // Assignees (static for now)
  ASSIGNEES: [
    { value: 'ueda', label: '上田', initial: '上' },
    { value: 'kurihara', label: '栗原', initial: '栗' },
  ],
};

// Date utility
function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function isOverdue(dateStr) {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  return d < today;
}

function isToday(dateStr) {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const today = new Date();
  return d.toDateString() === today.toDateString();
}

function formatCurrency(amount) {
  if (!amount) return '';
  return '¥' + amount.toLocaleString();
}

// --- Custom item helpers (merge built-in + user-added from Settings) ---
function _getCustom(key) {
  if (typeof Store === 'undefined') return [];
  const settings = Store.getSettings();
  return settings[key] || [];
}

function getAllPlans() {
  return [...CRM.PLANS, ..._getCustom('custom_plans')];
}

function getAllStoreTypes() {
  return [...CRM.STORE_TYPES, ..._getCustom('custom_store_types')];
}

function getAllSources() {
  return [...CRM.SOURCES, ..._getCustom('custom_sources')];
}

function getAllAssignees() {
  const custom = _getCustom('custom_members');
  const extras = custom.map(m => ({
    value: m.name.toLowerCase().replace(/\s+/g, '_'),
    label: m.name,
    initial: m.name.charAt(0),
  }));
  return [...CRM.ASSIGNEES, ...extras];
}
