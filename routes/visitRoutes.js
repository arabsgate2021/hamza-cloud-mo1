// routes/visitRoutes.js
const express = require('express');
const router = express.Router();
const Visit = require('../models/Visit'); // تأكد أن مسار موديل قاعدة البيانات صحيح هنا

// 1. جلب جميع الزيارات (تم تعديله إلى /all ليطابق طلب الواجهة)
router.get('/all', async (req, res) => {
    try {
        const visits = await Visit.find({}).sort({ visitDate: -1 });
        res.json(visits);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// 2. مزامنة وحفظ كافة البيانات (استبدال التخزين المحلي)
router.post('/sync', async (req, res) => {
    try {
        // لمطابقة عمل localStorage: نقوم بحذف القديم وحفظ المصفوفة الجديدة القادمة من الواجهة
        await Visit.deleteMany({}); 
        const savedVisits = await Visit.insertMany(req.body);
        res.status(200).json({ success: true, count: savedVisits.length });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;