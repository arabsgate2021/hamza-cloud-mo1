const Order = require('../models/Order');

exports.getAllOrders = async (req, res) => {
    try {
        const orders = await Order.find().sort({ createdAt: -1 });
        res.json(orders);
    } catch (err) {
        console.error("تفاصيل خطأ جلب الطلبات:", err);
        res.status(500).json({ error: 'خطأ في جلب بيانات الطلبات', details: err.message });
    }
};

exports.createOrder = async (req, res) => {
    try {
        const newOrder = new Order(req.body);
        await newOrder.save();
        res.json(newOrder);
    } catch (err) {
        console.error("تفاصيل خطأ حفظ الطلب:", err);
        res.status(400).json({ error: 'خطأ في حفظ بيانات الطلب', details: err.message });
    }
};