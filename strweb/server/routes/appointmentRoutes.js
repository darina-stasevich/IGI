const express = require('express');
const router = express.Router();
const Appointment = require('../src/models/Appointment');
const Service = require('../src/models/Service');
const { ensureAuthenticated } = require('../src/middleware/authMiddleware');

// @route   POST /api/appointments
// @access  Private
router.post('/', ensureAuthenticated, (req, res) => {
    const { serviceId, date, notes } = req.body;

    if (!serviceId || !date) {
        return res.status(400).json({ message: 'Необходимо указать услугу и дату.' });
    }

    const appointmentDate = new Date(date);
    const now = new Date();

    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    if (appointmentDate < oneHourAgo) {
        return res.status(400).json({
            message: 'Нельзя записаться на прошедшее время. Выберите дату в будущем.'
        });
    }

    const oneYearFromNow = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
    if (appointmentDate > oneYearFromNow) {
        return res.status(400).json({
            message: 'Нельзя записаться более чем на год вперед.'
        });
    }

    Promise.all([
        Service.findById(serviceId),
        Appointment.find({ service: serviceId, status: 'confirmed' })
    ])
        .then(([service, existingAppointments]) => {

            if (!service) {
                throw { status: 404, message: 'Услуга не найдена.' };
            }

            // валидация
            const newAppointmentStartTime = new Date(date);
            const newAppointmentEndTime = new Date(newAppointmentStartTime.getTime() + service.duration_minutes * 60000);

            const conflict = existingAppointments.find(existing => {
                const existingStartTime = new Date(existing.date);
                const existingEndTime = new Date(existingStartTime.getTime() + service.duration_minutes * 60000);

                return newAppointmentStartTime < existingEndTime && newAppointmentEndTime > existingStartTime;
            });

            if (conflict) {
                throw { status: 409, message: 'Выбранное время для этой услуги уже занято. Пожалуйста, выберите другое.' };
            }

            const newAppointment = new Appointment({
                user: req.user._id,
                service: serviceId,
                date: newAppointmentStartTime,
                notes,
            });

            return newAppointment.save();
        })
        .then(savedAppointment => {
            res.status(201).json({ message: 'Вы успешно записаны!', appointment: savedAppointment });
        })
        .catch(err => {
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
            .sort({ date: -1 })
            .populate({
                path: 'service',
                select: 'name price duration_minutes image',
                populate: {
                    path: 'category',
                    select: 'name'
                }
            })
            .exec(); // Выполнить запрос

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

        if (!appointment) {
            return res.status(404).json({ message: 'Запись не найдена.' });
        }

        if (appointment.user.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'У вас нет прав для отмены этой записи.' });
        }

        if (appointment.status !== 'confirmed') {
            return res.status(400).json({ message: `Нельзя отменить запись со статусом "${appointment.status}".` });
        }

        appointment.status = 'cancelled';
        await appointment.save();

        res.json({ message: 'Запись успешно отменена.', appointment });

    } catch (err) {
        console.error("Cancel Booking Error:", err.message);
        res.status(500).json({ message: 'Внутренняя ошибка сервера.' });
    }
});


module.exports = router;