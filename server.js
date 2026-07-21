require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

// خدمة الملفات الثابتة من مجلد public
app.use(express.static(path.join(__dirname, 'public')));

// الاتصال بقاعدة البيانات السحابية MongoDB Atlas أو المحلية
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/asgate_db')
    .then(() => console.log('تم الاتصال بقاعدة البيانات بنجاح'))
    .catch(err => console.error('فشل الاتصال بقاعدة البيانات:', err));

// ربط المسارات السحابية (API Routes)
app.use('/api/visits', require('./routes/visitRoutes'));
app.use('/api/opportunities', require('./routes/opportunityRoutes'));
app.use('/api/logs', require('./routes/logRoutes'));
app.use('/api/customers', require('./routes/customerRoutes')); // يشمل كل عمليات وتفاصيل العملاء

// توجيه أي طلب صفحة إلى مجلد public (دعم تطبيقات الصفحة الواحدة SPA)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`السيرفر يعمل الآن على المنفذ: ${PORT}`);
});
