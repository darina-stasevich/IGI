function setTimeZoneCookie() {
    try {
        const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

        if (userTimeZone) {
            const expires = new Date();
            expires.setTime(expires.getTime() + (365 * 24 * 60 * 60 * 1000));

            const currentCookieValue = getCookie('user_timezone');

            if (currentCookieValue !== userTimeZone) {
                document.cookie = `user_timezone=${encodeURIComponent(userTimeZone)};expires=${expires.toUTCString()};path=/;SameSite=Lax`;
                console.log(`Timezone cookie set to: ${userTimeZone}`);

            } else {
                console.log(`Timezone cookie already set to: ${userTimeZone}`);
            }
        } else {
            console.warn('Could not determine user timezone from browser.');
        }
    } catch (error) {
        console.error('Error setting timezone cookie:', error);
    }
}

function getCookie(name) {
    const nameEQ = name + "=";
    const ca = document.cookie.split(';');
    for(let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) === ' ') c = c.substring(1, c.length);
        if (c.indexOf(nameEQ) === 0) return decodeURIComponent(c.substring(nameEQ.length, c.length));
    }
    return null;
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setTimeZoneCookie);
} else {
    setTimeZoneCookie();
}