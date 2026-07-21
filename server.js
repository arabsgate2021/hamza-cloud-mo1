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

// الاتصال بقاعدة البيانات السحابية MongoDB Atlas
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/asgate_db')
    .then(() => console.log('تم الاتصال بقاعدة البيانات بنجاح'))
    .catch(err => console.error('فشل الاتصال بقاعدة البيانات:', err));

// ربط المسارات السحابية
app.use('/api/visits', require('./routes/visitRoutes'));
app.use('/api/opportunities', require('./routes/opportunityRoutes'));

// توجيه أي طلب صفحة إلى مجلد public
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`السيرفر يعمل الآن على المنفذ: ${PORT}`);
});
