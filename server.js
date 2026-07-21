require('dotenv').config(); // قراءة متغيرات البيئة السرية من ملف .env محلياً
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path'); // للتعامل مع مسارات المجلدات بأمان

const app = express();
app.use(cors());
app.use(express.json());

// خدمة الملفات الثابتة من مجلد public مباشرة
app.use(express.static(path.join(__dirname, 'public')));

// الاتصال بقاعدة البيانات - يقرأ من الرابط السحابي أو المحلي كاحتياط
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/asgate_db')
    .then(() => console.log('تم الاتصال بقاعدة البيانات بنجاح'))
    .catch(err => console.error('فشل الاتصال بقاعدة البيانات:', err));

// ربط المسارات
app.use('/api/visits', require('./routes/visitRoutes'));

// استخدام بورت المنصة (Render) أو البورت 5000 محلياً
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`السيرفر يعمل الآن على المنفذ: ${PORT}`);
});
