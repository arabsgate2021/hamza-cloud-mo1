// 1. استدعاء قاعدة البيانات من ملف الإعدادات المستقل
import { db } from './firebase-config.js'; 

// 2. استدعاء دوال الفايربيس المطلوبة للعمليات
import { 
  collection, addDoc, getDocs, doc, 
  updateDoc, deleteDoc, query, orderBy, limit, arrayUnion 
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

// عناصر واجهة المستخدم (DOM Elements)
const tableBody = document.getElementById('tableBody');
const logsBody = document.getElementById('activityList'); 
const totalCustomers = document.getElementById('stat-total'); 
const monthCustomers = document.getElementById('stat-month'); 
const todayCustomers = document.getElementById('stat-today'); 
const searchInput = document.getElementById('searchInput');

let searchTimeout;
let allCustomersCache = []; // مصفوفة محلية لتخزين البيانات المسترجعة للسرعة والتصفية

// دالتان مساعدتان للتعامل مع النصوص والأمان
function normalizeText(v) {
  return String(v || '').toLowerCase().trim();
}

function escapeHTML(str) {
  return str.replace(/[&<>'"]/g, tag => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  }[tag]));
}

function badgeClass(status) {
  const s = normalizeText(status);
  if (s.includes('جديد') || s.includes('مفتوح') || s.includes('نشط') || s.includes('مكتمل') || s.includes('تم')) return 'status-active';
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

// عرض العملاء في الجدول
function renderCustomers(list) {
  if (!tableBody) return;
  tableBody.innerHTML = '';

  if (!list.length) {
    tableBody.innerHTML = `<tr><td colspan="12" style="text-align:center;padding:28px;color:#6b7280;">لا توجد بيانات لعرضها</td></tr>`;
    return;
  }

  list.forEach((v) => {
    const classification = safe(v.classification || v.source || 'غير محدد');
    const tr = document.createElement('tr');
    tr.className = 'main-row';
    
    tr.innerHTML = `
      <td><input type="checkbox" class="select-check" data-id="${v.id}"></td>
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
      <td><div class="notes-preview" onclick="openNoteModal('${v.id}'); event.stopPropagation()">${safe(v.notesText || v.lastNote || 'اضغط لإضافة ملاحظة')}</div></td>
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

  list.forEach(log => {
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

  if(totalCustomers) totalCustomers.textContent = list.length;
  
  if(monthCustomers) monthCustomers.textContent = list.filter(v => {
    const dStr = v.creationDate || v.date || '';
    if(dStr.includes('/')) {
        const parts = dStr.split('/');
        return parseInt(parts[1])-1 === thisMonth && parseInt(parts[2]) === thisYear;
    }
    const d = new Date(dStr);
    return !isNaN(d) && d.getMonth() === thisMonth && d.getFullYear() === thisYear;
  }).length;
  
  if(todayCustomers) todayCustomers.textContent = list.filter(v => {
    const d = String(v.creationDate || v.date || '');
    return d.includes(today) || d.includes(`${now.getDate()}`) || d.includes(`${now.getMonth() + 1}`);
  }).length;
}

function debouncedFilterTable() {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    const q = normalizeText(searchInput.value);
    const filtered = allCustomersCache.filter(v => {
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

function openAddCustomerModal() {
  const modal = document.getElementById('addCustomerModal');
  if(modal) modal.style.display = 'flex';
  
  const code = 'CUST-' + Math.floor(1000 + Math.random() * 9000);
  const codeEl = document.getElementById('addCode');
  if(codeEl) codeEl.value = code;
  
  const d = new Date();
  const todayStr = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  const dateEl = document.getElementById('addDate');
  if(dateEl) dateEl.value = todayStr;
  
  ['addComp', 'addCity', 'addAddress', 'addMainCR', 'addSubCR', 'addManager', 'addMob', 'addEmail', 'addCreator'].forEach(id => {
     const el = document.getElementById(id);
     if(el) el.value = '';
  });
}

function closeAddCustomerModal() {
  const modal = document.getElementById('addCustomerModal');
  if(modal) modal.style.display = 'none';
}

async function saveNewCustomer() {
  const comp = document.getElementById('addComp').value;
  if(!comp.trim()) {
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
    notesText: '',
    notesHistory: [],
    createdAtTimestamp: new Date()
  };

  try {
    await addDoc(collection(db, "customers"), newCust);

    await addDoc(collection(db, "logs"), {
      date: document.getElementById('addDate').value,
      client: comp,
      action: 'إضافة عميل',
      notes: 'تمت إضافة العميل جديد',
      createdAtTimestamp: new Date()
    });

    closeAddCustomerModal();
    Swal.fire('نجاح', 'تم إضافة العميل بنجاح في قاعدة البيانات', 'success');
    
    await loadSavedData();
  } catch(error) {
    console.error("Error saving document to Firebase: ", error);
    Swal.fire('خطأ', 'فشل في حفظ البيانات، يرجى التحقق من القواعد أو الاتصال', 'error');
  }
}

let currentNoteId = "";
function openNoteModal(id) {
    currentNoteId = id;
    const modal = document.getElementById('noteModal');
    if(modal) modal.style.display = 'flex';
    
    const customer = allCustomersCache.find(v => v.id === id);
    const textarea = document.getElementById('modalTextArea');
    if(textarea) textarea.value = '';
    
    const historyLog = document.getElementById('historyLog');
    if(historyLog) {
        if (customer && customer.notesHistory && customer.notesHistory.length) {
            historyLog.innerHTML = customer.notesHistory.map(n => `<div style="margin-bottom:8px; padding-bottom:8px; border-bottom:1px dashed #cbd5e1; font-size:11px;"><strong>${n.date}</strong>: ${n.text}</div>`).join('');
        } else {
            historyLog.innerHTML = '<div style="color:#64748b; font-size:11px; text-align:center;">لا يوجد سجل ملاحظات سابق.</div>';
        }
    }
}

function closeNote() {
    const modal = document.getElementById('noteModal');
    if(modal) modal.style.display = 'none';
    currentNoteId = "";
}

async function saveNote() {
    if (!currentNoteId) return;
    const textarea = document.getElementById('modalTextArea');
    const text = textarea ? textarea.value : '';
    if (!text.trim()) {
        closeNote();
        return;
    }

    const d = new Date();
    const dateStr = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
    const customer = allCustomersCache.find(v => v.id === currentNoteId);

    try {
        const customerDocRef = doc(db, "customers", currentNoteId);
        
        await updateDoc(customerDocRef, {
            notesText: text,
            notesHistory: arrayUnion({ date: dateStr, text: text })
        });

        await addDoc(collection(db, "logs"), {
            date: dateStr,
            client: customer ? customer.comp : "غير معروف",
            action: 'إضافة ملاحظة',
            notes: text,
            createdAtTimestamp: new Date()
        });

        closeNote();
        Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'تم حفظ الملاحظة', showConfirmButton: false, timer: 1500 });
        await loadSavedData();
    } catch(error) {
        console.error("Error updating notes in Firebase: ", error);
        Swal.fire('خطأ', 'فشل في تحديث الملاحظات', 'error');
    }
}

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
    const selectedIds = Array.from(document.querySelectorAll('.select-check:checked')).map(cb => cb.getAttribute('data-id'));
    if (!selectedIds.length) {
        Swal.fire('تنبيه', 'يرجى تحديد عميل واحد على الأقل', 'info');
        return;
    }
    
    if (action === 'حذف') {
        Swal.fire({
            title: 'هل أنت متأكد؟',
            text: "سيتم حذف المحددين نهائياً من قاعدة بيانات السيرفر ولن تتمكن من الاسترجاع!",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#cbd5e1',
            confirmButtonText: 'نعم، احذف نهائياً',
            cancelButtonText: 'إلغاء'
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    for(const id of selectedIds) {
                        await deleteDoc(doc(db, "customers", id));
                    }
                    Swal.fire('تم الحذف!', 'تم إزالة العملاء المحددين من السيرفر بنجاح.', 'success');
                    await loadSavedData();
                } catch(error) {
                    console.error("Error deleting docs: ", error);
                    Swal.fire('خطأ', 'فشل في حذف بعض العناصر، تحقق من صلاحياتك', 'error');
                }
            }
        });
    } else {
        Swal.fire('معلومة', `إجراء ${action} غير متاح في هذه النسخة حالياً.`, 'info');
    }
}

function toggleLogExpansion() {
    const section = document.getElementById('activityLogSection');
    const icon = document.querySelector('#toggleExpandBtn i');
    if(!section || !icon) return;
    
    if(section.classList.contains('expanded')) {
        section.classList.remove('expanded');
        icon.classList.remove('fa-compress-alt');
        icon.classList.add('fa-expand-alt');
    } else {
        section.classList.add('expanded');
        icon.classList.remove('fa-expand-alt');
        icon.classList.add('fa-compress-alt');
    }
}

async function loadSavedData() {
  try {
    const customersQuery = query(collection(db, "customers"), orderBy("createdAtTimestamp", "desc"));
    const customersSnapshot = await getDocs(customersQuery);
    
    allCustomersCache = [];
    customersSnapshot.forEach((doc) => {
      allCustomersCache.push({ id: doc.id, ...doc.data() });
    });

    const logsQuery = query(collection(db, "logs"), orderBy("createdAtTimestamp", "desc"), limit(20));
    const logsSnapshot = await getDocs(logsQuery);
    
    let logsList = [];
    logsSnapshot.forEach((doc) => {
      logsList.push({ id: doc.id, ...doc.data() });
    });

    updateStats(allCustomersCache);
    renderCustomers(allCustomersCache);
    renderLogs(logsList);

  } catch (error) {
    console.error("Error loading data from Firestore: ", error);
  }
}

window.loadSavedData = loadSavedData;
window.openAddCustomerModal = openAddCustomerModal;
window.closeAddCustomerModal = closeAddCustomerModal;
window.saveNewCustomer = saveNewCustomer;
window.openNoteModal = openNoteModal;
window.closeNote = closeNote;
window.saveNote = saveNote;
window.toggleDropdown = toggleDropdown;
window.toggleAllCheckboxes = toggleAllCheckboxes;
window.handleBulkAction = handleBulkAction;
window.toggleLogExpansion = toggleLogExpansion;
window.debouncedFilterTable = debouncedFilterTable;

document.addEventListener('DOMContentLoaded', loadSavedData);