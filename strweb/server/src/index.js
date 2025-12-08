const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const passport = require('passport');

// ---> ВОТ ЭТА СТРОКА БЫЛА ПРОПУЩЕНА <---
const session = require('express-session');
// ------------------------------------

const connectDB = require('../src/config/db');
require('../src/config/passport')(passport); // Настройка Passport

const authRoutes = require('../routes/authRoutes');
const serviceRoutes = require('../routes/serviceRoutes');
const userRoutes = require('../routes/userRoutes');
const appointmentRoutes = require('../routes/appointmentRoutes');

connectDB();

const app = express();
const PORT = process.env.PORT || 5000;


app.use(express.static(path.join(__dirname, '..', 'public')));


app.use(cors({
    origin: 'http://localhost:3000',
    credentials: true,
}));
app.use(express.json());

// 1. Настройка сессий
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 24 * 60 * 60 * 1000 // 24 часа
    }
}));

// 2. Инициализация Passport и сессий Passport
app.use(passport.initialize());
app.use(passport.session());


// Роуты
app.use('/api/auth', authRoutes);
app.use('/api', serviceRoutes);
app.use('/api/users', userRoutes);
app.use('/api/appointments', appointmentRoutes);


if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, '../../client/dist')));
    app.get('*', (req, res) => {
        res.sendFile(path.join(__dirname, '../../client/dist', 'index.html'));
    });
}

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});