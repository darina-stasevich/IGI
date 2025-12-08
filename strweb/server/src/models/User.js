const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    // email оставляем, он будет приходить от Google
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true,
    },
    // Пароль теперь не является обязательным
    password: {
        type: String,
        required: false,
    },
    // Новые поля для Google Auth
    googleId: {
        type: String,
        unique: true,
        sparse: true, // Позволяет иметь много документов с пустым полем googleId
    },
    displayName: {
        type: String,
        required: true,
    },
    image: { // URL аватарки от Google
        type: String,
    },
    role: {
        type: String,
        enum: ['client', 'employee', 'admin'],
        default: 'client',
    },
}, {
    timestamps: true
});

const User = mongoose.model('User', userSchema);

module.exports = User;