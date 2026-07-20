const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema({
    type: String,
    desc: String,
    qty: Number,
    sub: Number,
    total: Number
});

const VisitSchema = new mongoose.Schema({
    comp: String,
    address: String,
    mgr: String,
    mob: String,
    email: String,
    record: String,
    visitDate: String,
    curServ: String,
    oppValue: Number,
    notes: String, // تخزين الملاحظات كـ JSON String أو تغييرها لمصفوفة لاحقاً
    status: String,
    editDate: String,
    owner: String,
    products: [ProductSchema]
}, { timestamps: true });

module.exports = mongoose.model('Visit', VisitSchema);