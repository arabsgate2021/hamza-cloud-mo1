/**
 * إعدادات الاتصال بالسيرفر
 * يمكنك تعديل API_BASE_URL حسب مسار السيرفر الخاص بك
 * مثال: 'http://localhost:5000/api' أو '/api'
 */
const API_BASE_URL = '/api';

const tableBody = document.getElementById('tableBody');
const logsBody = document.getElementById('activityList'); 
const totalCustomers = document.getElementById('stat-total'); 
const monthCustomers = document.getElementById('stat-month'); 
const todayCustomers = document.getElementById('stat-today'); 
const searchInput = document.getElementById('searchInput');

let searchTimeout;
let cachedCustomers = []; // حفظ نسخة مؤقتة للبحث السريع

/* =========================================
   دوال الاتصال بالسيرفر (API Requests)
========================================= */

async function fetchCustomers() {
  try {
    const res = await fetch(`${API_BASE_URL}/customers`);
    if (!res.ok) throw new Error('فشل جلب بيانات العملاء من السيرفر');
    const data = await res.json();
    cachedCustomers = data;
    return data;
  } catch (err) {
    console.error(err);
    Swal.fire('خطأ', 'تعذر الاتصال بالسيرفر لجلب العملاء', 'error');
    return [];
  }
}

async function fetchLogs() {
  try {
    const res = await fetch(`${API_BASE_URL}/logs`);
    if (!res.ok) throw new Error('فشل جلب سجل النشاط من السيرفر');
    return await res.json();
  } catch (err) {
    console.error(err);
    return [];
  }
}

/* =========================================
   دوال التنسيق والمساعدة
========================================= */

function normalizeText(v) {
  return String(v || '').toLowerCase().trim();
}

function escapeHTML(str) {
  return String(str || '').replace(/[&<>'"]/g, tag => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  }[tag]));
}

function badgeClass(status) {
  const s = normalizeText(status);
  if (s.includes('جديد') || s.includes('مفتوح')) return 'status-active';
  if (s.includes('نشط') || s.includes('مكتمل') || s.includes('تم')) return 'status-active';
  if (s.includes('متابعة')) return 'status-med';
  if (s.includes('مغلق') || s.includes('ملغي')) return 'status-inactive';
  return 'status-small';
}

function classBadgeColor(classification) {
  const c = normalizeText(classification);
  if (c.includes('حكومي')) return 'status-gov';
  if (c.includes('هام')) return 'status-important';
  if (c.includes('متوسط')) return 'status-med';
  if (c.includes('صغير')) return 'status-small';
  return 'status-small';
}

function safe(value, fallback = '-') {
  const val = value && String(value).trim() ? String(value).trim() : fallback;
  return escapeHTML(val);
}

function getDisplayManager(v) {
  if (v.delegatePriority && v.delegateName) return safe(v.delegateName);
  return safe(v.mgr);
}

function getDisplayMobile(v) {
  if (v.delegatePriority && v.delegateMob) return safe(v.delegateMob);
  return safe(v.mob);
}

function getDisplayEmail(v) {
  if (v.delegatePriority && v.delegateEmail) return safe(v.delegateEmail);
  return safe(v.email);
}

/* =========================================
   دوال العرض والواجهة (DOM Rendering)
========================================= */

function renderCustomers(list) {
  if (!tableBody) return;
  tableBody.innerHTML = '';

  if (!list.length) {
    tableBody.innerHTML = `<tr><td colspan="12" style="text-align:center;padding:28px;color:#6b7280;">لا توجد بيانات لعرضها</td></tr>`;
    return;
  }

  list.forEach((v, index) => {
    const classification = safe(v.classification || v.source || 'غير محدد');
    const tr = document.createElement('tr');
    tr.className = 'main-row';
    
    tr.innerHTML = `
      <td><input type="checkbox" class="select-check" data-code="${safe(v.code)}" data-index="${index}"></td>
      <td><a href="#" onclick="event.preventDefault(); window.location.href='customer-details.html?code=${v.code}'" class="code-link">${safe(v.code, '00001')}</a></td>
      <td><strong>${safe(v.comp)}</strong></td>
      <td>${safe(v.address || v.city)}</td>
      <td>${getDisplayManager(v)}</td>
      <td>
        <div class="phone-cell-container">
           ${getDisplayMobile(v)}
           <a href="https://wa.me/${getDisplayMobile(v).replace(/\D/g,'')}" target="_blank" class="whatsapp-icon-btn" title="مراسلة واتساب" onclick="event.stopPropagation()"><i class="fab fa-whatsapp"></i></a>
        </div>
      </td>
      <td>${getDisplayEmail(v)}</td>
      <td>${safe(v.creationDate || v.date)}</td>
      <td><span class="${classBadgeColor(classification)}" style="padding: 2px 8px; border-radius: 4px;">${classification}</span></td>
      <td><div class="notes-preview" onclick="openNoteModal(${index}); event.stopPropagation()">${safe(v.notesText || v.lastNote || 'اضغط لإضافة ملاحظة')}</div></td>
      <td><span class="${badgeClass(v.status)}" style="padding: 2px 8px; border-radius: 4px;">${safe(v.status, 'جديد')}</span></td>
      <td>${safe(v.owner)}</td>
    `;
    tableBody.appendChild(tr);
  });
}

function renderLogs(list) {
  if (!logsBody) return;
  logsBody.innerHTML = '';

  if (!list.length) {
    logsBody.innerHTML = `<div style="text-align:center;padding:28px;color:#6b7280;">لا يوجد سجل نشاط بعد</div>`;
    return;
  }

  list.slice(0, 20).forEach(log => {
    logsBody.innerHTML += `
      <div class="log-entry">
        <span class="log-timestamp"><i class="far fa-clock"></i> ${safe(log.date)}</span>
        <span class="log-divider">|</span>
        <span class="log-badge-user"><i class="fas fa-user"></i> ${safe(log.client)}</span>
        <span class="log-action"><strong>${safe(log.action)}:</strong> ${safe(log.notes)}</span>
      </div>
    `;
  });
}

function updateStats(list) {
  const now = new Date();
  const thisMonth = now.getMonth();
  const thisYear = now.getFullYear();
  const today = now.toISOString().slice(0, 10);

  if (totalCustomers) totalCustomers.textContent = list.length;
  if (monthCustomers) monthCustomers.textContent = list.filter(v => {
    const dStr = v.creationDate || v.date || '';
    if (dStr.includes('/')) {
        const parts = dStr.split('/');
        return parseInt(parts[1]) - 1 === thisMonth && parseInt(parts[2]) === thisYear;
    }
    const d = new Date(dStr);
    return !isNaN(d) && d.getMonth() === thisMonth && d.getFullYear() === thisYear;
  }).length;
  
  if (todayCustomers) todayCustomers.textContent = list.filter(v => {
    const d = String(v.creationDate || v.date || '');
    return d.includes(today) || d.includes(`${now.getDate()}`) || d.includes(`${now.getMonth() + 1}`);
  }).length;
}

function debouncedFilterTable() {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    const q = normalizeText(searchInput.value);
    const filtered = cachedCustomers.filter(v => {
      const haystack = [
        v.code, v.comp, v.address, v.city, v.mgr, v.delegateName,
        v.mob, v.delegateMob, v.email, v.delegateEmail, v.status,
        v.owner, v.classification, v.notesText, v.lastNote
      ].map(normalizeText).join(' ');
      return haystack.includes(q);
    });
    renderCustomers(filtered);
  }, 300);
}

/* =========================================
   دوال إضافة عميل جديد بالسيرفر
========================================= */

function openAddCustomerModal() {
  document.getElementById('addCustomerModal').style.display = 'flex';
  
  // توليد كود مبدئي وتاريخ اليوم
  const code = 'CUST-' + Math.floor(1000 + Math.random() * 9000);
  document.getElementById('addCode').value = code;
  
  const d = new Date();
  const todayStr = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  document.getElementById('addDate').value = todayStr;
  
  ['addComp', 'addCity', 'addAddress', 'addMainCR', 'addSubCR', 'addManager', 'addMob', 'addEmail', 'addCreator'].forEach(id => {
     document.getElementById(id).value = '';
  });
}

function closeAddCustomerModal() {
  document.getElementById('addCustomerModal').style.display = 'none';
}

async function saveNewCustomer() {
  const comp = document.getElementById('addComp').value;
  if (!comp.trim()) {
    Swal.fire('تنبيه', 'يرجى إدخال اسم الشركة', 'warning');
    return;
  }

  const newCust = {
    code: document.getElementById('addCode').value,
    date: document.getElementById('addDate').value,
    creationDate: document.getElementById('addDate').value,
    comp: comp,
    city: document.getElementById('addCity').value,
    address: document.getElementById('addAddress').value,
    cr: document.getElementById('addMainCR').value,
    cr1: document.getElementById('addMainCR').value,
    cr2: document.getElementById('addSubCR').value,
    mgr: document.getElementById('addManager').value,
    mob: document.getElementById('addMob').value,
    email: document.getElementById('addEmail').value,
    owner: document.getElementById('addCreator').value,
    status: 'جديد',
    classification: 'صغير',
    notesText: ''
  };

  try {
    const res = await fetch(`${API_BASE_URL}/customers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newCust)
    });

    if (!res.ok) throw new Error('فشل حفظ العميل في السيرفر');

    closeAddCustomerModal();
    Swal.fire('نجاح', 'تم إضافة العميل بنجاح', 'success');
    
    // إعادة تحميل البيانات من السيرفر للتحديث
    await loadSavedData();
  } catch (err) {
    console.error(err);
    Swal.fire('خطأ', 'حدث خطأ أثناء حفظ العميل في السيرفر', 'error');
  }
}

/* =========================================
   دوال الملاحظات عبر السيرفر
========================================= */

let currentNoteIndex = -1;

function openNoteModal(index) {
    currentNoteIndex = index;
    document.getElementById('noteModal').style.display = 'flex';
    const customer = cachedCustomers[index];
    document.getElementById('modalTextArea').value = '';
    
    const historyLog = document.getElementById('historyLog');
    if (customer && customer.notesHistory && customer.notesHistory.length) {
        historyLog.innerHTML = customer.notesHistory.map(n => `<div style="margin-bottom:8px; padding-bottom:8px; border-bottom:1px dashed #cbd5e1; font-size:11px;"><strong>${n.date}</strong>: ${n.text}</div>`).join('');
    } else {
        historyLog.innerHTML = '<div style="color:#64748b; font-size:11px; text-align:center;">لا يوجد سجل ملاحظات سابق.</div>';
    }
}

function closeNote() {
    document.getElementById('noteModal').style.display = 'none';
    currentNoteIndex = -1;
}

async function saveNote() {
    if (currentNoteIndex === -1) return;
    const text = document.getElementById('modalTextArea').value;
    if (!text.trim()) {
        closeNote();
        return;
    }

    const customer = cachedCustomers[currentNoteIndex];
    const d = new Date();
    const dateStr = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;

    try {
        const res = await fetch(`${API_BASE_URL}/customers/${customer.code}/notes`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ date: dateStr, text: text })
        });

        if (!res.ok) throw new Error('فشل حفظ الملاحظة');

        closeNote();
        Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'تم حفظ الملاحظة', showConfirmButton: false, timer: 1500 });
        
        await loadSavedData();
    } catch (err) {
        console.error(err);
        Swal.fire('خطأ', 'تعذر حفظ الملاحظة بالسيرفر', 'error');
    }
}

/* =========================================
   الإجراءات الجماعية
========================================= */

function toggleDropdown(event, el) {
    event.stopPropagation();
    const menu = el.nextElementSibling;
    document.querySelectorAll('.dropdown-menu').forEach(m => { if(m !== menu) m.classList.remove('show'); });
    menu.classList.toggle('show');
}

document.addEventListener('click', () => {
    document.querySelectorAll('.dropdown-menu').forEach(m => m.classList.remove('show'));
});

function toggleAllCheckboxes(source) {
    const checkboxes = document.querySelectorAll('.select-check');
    checkboxes.forEach(cb => cb.checked = source.checked);
}

async function handleBulkAction(action) {
    const selectedBoxes = Array.from(document.querySelectorAll('.select-check:checked'));
    if (!selectedBoxes.length) {
        Swal.fire('تنبيه', 'يرجى تحديد عميل واحد على الأقل', 'info');
        return;
    }

    const selectedCodes = selectedBoxes.map(cb => cb.getAttribute('data-code'));
    
    if (action === 'حذف') {
        Swal.fire({
            title: 'هل أنت متأكد؟',
            text: "لن تتمكن من التراجع عن هذا الإجراء!",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#cbd5e1',
            confirmButtonText: 'نعم، احذف',
            cancelButtonText: 'إلغاء'
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    const res = await fetch(`${API_BASE_URL}/customers/bulk-delete`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ codes: selectedCodes })
                    });

                    if (!res.ok) throw new Error('فشل الحذف من السيرفر');

                    Swal.fire('تم الحذف!', 'تم حذف العملاء المحددين بنجاح.', 'success');
                    await loadSavedData();
                } catch (err) {
                    console.error(err);
                    Swal.fire('خطأ', 'حدث خطأ أثناء إجراء الحذف بالسيرفر', 'error');
                }
            }
        });
    } else {
        Swal.fire('معلومة', `إجراء ${action} غير متاح حالياً.`, 'info');
    }
}

function toggleLogExpansion() {
    const section = document.getElementById('activityLogSection');
    const icon = document.querySelector('#toggleExpandBtn i');
    if (section.classList.contains('expanded')) {
        section.classList.remove('expanded');
        icon.classList.remove('fa-compress-alt');
        icon.classList.add('fa-expand-alt');
    } else {
        section.classList.add('expanded');
        icon.classList.remove('fa-expand-alt');
        icon.classList.add('fa-compress-alt');
    }
}

/* =========================================
   تحميل البيانات عند فتح الصفحة
========================================= */

async function loadSavedData() {
  const [customers, logs] = await Promise.all([
    fetchCustomers(),
    fetchLogs()
  ]);

  updateStats(customers);
  renderCustomers(customers);
  renderLogs(logs);

  if (searchInput) {
    searchInput.removeEventListener('input', debouncedFilterTable);
    searchInput.addEventListener('input', debouncedFilterTable);
  }
}

window.loadSavedData = loadSavedData;
document.addEventListener('DOMContentLoaded', loadSavedData);