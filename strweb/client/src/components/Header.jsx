import React from 'react';
import {NavLink} from 'react-router-dom';
import AuthButtons from "./AuthButtons.jsx";

function Header({user}) {
    return (
        <header className="app-header">
            <div className="logo">
                <NavLink to="/">Aetheria</NavLink>
            </div>
            <nav className="main-nav">

                <ul>
                    <li><NavLink to="/">Главная</NavLink></li>
                    <li><NavLink to="/services">Каталог процедур</NavLink></li>
                    <li><NavLink to="/about">О нас</NavLink></li>
                    <li><NavLink to="/skin-analyzer">Анализ кожи</NavLink></li>
                    <li><NavLink to="/treatment-planner">Подбор процедур</NavLink></li>
                    <li><NavLink to="/contacts">Контакты</NavLink></li>
                    {user && (
                        <li><NavLink to="/my-bookings">Мои записи</NavLink></li>
                    )}
                    {user && user.role === 'admin' && (
                        <>
                            <li><NavLink to="/admin">Пользователи</NavLink></li>
                            <li><NavLink to="/admin/services">Управление услугами</NavLink></li>
                        </>
                    )}
                </ul>
            </nav>
            <AuthButtons user={user}/>
        </header>
    );
}

export default Header;