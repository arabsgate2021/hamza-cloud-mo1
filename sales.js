// 1. استيراد قاعدة البيانات من ملف الإعدادات الخاص بك
import { db } from './firebase-config.js'; 

// 2. استيراد دوال الفايربيس المطلوبة
import { 
  collection, addDoc, getDocs, doc, 
  updateDoc, deleteDoc, query, orderBy, limit 
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

let currentActivePreview = null;
let pendingAttachment = null;
let salesCache = []; // مصفوفة لتخزين بيانات المبيعات في الذاكرة
const LOGS_COLLECTION = "sales_logs";
const SALES_COLLECTION = "sales"; // اسم الكوليكشن في فايربيس

// الدوال المساعدة
function getTodayFormatted() { return new Date().toISOString().split('T')[0]; }
function getTimeFormatted() { const d = new Date(); return String(d.getHours()).padStart(2, '0') + ":" + String(d.getMinutes()).padStart(2, '0'); }

// تهيئة الصفحة
window.initPage = async function() {
    initStatsVisibility();
    await loadSalesFromFirebase();
};

// تحميل البيانات من فايربيس
async function loadSalesFromFirebase() {
    const tbody = document.getElementById('salesBody');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="12" style="text-align:center;">جاري التحميل...</td></tr>';
    
    try {
        const q = query(collection(db, SALES_COLLECTION), orderBy("id", "desc"));
        const snapshot = await getDocs(q);
        
        salesCache = [];
        snapshot.forEach(doc => {
            salesCache.push({ fbId: doc.id, ...doc.data() });
        });

        tbody.innerHTML = '';
        salesCache.forEach(obj => renderTableRow(obj));
        updateHeaderStats();
        renderGeneralLog();
    } catch (e) {
        console.error("خطأ في تحميل البيانات: ", e);
    }
}

// تحديث الإحصائيات (تعتمد على الكاش)
function updateHeaderStats() {
    const currentMonthStr = getTodayFormatted().substring(0, 7);
    let totalComp = 0, totalPend = 0, monthCount = 0;
    let monthComp = 0, monthPend = 0;
    
    salesCache.forEach(item => {
        const sums = calculateOrderSums(item);
        totalComp += sums.completed; 
        totalPend += sums.pending;
        
        if (item.date && item.date.startsWith(currentMonthStr)) {
            monthCount++;
            monthComp += sums.completed;
            monthPend += sums.pending;
        }
    });
    
    if(document.getElementById('count-total')) document.getElementById('count-total').innerText = salesCache.length;
    if(document.getElementById('month-count')) document.getElementById('month-count').innerText = monthCount;
    if(document.getElementById('sum-completed')) document.getElementById('sum-completed').innerText = totalComp.toLocaleString('en-US', {minimumFractionDigits: 2});
    if(document.getElementById('sum-pending')) document.getElementById('sum-pending').innerText = totalPend.toLocaleString('en-US', {minimumFractionDigits: 2});
    if(document.getElementById('month-completed')) document.getElementById('month-completed').innerText = monthComp.toLocaleString('en-US', {minimumFractionDigits: 2});
    if(document.getElementById('month-pending')) document.getElementById('month-pending').innerText = monthPend.toLocaleString('en-US', {minimumFractionDigits: 2});
}

// ملاحظة: حساب المبالغ لا يزال يعتمد على LocalStorage للمنتجات كما طلبت، 
// إذا أردت تحويل المنتجات لفايربيس مستقبلاً أخبرني.
function calculateOrderSums(item) {
    const productsDb = JSON.parse(localStorage.getItem('asgate_products_db') || '{}');
    const products = productsDb[item.id] || [];
    let completed = 0, pending = 0;
    products.forEach(p => {
        const lineTotal = (parseFloat(p.qty) || 0) * (parseFloat(String(p.sub).replace(/[^\d.]/g, '')) || 0);
        if (p.status === "مكتمل") completed += lineTotal;
        if (p.status === "معلق") pending += lineTotal;
    });
    return { completed, pending };
}

// عرض الصف في الجدول
function renderTableRow(obj) {
    const tbody = document.getElementById('salesBody');
    const sums = calculateOrderSums(obj);
    const row = tbody.insertRow(-1);
    row.className = 'main-row';
    row.id = `row-${obj.id}`;
    
    if (obj.status === "فقدان") row.classList.add('lost-row');
    
    row.innerHTML = `
        <td><input type="checkbox" class="select-check" data-id="${obj.fbId}"></td>
        <td><a href="./order_details.html?id=${obj.id}" class="order-link">#${obj.id}</a></td>
        <td><input type="text" class="excel-input" value="${obj.type || ''}" onblur="updateField('${obj.fbId}', 'type', this.value, '${obj.comp}')"></td>
        <td><input type="text" class="excel-input readonly-input" value="${obj.date}" readonly></td>
        <td><input type="text" class="excel-input" value="${obj.comp || ''}" onblur="updateField('${obj.fbId}', 'comp', this.value, '${obj.comp}')"></td>
        <td><input type="text" class="excel-input" value="${obj.cr || ''}" onblur="updateField('${obj.fbId}', 'cr', this.value, '${obj.comp}')"></td>
        <td>
            <select class="excel-input status-select ${getStatusClass(obj.status)}" onchange="updateField('${obj.fbId}', 'status', this.value, '${obj.comp}')">
                <option value="مكتمل" ${obj.status === 'مكتمل' ? 'selected' : ''}>مكتمل</option>
                <option value="معلق" ${obj.status === 'معلق' ? 'selected' : ''}>معلق</option>
                <option value="فقدان" ${obj.status === 'فقدان' ? 'selected' : ''}>فقدان</option>
            </select>
        </td>
        <td><input type="text" class="excel-input readonly-input" value="${sums.completed.toFixed(2)}" readonly></td>
        <td><input type="text" class="excel-input readonly-input" value="${sums.pending.toFixed(2)}" readonly></td>
        <td><div class="notes-preview" onclick="openNote(this)" data-full-notes='${(obj.notes || '[]').replace(/'/g, "&apos;")}' data-fbid="${obj.fbId}">${getLastNoteOnly(obj.notes || "[]")}</div></td>
        <td><input type="text" class="excel-input readonly-input" value="${obj.lastModifiedDate || '---'}" readonly></td>
        <td><input type="text" class="excel-input" value="${obj.owner || 'أحمد'}" onblur="updateField('${obj.fbId}', 'owner', this.value, '${obj.comp}')"></td>
    `;
}

// تحديث حقل واحد في فايربيس
async function updateField(fbId, field, value, comp) {
    try {
        const docRef = doc(db, SALES_COLLECTION, fbId);
        await updateDoc(docRef, { 
            [field]: value, 
            lastModifiedDate: getTodayFormatted() 
        });
        addGeneralLog('تعديل', '', field, comp, `تحديث ${field} إلى ${value}`);
        // تحديث محلي للكاش لتجنب إعادة التحميل
        const item = salesCache.find(i => i.fbId === fbId);
        if(item) item[field] = value;
    } catch (e) {
        console.error("خطأ في التحديث: ", e);
    }
}

// دالة حذف جماعي
async function handleBulkAction(action) {
    const selected = document.querySelectorAll('.select-check:checked');
    if (selected.length === 0) { 
        Swal.fire({icon: 'info', text: 'يرجى تحديد صف واحد', confirmButtonColor: '#3b82f6'}); 
        return; 
    }
    
    if (action === 'حذف') {
        const result = await Swal.fire({ title: 'تأكيد الحذف؟', text: "سيتم حذف الطلبات نهائياً!", icon: 'warning', showCancelButton: true, confirmButtonColor: '#ef4444', confirmButtonText: 'نعم' });
        if (result.isConfirmed) {
            for (const chk of selected) {
                const fbId = chk.getAttribute('data-id');
                await deleteDoc(doc(db, SALES_COLLECTION, fbId));
            }
            Swal.fire('تم الحذف', '', 'success');
            loadSalesFromFirebase();
        }
    }
}

// دالة إضافة طلب جديد
async function addOrderRow() {
    const comp = document.getElementById('mComp').value;
    const cr = document.getElementById('mCr').value;
    const type = document.getElementById('mType').value;
    
    if (!comp) { return; }

    const newOrder = {
        id: generateCustomOrderId(), // احتفظ بدالة التوليد الخاصة بك
        type: type,
        date: getTodayFormatted(),
        comp: comp,
        cr: cr,
        status: "معلق",
        notes: "[]",
        lastModifiedDate: getTodayFormatted(),
        owner: "المستخدم"
    };

    try {
        await addDoc(collection(db, SALES_COLLECTION), newOrder);
        await addGeneralLog('إضافة', '', 'إنشاء طلب', comp, `تم إنشاء طلب #${newOrder.id}`);
        closeOrderModal();
        Swal.fire('تمت الإضافة', '', 'success');
        loadSalesFromFirebase();
    } catch (e) {
        console.error(e);
    }
}

// سجل النشاط (Log)
async function addGeneralLog(actionType, oldVal, newVal, companyName, description) {
    try {
        await addDoc(collection(db, LOGS_COLLECTION), {
            action: actionType,
            comp: companyName,
            desc: description,
            date: getTodayFormatted(),
            time: getTimeFormatted(),
            createdAt: new Date()
        });
        renderGeneralLog();
    } catch(e) { console.error(e); }
}

async function renderGeneralLog() {
    const list = document.getElementById('activityLogs');
    if (!list) return;
    const q = query(collection(db, LOGS_COLLECTION), orderBy("createdAt", "desc"), limit(20));
    const snapshot = await getDocs(q);
    
    let html = '';
    snapshot.forEach(doc => {
        const data = doc.data();
        html += `<div class="activity-item">[${data.date} ${data.time}] <i class="fas fa-building"></i> ${data.comp} - ${data.desc}</div>`;
    });
    list.innerHTML = html || 'لا يوجد نشاط';
}

// تصدير الدوال للـ HTML
window.loadSalesFromFirebase = loadSalesFromFirebase;
window.handleBulkAction = handleBulkAction;
window.addOrderRow = addOrderRow;
window.updateField = updateField;
window.getStatusClass = (s) => (s === 'مكتمل' ? 'status-complete' : (s === 'فقدان' ? 'status-lost-badge' : 'status-pending'));
window.getLastNoteOnly = getLastNoteOnly;
window.openNote = openNote;
window.closeNote = closeNote;
window.saveNote = saveNote;
window.toggleDropdown = toggleDropdown;
window.toggleAllCheckboxes = toggleAllCheckboxes;
window.filterSalesTable = filterSalesTable;
window.toggleGeneralLogHeight = toggleGeneralLogHeight;
window.openOrderModal = openOrderModal;
window.closeOrderModal = closeOrderModal;
window.searchCustomerInModal = searchCustomerInModal;
window.selectCustomer = selectCustomer;
window.initPage = initPage;

// ملاحظة: الدوال الأخرى (filter, search, modal handlers) تبقى كما هي في كودك 
// لأنها تعتمد على DOM ولا تتفاعل مع التخزين.