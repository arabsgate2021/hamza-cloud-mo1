const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema({
    name: { type: String, required: true },
    company: { type: String, required: true },
    email: { type: String },
    phone: { type: String },
    status: { type: String, default: 'نشط' }
}, { timestamps: true });

module.exports = mongoose.model('Customer', customerSchema);