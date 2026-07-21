const Customer = require('../models/Customer');

// 1. جلب كل العملاء
exports.getAllCustomers = async (req, res) => {
    try {
        const customers = await Customer.find().sort({ createdAt: -1 });
        res.json(customers);
    } catch (err) {
        res.status(500).json({ error: 'فشل جلب قائمة العملاء' });
    }
};

// 2. إضافة عميل جديد
exports.createCustomer = async (req, res) => {
    try {
        const newCustomer = new Customer(req.body);
        const saved = await newCustomer.save();
        res.status(201).json(saved);
    } catch (err) {
        res.status(400).json({ error: 'فشل حفظ بيانات العميل', details: err.message });
    }
};

// 3. جلب عميل بواسطة الكود أو الاسم
exports.getCustomerByIdentifier = async (req, res) => {
    try {
        const { identifier } = req.params;
        const customer = await Customer.findOne({
            $or: [{ code: identifier }, { comp: identifier }]
        });
        if (!customer) return res.status(404).json({ error: 'العميل غير موجود' });
        res.json(customer);
    } catch (err) {
        res.status(500).json({ error: 'خطأ في السيرفر عند جلب العميل' });
    }
};

// 4. إضافة ملاحظة لعميل
exports.addNote = async (req, res) => {
    try {
        const { date, text } = req.body;
        const customer = await Customer.findOne({
            $or: [{ code: req.params.code }, { comp: req.params.code }]
        });
        
        if (!customer) return res.status(404).json({ error: 'العميل غير موجود' });

        customer.lastNote = text;
        customer.notesText = text;
        customer.notesHistory = customer.notesHistory || [];
        customer.notesHistory.unshift({ date, text });

        await customer.save();
        res.json({ message: 'تم حفظ الملاحظة بنجاح', customer });
    } catch (err) {
        res.status(500).json({ error: 'فشل حفظ الملاحظة' });
    }
};

// 5. تحديث قائمة الاشخاص المسؤولين
exports.updateManagers = async (req, res) => {
    try {
        const { managers } = req.body;
        const customer = await Customer.findOneAndUpdate(
            { $or: [{ code: req.params.code }, { comp: req.params.code }] },
            { managers },
            { new: true }
        );
        if (!customer) return res.status(404).json({ error: 'العميل غير موجود' });
        res.json({ message: 'تم تحديث قائمة المسؤولين بنجاح', managers: customer.managers });
    } catch (err) {
        res.status(500).json({ error: 'فشل تحديث قائمة المسؤولين' });
    }
};

// 6. الحذف الجماعي
exports.bulkDelete = async (req, res) => {
    try {
        const { codes } = req.body;
        if (!codes || !codes.length) return res.status(400).json({ error: 'لم يتم تحديد أكواد للحذف' });

        await Customer.deleteMany({ code: { $in: codes } });
        res.json({ message: 'تم حذف العملاء بنجاح' });
    } catch (err) {
        res.status(500).json({ error: 'فشل عملية الحذف الجماعي' });
    }
};

// 7. تحديث بيانات العميل
exports.updateCustomer = async (req, res) => {
    try {
        const updated = await Customer.findOneAndUpdate(
            { $or: [{ code: req.params.code }, { comp: req.params.code }] },
            req.body,
            { new: true }
        );
        res.json(updated);
    } catch (err) {
        res.status(400).json({ error: 'فشل تحديث بيانات العميل' });
    }
};

// 8. حذف عميل واحد
exports.deleteCustomer = async (req, res) => {
    try {
        await Customer.findOneAndDelete({ $or: [{ code: req.params.code }, { comp: req.params.code }] });
        res.json({ message: 'تم حذف العميل بنجاح' });
    } catch (err) {
        res.status(500).json({ error: 'فشل حذف العميل' });
    }
};