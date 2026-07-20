const Customer = require('../models/Customer');

exports.getAllCustomers = async (req, res) => {
    try {
        const customers = await Customer.find().sort({ createdAt: -1 });
        res.json(customers);
    } catch (err) {
        console.error("تفاصيل خطأ جلب العملاء:", err);
        res.status(500).json({ error: 'خطأ في جلب بيانات العملاء', details: err.message });
    }
};

exports.createCustomer = async (req, res) => {
    try {
        const newCustomer = new Customer(req.body);
        await newCustomer.save();
        res.json(newCustomer);
    } catch (err) {
        console.error("تفاصيل خطأ حفظ العميل:", err);
        res.status(400).json({ error: 'خطأ في حفظ بيانات العميل', details: err.message });
    }
};