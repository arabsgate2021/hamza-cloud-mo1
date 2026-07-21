const express = require('express');
const router = express.Router();
const Visit = require('../models/Visit');

// جلب جميع الزيارات من السحابة
router.get('/', async (req, res) => {
    try {
        const visits = await Visit.find().sort({ createdAt: -1 });
        res.json(visits);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// إضافة زيارة جديدة
router.post('/', async (req, res) => {
    try {
        const newVisit = new Visit(req.body);
        const savedVisit = await newVisit.save();
        res.status(201).json(savedVisit);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

module.exports = router;