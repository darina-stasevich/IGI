import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import '../styles/services.css';
import ServiceFilter from '../components/ServiceFilter';

function ServicesPage() {
    const [services, setServices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    // Единое состояние для всех фильтров
    const [filters, setFilters] = useState({
        searchTerm: '',
        category: '',
        sort: ''
    });

    // Функция для загрузки данных с учетом всех фильтров
    const fetchServices = useCallback(async () => {
        try {
            setLoading(true);
            // Формируем URL с параметром сортировки для бэкенда
            const query = new URLSearchParams({ sort: filters.sort }).toString();
            const response = await fetch(`/api/services?${query}`);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            let data = await response.json();

            // Применяем клиентскую фильтрацию (поиск и категория) после получения отсортированных данных
            if (filters.searchTerm) {
                data = data.filter(service =>
                    service.name.toLowerCase().includes(filters.searchTerm.toLowerCase())
                );
            }

            if (filters.category) {
                data = data.filter(service => service.category?._id === filters.category);
            }

            setServices(data);
            setError(null);
        } catch (err) {
            setError(err.message);
            setServices([]);
        } finally {
            setLoading(false);
        }
    }, [filters]); // Функция будет пересоздана только при изменении фильтров

    // Вызываем fetchServices каждый раз, когда меняется сама функция (т.е. когда меняются фильтры)
    useEffect(() => {
        fetchServices();
    }, [fetchServices]);

    if (loading) {
        return <div className="status-message">Загрузка услуг...</div>;
    }

    if (error) {
        return <div className="status-message error-message">Ошибка: {error}</div>;
    }

    return (
        <div className="services-page">
            <header className="page-header">
                <h1 className="page-title">Наши Услуги</h1>
                <p className="page-subtitle">Откройте для себя процедуры, которые подчеркнут вашу естественную красоту.</p>
            </header>

            <ServiceFilter onFilterChange={setFilters} selectedSort={filters.sort} />

            <div className="services-grid">
                {services.length > 0 ? (
                    services.map((service) => (
                        <article key={service._id} className="service-card">
                            <img
                                src={service.image || `https://source.unsplash.com/random/400x300/?cosmetology,${service.name.split(' ')[0]}`}
                                alt={service.name}
                                className="service-card-image"
                            />
                            <div className="service-card-content">
                                {service.category && (
                                    <div className="service-category-badge">{service.category.name}</div>
                                )}
                                <h3 className="service-card-title">{service.name}</h3>
                                <p className="service-card-description">{service.description}</p>
                                <div className="service-card-footer">
                                    <div className="service-price">{service.price}<span> BYN</span></div>
                                    <Link to={`/services/${service._id}`} className="btn">Подробнее</Link>
                                    <Link to={`/book/${service._id}`} className="btn">Записаться</Link>
                            </div>
                            </div>
                            <div className="service-card-timestamps">
                                <p>Добавлено: {new Date(service.createdAt).toLocaleDateString()}</p>
                                <p>Обновлено: {new Date(service.updatedAt).toLocaleDateString()}</p>
                            </div>
                        </article>
                    ))
                ) : (
                    <p className="status-message">Услуги по вашему запросу не найдены.</p>
                )}
            </div>
        </div>
    );
}

export default ServicesPage;