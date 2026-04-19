import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import '../styles/my-bookings.css';

function MyBookingsPage() {
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchBookings = useCallback(async () => {
        try {
            setLoading(true);
            const response = await fetch('/api/appointments/my', {
                credentials: 'include',
            });
            if (!response.ok) {
                throw new Error('Не удалось загрузить ваши бронирования.');
            }
            const data = await response.json();
            data.sort((a, b) => new Date(a.date) - new Date(b.date));
            setBookings(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchBookings();
    }, [fetchBookings]);

    const handleCancelBooking = async (id) => {
        if (!window.confirm('Вы уверены, что хотите отменить эту запись?')) return;

        try {
            const response = await fetch(`/api/appointments/${id}/cancel`, {
                method: 'PUT',
                credentials: 'include',
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Не удалось отменить запись.');
            }
            fetchBookings();
        } catch (err) {
            alert(err.message);
        }
    };

    if (loading) {
        return <div className="status-message">Загружаем ваши записи...</div>;
    }

    if (error) {
        return <div className="status-message error-message">{error}</div>;
    }

    return (
        <div className="my-bookings-page">
            <h1 className="page-title">Мои Бронирования</h1>
            <p className="page-subtitle">Здесь вы можете просмотреть свои предстоящие и прошедшие визиты.</p>

            {bookings.length === 0 ? (
                <div className="no-bookings-message">
                    <p>У вас пока нет ни одной записи.</p>
                    <Link to="/services" className="btn btn-primary">Посмотреть услуги</Link>
                </div>
            ) : (
                <div className="bookings-list">
                    {bookings.map(booking => {
                        const bookingDate = new Date(booking.date);
                        const isPast = bookingDate < new Date();
                        const cardClassName = `booking-card ${isPast ? 'past-booking' : ''} status-${booking.status}`;

                        return (
                            <div key={booking._id} className={cardClassName}>
                                <div className="booking-card-header">
                                    <span className="booking-status-badge">{booking.status}</span>
                                    <h3 className="booking-service-name">{booking.service?.name || 'Услуга удалена'}</h3>
                                </div>
                                <div className="booking-card-body">
                                    <p><strong>Категория:</strong> {booking.service?.category?.name || 'N/A'}</p>
                                    <p><strong>Дата:</strong> {bookingDate.toLocaleDateString('ru-RU')}</p>
                                    <p><strong>Время:</strong> {bookingDate.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}</p>
                                    <p><strong>Стоимость:</strong> {booking.service?.price || '0'} BYN</p>
                                </div>
                                {!isPast && booking.status === 'confirmed' && (
                                    <div className="booking-card-footer">
                                        <button
                                            onClick={() => handleCancelBooking(booking._id)}
                                            className="btn btn-secondary btn-cancel"
                                        >
                                            Отменить запись
                                        </button>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

export default MyBookingsPage;