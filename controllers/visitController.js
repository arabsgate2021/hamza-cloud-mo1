const Visit = require('../models/Visit');

exports.getAllVisits = async (req, res) => {
    try {
        const visits = await Visit.find().sort({ createdAt: -1 });
        res.json(visits);
    } catch (err) {
        console.error("تفاصيل خطأ الجلب:", err);
        res.status(500).json({ error: 'خطأ في جلب البيانات', details: err.message });
    }
};

exports.createVisit = async (req, res) => {
    try {
        const newVisit = new Visit(req.body);
        await newVisit.save();
        res.json(newVisit);
    } catch (err) {
        console.error("تفاصيل خطأ الحفظ:", err);
        res.status(400).json({ error: 'خطأ في حفظ البيانات', details: err.message });
    }
};