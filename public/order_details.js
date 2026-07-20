import { db } from './firebase-config.js';
import { 
    collection, doc, getDoc, getDocs, updateDoc, 
    addDoc, deleteDoc, query, where, orderBy 
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

const urlParams = new URLSearchParams(window.location.search);
let currentOrderId = urlParams.get('id') || urlParams.get('orderId') || localStorage.getItem('current_order_id');

// الإعدادات والثوابت
const statusOptions = ["مكتمل", "معلق", "جديد", "مرتجع", "فقدان"];
const statusOrder = { "مكتمل": 1, "معلق": 2, "جديد": 3, "مرتجع": 4, "فقدان": 5 };

// الدوال الأساسية (Utility)
function formatNumberWithOneDecimal(num) {
    return Number(num).toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

function getTodayFormatted() {
    return new Date().toISOString().split('T')[0];
}

// ==========================================
// التعامل مع البيانات (Firebase)
// ==========================================

// تحميل بيانات الطلب والمنتجات
window.loadOrderDetails = async function() {
    if (!currentOrderId) return;
    
    // 1. تحميل بيانات الطلب الأساسية من كوليكشن "sales"
    try {
        const q = query(collection(db, "sales"), where("id", "==", currentOrderId));
        const querySnapshot = await getDocs(q);
        querySnapshot.forEach((doc) => {
            const order = doc.data();
            document.getElementById('orderId').innerText = '#' + order.id;
            document.getElementById('orderType').innerText = order.type || '-';
            document.getElementById('orderComp').innerText = order.comp || '-';
            document.getElementById('orderCr').innerText = order.cr || '-';
            document.getElementById('orderStatus').innerText = order.status || '-';
        });
    } catch (e) { console.error("خطأ في تحميل بيانات الطلب:", e); }

    // 2. تحميل المنتجات المرتبطة بهذا الطلب
    await renderProducts();
};

async function renderProducts() {
    const productsBody = document.getElementById('productsBody');
    productsBody.innerHTML = '<tr><td colspan="12" style="text-align:center;">جاري تحميل المنتجات...</td></tr>';
    
    const q = query(collection(db, "products"), where("orderId", "==", currentOrderId));
    const snapshot = await getDocs(q);
    let items = [];
    snapshot.forEach(doc => items.push({ fbId: doc.id, ...doc.data() }));

    // الفرز الذكي
    items.sort((a, b) => (statusOrder[a.status] || 99) - (statusOrder[b.status] || 99));

    productsBody.innerHTML = '';
    items.forEach((p) => {
        // ... (هنا يتم بناء صفوف الجدول كما في كودك الأصلي)
        // ملاحظة: تأكد من تمرير p.fbId عند التعديل في الدوال
    });
    
    calculateTotals();
    updateStatsBox();
}

// تحديث حقل واحد
window.updateField = async function(fbId, field, value) {
    try {
        const docRef = doc(db, "products", fbId);
        await updateDoc(docRef, { [field]: value });
        console.log("تم التحديث");
    } catch (e) { console.error(e); }
};

// ==========================================
// الوظائف التفاعلية (Excel-like & UI)
// ==========================================
// (يمكنك الإبقاء على دوال: dragSelect, copy/paste, calculateTotals كما هي في كودك الأصلي)

// ... [ضع الدوال التفاعلية الخاصة بك هنا] ...

// ==========================================
// تصدير الدوال للـ HTML
// ==========================================
window.toggleLogExpansion = toggleLogExpansion;
window.changeStatus = async function(fbId, newStatus) {
    await updateField(fbId, 'status', newStatus);
    await renderProducts();
};

// ... (تصدير باقي الدوال) ...