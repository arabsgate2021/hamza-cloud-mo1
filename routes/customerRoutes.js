const express = require('express');
const router = express.Router();
const customerController = require('../controllers/customerController');

// 1. جلب قائمة كل العملاء
router.get('/', customerController.getAllCustomers); //

// 2. إنشاء عميل جديد
router.post('/', customerController.createCustomer); //

// 3. الحذف الجماعي للعملاء
router.post('/bulk-delete', customerController.bulkDelete);

// 4. جلب بيانات عميل واحد عبر الكود أو اسم الشركة
router.get('/:identifier', customerController.getCustomerByIdentifier);

// 5. حفظ/إضافة ملاحظة جديدة لعميل محدد
router.post('/:code/notes', customerController.addNote);

// 6. تحديث قائمة المسؤولين لعميل محدد
router.put('/:code/managers', customerController.updateManagers);

// 7. تحديث بيانات عميل
router.put('/:code', customerController.updateCustomer);

// 8. حذف عميل منفرد
router.delete('/:code', customerController.deleteCustomer);

module.exports = router; //