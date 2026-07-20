const urlParams = new URLSearchParams(window.location.search);
const clientCode = urlParams.get('code'); // جلب كود العميل من الرابط
let clientName = '';

function escapeHTML(str) { return String(str).replace(/[&<>"']/g, tag => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[tag])); }
function safe(v, fallback = '-') { return escapeHTML(v && String(v).trim() ? String(v).trim() : fallback); }

function goBackAndFocus() {
  if (clientCode) sessionStorage.setItem('last_viewed_client_code', clientCode);
  window.location.href = 'customers.html';
}

// 1. جلب بيانات العميل الأساسية من قاعدة البيانات عند تحميل الصفحة
async function loadClientData() {
  if (!clientCode) return;
  
  try {
    // إرسال طلب للسيرفر لجلب بيانات هذا العميل بناءً على الكود الخاص به
    const response = await fetch(`/api/customers/${clientCode}`);
    if (!response.ok) throw new Error('فشل في جلب بيانات العميل');
    
    const client = await response.json();
    if (!client) {
      document.getElementById('c-name').innerText = 'غير موجود';
      return;
    }
    
    clientName = client.company || client.name || '';
    document.title = `${safe(clientName)} | ASGate`;
    document.getElementById('c-name').innerText = safe(clientName);
    
    // ربط البيانات القادمة من الـ MongoDB بالـ HTML الخاص بك
    document.getElementById('c-cr1').innerText = safe(client.cr1 || client.record, '0000000');
    document.getElementById('c-cr2').innerText = safe(client.cr2);
    document.getElementById('c-city').innerText = safe(client.city || client.address);
    document.getElementById('c-district').innerText = safe(client.district);
    document.getElementById('c-source').innerText = safe(client.source);
    document.getElementById('c-owner').innerText = safe(client.owner);
    
    document.getElementById('internalNote').value = client.internalNote || '';
    document.getElementById('importantNote').value = client.importantNote || '';
    
    // بعد تحميل العميل، نقوم بجلب طلباته وفريق العمل المرتبط به
    renderOrders();
    renderManagers(client.managers);

  } catch (err) {
    console.error("خطأ أثناء الاتصال بالسيرفر:", err);
    document.getElementById('c-name').innerText = 'خطأ في التحميل';
  }
}

function showTab(tab) {
  ['overview', 'orders', 'team', 'notes'].forEach(t => {
    const el = document.getElementById(`${t}Tab`);
    if (el) el.style.display = t === tab ? '' : 'none';
  });
  document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
  // يمكنك إضافة كود هنا لتفعيل الزر المضغوط لتغيير خلفيته
}

// 2. جلب طلبات/زيارات العميل الحقيقية من الـ API الخاص بالزيارات
async function renderOrders() {
  try {
    // استدعاء الـ API الذي يفلتر الزيارات بناءً على اسم الشركة
    const response = await fetch(`/api/visits?company=${encodeURIComponent(clientName)}`);
    const visits = await response.json();
    
    const rows = visits.map(v => `
      <tr>
        <td>${escapeHTML(v.visitDate || '-')}</td>
        <td>${escapeHTML(v.curServ || '-')}</td>
        <td><span class="badge info">${escapeHTML(v.status || 'غير محدد')}</span></td>
        <td>${escapeHTML(v.notes || 'لا توجد ملاحظات')}</td>
      </tr>
    `).join('');
    
    document.getElementById('contentBody').innerHTML = rows || '<tr><td colspan="4" class="empty-state">لا توجد طلبات بعد.</td></tr>';
  } catch (err) {
    console.error("خطأ في جلب الطلبات:", err);
  }
}

// 3. عرض مسؤولي المتابعة القادمين مع كائن العميل من قاعدة البيانات
function renderManagers(managers = []) {
  document.getElementById('managerTableBody').innerHTML = managers.map(m => `
    <tr>
      <td>${escapeHTML(m.name || '-')}</td>
      <td>${escapeHTML(m.mobile || '-')}</td>
      <td>${escapeHTML(m.email || '-')}</td>
      <td>${m.primary ? '<span class="badge success">أساسي</span>' : '<span class="badge warning">ثانوي</span>'}</td>
      <td>${escapeHTML(m.addedAt || '-')}</td>
      <td><button class="btn btn-soft" onclick="removeManager('${escapeHTML(m._id || m.name)}')">حذف</button></td>
    </tr>
  `).join('') || '<tr><td colspan="6" class="empty-state">لا يوجد أفراد متابعة بعد.</td></tr>';
}

// 4. حفظ الملاحظات مباشرة في قاعدة البيانات عبر طلب PUT أو POST للسيرفر
async function saveNotes() {
  const internalNote = document.getElementById('internalNote').value.trim();
  const importantNote = document.getElementById('importantNote').value.trim();
  
  try {
    const response = await fetch(`/api/customers/${clientCode}/notes`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ internalNote, importantNote })
    });
    
    if (response.ok) {
      alert('تم حفظ الملاحظات في قاعدة البيانات بنجاح.');
    } else {
      alert('فشل حفظ الملاحظات على السيرفر.');
    }
  } catch (err) {
    console.error("خطأ في الحفظ:", err);
  }
}

// باقي دوال الإضافة والحذف سيتم تحويلها لـ fetch لاحقاً لتعديل الـ Array في MongoDB بنفس الطريقة
function clearNotes() { document.getElementById('internalNote').value = ''; document.getElementById('importantNote').value = ''; }
function markImportant() { const el = document.getElementById('importantNote'); el.value = el.value || 'عميل مهم'; el.focus(); }
function addOrder() { alert('سيتم ربطه بـ API إضافة الطلبات الجديد الخاص بك.'); }
