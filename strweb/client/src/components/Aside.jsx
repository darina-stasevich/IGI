import React, { useState, useEffect } from 'react';

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


function Aside({ nextAppointment = null }) {
    const [storedAppointment, setStoredAppointment] = useLocalStorage('nextAppointment', null);

    const targetAppointment = nextAppointment || storedAppointment;

    const [timeData, setTimeData] = useState({
        currentDate: new Date(),
        timeLeft: calculateTimeLeft(targetAppointment?.date),
    });

    useEffect(() => {
        if (nextAppointment && nextAppointment._id !== storedAppointment?._id) {
            setStoredAppointment(nextAppointment);
        }
        if (nextAppointment === null && storedAppointment !== null) {
            setStoredAppointment(null);
        }
    }, [nextAppointment, storedAppointment, setStoredAppointment]);

    useEffect(() => {
        const timerId = setInterval(() => {
            setTimeData({
                currentDate: new Date(),
                timeLeft: calculateTimeLeft(storedAppointment?.date)
            });
        }, 1000);

        return () => clearInterval(timerId);

    }, [storedAppointment]);

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

            {timeLeft && targetAppointment && (
                <div className="aside-block countdown-timer">
                    <h3>До процедуры "{targetAppointment.service?.name || '...'}":</h3>
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