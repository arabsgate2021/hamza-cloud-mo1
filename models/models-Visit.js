const mongoose = require('mongoose');

const visitSchema = new mongoose.Schema({
    company: { type: String, required: true },
    address: { type: String },
    manager: { type: String },
    status: { type: String, default: 'جديد' }
}, { timestamps: true });

module.exports = mongoose.model('Visit', visitSchema);