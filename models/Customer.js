const mongoose = require('mongoose');

const managerSchema = new mongoose.Schema({
    isMain: { type: Boolean, default: false },
    name: String,
    phone1: String,
    phone2: String,
    email: String,
    job: String,
    date: String
});

const customerSchema = new mongoose.Schema({
    code: { type: String, required: true, unique: true },
    comp: { type: String, required: true },
    city: String,
    address: String,
    cr: String,
    cr1: String,
    cr2: String,
    mgr: String,
    mob: String,
    email: String,
    owner: String,
    source: { type: String, default: 'نظام داخلي' },
    status: { type: String, default: 'جديد' },
    classification: { type: String, default: 'صغير' },
    date: String,
    creationDate: String,
    notesText: String,
    lastNote: String,
    notesHistory: [
        {
            date: String,
            text: String
        }
    ],
    managers: [managerSchema]
}, { timestamps: true });

module.exports = mongoose.model('Customer', customerSchema);