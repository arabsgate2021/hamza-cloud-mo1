const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
    orderNumber: { type: String, required: true, unique: true },
    orderName: { type: String, required: true },
    company: { type: String, required: true },
    amount: { type: Number, required: true },
    status: { type: String, default: 'قيد الانتظار' }
}, { timestamps: true });

module.exports = mongoose.model('Order', orderSchema);