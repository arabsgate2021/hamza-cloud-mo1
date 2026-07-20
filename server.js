require('dotenv').config(); // تم إضافة هذا السطر في البداية لقراءة متغيرات البيئة السرية من ملف .env
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path'); // تم إضافة مكتبة path للتعامل مع مسارات المجلدات بأمان

const app = express();
app.use(cors()); //[cite: 2]
app.use(express.json()); //[cite: 2]

// تم إضافة هذا السطر لخدمة الملفات الثابتة (مثل visits.html، وملفات الـ CSS والـ JS) من مجلد public مباشرة[cite: 2]
app.use(express.static(path.join(__dirname, 'public')));

// الاتصال بقاعدة البيانات - تم التعديل ليقرأ من الرابط السحابي المؤمن أولاً أو المحلي كاحتياط
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/asgate_db')
    .then(() => console.log('تم الاتصال بقاعدة البيانات بنجاح')) //[cite: 2]
    .catch(err => console.error('فشل الاتصال بقاعدة البيانات:', err)); //[cite: 2]

// ربط المسارات[cite: 2]
app.use('/api/visits', require('./routes/visitRoutes')); //[cite: 2]

const PORT = 5000; //[cite: 2]
// تم تعديل هذا السطر ليسمح للأجهزة الأخرى بالوصول للسيرفر مستقبلاً[cite: 2]
app.listen(PORT, () => {
    console.log(`السيرفر يعمل الآن على المنفذ: ${PORT}`); //[cite: 2]
});
