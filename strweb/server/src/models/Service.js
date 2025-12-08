const mongoose = require('mongoose');

const serviceSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
    },
    description: {
        type: String,
        required: true,
    },
    price: {
        type: Number,
        required: true,
        min: [0, 'Price cannot be negative'],
    },
    duration_minutes: {
        type: Number,
        required: true,
        min: [0, 'Duration cannot be negative'],
    },
    image: {
        type: String,
        required: true,
    },
    category: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ServiceCategory', // Связь с моделью ServiceCategory
        required: true,
    },
    photoGallery: [{
        url: { type: String, required: true },      // Путь к файлу
        caption: { type: String, default: '' },     // Описание/комментарий к фото
        uploadedAt: { type: Date, default: Date.now } // Дата загрузки
    }]
}, {
    timestamps: true
});

const Service = mongoose.model('Service', serviceSchema);

module.exports = Service;