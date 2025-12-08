const express = require('express');
const router = express.Router();
const User = require('../src/models/User');
const { ensureAuthenticated, ensureAdmin } = require('../src/middleware/authMiddleware');

// @route   GET /api/users
// @desc    Получить список всех пользователей (только для админа)
// @access  Private/Admin
router.get('/', ensureAuthenticated, ensureAdmin, async (req, res) => {
    try {
        const users = await User.find().select('-googleId'); // Не отправляем googleId
        res.json(users);
    } catch (err) {
        res.status(500).json({ message: 'Server Error' });
    }
});

// @route   PUT /api/users/:userId/role
// @desc    Обновить роль пользователя (только для админа)
// @access  Private/Admin
router.put('/:userId/role', ensureAuthenticated, ensureAdmin, async (req, res) => {
    try {
        const { role } = req.body;

        // Проверка, что переданная роль валидна
        const allowedRoles = ['client', 'employee', 'admin'];
        if (!allowedRoles.includes(role)) {
            return res.status(400).json({ message: 'Invalid role specified' });
        }

        const user = await User.findById(req.params.userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        user.role = role;
        await user.save();

        res.json(user);

    } catch (err) {
        res.status(500).json({ message: 'Server Error' });
    }
});

module.exports = router;