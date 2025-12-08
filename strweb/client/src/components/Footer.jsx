import React from 'react';

function Footer() {
    const currentYear = new Date().getFullYear();
    return (
        <footer className="app-footer">
            <p>&copy; {currentYear} Косметологический центр "Aetheria". Все права защищены.</p>
        </footer>
    );
}

export default Footer;