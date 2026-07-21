let currentActivePreview = null;
let currentAttachmentName = null; 
let pendingAttachment = null;
let customersCache = [];
let salesOrdersCache = [];
let saveTimeout;

const API_SALES = '/api/sales';
const API_CUSTOMERS = '/api/customers';
const API_LOGS = '/api/logs';

function getTodayFormatted() { return new Date().toISOString().split('T')[0]; }
function getTimeFormatted() { const d = new Date(); return String(d.getHours()).padStart(2, '0') + ":" + String(d.getMinutes()).padStart(2, '0'); }

async function initPage() {
    initStatsVisibility();
    await fetchCustomers();
    await loadSalesFromServer();
    await renderGeneralLog();
}

function toggleStatsVisibility() {
    const container = document.getElementById('statsContainer');
    const btn = document.getElementById('eyeToggleBtn');
    const isHidden = container.classList.toggle('blur-active');
    
    if (isHidden) {
        btn.innerHTML = '<i class="fas fa-eye-slash"></i>';
        localStorage.setItem('asgate_sales_stats_hidden', 'true');
    } else {
        btn.innerHTML = '<i class="fas fa-eye"></i>';
        localStorage.setItem('asgate_sales_stats_hidden', 'false');
    }
}

function initStatsVisibility() {
    const isHidden = localStorage.getItem('asgate_sales_stats_hidden') === 'true';
    if (isHidden) {
        document.getElementById('statsContainer').classList.add('blur-active');
        document.getElementById('eyeToggleBtn').innerHTML = '<i class="fas fa-eye-slash"></i>';
    }
}

function debouncedSave() {
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => {
        autoSave();
    }, 600);
}

function toggleGeneralLogHeight() {
    const section = document.getElementById('generalActivityLogSection');
    const btn = document.getElementById('toggleGeneralLogBtn');
    if (section.classList.contains('expanded')) {
        section.classList.remove('expanded');
        btn.innerHTML = '<i class="fas fa-expand-alt"></i>';
    } else {
        section.classList.add('expanded');
        btn.innerHTML = '<i class="fas fa-compress-alt"></i>';
    }
}

function generateCustomOrderId() {
    const now = new Date();
    const year = String(now.getFullYear()).slice(-2); 
    const month = String(now.getMonth() + 1).padStart(2, '0'); 
    const prefix = year + month; 
    
    let maxSequence = 0;
    salesOrdersCache.forEach(item => {
        const idStr = String(item.orderId || item.id);
        if (idStr.startsWith(prefix) && idStr.length === 8) {
            const seq = parseInt(idStr.slice(4), 10);
            if (seq > maxSequence) maxSequence = seq;
        }
    });
    return prefix + String(maxSequence + 1).padStart(4, '0');
}

function updateHeaderStats() {
    const currentMonthStr = getTodayFormatted().substring(0, 7);
    
    let totalComp = 0, totalPend = 0, monthCount = 0;
    let monthComp = 0, monthPend = 0;
    
    salesOrdersCache.forEach(item => {
        const completed = item.completedSum || 0;
        const pending = item.pendingSum || 0;
        
        totalComp += completed; 
        totalPend += pending;
        
        if (item.date && item.date.startsWith(currentMonthStr)) {
            monthCount++;
            monthComp += completed;
            monthPend += pending;
        }
    });
    
    document.getElementById('count-total').innerText = salesOrdersCache.length;
    document.getElementById('month-count').innerText = monthCount;
    document.getElementById('sum-completed').innerText = totalComp.toLocaleString('en-US', {minimumFractionDigits: 2});
    document.getElementById('sum-pending').innerText = totalPend.toLocaleString('en-US', {minimumFractionDigits: 2});
    document.getElementById('month-completed').innerText = monthComp.toLocaleString('en-US', {minimumFractionDigits: 2});
    document.getElementById('month-pending').innerText = monthPend.toLocaleString('en-US', {minimumFractionDigits: 2});
}

async function fetchCustomers() {
    try {
        const res = await fetch(API_CUSTOMERS);
        if(res.ok) {
            customersCache = await res.json();
        }
    } catch (e) {
        console.warn('تعذر تحميل العملاء من السيرفر، استخدام الذاكرة المحلية كبديل');
        customersCache = JSON.parse(localStorage.getItem('asgate_customers_final_v1') || '[]');
    }
}

async function loadSalesFromServer() {
    const tbody = document.getElementById('salesBody');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    try {
        const res = await fetch(API_SALES);
        if(res.ok) {
            salesOrdersCache = await res.json();
        } else {
            salesOrdersCache = JSON.parse(localStorage.getItem('asgate_sales_db') || '[]');
        }
    } catch(err) {
        console.warn('تعذر الاتصال بالسيرفر، استخدام الذاكرة المحلية');
        salesOrdersCache = JSON.parse(localStorage.getItem('asgate_sales_db') || '[]');
    }

    salesOrdersCache.forEach(obj => renderTableRow(obj));
    updateHeaderStats();
}

function renderTableRow(obj) {
    const tbody = document.getElementById('salesBody');
    const orderId = obj.orderId || obj.id;
    const completedVal = parseFloat(obj.completedSum || 0).toFixed(2);
    const pendingVal = parseFloat(obj.pendingSum || 0).toFixed(2);
    
    const row = tbody.insertRow(-1);
    row.className = 'main-row';
    row.id = `row-${orderId}`;
    row.dataset.mongoId = obj._id || '';
    
    if (obj.status === "فقدان") row.classList.add('lost-row');
    
    row.innerHTML = `
        <td><input type="checkbox" class="select-check"></td>
        <td><a href="./order_details.html?id=${orderId}" class="order-link" title="فتح التفاصيل">#${orderId}</a></td>
        <td><input type="text" class="excel-input" value="${obj.type || ''}" data-old="${obj.type || ''}" onfocus="this.dataset.old=this.value" onkeyup="updateDateField(this); debouncedSave();" onblur="logEdit('اسم الطلب', this, '${obj.comp}', '${orderId}')"></td>
        <td><input type="text" class="excel-input readonly-input" value="${obj.date || getTodayFormatted()}" readonly style="color:var(--text-muted); font-weight:700;"></td>
        <td><input type="text" class="excel-input" value="${obj.comp || ''}" data-old="${obj.comp || ''}" onfocus="this.dataset.old=this.value" onkeyup="updateDateField(this); debouncedSave();" onblur="logEdit('الشركة', this, '${obj.comp}', '${orderId}')"></td>
        <td><input type="text" class="excel-input" value="${obj.cr || ''}" data-old="${obj.cr || ''}" onfocus="this.dataset.old=this.value" onkeyup="updateDateField(this); debouncedSave();" onblur="logEdit('السجل', this, '${obj.comp}', '${orderId}')"></td>
        <td>
            <select class="excel-input status-select ${getStatusClass(obj.status)}" data-old="${obj.status || 'معلق'}" onchange="handleStatusChange(this, '${orderId}', '${obj.comp}')">
                <option value="مكتمل" ${obj.status === 'مكتمل' ? 'selected' : ''}>مكتمل</option>
                <option value="معلق" ${obj.status === 'معلق' ? 'selected' : ''}>معلق</option>
                <option value="فقدان" ${obj.status === 'فقدان' ? 'selected' : ''}>فقدان</option>
            </select>
        </td>
        <td><input type="text" class="excel-input readonly-input" value="${completedVal}" readonly style="color:var(--success); font-weight:800;"></td>
        <td><input type="text" class="excel-input readonly-input" value="${pendingVal}" readonly style="color:var(--danger); font-weight:800;"></td>
        <td><div class="notes-preview" onclick="openNote(this)" data-full-notes='${(typeof obj.notes === 'string' ? obj.notes : JSON.stringify(obj.notes || [])).replace(/'/g, "&apos;")}' title="عرض الملاحظات">${getLastNoteOnly(obj.notes)}</div></td>
        <td><input type="text" class="excel-input readonly-input last-mod-field" value="${obj.lastModifiedDate || '---'}" readonly style="color:var(--text-muted); font-weight:700;"></td>
        <td><input type="text" class="excel-input" value="${obj.owner || 'أحمد'}" data-old="${obj.owner || ''}" onfocus="this.dataset.old=this.value" onkeyup="updateDateField(this); debouncedSave();" onblur="logEdit('المالك', this, '${obj.comp}', '${orderId}')"></td>
    `;
}

function getStatusClass(status) {
    if(status === 'مكتمل') return 'status-complete';
    if(status === 'فقدان') return 'status-lost-badge';
    return 'status-pending';
}

function handleStatusChange(el, orderId, company) {
    const val = el.value; const oldVal = el.dataset.old;
    const row = el.closest('tr');
    el.className = `excel-input status-select ${getStatusClass(val)}`;
    
    if (val === "فقدان") row.classList.add('lost-row');
    else row.classList.remove('lost-row');
    
    addGeneralLog('الحالة', oldVal, val, company, `تغيير حالة الطلب #${orderId}`);
    updateDateField(el);
    el.dataset.old = val;
    debouncedSave();
}

function updateDateField(inputElement) {
    const row = inputElement.closest('tr');
    const modField = row.querySelector('.last-mod-field');
    if (modField) modField.value = getTodayFormatted();
}

function logEdit(fieldName, el, comp, id) {
    const newVal = el.value; const oldVal = el.dataset.old;
    if(newVal !== oldVal) {
        addGeneralLog(fieldName, oldVal, newVal, comp, `تعديل ${fieldName} للطلب #${id}`);
        el.dataset.old = newVal;
    }
}

async function autoSave() {
    const rows = document.querySelectorAll('#salesBody .main-row');
    const salesData = Array.from(rows).map(r => ({
        mongoId: r.dataset.mongoId || null,
        orderId: r.cells[1].innerText.replace('#', '').trim(),
        type: r.cells[2].querySelector('input').value,
        date: r.cells[3].querySelector('input').value,
        comp: r.cells[4].querySelector('input').value,
        cr: r.cells[5].querySelector('input').value,
        status: r.cells[6].querySelector('select').value,
        completedSum: parseFloat(r.cells[7].querySelector('input').value) || 0,
        pendingSum: parseFloat(r.cells[8].querySelector('input').value) || 0,
        notes: r.cells[9].querySelector('.notes-preview').getAttribute('data-full-notes'),
        lastModifiedDate: r.cells[10].querySelector('input').value === '---' ? '' : r.cells[10].querySelector('input').value,
        owner: r.cells[11].querySelector('input').value
    }));

    salesOrdersCache = salesData;
    localStorage.setItem('asgate_sales_db', JSON.stringify(salesData));
    updateHeaderStats();

    try {
        await fetch(`${API_SALES}/sync`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sales: salesData })
        });
    } catch (e) {
        console.log('سيتم المزامنة تلقائياً عند عودة الاتصال بالفورم الموحد');
    }
}

function filterSalesTable() {
    const query = document.getElementById('globalSearch').value.toLowerCase().trim();
    const rows = document.querySelectorAll('#salesBody .main-row');
    rows.forEach(row => {
        const text = row.innerText.toLowerCase();
        row.style.display = text.includes(query) ? '' : 'none';
    });
}

function toggleDropdown(e, btn) {
    e.stopPropagation();
    const menu = btn.nextElementSibling;
    document.querySelectorAll('.dropdown-menu').forEach(m => { if(m !== menu) m.classList.remove('show'); });
    menu.classList.toggle('show');
}

window.onclick = (e) => {
    if (!e.target.matches('.btn-bulk-trigger') && !e.target.matches('.fa-chevron-down')) {
        document.querySelectorAll('.dropdown-menu').forEach(m => m.classList.remove('show'));
    }
};

function toggleAllCheckboxes(source) {
    document.querySelectorAll('.select-check').forEach(chk => chk.checked = source.checked);
}

async function handleBulkAction(action) {
    const selected = document.querySelectorAll('.select-check:checked');
    if (selected.length === 0) { 
        Swal.fire({icon: 'info', text: 'يرجى تحديد صف واحد على الأقل', confirmButtonColor: '#3b82f6'}); 
        return; 
    }
    
    if (action === 'حذف') {
        const result = await Swal.fire({ 
            title: 'تأكيد الحذف؟', 
            text: "سيتم حذف الطلبات المحددة بشكل نهائي!", 
            icon: 'warning', 
            showCancelButton: true, 
            confirmButtonColor: '#ef4444', 
            cancelButtonColor: '#94a3b8', 
            confirmButtonText: 'نعم، احذف', 
            cancelButtonText: 'إلغاء' 
        });

        if (result.isConfirmed) {
            for (const chk of selected) {
                const row = chk.closest('tr');
                const orderId = row.cells[1].innerText.replace('#', '').trim();
                const comp = row.cells[4].querySelector('input').value;
                const mongoId = row.dataset.mongoId;

                if (mongoId) {
                    try {
                        await fetch(`${API_SALES}/${mongoId}`, { method: 'DELETE' });
                    } catch (e) {
                        console.error('Failed to delete on server', e);
                    }
                }

                addGeneralLog('إجراء', 'حذف طلب', '', comp, `تم حذف الطلب #${orderId}`);
                row.remove();
            }
            autoSave();
            Swal.fire({icon: 'success', title: 'تم الحذف', showConfirmButton: false, timer: 1500});
        }
    } else {
        Swal.fire({icon: 'success', title: 'تم', text: 'تم تنفيذ الإجراء (' + action + ') على ' + selected.length + ' صف', showConfirmButton: false, timer: 1500});
    }
}

async function addGeneralLog(actionType, oldVal, newVal, companyName, description) {
    const logData = {
        actionType,
        oldVal,
        newVal,
        companyName: companyName || 'عام',
        description,
        date: getTodayFormatted(),
        time: getTimeFormatted()
    };

    try {
        await fetch(API_LOGS, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(logData)
        });
    } catch(e) {
        const logs = JSON.parse(localStorage.getItem('asgate_general_sales_logs') || '[]');
        const logHtml = `
            <div class="activity-item">
                <span style="color:#4c1d95; font-weight:800; font-size:10px;">[${logData.date} ${logData.time}]</span> 
                <span style="color:var(--accent-blue);"><i class="fas fa-building"></i> ${logData.companyName}</span> - 
                ${description}
            </div>
        `;
        logs.unshift(logHtml);
        localStorage.setItem('asgate_general_sales_logs', JSON.stringify(logs.slice(0, 100)));
    }
    
    renderGeneralLog();
}

async function renderGeneralLog() {
    const list = document.getElementById('activityLogs');
    if (!list) return;

    try {
        const res = await fetch(`${API_LOGS}?module=sales`);
        if (res.ok) {
            const logsArr = await res.json();
            list.innerHTML = logsArr.map(log => `
                <div class="activity-item">
                    <span style="color:#4c1d95; font-weight:800; font-size:10px;">[${log.date || ''} ${log.time || ''}]</span> 
                    <span style="color:var(--accent-blue);"><i class="fas fa-building"></i> ${log.companyName || 'عام'}</span> - 
                    ${log.description}
                </div>
            `).join('') || '<div style="color:#94a3b8; text-align:center; padding:10px;">لا يوجد نشاط مسجل</div>';
            return;
        }
    } catch(e) {}

    const logs = JSON.parse(localStorage.getItem('asgate_general_sales_logs') || '[]');
    list.innerHTML = logs.join('') || '<div style="color:#94a3b8; text-align:center; padding:10px;">لا يوجد نشاط مسجل</div>';
}

function openNote(el) {
    currentActivePreview = el;
    pendingAttachment = null;
    document.getElementById('filePreviewContainer').style.display = 'none';
    
    let arr = []; 
    try { 
        const raw = el.getAttribute('data-full-notes') || "[]";
        arr = typeof raw === 'string' ? JSON.parse(raw) : raw;
    } catch(e) {}

    const historyLog = document.getElementById('historyLog');
    
    if (historyLog) {
        historyLog.innerHTML = arr.map(msg => {
            const attachHtml = msg.attachment ? `<br><a href="${msg.attachment.data}" download="${msg.attachment.name}" style="color:var(--accent-blue); font-size:10.5px; font-weight:800; text-decoration:none;"><i class="fas fa-download"></i> ${msg.attachment.name}</a>` : '';
            return `
            <div class="chat-msg-block">
                <div class="chat-msg-header">
                    <span><i class="fas fa-user-circle"></i> ${msg.user || 'المستخدم'}</span>
                    <span style="color:#94a3b8;"><i class="fas fa-clock"></i> ${msg.date} ${msg.time}</span>
                </div>
                <div class="chat-msg-text">${msg.text || ''}${attachHtml}</div>
            </div>`;
        }).join('') || '<div style="color:#64748b; text-align:center; font-size:10px; padding:20px; font-weight:700;">لا توجد ملاحظات سابقة</div>';
    }
    
    document.getElementById('noteModal').style.display = "flex";
    const modalTextArea = document.getElementById('modalTextArea');
    if (modalTextArea) { modalTextArea.value = ""; modalTextArea.focus(); }
}

function handleFileSelect(input) {
    const file = input.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            pendingAttachment = { name: file.name, data: e.target.result };
            document.getElementById('fileNameDisplay').innerText = file.name;
            document.getElementById('filePreviewContainer').style.display = 'block';
        };
        reader.readAsDataURL(file);
    }
}

function removeAttachment() {
    pendingAttachment = null;
    document.getElementById('modalFileAttachment').value = '';
    document.getElementById('filePreviewContainer').style.display = 'none';
}

function saveNote() {
    const txt = document.getElementById('modalTextArea').value.trim();
    if ((txt || pendingAttachment) && currentActivePreview) {
        let arr = []; 
        try { 
            const raw = currentActivePreview.getAttribute('data-full-notes') || "[]";
            arr = typeof raw === 'string' ? JSON.parse(raw) : raw;
        } catch(e) {}
        
        const newNote = { 
            user: "المستخدم", 
            date: getTodayFormatted(), 
            time: getTimeFormatted(), 
            text: txt 
        };
        if(pendingAttachment) { newNote.attachment = pendingAttachment; }
        
        arr.push(newNote);
        currentActivePreview.setAttribute('data-full-notes', JSON.stringify(arr)); 
        currentActivePreview.innerText = txt ? txt : "مرفق";
        
        updateDateField(currentActivePreview);
        autoSave();
    }
    removeAttachment();
    closeNote();
}

function closeNote() { document.getElementById('noteModal').style.display = "none"; }

function getLastNoteOnly(jsonStrOrObj) { 
    try { 
        const arr = typeof jsonStrOrObj === 'string' ? JSON.parse(jsonStrOrObj || '[]') : (jsonStrOrObj || []); 
        if(arr.length > 0) {
            const last = arr[arr.length - 1];
            return last.text ? last.text : "مرفق";
        }
        return "أضف ملاحظة..."; 
    } catch(e) { return "أضف ملاحظة..."; } 
}

function openOrderModal() { document.getElementById('orderModal').style.display = 'flex'; }
function closeOrderModal() { 
    document.getElementById('orderModal').style.display = 'none'; 
    document.getElementById('mSearchField').value = ''; 
    document.getElementById('mType').value = ''; 
    document.getElementById('mComp').value = ''; 
    document.getElementById('mCr').value = ''; 
}

function searchCustomerInModal(el) {
    const query = el.value.toLowerCase().trim();
    const resDiv = document.getElementById('mResults');
    
    if (query.length < 1) { resDiv.style.display='none'; return; }
    
    const filtered = customersCache.filter(c => (c.comp || "").toLowerCase().includes(query) || (c.record || "").includes(query));
    
    resDiv.innerHTML = filtered.map(c => `<div onclick="selectCustomer('${c.comp || ''}', '${c.record || ''}')"><i class="far fa-building"></i> ${c.comp || 'بدون اسم'} - ${c.record || 'بدون سجل'}</div>`).join('');
    resDiv.style.display = filtered.length ? 'block' : 'none';
}

function selectCustomer(comp, record) { 
    document.getElementById('mComp').value = comp;
    document.getElementById('mCr').value = record; 
    document.getElementById('mSearchField').value = comp;
    document.getElementById('mResults').style.display = 'none';
}

async function addOrderRow() {
    const comp = document.getElementById('mComp').value;
    const cr = document.getElementById('mCr').value;
    const type = document.getElementById('mType').value;
    
    if (!comp) { 
        Swal.fire({icon: 'warning', title: 'تنبيه', text: 'يرجى اختيار شركة من نتائج البحث', confirmButtonColor: '#3b82f6'}); 
        return; 
    }

    const newOrder = {
        orderId: generateCustomOrderId(),
        type: type,
        date: getTodayFormatted(),
        comp: comp,
        cr: cr,
        status: "معلق",
        completedSum: 0,
        pendingSum: 0,
        notes: "[]",
        lastModifiedDate: getTodayFormatted(),
        owner: "المستخدم"
    };

    try {
        const res = await fetch(API_SALES, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newOrder)
        });

        if (res.ok) {
            const created = await res.json();
            salesOrdersCache.unshift(created);
        } else {
            salesOrdersCache.unshift(newOrder);
        }
    } catch(e) {
        salesOrdersCache.unshift(newOrder);
    }

    localStorage.setItem('asgate_sales_db', JSON.stringify(salesOrdersCache));
    await addGeneralLog('إضافة', '', 'إنشاء طلب', comp, `تم إنشاء طلب مبيعات جديد برقم #${newOrder.orderId}`);

    closeOrderModal();
    Swal.fire({icon: 'success', title: 'تمت الإضافة بنجاح', showConfirmButton: false, timer: 1500});
    
    loadSalesFromServer();
}