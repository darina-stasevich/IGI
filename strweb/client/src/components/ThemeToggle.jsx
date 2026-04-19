import React, { useContext } from 'react';
import { ThemeContext } from '../context/ThemeContext.jsx';
const ThemeToggle = () => {
    const { theme, toggleTheme } = useContext(ThemeContext);

    return (
        <button onClick={toggleTheme} className="theme-toggle-button">
            {theme === 'light' ? '🌜' : '🌞'}
        </button>
    );
};

export default ThemeToggle;