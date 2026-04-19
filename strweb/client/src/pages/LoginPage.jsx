import React from 'react';
import '../styles/login.css'; // Создадим файл со стилями для красоты

function LoginPage() {
    return (
        <div className="login-page-container">
            <div className="login-box">
                <h1 className="login-title">Вход в систему</h1>
                <p className="login-subtitle">
                    Пожалуйста, войдите в свой аккаунт, чтобы получить доступ к вашим записям и другим персональным разделам сайта.
                </p>
                <div className="login-actions">
                    {/*
                        Это прямая ссылка на ваш бэкенд-эндпоинт, который инициирует
                        процесс аутентификации через Google.
                    */}
                    <a href="/api/auth/google" className="btn btn-primary google-login-btn">
                        Войти через Google
                    </a>
                </div>
            </div>
        </div>
    );
}

export default LoginPage;