const express = require('express');
const passport = require('passport');
const router = express.Router();

// @desc    Аутентификация через Google
// @route   GET /api/auth/google
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

// @desc    Callback от Google
// @route   GET /api/auth/google/callback
router.get('/google/callback', passport.authenticate('google', {
    failureRedirect: 'http://localhost:3000/login/error' // Куда перенаправить при ошибке
}), (req, res) => {
    // При успешной аутентификации перенаправляем на главную страницу
    res.redirect('http://localhost:3000/');
});

// @desc    Получение текущего пользователя
// @route   GET /api/auth/current_user
router.get('/current_user', (req, res) => {
    if (req.user) {
        res.send(req.user); // Отправляем данные пользователя, если он в сессии
    } else {
        res.status(401).send({ message: 'Not authenticated' });
    }
});


// @desc    Выход из системы
// @route   GET /api/auth/logout
router.get('/logout', (req, res, next) => {
    req.logout(function(err) {
        if (err) { return next(err); }
        res.redirect('http://localhost:3000/'); // Перенаправляем на главную
    });
});

module.exports = router;