import React from 'react';

function AuthButtons({ user }) {
    if (user) {
        return (
            <div className="auth-buttons">
                <span className="user-greeting">Привет, {user.displayName}!</span>
                <a href="http://localhost:5000/api/auth/logout" className="btn btn-secondary">
                    Выйти
                </a>
            </div>
        );
    } else {
        return (
            <div className="auth-buttons">
                <a href="http://localhost:5000/api/auth/google" className="btn btn-google">
                    Войти через Google
                </a>
            </div>
        );
    }
}

export default AuthButtons;