const express = require('express');
const router = express.Router();
const Opportunity = require('../models/Opportunity');

// جلب جميع الفرص البيعية من السحابة
router.get('/', async (req, res) => {
    try {
        const opportunities = await Opportunity.find().sort({ createdAt: -1 });
        res.json(opportunities);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// إضافة فرصة بيعية جديدة
router.post('/', async (req, res) => {
    try {
        const newOpp = new Opportunity(req.body);
        const savedOpp = await newOpp.save();
        res.status(201).json(savedOpp);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

module.exports = router;