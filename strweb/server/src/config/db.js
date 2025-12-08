const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        // Пытаемся подключиться к MongoDB по URI из переменных окружения
        const conn = await mongoose.connect(process.env.MONGO_URI);

        // Если подключение успешно, выводим сообщение в консоль
        console.log(`MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        // Если произошла ошибка, выводим её и завершаем процесс
        console.error(`Error connecting to MongoDB: ${error.message}`);
        process.exit(1); // Завершаем приложение с кодом ошибки
    }
};

// Экспортируем функцию, чтобы её можно было использовать в других файлах (в index.js)
module.exports = connectDB;