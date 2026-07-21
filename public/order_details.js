import { db } from './firebase-config.js';
import { 
    collection, doc, getDoc, getDocs, updateDoc, 
    addDoc, deleteDoc, query, where, orderBy, serverTimestamp 
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

// ==========================================
// المتغيرات والإعدادات العامة
// ==========================================
const urlParams = new URLSearchParams(window.location.search);
let currentOrderId = urlParams.get('id') || urlParams.get('orderId') || localStorage.getItem('current_order_id') || '0001';

const statusOptions = ["مكتمل", "معلق", "جديد", "مرتجع", "فقدان"];
const statusOrder = { "مكتمل": 1, "معلق": 2, "جديد": 3, "مرتجع": 4, "فقدان": 5 };

let loadedProducts = [];
let attachedFileUrl = null;

// ==========================================
// الدوال المساعدة (Utility Functions)
// ==========================================
function formatNum(num) {
    return Number(num || 0).toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

function getStatusClass(status) {
    switch (status) {
        case "مكتمل": return "status-mektamel";
        case "معلق": return "status-moallaq";
        case "مرتجع": return "status-mortaja";
        case "فقدان": return "status-faqd";
        default: return "";
    }
}

// ==========================================
// تحميل بيانات الطلب والمنتجات من Firebase
// ==========================================
window.loadOrderDetails = async function() {
    if (!currentOrderId) return;
    
    // 1. تحميل البيانات الأساسية للطلب
    try {
        const q = query(collection(db, "sales"), where("id", "==", currentOrderId));
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
            querySnapshot.forEach((docSnap) => {
                const order = docSnap.data();
                document.getElementById('orderId').innerText = '#' + (order.id || currentOrderId);
                document.getElementById('orderType').innerText = order.type || 'طلب جديد';
                document.getElementById('orderComp').innerText = order.comp || '-';
                document.getElementById('orderCr').innerText = order.cr || '-';
                document.getElementById('orderStatus').innerText = order.status || 'معلق';
            });
        } else {
            document.getElementById('orderId').innerText = '#' + currentOrderId;
        }
    } catch (e) { 
        console.error("خطأ في تحميل بيانات الطلب:", e); 
    }

    // 2. بناء رأس الجدول الديناميكي
    renderTableHeader();

    // 3. تحميل المنتجات وسجل النشاط
    await renderProducts();
    await loadActivityLogs();
};

function renderTableHeader() {
    const dynamicHeader = document.getElementById('dynamicHeader');
    dynamicHeader.innerHTML = `
        <th style="width: 40px;"><input type="checkbox" id="selectAll" onclick="window.toggleSelectAll(this)"></th>
        <th style="width: 50px;">#</th>
        <th style="width: 180px;">المنتج / الباقة</th>
        <th style="width: 70px;">العدد</th>
        <th style="width: 100px;">الاشتراك</th>
        <th style="width: 100px;">الإجمالي</th>
        <th style="width: 110px;">
            الحالة
            <select class="status-header-filter" id="statusFilter" onchange="window.applyFilters()">
                <option value="">الكل</option>
                ${statusOptions.map(opt => `<option value="${opt}">${opt}</option>`).join('')}
            </select>
        </th>
        <th style="width: 140px;">السريال / المستخدم</th>
        <th>ملاحظات</th>
        <th style="width: 110px;">تاريخ العقد</th>
        <th style="width: 110px;">تاريخ التنفيذ</th>
        <th style="width: 80px;">إجراءات</th>
    `;
}

async function renderProducts() {
    const productsBody = document.getElementById('productsBody');
    productsBody.innerHTML = '<tr><td colspan="12" style="text-align:center; padding: 20px;">جاري تحميل المنتجات...</td></tr>';
    
    try {
        const q = query(collection(db, "products"), where("orderId", "==", currentOrderId));
        const snapshot = await getDocs(q);
        loadedProducts = [];
        snapshot.forEach(docSnap => loadedProducts.push({ fbId: docSnap.id, ...docSnap.data() }));

        // الفرز الذكي بحسب أولوية الحالة
        loadedProducts.sort((a, b) => (statusOrder[a.status] || 99) - (statusOrder[b.status] || 99));

        if (loadedProducts.length === 0) {
            productsBody.innerHTML = '<tr><td colspan="12" style="text-align:center; padding: 20px; color: #64748b;">لا توجد منتجات مضافة لهذا الطلب.</td></tr>';
            calculateTotals();
            updateStatsBox();
            return;
        }

        buildProductsTableRows(loadedProducts);
    } catch (e) {
        console.error("خطأ في تحميل المنتجات:", e);
        productsBody.innerHTML = '<tr><td colspan="12" style="text-align:center; color: red;">حدث خطأ أثناء تحميل المنتجات.</td></tr>';
    }
}

function buildProductsTableRows(items) {
    const productsBody = document.getElementById('productsBody');
    productsBody.innerHTML = '';

    items.forEach((p, index) => {
        const qty = Number(p.qty || 1);
        const sub = Number(p.sub || 0);
        const total = qty * sub;
        const statusClass = getStatusClass(p.status);

        const tr = document.createElement('tr');
        tr.dataset.fbid = p.fbId;
        tr.className = p.status === 'مكتمل' ? 'row-locked' : '';

        tr.innerHTML = `
            <td class="not-locked"><input type="checkbox" class="row-checkbox" onchange="window.calculateTotals()"></td>
            <td>${index + 1}</td>
            <td contenteditable="true" onblur="window.updateField('${p.fbId}', 'name', this.innerText)">${p.name || ''}</td>
            <td contenteditable="true" onblur="window.updateField('${p.fbId}', 'qty', this.innerText)">${qty}</td>
            <td contenteditable="true" onblur="window.updateField('${p.fbId}', 'sub', this.innerText)">${sub}</td>
            <td style="font-weight: 800; color: var(--nav-bg);">${formatNum(total)}</td>
            <td class="not-locked">
                <select class="status-select ${statusClass}" onchange="window.changeStatus('${p.fbId}', this.value)">
                    ${statusOptions.map(opt => `<option value="${opt}" ${p.status === opt ? 'selected' : ''}>${opt}</option>`).join('')}
                </select>
            </td>
            <td contenteditable="true" onblur="window.updateField('${p.fbId}', 'serial', this.innerText)">${p.serial || ''}</td>
            <td contenteditable="true" onblur="window.updateField('${p.fbId}', 'notes', this.innerText)">${p.notes || ''}</td>
            <td><input type="date" value="${p.contractDate || ''}" style="border:none; background:transparent; font-family:Cairo; font-size:11px;" onchange="window.updateField('${p.fbId}', 'contractDate', this.value)"></td>
            <td><input type="date" value="${p.execDate || ''}" style="border:none; background:transparent; font-family:Cairo; font-size:11px;" onchange="window.updateField('${p.fbId}', 'execDate', this.value)"></td>
            <td class="not-locked">
                <button onclick="window.deleteProduct('${p.fbId}')" style="background:none; border:none; color:var(--danger-red); cursor:pointer;" title="حذف"><i class="fas fa-trash-alt"></i></button>
            </td>
        `;

        // إضافة دعم التحديد الشبيه بـ Excel عند الضغط على الخلية
        tr.querySelectorAll('td').forEach(cell => {
            cell.addEventListener('click', (e) => {
                if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'SELECT' && e.target.tagName !== 'BUTTON') {
                    document.querySelectorAll('td.cell-selected').forEach(c => c.classList.remove('cell-selected'));
                    cell.classList.add('cell-selected');
                }
            });
        });

        productsBody.appendChild(tr);
    });

    calculateTotals();
    updateStatsBox();
}

// ==========================================
// تحديث البيانات والتفاعل مع Firestore
// ==========================================
window.updateField = async function(fbId, field, value) {
    try {
        const cleanValue = (field === 'qty' || field === 'sub') ? Number(value.trim()) || 0 : value.trim();
        const docRef = doc(db, "products", fbId);
        await updateDoc(docRef, { [field]: cleanValue });

        // إعادة حساب الإجماليات في حال تعديل الأرقام
        if (field === 'qty' || field === 'sub') {
            await renderProducts();
        }
    } catch (e) { 
        console.error("خطأ التحديث:", e); 
    }
};

window.changeStatus = async function(fbId, newStatus) {
    try {
        await updateDoc(doc(db, "products", fbId), { status: newStatus });
        await logActivity(`تغيير حالة المنتج إلى: ${newStatus}`);
        await renderProducts();
    } catch (e) {
        console.error("خطأ في تغيير الحالة:", e);
    }
};

window.deleteProduct = async function(fbId) {
    if (!confirm("هل أنت تأكد من حذف هذا المنتج؟")) return;
    try {
        await deleteDoc(doc(db, "products", fbId));
        await logActivity(`حذف منتج من الطلب`);
        await renderProducts();
    } catch (e) {
        console.error("خطأ في حذف المنتج:", e);
    }
};

// ==========================================
// الحسابات والإحصائيات وتذييل الجدول (Footer)
// ==========================================
window.calculateTotals = function() {
    const rows = document.querySelectorAll('#productsBody tr');
    let totalQty = 0;
    let totalSub = 0;
    let grandTotal = 0;
    let selectedCount = 0;
    let visibleCount = 0;

    rows.forEach(tr => {
        if (tr.style.display !== 'none' && tr.cells.length > 5) {
            visibleCount++;
            const chk = tr.querySelector('.row-checkbox');
            if (chk && chk.checked) selectedCount++;

            const qty = Number(tr.cells[3].innerText) || 0;
            const sub = Number(tr.cells[4].innerText) || 0;
            totalQty += qty;
            totalSub += sub;
            grandTotal += (qty * sub);
        }
    });

    document.getElementById('f_selection').innerText = selectedCount;
    document.getElementById('f_count').innerText = visibleCount;
    document.getElementById('f_qty').innerText = totalQty;
    document.getElementById('f_sub').innerText = formatNum(totalSub);
    document.getElementById('f_total').innerText = formatNum(grandTotal);
    document.getElementById('orderTotalSum').innerText = formatNum(grandTotal) + ' ر.س';
};

function updateStatsBox() {
    let totalOk = 0, totalWait = 0;
    let monthOk = 0, monthWait = 0;

    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    loadedProducts.forEach(p => {
        const totalVal = (Number(p.qty) || 1) * (Number(p.sub) || 0);
        const pDate = p.contractDate ? new Date(p.contractDate) : new Date();

        if (p.status === 'مكتمل') {
            totalOk += totalVal;
            if (pDate.getMonth() === currentMonth && pDate.getFullYear() === currentYear) {
                monthOk += totalVal;
            }
        } else if (p.status === 'معلق' || p.status === 'جديد') {
            totalWait += totalVal;
            if (pDate.getMonth() === currentMonth && pDate.getFullYear() === currentYear) {
                monthWait += totalVal;
            }
        }
    });

    document.getElementById('stat_total_ok').innerText = formatNum(totalOk);
    document.getElementById('stat_total_wait').innerText = formatNum(totalWait);
    document.getElementById('stat_month_ok').innerText = formatNum(monthOk);
    document.getElementById('stat_month_wait').innerText = formatNum(monthWait);
}

// ==========================================
// نافذة إضافة منتج جديد (Modal)
// ==========================================
window.openModal = function() {
    document.getElementById('productModal').style.display = 'flex';
};

window.closeModal = function() {
    document.getElementById('productModal').style.display = 'none';
    document.getElementById('p_name').value = '';
    document.getElementById('p_sub').value = '';
    document.getElementById('p_qty').value = '1';
    document.getElementById('p_serial').value = '';
    document.getElementById('auto_serial').checked = false;
};

window.handleTypeChange = function() {
    const type = document.getElementById('p_type').value;
    const nameInput = document.getElementById('p_name');
    if (!nameInput.value) {
        nameInput.value = `باقة ${type}`;
    }
};

window.saveProduct = async function() {
    const type = document.getElementById('p_type').value;
    const name = document.getElementById('p_name').value.trim() || type;
    const sub = Number(document.getElementById('p_sub').value) || 0;
    const qty = Number(document.getElementById('p_qty').value) || 1;
    const serial = document.getElementById('p_serial').value.trim();
    const isAutoSerial = document.getElementById('auto_serial').checked;

    if (!sub) {
        alert("يرجى إدخال قيمة الاشتراك الصحيحة.");
        return;
    }

    try {
        // إذا كان خيار التسلسل التلقائي مفعلاً وكان العدد أكبر من 1
        if (isAutoSerial && qty > 1 && serial) {
            const startSerial = BigInt(serial);
            for (let i = 0; i < qty; i++) {
                const currentSerial = (startSerial + BigInt(i)).toString();
                await addDoc(collection(db, "products"), {
                    orderId: currentOrderId,
                    type,
                    name: `${name} (${i + 1})`,
                    qty: 1,
                    sub,
                    serial: currentSerial,
                    status: 'جديد',
                    createdAt: serverTimestamp()
                });
            }
        } else {
            // إضافة منتج واحد بالكمية المحددة
            await addDoc(collection(db, "products"), {
                orderId: currentOrderId,
                type,
                name,
                qty,
                sub,
                serial,
                status: 'جديد',
                createdAt: serverTimestamp()
            });
        }

        await logActivity(`إضافة منتج جديد: ${name}`);
        window.closeModal();
        await renderProducts();
    } catch (e) {
        console.error("خطأ في حفظ المنتج:", e);
        alert("حدث خطأ أثناء حفظ المنتج.");
    }
};

// ==========================================
// سجل النشاط (Activity Log)
// ==========================================
async function logActivity(text) {
    try {
        await addDoc(collection(db, "activity_logs"), {
            orderId: currentOrderId,
            text,
            time: new Date().toLocaleString('ar-SA'),
            timestamp: serverTimestamp()
        });
        await loadActivityLogs();
    } catch (e) {
        console.error("خطأ في إضافة السجل:", e);
    }
}

async function loadActivityLogs() {
    const activityList = document.getElementById('activityList');
    try {
        const q = query(
            collection(db, "activity_logs"), 
            where("orderId", "==", currentOrderId)
        );
        const snapshot = await getDocs(q);
        
        let logs = [];
        snapshot.forEach(docSnap => logs.push(docSnap.data()));
        
        // ترتيب السجلات تنازلياً
        logs.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));

        activityList.innerHTML = logs.map(log => `
            <div class="activity-item">
                <div class="activity-row-inline">
                    <span class="activity-header-part">تحديث:</span>
                    <span class="activity-time-part">(${log.time || ''})</span>
                    <span class="activity-text-part">${log.text || ''}</span>
                </div>
            </div>
        `).join('');
    } catch (e) {
        console.error("خطأ في تحميل سجل النشاط:", e);
    }
}

window.toggleLogExpansion = function() {
    const logSection = document.getElementById('activityLogSection');
    const icon = document.querySelector('#toggleExpandBtn i');
    logSection.classList.toggle('expanded');
    if (logSection.classList.contains('expanded')) {
        icon.className = 'fas fa-compress-alt';
    } else {
        icon.className = 'fas fa-expand-alt';
    }
};

// ==========================================
// سجل الملاحظات العائم (Global Notes Modal)
// ==========================================
window.openGlobalNote = async function() {
    document.getElementById('noteModal').style.display = 'flex';
    const historyLog = document.getElementById('historyLog');
    historyLog.innerHTML = 'جاري تحميل الملاحظات...';

    try {
        const q = query(collection(db, "global_notes"), where("orderId", "==", currentOrderId));
        const snapshot = await getDocs(q);
        let notes = [];
        snapshot.forEach(docSnap => notes.push(docSnap.data()));
        notes.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));

        historyLog.innerHTML = notes.map(n => `
            <div style="border-bottom: 1px solid #cbd5e1; padding-bottom: 5px; margin-bottom: 8px;">
                <div style="font-size: 10px; color: #64748b;">${n.time || ''}</div>
                <div style="color: #1e293b; font-weight: 700;">${n.text || ''}</div>
                ${n.file ? `<a href="${n.file}" target="_blank" style="color:var(--accent-blue); font-size:11px;"><i class="fas fa-paperclip"></i> مرفق</a>` : ''}
            </div>
        `).join('') || 'لا توجد ملاحظات مسجلة بعد.';
    } catch (e) {
        historyLog.innerHTML = 'خطأ في تحميل الملاحظات.';
    }
};

window.closeGlobalNote = function() {
    document.getElementById('noteModal').style.display = 'none';
    document.getElementById('modalTextArea').value = '';
    attachedFileUrl = null;
};

window.handleFileUpload = function(event) {
    const file = event.target.files[0];
    if (file) {
        attachedFileUrl = URL.createObjectURL(file); // محاكاة رابط المرفق
        alert(`تم إرفاق الملف: ${file.name}`);
    }
};

window.saveGlobalNote = async function() {
    const text = document.getElementById('modalTextArea').value.trim();
    if (!text) return;

    try {
        await addDoc(collection(db, "global_notes"), {
            orderId: currentOrderId,
            text,
            file: attachedFileUrl || null,
            time: new Date().toLocaleString('ar-SA'),
            timestamp: serverTimestamp()
        });
        await logActivity(`إضافة ملاحظة جديدة`);
        window.closeGlobalNote();
    } catch (e) {
        console.error("خطأ في حفظ الملاحظة:", e);
    }
};

// ==========================================
// فلترة البحث والتحديد والخيارات (Actions)
// ==========================================
window.applyFilters = function() {
    const searchVal = document.getElementById('liveSearch').value.toLowerCase().trim();
    const statusVal = document.getElementById('statusFilter') ? document.getElementById('statusFilter').value : '';
    const rows = document.querySelectorAll('#productsBody tr');

    rows.forEach(tr => {
        const text = tr.innerText.toLowerCase();
        const statusSelect = tr.querySelector('.status-select');
        const status = statusSelect ? statusSelect.value : '';

        const matchesSearch = text.includes(searchVal);
        const matchesStatus = !statusVal || status === statusVal;

        if (matchesSearch && matchesStatus) {
            tr.style.display = '';
        } else {
            tr.style.display = 'none';
        }
    });

    window.calculateTotals();
};

window.toggleSelectAll = function(master) {
    const checkboxes = document.querySelectorAll('.row-checkbox');
    checkboxes.forEach(chk => {
        if (chk.closest('tr').style.display !== 'none') {
            chk.checked = master.checked;
        }
    });
    window.calculateTotals();
};

window.triggerActionLog = async function(actionType) {
    if (actionType === 'طباعة') {
        window.print();
    } else if (actionType === 'تصدير Excel') {
        exportTableToExcel();
    } else if (actionType === 'حذف المختار') {
        const checkedBoxes = document.querySelectorAll('.row-checkbox:checked');
        if (checkedBoxes.length === 0) {
            alert("يرجى تحديد المنتجات المراد حذفها أولاً.");
            return;
        }
        if (confirm(`هل أنت تأكد من حذف ${checkedBoxes.length} من المنتجات المحددة؟`)) {
            for (let chk of checkedBoxes) {
                const tr = chk.closest('tr');
                const fbId = tr.dataset.fbid;
                if (fbId) await deleteDoc(doc(db, "products", fbId));
            }
            await logActivity(`حذف ${checkedBoxes.length} منتجات مختارة`);
            await renderProducts();
        }
    } else {
        alert(`تم تنفيذ الإجراء: ${actionType}`);
    }
};

function exportTableToExcel() {
    const table = document.getElementById('mainTable');
    if (typeof XLSX !== 'undefined') {
        const wb = XLSX.utils.table_to_book(table, { sheet: "تفاصيل الطلب" });
        XLSX.writeFile(wb, `Order_Details_${currentOrderId}.xlsx`);
    } else {
        alert("مكتبة XLSX غير محملة.");
    }
}