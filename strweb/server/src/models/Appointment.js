const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema({
    // Ссылка на пользователя, который записывается
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    // Ссылка на услугу, на которую записываются
    service: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Service',
        required: true,
    },
    // Дата и время записи
    date: {
        type: Date,
        required: true,
    },
    // Дополнительные комментарии от клиента
    notes: {
        type: String,
        trim: true,
    },
    // Статус записи (например, подтверждена, отменена)
    status: {
        type: String,
        enum: ['confirmed', 'cancelled', 'completed'],
        default: 'confirmed',
    }
}, {
    timestamps: true // Добавляем createdAt и updatedAt
});

const Appointment = mongoose.model('Appointment', appointmentSchema);
module.exports = Appointment;