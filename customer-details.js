const urlParams = new URLSearchParams(window.location.search);
const clientCode = urlParams.get('code');
let clientName = '';

const STORAGE_KEY = 'asgate_customers_final_v2';
const VISITS_KEY = 'asgate_visits_final_v21';

function escapeHTML(str) { return String(str).replace(/[&<>"']/g, tag => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[tag])); }
function safe(v, fallback = '-') { return escapeHTML(v && String(v).trim() ? String(v).trim() : fallback); }

function goBackAndFocus() {
  if (clientCode) sessionStorage.setItem('last_viewed_client_code', clientCode);
  window.location.href = 'customers.html';
}

function getTodayDateFormatted() {
  const d = new Date();
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

function loadClientData() {
  if (!clientCode) return;
  const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  const client = data.find(c => c.code === clientCode);
  if (!client) {
    document.getElementById('c-name').innerText = 'غير موجود';
    return;
  }
  clientName = client.comp || '';
  document.title = `${safe(client.comp)} | ASGate`;
  document.getElementById('c-name').innerText = safe(client.comp);
  document.getElementById('c-cr1').innerText = safe(client.cr1 || client.cr || client.record, '0000000');
  document.getElementById('c-cr2').innerText = safe(client.cr2);
  document.getElementById('c-city').innerText = safe(client.city || client.address);
  document.getElementById('c-district').innerText = safe(client.district);
  document.getElementById('c-source').innerText = safe(client.classification || client.source);
  document.getElementById('c-owner').innerText = safe(client.owner);
  document.getElementById('internalNote').value = client.internalNote || '';
  document.getElementById('importantNote').value = client.importantNote || '';
  renderOrders();
  renderManagers();
}

function showTab(tab) {
  ['overview', 'orders', 'team', 'notes'].forEach(t => document.getElementById(`${t}Tab`).style.display = t === tab ? '' : 'none');
  document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
  // تحديث الزر النشط يدوياً
}

function renderOrders() {
  const visits = JSON.parse(localStorage.getItem(VISITS_KEY) || '[]');
  const rows = visits.filter(v => (v.comp || '').trim() === clientName).map(v => `
    <tr>
      <td>${escapeHTML(v.visitDate || '-')}</td>
      <td>${escapeHTML(v.curServ || '-')}</td>
      <td><span class="badge info">${escapeHTML(v.status || 'غير محدد')}</span></td>
      <td>${escapeHTML(v.notes || 'لا توجد ملاحظات')}</td>
    </tr>
  `).join('');
  document.getElementById('contentBody').innerHTML = rows || '<tr><td colspan="4" class="empty-state">لا توجد طلبات بعد.</td></tr>';
}

function renderManagers() {
  const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  const client = data.find(c => c.code === clientCode);
  const managers = client && Array.isArray(client.managers) ? client.managers : [];
  document.getElementById('managerTableBody').innerHTML = managers.map(m => `
    <tr>
      <td>${escapeHTML(m.name || '-')}</td>
      <td>${escapeHTML(m.mobile || '-')}</td>
      <td>${escapeHTML(m.email || '-')}</td>
      <td>${m.primary ? '<span class="badge success">أساسي</span>' : '<span class="badge warning">ثانوي</span>'}</td>
      <td>${escapeHTML(m.addedAt || getTodayDateFormatted())}</td>
      <td><button class="btn btn-soft" onclick="removeManager('${escapeHTML(m.name || '')}')">حذف</button></td>
    </tr>
  `).join('') || '<tr><td colspan="6" class="empty-state">لا يوجد أفراد متابعة بعد.</td></tr>';
}

function saveNotes() {
  const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  const idx = data.findIndex(c => c.code === clientCode);
  if (idx === -1) return;
  data[idx].internalNote = document.getElementById('internalNote').value.trim();
  data[idx].importantNote = document.getElementById('importantNote').value.trim();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  alert('تم حفظ الملاحظات.');
}

function addManager() {
  const name = prompt('اسم المسؤول:');
  if (!name) return;
  const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  const idx = data.findIndex(c => c.code === clientCode);
  if (idx === -1) return;
  if (!Array.isArray(data[idx].managers)) data[idx].managers = [];
  data[idx].managers.push({ name, mobile: prompt('الجوال:')||'', email: prompt('البريد:')||'', primary: false, addedAt: getTodayDateFormatted() });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  renderManagers();
}

function removeManager(name) {
  const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  const idx = data.findIndex(c => c.code === clientCode);
  if (idx !== -1 && Array.isArray(data[idx].managers)) {
    data[idx].managers = data[idx].managers.filter(m => m.name !== name);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    renderManagers();
  }
}
function clearNotes() { document.getElementById('internalNote').value = ''; document.getElementById('importantNote').value = ''; }
function markImportant() { const el = document.getElementById('importantNote'); el.value = el.value || 'عميل مهم'; el.focus(); }
function addOrder() { alert('يمكن ربط هذا الجزء بحفظ الطلبات لاحقًا.'); }