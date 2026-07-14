// ملف: routes/visitRoutes.js
const express = require('express');
const router = express.Router();
const Visit = require('../models/Visit'); // استدعاء النموذج الذي أنشأناه أعلاه

// 1. جلب جميع الزيارات (GET)
router.get('/', async (req, res) => {
    try {
        const visits = await Visit.find();
        res.status(200).json({ 
            success: true, 
            message: 'تم جلب الزيارات بنجاح', 
            data: visits 
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 2. إضافة زيارة جديدة (POST)
router.post('/', async (req, res) => {
    try {
        const newVisit = new Visit(req.body);
        const savedVisit = await newVisit.save();
        res.status(201).json({ 
            success: true, 
            message: 'تم تسجيل الزيارة بنجاح', 
            data: savedVisit 
        });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

// 3. جلب زيارة محددة بالـ ID (GET)
router.get('/:id', async (req, res) => {
    try {
        const visit = await Visit.findById(req.params.id);
        if (!visit) return res.status(404).json({ success: false, message: 'الزيارة غير موجودة' });
        
        res.status(200).json({ 
            success: true, 
            message: 'تم العثور على الزيارة',
            data: visit 
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
