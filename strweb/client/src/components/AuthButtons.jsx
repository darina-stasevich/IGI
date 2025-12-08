import React from 'react';

function AuthButtons({ user }) {
    if (user) {
        // Если пользователь вошел, показываем его имя и кнопку "Выйти"
        return (
            <div className="auth-buttons">
                <span className="user-greeting">Привет, {user.displayName}!</span>
                <a href="http://localhost:5000/api/auth/logout" className="btn btn-secondary">
                    Выйти
                </a>
            </div>
        );
    } else {
        // Если пользователь не вошел, показываем кнопку "Войти через Google"
        return (
            <div className="auth-buttons">
                {/* Эта ссылка ведет на наш бэкенд, который перенаправит на Google */}
                <a href="http://localhost:5000/api/auth/google" className="btn btn-google">
                    Войти через Google
                </a>
            </div>
        );
    }
}

export default AuthButtons;