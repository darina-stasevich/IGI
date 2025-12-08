const express = require('express');
const router = express.Router();
const Appointment = require('../src/models/Appointment');
const Service = require('../src/models/Service');
const { ensureAuthenticated } = require('../src/middleware/authMiddleware');

// @route   POST /api/appointments
// @desc    Создать новую запись на процедуру
// @access  Private (только для авторизованных пользователей)
// @route   POST /api/appointments
// @desc    Создать новую запись с проверкой на конфликт времени
// @access  Private
router.post('/', ensureAuthenticated, (req, res) => {
    const { serviceId, date, notes } = req.body;

    if (!serviceId || !date) {
        return res.status(400).json({ message: 'Необходимо указать услугу и дату.' });
    }

    // --- НАЧАЛО ЯВНОЙ ЦЕПОЧКИ PROMISE ---

    // 1. ПОЛУЧЕНИЕ ДАННЫХ ДЛЯ ПРОВЕРКИ (Параллельные запросы)
    // Promise.all - идеальный инструмент для параллельных независимых запросов.
    // Он возвращает Promise, который разрешается, когда все Promise в массиве разрешены.
    Promise.all([
        Service.findById(serviceId),
        Appointment.find({ service: serviceId }) // Находим все записи на ЭТУ ЖЕ услугу
    ])
        .then(([service, existingAppointments]) => {
            // Этот .then() выполнится, когда оба запроса (findById и find) завершатся.
            // Он получает массив с результатами: [результат_первого_промиса, результат_второго_промиса].

            if (!service) {
                // Прерываем цепочку, создавая ошибку, которая будет поймана в .catch().
                throw { status: 404, message: 'Услуга не найдена.' };
            }

            // 2. РЕАЛИЗАЦИЯ СЛОЖНОЙ БИЗНЕС-ЛОГИКИ (Проверка конфликтов)
            // Эта часть синхронна и выполняется сразу.
            const newAppointmentStartTime = new Date(date);
            const newAppointmentEndTime = new Date(newAppointmentStartTime.getTime() + service.duration_minutes * 60000);

            const conflict = existingAppointments.find(existing => {
                const existingStartTime = new Date(existing.date);
                // Важно: длительность нужно брать от service, так как у разных услуг она может быть разной.
                const existingEndTime = new Date(existingStartTime.getTime() + service.duration_minutes * 60000);

                return newAppointmentStartTime < existingEndTime && newAppointmentEndTime > existingStartTime;
            });

            if (conflict) {
                // Если конфликт найден, снова прерываем цепочку.
                throw { status: 409, message: 'Выбранное время для этой услуги уже занято. Пожалуйста, выберите другое.' };
            }

            // 3. СОЗДАНИЕ ЗАПИСИ (Финальный шаг в цепочке)
            // Если все проверки пройдены, создаем новую запись.
            const newAppointment = new Appointment({
                user: req.user._id,
                service: serviceId,
                date: newAppointmentStartTime,
                notes,
            });

            // .save() тоже асинхронен и возвращает Promise.
            // Мы возвращаем этот Promise, чтобы следующий .then() в цепочке мог с ним работать.
            return newAppointment.save();
        })
        .then(savedAppointment => {
            // Этот .then() получает результат от `newAppointment.save()`.
            // Он выполнится только в случае полного успеха всей предыдущей цепочки.
            res.status(201).json({ message: 'Вы успешно записаны!', appointment: savedAppointment });
        })
        .catch(err => {
            // Единый .catch() для всей цепочки.
            // Он поймает любые ошибки, которые мы "бросили" (throw) или которые произошли в Mongoose/сети.
            console.error("Booking Error:", err.message || err);
            res.status(err.status || 500).json({ message: err.message || 'Внутренняя ошибка сервера.' });
        });
});

// @route   GET /api/appointments/my
// @desc    Получить все записи текущего пользователя
// @access  Private
router.get('/my', ensureAuthenticated, async (req, res) => {
    try {
        const appointments = await Appointment.find({ user: req.user._id })
            .sort({ date: -1 }) // Сортируем по дате, чтобы новые были сверху
            .populate({
                path: 'service', // "Заполняем" поле service данными из коллекции Service
                select: 'name price duration_minutes image', // Выбираем только нужные поля услуги
                populate: {
                    path: 'category', // Внутри услуги "заполняем" поле category
                    select: 'name' // Из категории нам нужно только имя
                }
            })
            .exec(); // Выполняем запрос

        res.json(appointments);
    } catch (err) {
        console.error("Get My Appointments Error:", err.message);
        res.status(500).json({ message: 'Внутренняя ошибка сервера.' });
    }
});

// --- НОВЫЙ МЕТОД ДЛЯ ОТМЕНЫ ЗАПИСИ ---
// @route   PUT /api/appointments/:id/cancel
// @desc    Отменить бронирование
// @access  Private (только владелец записи)
router.put('/:id/cancel', ensureAuthenticated, async (req, res) => {
    try {
        const appointment = await Appointment.findById(req.params.id);

        // 1. Проверка, существует ли запись
        if (!appointment) {
            return res.status(404).json({ message: 'Запись не найдена.' });
        }

        // 2. Проверка прав доступа: отменить может только владелец записи
        // (сравниваем ID в виде строк, чтобы избежать проблем с объектами ObjectId)
        if (appointment.user.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'У вас нет прав для отмены этой записи.' });
        }

        // 3. Бизнес-логика: нельзя отменить уже отмененную или завершенную запись
        if (appointment.status !== 'confirmed') {
            return res.status(400).json({ message: `Нельзя отменить запись со статусом "${appointment.status}".` });
        }

        // 4. Обновляем статус и сохраняем
        appointment.status = 'cancelled';
        await appointment.save();

        res.json({ message: 'Запись успешно отменена.', appointment });

    } catch (err) {
        console.error("Cancel Booking Error:", err.message);
        res.status(500).json({ message: 'Внутренняя ошибка сервера.' });
    }
});


module.exports = router;