const mongoose = require('mongoose');

const opportunitySchema = new mongoose.Schema({
    date: { type: String, required: true },
    value: { type: Number, required: true, default: 0 },
    status: { type: String, required: true, default: 'معلق' },
    region: { type: String, default: '' },
    supervisor: { type: String, default: '' },
    salesman: { type: String, default: '' }
}, { timestamps: true });

module.exports = mongoose.model('Opportunity', opportunitySchema);