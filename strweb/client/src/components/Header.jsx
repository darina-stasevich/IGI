import React, {useContext} from 'react';
import {NavLink} from 'react-router-dom';
import AuthButtons from "./AuthButtons.jsx";
import {ThemeContext} from "../context/ThemeContext.jsx";
import ThemeToggle from './ThemeToggle.jsx'; // 3. Импортируем новый компонент переключателя

function Header({user}) {
    const { theme } = useContext(ThemeContext);
    return (
        <header className="app-header">
            <div className="logo">
                <NavLink to="/">Aetheria</NavLink>
            </div>
            <nav className="main-nav">

                <ul>
                    <li><NavLink to="/">Главная</NavLink></li>
                    <li><NavLink to="/services">Каталог процедур</NavLink></li>
                    <li><NavLink to="/skin-analyzer">Анализ кожи</NavLink></li>
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
            <ThemeToggle />
            <AuthButtons user={user}/>
        </header>
    );
}

export default Header;