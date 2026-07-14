// ملف: models/Visit.js
const mongoose = require('mongoose');

const visitSchema = new mongoose.Schema({
    company: { type: String, required: true },
    address: { type: String },
    manager: { type: String },
    status: { type: String, default: 'جديد' }
}, { timestamps: true });

// هذا السطر هو الأهم لحل مشكلة "is not a function"
module.exports = mongoose.model('Visit', visitSchema);
