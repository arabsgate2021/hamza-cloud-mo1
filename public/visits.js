// ==========================================================
// 1. التعريفات والمتغيرات الأساسية
// ==========================================================
// تم الإبقاء على تعريف واحد فقط لتجنب خطأ الـ SyntaxError الحرج
const API_URL = 'http://localhost:5000/api/visits'; 

let currentActivePreview = null;
let saveTimeout;
let searchTimeout;
const STORAGE_KEY = 'asgate_visits_final_v31';

// ==========================================================
// 2. دالة جلب البيانات من السيرفر (مع معالجة أخطاء الاتصال)
// ==========================================================
async function loadSavedData() {
    try {
        // يمكنك تعديل المسار الفرعي (/all) حسب إعدادات الـ API لديك
        const response = await fetch(`${API_URL}/all`); 
        if (!response.ok) throw new Error('فشل في جلب البيانات من السيرفر السحابي.');
        
        const data = await response.json();
        
        const tbody = document.getElementById('tableBody');
        if (tbody) tbody.innerHTML = ''; // تنظيف الجدول قبل رسم البيانات الجديدة

        if (data && data.length > 0) {
            data.forEach(visit => renderRow(visit));
        } else {
            // إذا لم تكن هناك بيانات على السيرفر، نتحقق من التخزين المحلي كخيار احتياطي
            loadFromLocalStorageFallback();
        }
    } catch (error) {
        console.error('Error loading data:', error);
        
        // تنبيه ذكي للمستخدم باستخدام Swal المتوفر في مشروعك لإعلامه بالتحول للوضع المحلي
        if (typeof Swal !== 'undefined') {
            Swal.fire({
                icon: 'warning',
                title: 'مشكلة في الاتصال بالسيرفر',
                text: 'لم نتمكن من الاتصال بالقاعدة السحابية. تم تشغيل النسخة الاحتياطية المحلية مؤقتاً.',
                timer: 4000,
                showConfirmButton: false
            });
        }
        loadFromLocalStorageFallback();
    }
}

// الدالة الاحتياطية للقراءة من المتصفح مباشرة في حال انقطاع السيرفر
function loadFromLocalStorageFallback() {
    const localData = localStorage.getItem(STORAGE_KEY);
    if (localData) {
        const data = JSON.parse(localData);
        data.forEach(visit => renderRow(visit));
    }
}

// ==========================================================
// 3. دالة حفظ البيانات الصامتة (المزامنة السحابية والمحلية)
// ==========================================================
async function saveAllDataSilently(data) {
    try {
        // 1. الحفظ المحلي فوراً لضمان عدم ضياع البيانات تحت أي ظرف
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));

        // 2. إرسال البيانات للسيرفر للمزامنة السحابية
        const response = await fetch(`${API_URL}/sync`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        if (!response.ok) throw new Error('فشل تحديث البيانات على السيرفر.');
        console.log('تمت المزامنة السحابية بنجاح! ☁️');
    } catch (error) {
        console.error('Sync Error:', error);
        // نكتفي بالتسجيل في الكونسول هنا لضمان عدم إزعاج المستخدم أثناء العمل المستمر
    }
}

// ==========================================================
// 4. الدالة الأساسية لبناء ورسم السطور بالجدول
// ==========================================================
function renderRow(v = {}, prepend = false) {
    const tbody = document.getElementById('tableBody');
    if (!tbody) return;
    
    // إنشاء معرف فريد يدمج الوقت مع رقم عشوائي لضمان عدم تكرار الـ IDs نهائياً
    const rowId = 'row-' + Date.now() + Math.random().toString(36).substr(2, 5);
    
    const mainRow = document.createElement('tr');
    mainRow.className = 'main-row';
    mainRow.id = rowId;
    
    const subRow = document.createElement('tr');
    subRow.className = 'sub-table-row';
    subRow.id = 'sub-' + rowId;
    subRow.style.display = 'none';
    
    const today = getTodayFormatted();
    const visitDate = v.visitDate || today;
    const notesJson = v.notes || "[]";
    const lastNoteText = getLastNoteOnlyFromJSON(notesJson);
    const editDateHTML = parseEditDateHTML(v.editDate || '');

    // بناء هيكل السطر الأساسي للزيارة
    mainRow.innerHTML = `
        <td><input type="checkbox" class="row-checkbox" value="${rowId}"></td>
        <td><input type="date" class="form-control form-control-sm" value="${visitDate}"></td>
        <td><input type="text" class="form-control form-control-sm client-name" value="${v.clientName || ''}"></td>
        <td><input type="text" class="form-control form-control-sm phone-num" value="${v.phone || ''}"></td>
        <td>
            <!-- تم تعديل الـ id هنا ليعتمد على rowId المضمون والفريد بدلاً من Date.now() المجرد -->
            <div class="notes-preview" onclick="openNote(this)" data-full-notes='${notesJson.replace(/'/g, "&apos;")}' id="preview-${rowId}">
                ${lastNoteText}
            </div>
        </td>
        <td>${editDateHTML}</td>
        <td class="text-center">
            <button class="btn btn-sm btn-outline-primary" onclick="toggleSubRow('${rowId}')">
                <i class="fas fa-box"></i> المنتجات
            </button>
        </td>
    `;

    // إدراج السطور في الجدول حسب الترتيب المطلوب
    if (prepend) {
        tbody.insertBefore(subRow, tbody.firstChild);
        tbody.insertBefore(mainRow, tbody.firstChild);
    } else {
        tbody.appendChild(mainRow);
        tbody.appendChild(subRow);
    }
}

// ==========================================================
// 5. الدوال المساعدة (Helpers)
// ==========================================================
function getTodayFormatted() {
    const d = new Date();
    const month = '' + (d.getMonth() + 1);
    const day = '' + d.getDate();
    const year = d.getFullYear();
    return [year, month.padStart(2, '0'), day.padStart(2, '0')].join('-');
}

function getLastNoteOnlyFromJSON(jsonStr) {
    try {
        const arr = JSON.parse(jsonStr);
        if (Array.isArray(arr) && arr.length > 0) {
            return arr[arr.length - 1].text || '';
        }
        return '';
    } catch(e) {
        return jsonStr || '';
    }
}

function parseEditDateHTML(dateStr) {
    if (!dateStr) return '<span class="text-muted small">-</span>';
    return `<span class="badge bg-secondary small">${dateStr}</span>`;
}

function toggleSubRow(rowId) {
    const subRow = document.getElementById('sub-' + rowId);
    if (subRow) {
        subRow.style.display = subRow.style.display === 'none' ? 'table-row' : 'none';
    }
}

function openNote(element) {
    // هنا يوضع منطق الـ Modal الخاص بك لفتح وتعديل الملاحظات بالاعتماد على الـ ID الفريد الخاص به
    console.log("تم فتح الملاحظة للعنصر:", element.id);
}

// تشغيل دالة جلب البيانات تلقائياً بمجرد اكتمال تحميل واجهة الصفحة
document.addEventListener('DOMContentLoaded', loadSavedData);