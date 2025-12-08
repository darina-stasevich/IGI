// Проверяет, аутентифицирован ли пользователь
const ensureAuthenticated = (req, res, next) => {
    if (req.isAuthenticated()) {
        return next();
    }
    res.status(401).json({ message: 'Authentication required' });
};

// Проверяет, является ли пользователь администратором
const ensureAdmin = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        return next();
    }
    res.status(403).json({ message: 'Admin access required' });
};

// Убедитесь, что в экспорте тоже правильное имя
module.exports = { ensureAuthenticated, ensureAdmin };