/* ==========================================================
   1. المتغيرات والتعريفات الأساسية للفرص البيعية
   ========================================================== */
let currentActivePreview = null;
let saveTimeout;
let searchTimeout;

// 🟢 تم ضبط رابط الـ API ديناميكياً ليتعرف تلقائياً على النطاق والسيرفر الحالي
const API_BASE_URL = window.location.origin.startsWith('http') 
    ? `${window.location.origin}/api` 
    : 'http://localhost:5000/api'; 

/* ==========================================================
   2. الدالة الأساسية لبناء السطور المرحّلة (renderRow) 
   ========================================================== */
function renderRow(v = {}, prepend = false) {
    const tbody = document.getElementById('tableBody');
    if (!tbody) return;
    const rowId = 'row-' + Date.now() + Math.random().toString(36).substr(2, 5);
    const mainRow = document.createElement('tr');
    mainRow.className = 'main-row';
    mainRow.id = rowId;
    const subRow = document.createElement('tr');
    subRow.className = 'sub-table-row';
    subRow.id = 'sub-' + rowId;
    subRow.style.display = 'none';
    const today = getTodayFormatted();
    
    const oppDate = v.oppDate || today; 
    const notesJson = v.notes || "[]";
    const lastNoteText = getLastNoteOnlyFromJSON(notesJson);

    mainRow.innerHTML = `
        <td class="col-select">
            <input type="checkbox" class="select-check">
            <span class="toggle-arrow" onclick="toggleSubTable('${rowId}')"><i class="fas fa-caret-left"></i></span>
        </td>
        <td><input type="text" class="excel-input" value="${v.comp || ''}" data-old="${v.comp || ''}" onfocus="this.dataset.old=this.value" onkeyup="updateEditDateField(this.closest('tr')); debouncedSaveAllData();" onblur="addToActivityLog('الشركة', this.dataset.old, this.value, this.value); this.dataset.old=this.value;"></td>
        <td><input type="text" class="excel-input" value="${v.address || ''}" data-old="${v.address || ''}" onfocus="this.dataset.old=this.value" onkeyup="updateEditDateField(this.closest('tr')); debouncedSaveAllData();" onblur="addToActivityLog('العنوان', this.dataset.old, this.value, this.closest('tr').cells[1].querySelector('input').value); this.dataset.old=this.value;"></td>
        <td><input type="text" class="excel-input" value="${v.mgr || ''}" data-old="${v.mgr || ''}" onfocus="this.dataset.old=this.value" onkeyup="updateEditDateField(this.closest('tr')); debouncedSaveAllData();" onblur="addToActivityLog('المسؤول', this.dataset.old, this.value, this.closest('tr').cells[1].querySelector('input').value); this.dataset.old=this.value;"></td>
        <td>
            <div class="phone-cell-container">
                <a class="whatsapp-icon-btn" onclick="openWhatsAppChat(this)" title="مراسلة عبر واتساب"><i class="fa-brands fa-whatsapp"></i></a>
                <input type="text" class="excel-input" value="${v.mob || ''}" data-old="${v.mob || ''}" oninput="this.value = this.value.replace(/[^0-9]/g, ''); debouncedSaveAllData();" onfocus="this.dataset.old=this.value" onkeyup="updateEditDateField(this.closest('tr'));" onblur="addToActivityLog('رقم التواصل', this.dataset.old, this.value, this.closest('tr').cells[1].querySelector('input').value); this.dataset.old=this.value;">
            </div>
        </td>
        <td><input type="text" class="excel-input" value="${v.email || ''}" data-old="${v.email || ''}" onfocus="this.dataset.old=this.value" onkeyup="updateEditDateField(this.closest('tr')); debouncedSaveAllData();" onblur="addToActivityLog('الإيميل', this.dataset.old, this.value, this.closest('tr').cells[1].querySelector('input').value); this.dataset.old=this.value;"></td>
        <td><input type="text" class="excel-input" value="${v.record || ''}" data-old="${v.record || ''}" oninput="this.value = this.value.replace(/[^0-9]/g, ''); debouncedSaveAllData();" onfocus="this.dataset.old=this.value" onkeyup="updateEditDateField(this.closest('tr'));" onblur="addToActivityLog('السجل', this.dataset.old, this.value, this.closest('tr').cells[1].querySelector('input').value); this.dataset.old=this.value;"></td>
        <td><input type="text" class="excel-input readonly-input" value="${oppDate}" style="color:var(--text-muted); font-weight:700;" readonly><input type="hidden" class="opp-date-val" value="${oppDate}"></td>
        <td><input type="text" class="excel-input cur-serv-val" value="${v.curServ || ''}" data-old="${v.curServ || ''}" onfocus="this.dataset.old=this.value" onkeyup="updateEditDateField(this.closest('tr')); debouncedSaveAllData();" onblur="addToActivityLog('الخدمة', this.dataset.old, this.value, this.closest('tr').cells[1].querySelector('input').value); this.dataset.old=this.value;" onmouseenter="showStatusTooltip(this)" onmouseleave="hideStatusTooltip()"></td>
        <td><input type="number" class="excel-input opp-value-input readonly-input" value="${v.oppValue || ''}" readonly style="color:var(--accent-blue); font-weight:800; cursor:not-allowed; background: transparent;"></td>
        <td><div class="notes-preview" onclick="openNote(this)" data-full-notes='${notesJson.replace(/'/g, "&apos;")}' id="preview-${Date.now()}">${lastNoteText}</div></td>
        <td>
            <select class="excel-input status-select" data-old="${v.status || ''}" onfocus="this.dataset.old=this.value" onchange="handleStatusChange(this, '${rowId}')">
                <option value="" ${v.status === '' ? 'selected' : ''}>-</option>
                <option value="مهتم" ${v.status === 'مهتم' ? 'selected' : ''}>مهتم</option>
                <option value="رابح" ${v.status === 'رابح' ? 'selected' : ''}>رابح</option>
                <option value="فقدان" ${v.status === 'فقدان' ? 'selected' : ''}>فقدان</option>
            </select>
        </td>
        <td>
            <input type="date" class="excel-input exp-date-input" value="${v.expDate || ''}" data-old="${v.expDate || ''}" onfocus="this.dataset.old=this.value" onchange="addToActivityLog('التاريخ المتوقع', this.dataset.old, this.value, this.closest('tr').cells[1].querySelector('input').value); this.dataset.old=this.value; debouncedSaveAllData(); reorderRows();">
            <input type="hidden" class="edit-date-val" value="${v.editDate || ''}">
        </td>
        <td><input type="text" class="excel-input" value="${v.owner || ''}" data-old="${v.owner || ''}" onfocus="this.dataset.old=this.value" onkeyup="updateEditDateField(this.closest('tr')); debouncedSaveAllData();" onblur="addToActivityLog('المالك', this.dataset.old, this.value, this.closest('tr').cells[1].querySelector('input').value); this.dataset.old=this.value;"></td>
    `;

    subRow.innerHTML = `
        <td colspan="14" style="padding:15px 10px; background:#f8fafc; box-shadow: inset 0 2px 4px rgba(0,0,0,.02);">
            <div style="display: flex; gap: 15px; align-items: stretch;">
                <div class="sub-table-container" style="flex: 0 0 50%; padding: 0;">
                    <table class="inner-table" style="width: 100%;">
                        <thead>
                            <tr>
                                <th>المنتج</th><th>التفاصيل</th><th>العدد</th><th>الاشتراك</th><th>الإجمالي</th>
                                <th style="width:75px"><button class="header-plus-btn" onclick="addProductRow('${rowId}')" title="إضافة منتج"><i class="fas fa-plus"></i></button></th>
                            </tr>
                        </thead>
                        <tbody class="product-body"></tbody>
                    </table>
                </div>
                <div style="width: 250px; background: white; border: 1px solid var(--border-soft); border-radius: 8px; padding: 10px; display: flex; flex-direction: column; justify-content: center; align-items: center; box-shadow: 0 4px 6px rgba(0,0,0,.05);">
                    <div style="font-weight:bold; color:#2e1065; margin-bottom:10px; font-size:12px;">تفاصيل التعديل والوقت:</div>
                    <div class="edit-date-container-sub" style="display:flex; flex-direction:column; align-items:center;">${parseEditDateHTML(v.editDate || '')}</div>
                </div>
            </div>
        </td>
    `;

    if (prepend && tbody.firstChild) { tbody.insertBefore(subRow, tbody.firstChild); tbody.insertBefore(mainRow, tbody.firstChild); } 
    else { tbody.appendChild(mainRow); tbody.appendChild(subRow); }
    applyStatusColor(mainRow.querySelector('.status-select'));
    if (v.products && v.products.length > 0) v.products.forEach(p => addProductRow(rowId, p)); else addProductRow(rowId);
    calculateMainVisitValue(rowId);
}

/* ==========================================================
   3. دوال جدول المنتجات داخل الفرصة
   ========================================================== */
function addProductRow(rowId, data = {}) {
    const subRow = document.getElementById('sub-' + rowId);
    if (!subRow) return;
    const tbody = subRow.querySelector('.product-body');
    const row = tbody.insertRow();
    row.innerHTML = `
        <td><select onchange="updateEditDateField(this.closest('.sub-table-row').previousElementSibling); debouncedSaveAllData();"><option value="">-</option><option value="جوال" ${data.type === 'جوال' ? 'selected' : ''}>جوال</option><option value="بيانات" ${data.type === 'بيانات' ? 'selected' : ''}>بيانات</option><option value="هاتف" ${data.type === 'هاتف' ? 'selected' : ''}>هاتف</option><option value="فايبر نت" ${data.type === 'فايبر نت' ? 'selected' : ''}>فايبر نت</option><option value="DIA" ${data.type === 'DIA' ? 'selected' : ''}>DIA</option><option value="IPVPN" ${data.type === 'IPVPN' ? 'selected' : ''}>IPVPN</option><option value="SIP" ${data.type === 'SIP' ? 'selected' : ''}>SIP</option></select></td>
        <td><input type="text" value="${data.desc || ''}" onkeyup="updateEditDateField(this.closest('.sub-table-row').previousElementSibling); debouncedSaveAllData();"></td>
        <td><input type="number" class="prod-qty" min="0" value="${data.qty || ''}" onkeyup="updateEditDateField(this.closest('.sub-table-row').previousElementSibling); calculateMainVisitValue('${rowId}')" oninput="calculateMainVisitValue('${rowId}')"></td>
        <td><input type="number" class="prod-sub" min="0" value="${data.sub || ''}" onkeyup="updateEditDateField(this.closest('.sub-table-row').previousElementSibling); calculateMainVisitValue('${rowId}')" oninput="calculateMainVisitValue('${rowId}')"></td>
        <td><input type="number" class="prod-total readonly-input" value="${data.total || ''}" readonly style="color:var(--text-muted); font-weight:700; cursor:not-allowed;"></td>
        <td><div style="display:flex; justify-content:center;"><button class="sub-action-btn" title="حذف" onclick="if(this.closest('tbody').rows.length > 1) { const main = this.closest('.sub-table-row').previousElementSibling; updateEditDateField(main); this.closest('tr').remove(); calculateMainVisitValue('${rowId}'); }"><i class="fas fa-trash-alt" style="font-size:10px;"></i></button></div></td>
    `;
}

function calculateMainVisitValue(rowId) {
    const subRow = document.getElementById('sub-' + rowId);
    if (!subRow) return;
    let grandTotal = 0;
    subRow.querySelectorAll('.product-body tr').forEach(pRow => {
        const qty = parseFloat(pRow.querySelector('.prod-qty').value) || 0;
        const sub = parseFloat(pRow.querySelector('.prod-sub').value) || 0;
        const rowTotal = qty * sub;
        pRow.querySelector('.prod-total').value = rowTotal > 0 ? rowTotal : '';
        grandTotal += rowTotal;
    });
    const mainRow = document.getElementById(rowId);
    if (mainRow) {
        const oppVal = mainRow.querySelector('.opp-value-input');
        if (oppVal) oppVal.value = grandTotal > 0 ? grandTotal : '';
    }
    debouncedSaveAllData();
}

/* ==========================================================
   4. الإجراءات الجماعية والبحث والفرز
   ========================================================== */
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

function toggleAllCheckboxes(source) { document.querySelectorAll('.select-check').forEach(chk => chk.checked = source.checked); }

async function handleBulkAction(action) {
    const selected = document.querySelectorAll('.select-check:checked');
    if (selected.length === 0) { Swal.fire({icon: 'info', text: 'يرجى تحديد صف واحد على الأقل', confirmButtonText: 'حسناً', confirmButtonColor: '#3b82f6'}); return; }
    if (action === 'حذف') {
        const result = await Swal.fire({ title: 'تأكيد الحذف؟', text: "سيتم حذف الفرص المحددة نهائياً!", icon: 'warning', showCancelButton: true, confirmButtonColor: '#ef4444', cancelButtonColor: '#94a3b8', confirmButtonText: 'نعم، احذف', cancelButtonText: 'إلغاء' });
        if (result.isConfirmed) {
            selected.forEach(chk => { const row = chk.closest('tr'); const id = row.id; addToActivityLog('إجراء', 'حذف الفرصة البيعية', '', row.cells[1].querySelector('input').value); row.remove(); if(document.getElementById('sub-' + id)) document.getElementById('sub-' + id).remove(); });
            saveAllDataSilently(); updateStats(); reorderRows(); Swal.fire({icon: 'success', title: 'تم الحذف', showConfirmButton: false, timer: 1500});
        }
    } else if (action === 'تصدير') {
        exportToExcel(selected); addToActivityLog('إجراء', 'تصدير بيانات الفرص للإكسيل', '', 'مجموعة محددة');
    } else if (action === 'طباعة') {
        printSelected(selected); addToActivityLog('إجراء', 'طباعة بيانات الفرص', '', 'مجموعة محددة');
    } else { 
        selected.forEach(chk => { const row = chk.closest('tr'); addToActivityLog('إجراء', action, '', row.cells[1].querySelector('input').value); });
        Swal.fire({icon: 'success', title: 'تم', text: 'تم تنفيذ الإجراء على ' + selected.length + ' صف', showConfirmButton: false, timer: 1500});
    }
}

function exportToExcel(selectedRows) {
    let csvContent = "\uFEFFالشركة,العنوان,المسؤول,رقم التواصل,الإيميل,السجل,تاريخ الفرصة,الخدمة,القيمة,الحالة,التاريخ المتوقع,المالك\n";
    selectedRows.forEach(chk => {
        const row = chk.closest('tr');
        const getVal = (idx) => { 
            if(idx === 12) return `"${row.cells[12].querySelector('.exp-date-input')?.value || ''}"`;
            const inp = row.cells[idx].querySelector('input, select'); return `"${inp ? inp.value.replace(/"/g, '""') : ''}"`; 
        };
        csvContent += [getVal(1), getVal(2), getVal(3), getVal(4), getVal(5), getVal(6), getVal(7), getVal(8), getVal(9), getVal(11), getVal(12), getVal(13)].join(",") + "\n";
    });
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = "تقرير_الفرص_البيعية_" + getTodayFormatted() + ".csv";
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
}

function printSelected(selectedRows) {
    let printWindow = window.open('', '_blank');
    let html = `<html dir="rtl"><head><title>تقرير الفرص البيعية المحددة</title><link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap" rel="stylesheet"><style>body { font-family: 'Cairo', sans-serif; padding: 20px; color: #0f172a; } h2 { text-align: center; color: #4c1d95; margin-bottom: 20px; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; } table { width: 100%; border-collapse: collapse; font-size: 12px; } th { background-color: #f1f5f9; color: #1e293b; padding: 10px; border: 1px solid #cbd5e1; font-weight: 700; } td { padding: 8px; border: 1px solid #cbd5e1; text-align: center; } tr:nth-child(even) { background-color: #f8fafc; } .footer { margin-top: 30px; text-align: left; font-size: 10px; color: #64748b; }</style></head><body><h2>تقرير الفرص البيعية (ASGate CRM)</h2><table><thead><tr><th>الشركة</th><th>المسؤول</th><th>رقم التواصل</th><th>الخدمة</th><th>تاريخ الفرصة</th><th>الحالة</th></tr></thead><tbody>`;
    selectedRows.forEach(chk => { const row = chk.closest('tr'); const getVal = (idx) => row.cells[idx].querySelector('input, select')?.value || ''; html += `<tr><td><strong>${getVal(1)}</strong></td><td>${getVal(3)}</td><td dir="ltr">${getVal(4)}</td><td>${getVal(8)}</td><td>${getVal(7)}</td><td>${getVal(11)}</td></tr>`; });
    html += `</tbody></table><div class="footer">تاريخ الطباعة: ${getTodayFormatted()}</div></body></html>`;
    printWindow.document.write(html); printWindow.document.close();
    setTimeout(() => { printWindow.print(); printWindow.close(); }, 500);
}

function debouncedFilterTable() { clearTimeout(searchTimeout); searchTimeout = setTimeout(filterTable, 300); }
function filterTable() {
    const q = document.getElementById('searchInput').value.toLowerCase().trim();
    document.querySelectorAll('.main-row').forEach(row => {
        const text = Array.from(row.cells).slice(1, 7).map(c => c.querySelector('input')?.value.toLowerCase() || '').join(' ');
        const subRow = document.getElementById('sub-' + row.id);
        if (text.includes(q)) { row.style.display = 'table-row'; } else { row.style.display = 'none'; if(subRow) subRow.style.display = 'none'; }
    });
}

/* ==========================================================
   5. إدارة الملاحظات وتلميحات الحالة
   ========================================================== */
function openNote(el) {
    currentActivePreview = el;
    let arr = []; try { arr = JSON.parse(el.getAttribute('data-full-notes') || "[]"); } catch(e) {}
    const historyLog = document.getElementById('historyLog');
    const days = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

    if (historyLog) {
        historyLog.innerHTML = arr.map(msg => {
            let msgDateObj = new Date(msg.date);
            let dayStr = isNaN(msgDateObj) ? '' : days[msgDateObj.getDay()] + ' ';
            let userName = msg.user && msg.user !== "المستخدم" ? msg.user : "المستخدم";

            return `
            <div class="log-entry" style="display: block; line-height: 1.6;">
                <div style="margin-bottom: 4px; display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                    <span class="log-badge-user"><i class="fas fa-user-circle"></i> ${userName}</span>
                    <span class="log-divider">|</span>
                    <span class="log-timestamp"><i class="fas fa-clock"></i> ${dayStr}${msg.date} ${msg.time}</span>
                    <span class="log-divider">|</span>
                </div>
                <div class="log-action" style="padding-right: 5px; color: #0f172a; font-size: 11px; font-weight: 700; white-space: pre-wrap; display: block;">${msg.text}</div>
            </div>
            `;
        }).join('') || '<div style="color:#64748b; text-align:center; font-size:10px; padding:20px; font-weight:700;">لا توجد ملاحظات سابقة - ابدأ بإضافة ملاحظة للفرصة البيعية</div>';
    }
    
    const noteModal = document.getElementById('noteModal');
    if (noteModal) noteModal.style.display = "flex";
    const modalTextArea = document.getElementById('modalTextArea');
    if (modalTextArea) { modalTextArea.value = ""; modalTextArea.focus(); }
}

function saveNote() {
    const txt = document.getElementById('modalTextArea').value.trim();
    if (txt && currentActivePreview) {
        let arr = []; try { arr = JSON.parse(currentActivePreview.getAttribute('data-full-notes') || "[]"); } catch(e) {}
        let username = "المستخدم"; const mainRow = currentActivePreview.closest('.main-row');
        if (mainRow) { const ownerInput = mainRow.cells[13]?.querySelector('input'); if (ownerInput && ownerInput.value.trim()) username = ownerInput.value.trim(); }
        arr.push({ user: username, date: getTodayFormatted(), time: getTimeFormatted(), text: txt });
        currentActivePreview.setAttribute('data-full-notes', JSON.stringify(arr)); currentActivePreview.innerText = txt;
        if (mainRow) updateEditDateField(mainRow); saveAllDataSilently();
    }
    closeNote();
}

function closeNote() { document.getElementById('noteModal').style.display = "none"; }
function showStatusTooltip(el) { const val = el.value || "فارغ"; let tooltip = document.getElementById('status-custom-tooltip'); if(!tooltip) { tooltip = document.createElement('div'); tooltip.id = 'status-custom-tooltip'; Object.assign(tooltip.style, {position:'absolute', background:'#1e293b', color:'#fff', padding:'5px 10px', borderRadius:'4px', fontSize:'11px', zIndex:'3000', pointerEvents:'none'}); document.body.appendChild(tooltip); } tooltip.innerText = val; tooltip.style.display = 'block'; const rect = el.getBoundingClientRect(); tooltip.style.top = (rect.top + window.scrollY - tooltip.offsetHeight - 6) + 'px'; tooltip.style.left = (rect.left + window.scrollX + (rect.width/2) - (tooltip.offsetWidth/2)) + 'px'; }
function hideStatusTooltip() { const tooltip = document.getElementById('status-custom-tooltip'); if(tooltip) tooltip.style.display = 'none'; }

/* ==========================================================
   6. العمليات التشغيلية وتحديث التواريخ
   ========================================================== */
function updateEditDateField(row) {
    if (!row) return; const dateFormatted = getTodayFormatted(); const time24 = getTimeFormatted(); const fullDateTime = `${dateFormatted} ${time24}`;
    const hiddenInput = row.querySelector('.edit-date-val');
    if (hiddenInput) hiddenInput.value = fullDateTime;
    const subRow = document.getElementById('sub-' + row.id);
    if (subRow) { const subContainer = subRow.querySelector('.edit-date-container-sub'); if (subContainer) subContainer.innerHTML = `<span class="edit-date-d">${dateFormatted}</span><span class="edit-date-t">${time24}</span>`; }
}
function parseEditDateHTML(fullDateTime) { if (!fullDateTime || !fullDateTime.includes(' ')) return `<span class="edit-date-d">${fullDateTime || ''}</span><span class="edit-date-t"></span>`; const parts = fullDateTime.split(' '); return `<span class="edit-date-d">${parts[0]}</span><span class="edit-date-t">${parts[1]}</span>`; }
function toggleSubTable(rowId) { const sub = document.getElementById('sub-' + rowId); const arrows = document.querySelectorAll(`#${rowId} .toggle-arrow i`); if (!sub) return; const isOpen = sub.style.display === 'table-row'; sub.style.display = isOpen ? 'none' : 'table-row'; arrows.forEach(arrow => arrow.className = isOpen ? 'fas fa-caret-left' : 'fas fa-caret-down'); }
function toggleLogExpansion() { const logSection = document.getElementById('activityLogSection'); const toggleBtn = document.getElementById('toggleExpandBtn'); if (logSection.classList.contains('expanded')) { logSection.classList.remove('expanded'); toggleBtn.innerHTML = '<i class="fas fa-expand-alt"></i>'; } else { logSection.classList.add('expanded'); toggleBtn.innerHTML = '<i class="fas fa-compress-alt"></i>'; } }

/* ==========================================================
   7. دمج الحالة ومتابعة الفرص وألوان التاريخ
   ========================================================== */
async function handleStatusChange(selectEl, rowId) {
    const newVal = selectEl.value; const oldVal = selectEl.dataset.old; const companyName = selectEl.closest('tr').cells[1].querySelector('input').value;
    applyStatusColor(selectEl); addToActivityLog('الحالة', oldVal, newVal, companyName); updateEditDateField(selectEl.closest('tr')); saveAllDataSilently(); updateStats(); selectEl.dataset.old = newVal;
}

function updateAllDateColors() {
    const todayStr = getTodayFormatted();
    const todayObj = new Date(todayStr);

    document.querySelectorAll('#tableBody .main-row').forEach(row => {
        const dateInput = row.querySelector('.exp-date-input');
        if(!dateInput) return;
        const status = row.querySelector('.status-select').value;

        dateInput.classList.remove('date-today', 'date-warning', 'date-past');

        if (status === 'رابح' || status === 'فقدان') {
            return;
        }

        const dVal = dateInput.value;
        if (!dVal) return;

        const expDateObj = new Date(dVal);
        const diffTime = expDateObj - todayObj;
        const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays < 0) {
            dateInput.classList.add('date-past');       
        } else if (diffDays === 0) {
            dateInput.classList.add('date-today');      
        } else if (diffDays > 0 && diffDays <= 3) {
            dateInput.classList.add('date-warning');    
        }
    });
}

/* ==========================================================
   8. حفظ واسترجاع وعمليات مساعدة لبيانات الفرص (متصلة بالـ API)
   ========================================================== */
async function saveAllDataSilently() {
    const data = Array.from(document.querySelectorAll('#tableBody .main-row')).map(row => {
        const subRow = document.getElementById('sub-' + row.id); const products = [];
        if (subRow) { subRow.querySelectorAll('.product-body tr').forEach(pRow => { const inputs = pRow.querySelectorAll('input, select'); if (inputs.length >= 5) products.push({ type: inputs[0].value, desc: inputs[1].value, qty: inputs[2].value, sub: inputs[3].value, total: inputs[4].value }); }); }
        return { 
            comp: row.cells[1].querySelector('input').value, address: row.cells[2].querySelector('input').value, mgr: row.cells[3].querySelector('input').value, mob: row.cells[4].querySelector('input').value, email: row.cells[5].querySelector('input').value, record: row.cells[6].querySelector('input').value, oppDate: row.querySelector('.opp-date-val').value, curServ: row.cells[8].querySelector('input').value, oppValue: row.cells[9].querySelector('input').value, notes: row.cells[10].querySelector('.notes-preview').getAttribute('data-full-notes'), status: row.cells[11].querySelector('select').value, 
            expDate: row.cells[12].querySelector('.exp-date-input').value, 
            editDate: row.querySelector('.edit-date-val')?.value || '', 
            owner: row.cells[13].querySelector('input').value, products: products 
        };
    });
    
    try {
        await fetch(`${API_BASE_URL}/opportunities/save`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
    } catch (error) {
        console.error("خطأ أثناء حفظ البيانات في الخادم:", error);
    }
}

function debouncedSaveAllData() { clearTimeout(saveTimeout); saveTimeout = setTimeout(() => { saveAllDataSilently(); updateStats(); }, 600); }

async function loadSavedData() { 
    const tbody = document.getElementById('tableBody'); 
    if (!tbody) return; 
    tbody.innerHTML = ''; 
    
    try {
        const response = await fetch(`${API_BASE_URL}/opportunities`);
        const rawData = await response.json();
        
        if (rawData && Array.isArray(rawData)) { 
            rawData.forEach(v => renderRow(v, false)); 
        }
        
        reorderRows(); 
        updateStats(); 
        renderActivityLog(); 
        
    } catch (error) {
        console.error("خطأ في الاتصال بقاعدة البيانات:", error);
        if (typeof Swal !== "undefined") {
            Swal.fire({ icon: 'error', title: 'خطأ في الاتصال', text: 'تعذر جلب البيانات من الخادم', confirmButtonColor: '#3b82f6' });
        }
    }
}

function getTodayFormatted() { return new Date().toISOString().split('T')[0]; }
function getTimeFormatted() { const d = new Date(); return String(d.getHours()).padStart(2, '0') + ":" + String(d.getMinutes()).padStart(2, '0'); }
function getLastNoteOnlyFromJSON(jsonStr) { try { const arr = JSON.parse(jsonStr); return arr.length > 0 ? arr[arr.length - 1].text : "أضف ملاحظة..."; } catch(e) { return "أضف ملاحظة..."; } }

function applyStatusColor(selectEl) { 
    if (!selectEl) return; 
    const val = selectEl.value; 
    const parentCell = selectEl.closest('td'); 
    const mainRow = selectEl.closest('.main-row'); 
    if (!parentCell) return; 
    
    selectEl.classList.remove('status-yellow', 'status-green', 'status-red'); 
    if (mainRow) mainRow.classList.remove('closed-row'); 
    
    if (val === 'مهتم') {
        selectEl.classList.add('status-yellow'); 
    } else if (val === 'رابح') {
        selectEl.classList.add('status-green'); 
        if (mainRow) mainRow.classList.add('closed-row'); 
    } else if (val === 'فقدان') { 
        selectEl.classList.add('status-red'); 
        if (mainRow) mainRow.classList.add('closed-row'); 
    } 
    updateAllDateColors(); 
}

function reorderRows() { 
    const tbody = document.getElementById('tableBody'); if (!tbody) return; 
    const rows = Array.from(tbody.querySelectorAll('.main-row')); 
    const today = getTodayFormatted(), currentMonth = today.substring(0, 7); 
    
    const rowsData = rows.map(row => {
        const expInput = row.querySelector('.exp-date-input');
        return {
            row: row, 
            subRow: document.getElementById('sub-' + row.id), 
            date: (expInput && expInput.value) ? expInput.value : '9999-12-31'
        };
    }); 
    
    rowsData.sort((a, b) => a.date.localeCompare(b.date)); 
    
    const groups = {}; 
    rowsData.forEach(item => { 
        const month = item.date === '9999-12-31' ? 'بدون تاريخ متوقع' : item.date.substring(0, 7); 
        if (!groups[month]) groups[month] = []; 
        groups[month].push(item); 
    }); 
    
    tbody.innerHTML = ''; 
    const fragment = document.createDocumentFragment(); 
    
    const sortedMonths = Object.keys(groups).sort((a, b) => {
        if (a === currentMonth) return -1;
        if (b === currentMonth) return 1;
        if (a === 'بدون تاريخ متوقع') return 1;
        if (b === 'بدون تاريخ متوقع') return -1;
        return b.localeCompare(a);
    });

    sortedMonths.forEach(month => { 
        const sepRow = document.createElement('tr'); 
        sepRow.className = 'month-separator'; 
        const isCurrentMonth = (month === currentMonth); 
        const sepStyle = isCurrentMonth 
            ? 'background-color: #a855f7 !important; color:#fff !important; box-shadow: 0 2px 4px rgba(168,85,247,0.3);' 
            : 'background-color: #3b82f6 !important; color:#fff !important; box-shadow: 0 2px 4px rgba(59,130,246,0.3);'; 
        
        const monthText = month === 'بدون تاريخ متوقع' ? month : `الفرص المتوقعة لشهر ${month}`;

        sepRow.innerHTML = `<td colspan="14"><div class="sep-text" style="${sepStyle}"><i class="far fa-calendar-alt"></i> ${monthText}</div></td>`; 
        fragment.appendChild(sepRow); 
        groups[month].forEach(item => { fragment.appendChild(item.row); if (item.subRow) fragment.appendChild(item.subRow); }); 
    }); 
    tbody.appendChild(fragment); 
    updateAllDateColors(); 
}

function updateStats() { 
    const rows = document.querySelectorAll('#tableBody .main-row'); 
    const today = getTodayFormatted(), currentMonth = today.substring(0, 7); 
    let total = rows.length, tDay = 0, tMonth = 0, valTotal = 0, valMonth = 0; 
    rows.forEach(row => { 
        const dateInput = row.querySelector('.opp-date-val'); 
        const visitValInput = row.querySelector('.opp-value-input'); 
        const visitVal = visitValInput ? parseFloat(visitValInput.value) || 0 : 0; 
        valTotal += visitVal; 
        if (dateInput) { 
            const date = dateInput.value; 
            if (date === today) tDay++; 
            if (date.startsWith(currentMonth)) { tMonth++; valMonth += visitVal; } 
        } 
    }); 
    if (document.getElementById('stat-total')) document.getElementById('stat-total').innerText = total; 
    if (document.getElementById('stat-today')) document.getElementById('stat-today').innerText = tDay; 
    if (document.getElementById('stat-month')) document.getElementById('stat-month').innerText = tMonth; 
    if (document.getElementById('stat-value-total')) document.getElementById('stat-value-total').innerText = valTotal.toLocaleString() + ' ر.س'; 
    if (document.getElementById('stat-value-month')) document.getElementById('stat-value-month').innerText = valMonth.toLocaleString() + ' ر.س'; 
}

async function addToActivityLog(fieldName, oldVal, newVal, companyName) { 
    if (oldVal === newVal) return; 
    const days = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']; 
    const d = new Date(); 
    let dd = String(d.getDate()).padStart(2, '0'), mm = String(d.getMonth() + 1).padStart(2, '0'), yyyy = d.getFullYear(); 
    const dayName = days[d.getDay()];
    const timeStr = getTimeFormatted();
    const cleanCompany = companyName || 'شركة غير مسماة'; 
    let actionText = fieldName === 'إجراء' ? `${oldVal} لفرصة شركة ( ${cleanCompany} )` : `تعديل ${fieldName} من [${oldVal || 'فارغ'}] إلى [${newVal || 'فارغ'}] لفرصة العميل ( ${cleanCompany} )`; 
    
    const fullLogHTML = `
        <div class="log-entry">
            <span class="log-badge-user"><i class="fas fa-user-circle"></i> المستخدم</span>
            <span class="log-divider">|</span>
            <span class="log-timestamp"><i class="fas fa-clock"></i> ${dayName} ${yyyy}-${mm}-${dd} ${timeStr}</span>
            <span class="log-divider">|</span>
            <span class="log-action">${actionText}</span>
        </div>
    `; 
    
    try {
        await fetch(`${API_BASE_URL}/logs/add`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ logEntry: fullLogHTML })
        });
        renderActivityLog(); 
    } catch (error) {
        console.error("خطأ في حفظ السجل:", error);
    }
}

async function renderActivityLog() { 
    const list = document.getElementById('activityList'); 
    if (!list) return; 
    
    try {
        const response = await fetch(`${API_BASE_URL}/logs`);
        const logs = await response.json();
        list.innerHTML = logs.join(''); 
    } catch (error) {
        list.innerHTML = '<div style="color:#ef4444; text-align:center; font-size:11px; padding:10px; font-weight:700;">تعذر تحميل سجل النشاطات من الخادم</div>';
    }
}

function openWhatsAppChat(el) { 
    const inputEl = el.closest('.phone-cell-container').querySelector('input'); 
    let rawPhone = inputEl.value.trim(); 
    if (!rawPhone) { Swal.fire({icon: 'warning', title: 'تنبيه', text: 'يرجى إدخال رقم الجوال أولاً', confirmButtonText: 'حسناً', confirmButtonColor: '#3b82f6'}); return; } 
    let cleanNumber = rawPhone.replace(/\D/g, ''); 
    if (cleanNumber.startsWith('00966')) cleanNumber = cleanNumber.substring(2); 
    else if (cleanNumber.startsWith('05')) cleanNumber = '966' + cleanNumber.substring(1); 
    else if (cleanNumber.startsWith('5') && cleanNumber.length === 9) cleanNumber = '966' + cleanNumber; 
    window.open("https://wa.me/" + cleanNumber, '_blank'); 
}
