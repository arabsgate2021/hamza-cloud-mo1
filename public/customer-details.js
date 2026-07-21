const urlParams = new URLSearchParams(window.location.search);
const clientIdentifier = urlParams.get('code') || urlParams.get('name');
let currentCustomerCode = null;

function goBackAndFocus() {
    if (clientIdentifier) sessionStorage.setItem('last_viewed_client', clientIdentifier);
    window.location.href = 'customers.html';
}

function getTodayDateFormatted() {
    const d = new Date();
    return d.getDate().toString().padStart(2, '0') + '/' + (d.getMonth() + 1).toString().padStart(2, '0') + '/' + d.getFullYear();
}

// 1. تحميل بيانات العميل والمسؤولين من قاعدة البيانات السحابية
async function loadClientData() {
    if (!clientIdentifier) return;

    try {
        const response = await fetch(`/api/customers/${encodeURIComponent(clientIdentifier)}`);
        if (!response.ok) throw new Error('تعذر جلب بيانات العميل');
        
        const client = await response.json();
        currentCustomerCode = client.code;

        document.title = `${client.comp} | تفاصيل العميل`;
        document.getElementById('c-name').innerText = client.comp || '-';
        document.getElementById('c-cr').innerText = client.cr || '0000000';
        document.getElementById('c-addr').innerText = client.address || 'غير محدد';
        document.getElementById('c-source').innerText = client.source || 'نظام داخلي';
        document.getElementById('c-owner').innerText = client.owner || 'غير محدد';

        loadManagersData(client.managers || []);
        openTab('o-history');
    } catch (err) {
        console.error('خطأ في تحميل بيانات العميل:', err);
    }
}

// 2. إضافة صف مسؤول جديد في الجدول
function addNewManagerRow() {
    const tbody = document.getElementById('managerTableBody');
    const row = tbody.insertRow();
    const todayStr = getTodayDateFormatted();
    row.innerHTML = `
        <td><input type="checkbox" class="main-check" onchange="handleMainSelection(this)"></td>
        <td><input type="text" class="mgr-input"></td>
        <td><input type="text" class="mgr-input"></td>
        <td><input type="text" class="mgr-input"></td>
        <td><input type="email" class="mgr-input"></td>
        <td><input type="text" class="mgr-input"></td>
        <td><input type="text" class="mgr-input" value="${todayStr}" disabled style="color: #64748b;"></td>
        <td><button class="btn-save-row" onclick="lockAndSaveManagerRow(this)">حفظ</button></td>
    `;
}

// 3. قفل وحفظ الصف الحالي للمسؤول
async function lockAndSaveManagerRow(btn) {
    const row = btn.closest('tr');
    const inputs = row.querySelectorAll('.mgr-input');
    
    if (!inputs[0].value.trim()) {
        alert("يرجى إدخال اسم المسؤول أولاً.");
        inputs[0].focus();
        return;
    }

    alert("لن تتمكن من الحذف أو التعديل بعد ذلك (باستثناء تحديد المسؤول الرئيسي)");
    
    inputs.forEach(input => input.disabled = true);
    btn.parentElement.innerHTML = `<span class="btn-locked-status">🔒 محفوظ ومقفل</span>`;
    
    await saveManagersToServer();
}

// 4. تحديد المسؤول الرئيسي
async function handleMainSelection(checkbox) {
    if (checkbox.checked) {
        const allChecks = document.querySelectorAll('.main-check');
        allChecks.forEach(cb => {
            if (cb !== checkbox) cb.checked = false;
        });
    }
    await saveManagersToServer();
}

// 5. إرسال وحفظ قائمة المسؤولين في السيرفر (MongoDB)
async function saveManagersToServer() {
    if (!currentCustomerCode && !clientIdentifier) return;
    const codeToUse = currentCustomerCode || clientIdentifier;

    const tbody = document.getElementById('managerTableBody');
    const managersList = [];

    tbody.querySelectorAll('tr').forEach(row => {
        const inputs = row.querySelectorAll('.mgr-input');
        const mainCheckbox = row.querySelector('.main-check');
        if (inputs.length > 0 && inputs[0].disabled) {
            managersList.push({
                isMain: mainCheckbox ? mainCheckbox.checked : false,
                name: inputs[0].value.trim(),
                phone1: inputs[1].value.trim(),
                phone2: inputs[2].value.trim(),
                email: inputs[3].value.trim(),
                job: inputs[4].value.trim(),
                date: inputs[5].value.trim()
            });
        }
    });

    try {
        await fetch(`/api/customers/${encodeURIComponent(codeToUse)}/managers`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ managers: managersList })
        });
    } catch (err) {
        console.error('فشل حفظ المسؤولين في السيرفر:', err);
    }
}

// 6. عرض جدول المسؤولين المسجلين
function loadManagersData(managersList) {
    const tbody = document.getElementById('managerTableBody');
    tbody.innerHTML = '';

    managersList.forEach(mgr => {
        const row = tbody.insertRow();
        row.innerHTML = `
            <td><input type="checkbox" class="main-check" ${mgr.isMain ? 'checked' : ''} onchange="handleMainSelection(this)"></td>
            <td><input type="text" class="mgr-input" value="${mgr.name || ''}" disabled></td>
            <td><input type="text" class="mgr-input" value="${mgr.phone1 || ''}" disabled></td>
            <td><input type="text" class="mgr-input" value="${mgr.phone2 || ''}" disabled></td>
            <td><input type="email" class="mgr-input" value="${mgr.email || ''}" disabled></td>
            <td><input type="text" class="mgr-input" value="${mgr.job || ''}" disabled></td>
            <td><input type="text" class="mgr-input" value="${mgr.date || ''}" disabled></td>
            <td><span class="btn-locked-status">🔒 محفوظ ومقفل</span></td>
        `;
    });
}

// 7. التنقل بين التبويبات وجلب سجل الزيارات من الـ API
async function openTab(tab) {
    const title = document.getElementById('frame-title');
    const content = document.getElementById('table-content');
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));

    if (tab === 'o-history') {
        document.getElementById('btn-o').classList.add('active');
        title.innerText = "🛒 سجل طلبات العميل";
        content.innerHTML = `<p style="text-align:center; color:#94a3b8; font-size:11px; margin-top:20px;">لا توجد طلبات سابقة مسجلة.</p>`;
    } else if (tab === 'attachments') {
        document.getElementById('btn-a').classList.add('active');
        title.innerText = "📁 المرفقات والملفات";
        content.innerHTML = `<p style="text-align:center; color:#94a3b8; font-size:11px; margin-top:20px;">لا توجد ملفات مرفقة.</p>`;
    } else if (tab === 'v-history') {
        document.getElementById('btn-v').classList.add('active');
        title.innerText = "📅 سجل الزيارات الميدانية";
        
        content.innerHTML = `<p style="text-align:center; color:#94a3b8; font-size:11px; margin-top:20px;">جاري تحميل سجل الزيارات...</p>`;

        try {
            const res = await fetch('/api/visits');
            const allVisits = await res.json();
            
            const compName = document.getElementById('c-name').innerText;
            const visits = allVisits.filter(v => 
                (currentCustomerCode && v.customerCode === currentCustomerCode) || 
                (compName && v.comp === compName)
            );

            content.innerHTML = visits.length > 0 ? `
                <table>
                    <thead>
                        <tr>
                            <th>التاريخ</th>
                            <th>الحالة</th>
                            <th>الملاحظات</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${visits.map(v => `
                            <tr>
                                <td>${v.visitDate || v.date || '-'}</td>
                                <td>${v.status || 'مكتملة'}</td>
                                <td>${v.notes || '-'}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>` : `<p style="text-align:center; color:#94a3b8; font-size:11px; margin-top:20px;">لا توجد سجلات زيارات حالياً.</p>`;
        } catch (err) {
            console.error('فشل جلب الزيارات:', err);
            content.innerHTML = `<p style="text-align:center; color:#ef4444; font-size:11px; margin-top:20px;">حدث خطأ في تحميل الزيارات.</p>`;
        }
    }
}