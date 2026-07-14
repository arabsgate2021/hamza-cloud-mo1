const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// الاتصال بقاعدة البيانات
mongoose.connect('mongodb://localhost:27017/asgate_db')
    .then(() => console.log('تم الاتصال بقاعدة البيانات بنجاح'))
    .catch(err => console.error('فشل الاتصال بقاعدة البيانات:', err));

// ربط المسارات
app.use('/api/visits', require('./routes/visitRoutes'));

const PORT = 5000;
app.listen(PORT, '127.0.0.1', () => {
    console.log(`السيرفر يعمل الآن على http://127.0.0.1:${PORT}`);
});
