const Visit = require('../models/Visit');

// جلب كل الزيارات
exports.getAllVisits = async (req, res) => {
    try {
        const visits = await Visit.find().sort({ createdAt: -1 });
        res.json(visits);
    } catch (err) {
        // هذا السطر سيظهر لك السبب الحقيقي للخطأ في شاشة الـ Terminal
        console.error("تفاصيل خطأ الجلب:", err);
        res.status(500).json({ error: 'خطأ في جلب البيانات', details: err.message });
    }
};

// إضافة زيارة جديدة
exports.createVisit = async (req, res) => {
    try {
        const newVisit = new Visit(req.body);
        await newVisit.save();
        res.json(newVisit);
    } catch (err) {
        // هذا السطر سيظهر لك السبب الحقيقي للخطأ في شاشة الـ Terminal
        console.error("تفاصيل خطأ الحفظ:", err);
        res.status(400).json({ error: 'خطأ في حفظ البيانات', details: err.message });
    }
};
