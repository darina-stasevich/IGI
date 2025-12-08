import React, { useState, useEffect } from 'react';

// --- ХУК ДЛЯ РАБОТЫ С localStorage ---
// Этот хук будет безопасно получать и устанавливать значения
function useLocalStorage(key, initialValue) {
    const [storedValue, setStoredValue] = useState(() => {
        try {
            const item = window.localStorage.getItem(key);
            return item ? JSON.parse(item) : initialValue;
        } catch (error) {
            console.error(error);
            return initialValue;
        }
    });

    const setValue = (value) => {
        try {
            const valueToStore = value instanceof Function ? value(storedValue) : value;
            setStoredValue(valueToStore);
            if (valueToStore === null || valueToStore === undefined) {
                window.localStorage.removeItem(key);
            } else {
                window.localStorage.setItem(key, JSON.stringify(valueToStore));
            }
        } catch (error) {
            console.error(error);
        }
    };

    return [storedValue, setValue];
}

// Функция-хелпер для расчета времени
const calculateTimeLeft = (targetDate) => {
    if (!targetDate) return null;
    const difference = +new Date(targetDate) - Date.now();
    if (difference <= 0) return null;

    return {
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / 1000 / 60) % 60),
        seconds: Math.floor((difference / 1000) % 60),
    };
};


function Aside({ nextAppointmentDate }) { // Получаем "живую" дату через props
    // --- ИСПОЛЬЗУЕМ НАШ ХУК ДЛЯ СИНХРОНИЗАЦИИ С localStorage ---
    const [storedAppointmentDate, setStoredAppointmentDate] = useLocalStorage('nextAppointmentDate', null);

    // --- ОБЪЕДИНЕННОЕ СОСТОЯНИЕ ---
    const [timeData, setTimeData] = useState({
        currentDate: new Date(),
        timeLeft: calculateTimeLeft(storedAppointmentDate), // Начальное значение берем из localStorage
    });

    // --- СИНХРОНИЗАЦИЯ ПРОПСОВ И localStorage ---
    useEffect(() => {
        // Если из App пришла новая дата, которая отличается от сохраненной, обновляем localStorage
        if (nextAppointmentDate && nextAppointmentDate !== storedAppointmentDate) {
            setStoredAppointmentDate(nextAppointmentDate);
        }
        // Если из App пришел null (например, юзер вышел), а в localStorage что-то есть - очищаем
        if (nextAppointmentDate === null && storedAppointmentDate !== null) {
            setStoredAppointmentDate(null);
        }
    }, [nextAppointmentDate, storedAppointmentDate, setStoredAppointmentDate]);

    // --- ЕДИНЫЙ ТАЙМЕР ДЛЯ ВСЕГО ---
    useEffect(() => {
        // Запускаем интервал, который обновляет ВСЕ данные каждую секунду
        const timerId = setInterval(() => {
            setTimeData({
                currentDate: new Date(),
                timeLeft: calculateTimeLeft(storedAppointmentDate)
            });
        }, 1000);

        // Очищаем интервал при размонтировании
        return () => clearInterval(timerId);

    }, [storedAppointmentDate]); // Перезапускаем таймер, если целевая дата изменилась

    const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const { currentDate, timeLeft } = timeData;

    return (
        <aside className="sidebar">
            <section id="time-widget">
                <div className="calendar-caption">
                    {currentDate.toLocaleString('ru-RU', { month: 'long', year: 'numeric' })}
                </div>
                <div className="time-info">
                    <p><strong>Ваше время:</strong><br />
                        <time>{currentDate.toLocaleTimeString('ru-RU')}</time>
                    </p>
                    <p><strong>Время (UTC):</strong><br />
                        <time>{currentDate.toLocaleTimeString('ru-RU', { timeZone: 'UTC' })}</time>
                    </p>
                </div>
            </section>

            {/* Таймер обратного отсчета */}
            {timeLeft && (
                <div className="aside-block countdown-timer">
                    <h3>До следующего приема:</h3>
                    <div className="timer-grid">
                        <div className="timer-unit"><span>{timeLeft.days}</span><small>дней</small></div>
                        <div className="timer-unit"><span>{String(timeLeft.hours).padStart(2, '0')}</span><small>часов</small></div>
                        <div className="timer-unit"><span>{String(timeLeft.minutes).padStart(2, '0')}</span><small>минут</small></div>
                        <div className="timer-unit"><span>{String(timeLeft.seconds).padStart(2, '0')}</span><small>секунд</small></div>
                    </div>
                </div>
            )}
        </aside>
    );
}

export default Aside;