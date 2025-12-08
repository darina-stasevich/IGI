import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import BeforeAfterGallery from '../components/BeforeAfterGallery'; // Импортируем галерею
import '../styles/details.css'; // Стили для страницы

function ServiceDetailsPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [service, setService] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isButtonHovered, setIsButtonHovered] = useState(false);


    useEffect(() => {
        const fetchService = async () => {
            try {
                setLoading(true);
                const response = await fetch(`/api/services/${id}`);
                if (!response.ok) throw new Error('Услуга не найдена');
                const data = await response.json();
                setService(data);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        fetchService();
    }, [id]);

    // Колбэк, который будет обновлять галерею после успешной загрузки
    const handleUploadSuccess = (newPhotoGallery) => {
        setService(prevService => ({
            ...prevService,
            photoGallery: newPhotoGallery
        }));
    };

    if (loading) return <div className="status-message">Загрузка...</div>;
    if (error) return <div className="status-message error-message">{error}</div>;
    if (!service) return <div className="status-message">Услуга не найдена.</div>;


    return (
        <div className="details-page-container">
            <div className="details-image-wrapper">
                <img src={service.image} alt={service.name} className="details-image" />
            </div>
            <div className="details-content-wrapper">
                {service.category && (
                    <span className="details-category-badge">{service.category.name}</span>
                )}
                <h1 className="details-title">{service.name}</h1>

                <div className="details-meta">
                    <span><strong>Цена:</strong> {service.price} BYN</span>
                    <span><strong>Длительность:</strong> {service.duration_minutes} мин.</span>
                </div>

                <p className="details-description">{service.description}</p>

                <div className="details-timestamps">
                    <p>Добавлено: {new Date(service.createdAt).toLocaleDateString()}</p>
                    <p>Обновлено: {new Date(service.updatedAt).toLocaleDateString()}</p>
                </div>

                <div className="details-actions">
                    {/* Кнопка "Назад" с использованием navigate(-1) для возврата на предыдущую страницу */}
                    <button onClick={() => navigate(-1)} className="btn btn-secondary">
                        &larr; Назад
                    </button>
                    {/* Кнопка "Записаться", ведущая на страницу бронирования */}
                    <Link
                        to={`/book/${service._id}`}
                        className="btn btn-primary"
                        onMouseOver={() => setIsButtonHovered(true)}
                        onMouseLeave={() => setIsButtonHovered(false)}
                        // --- ИЗМЕНЕНИЕ ЗДЕСЬ ---
                        // Мы добавляем новое свойство backgroundColor
                        style={{
                            // Если курсор наведен, цвет фона - красный.
                            // Иначе - пустая строка, чтобы применился стиль из класса "btn-primary" (вероятно, синий).
                            backgroundColor: isButtonHovered ? 'red' : '',

                            // Остальные эффекты оставляем для наглядности
                            transform: isButtonHovered ? 'scale(1.05)' : 'scale(1)',
                            boxShadow: isButtonHovered ? '0 4px 15px rgba(0, 0, 0, 0.2)' : '0 2px 5px rgba(0, 0, 0, 0.1)',
                            transition: 'all 0.2s ease-in-out'
                        }}
                    >
                        Записаться на процедуру
                    </Link>

                    <BeforeAfterGallery
                        serviceId={service._id}
                        initialPhotos={service.photoGallery}
                        onUploadSuccess={handleUploadSuccess}
                    />
                </div>
            </div>
        </div>
    );
}

export default ServiceDetailsPage;