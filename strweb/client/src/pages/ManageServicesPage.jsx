import React, { useState, useEffect, useCallback } from 'react';
import '../styles/admin.css';

function ManageServicesPage() {
    const [services, setServices] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // --- ИЗМЕНЕНИЕ: Добавили 'image' в начальное состояние ---
    const initialFormData = {
        name: '', description: '', price: '', duration_minutes: '', category: '', image: ''
    };
    const [formData, setFormData] = useState(initialFormData);

    // --- НОВОЕ: Состояние для ошибок валидации ---
    const [formErrors, setFormErrors] = useState({});

    const [editingId, setEditingId] = useState(null);

    const fetchData = useCallback(async () => {
        // ... (без изменений)
        try {
            setLoading(true);
            const [servicesRes, categoriesRes] = await Promise.all([ fetch('/api/services'), fetch('/api/categories') ]);
            if (!servicesRes.ok || !categoriesRes.ok) throw new Error('Failed to fetch data');
            setServices(await servicesRes.json());
            setCategories(await categoriesRes.json());
            setError(null);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
        // Убираем ошибку для поля, которое пользователь начал исправлять
        if (formErrors[name]) {
            setFormErrors({ ...formErrors, [name]: null });
        }
    };

    const resetForm = () => {
        setEditingId(null);
        setFormData(initialFormData);
        setFormErrors({}); // Сбрасываем ошибки
    };

    // --- НОВОЕ: Функция валидации ---
    const validateForm = () => {
        const errors = {};
        if (!formData.name.trim()) errors.name = "Название не может быть пустым.";
        if (formData.description.length < 10) errors.description = "Описание должно содержать не менее 10 символов.";
        if (!/^\d+(\.\d{1,2})?$/.test(formData.price) || Number(formData.price) <= 0) {
            errors.price = "Цена должна быть положительным числом.";
        }
        if (!/^\d+$/.test(formData.duration_minutes) || Number(formData.duration_minutes) <= 0) {
            errors.duration_minutes = "Длительность должна быть целым положительным числом.";
        }
        if (!formData.category) errors.category = "Необходимо выбрать категорию.";
        try {
            new URL(formData.image);
        } catch (_) {
            errors.image = "Пожалуйста, введите корректный URL изображения.";
        }
        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        // --- ИЗМЕНЕНИЕ: Проверяем форму перед отправкой ---
        if (!validateForm()) {
            return;
        }

        const method = editingId ? 'PUT' : 'POST';
        const url = editingId ? `/api/services/${editingId}` : '/api/services';
        try {
            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(formData),
            });
            if (!response.ok) throw new Error(`Operation failed: ${response.statusText}`);
            resetForm();
            fetchData();
        } catch (err) {
            alert(err.message);
        }
    };

    const handleEdit = (service) => {
        setEditingId(service._id);
        // --- ИЗМЕНЕНИЕ: Добавляем 'image' при редактировании ---
        setFormData({
            name: service.name,
            description: service.description,
            price: service.price,
            duration_minutes: service.duration_minutes,
            category: service.category?._id || '',
            image: service.image || ''
        });
        setFormErrors({}); // Сбрасываем ошибки при выборе новой записи
        window.scrollTo(0, 0);
    };

    const handleDelete = async (id) => {
        // ... (без изменений)
        if (!window.confirm('Вы уверены, что хотите удалить эту услугу?')) return;
        try {
            const response = await fetch(`/api/services/${id}`, { method: 'DELETE', credentials: 'include' });
            if (!response.ok) throw new Error('Delete failed');
            fetchData();
        } catch (err) {
            alert(err.message);
        }
    };

    if (loading) return <div className="status-message">Загрузка...</div>;
    if (error) return <div className="status-message error-message">{error}</div>;

    return (
        <div className="admin-page">
            <h1 className="page-title">Управление услугами</h1>
            <p className="page-subtitle">Добавляйте, редактируйте и удаляйте услуги салона.</p>

            <form className="admin-form" onSubmit={handleSubmit} noValidate>
                <h3>{editingId ? 'Редактирование услуги' : 'Добавить новую услугу'}</h3>

                {/* --- ИЗМЕНЕНИЕ: Обернули каждое поле в div и добавили отображение ошибок --- */}
                <div className="form-group">
                    <input type="text" name="name" placeholder="Название услуги" value={formData.name} onChange={handleInputChange} className={`form-control ${formErrors.name ? 'is-invalid' : ''}`} />
                    {formErrors.name && <p className="error-text">{formErrors.name}</p>}
                </div>

                <div className="form-group">
                    <textarea name="description" placeholder="Описание" value={formData.description} onChange={handleInputChange} className={`form-control ${formErrors.description ? 'is-invalid' : ''}`} />
                    {formErrors.description && <p className="error-text">{formErrors.description}</p>}
                </div>

                <div className="form-group">
                    <input type="text" name="price" placeholder="Цена (BYN)" value={formData.price} onChange={handleInputChange} className={`form-control ${formErrors.price ? 'is-invalid' : ''}`} />
                    {formErrors.price && <p className="error-text">{formErrors.price}</p>}
                </div>

                <div className="form-group">
                    <input type="text" name="duration_minutes" placeholder="Длительность (минуты)" value={formData.duration_minutes} onChange={handleInputChange} className={`form-control ${formErrors.duration_minutes ? 'is-invalid' : ''}`} />
                    {formErrors.duration_minutes && <p className="error-text">{formErrors.duration_minutes}</p>}
                </div>

                <div className="form-group">
                    <input type="url" name="image" placeholder="URL изображения" value={formData.image} onChange={handleInputChange} className={`form-control ${formErrors.image ? 'is-invalid' : ''}`} />
                    {formErrors.image && <p className="error-text">{formErrors.image}</p>}
                </div>

                <div className="form-group">
                    <select name="category" value={formData.category} onChange={handleInputChange} className={`form-control ${formErrors.category ? 'is-invalid' : ''}`}>
                        <option value="" disabled>Выберите категорию</option>
                        {categories.map(cat => <option key={cat._id} value={cat._id}>{cat.name}</option>)}
                    </select>
                    {formErrors.category && <p className="error-text">{formErrors.category}</p>}
                </div>

                <div className="form-buttons">
                    <button type="submit" className="btn btn-primary">{editingId ? 'Сохранить' : 'Добавить'}</button>
                    {editingId && <button type="button" className="btn btn-secondary" onClick={resetForm}>Отмена</button>}
                </div>
            </form>

            <hr className="divider" />
            <h2 className="page-title">Список услуг</h2>
            {/* Таблица остается без изменений */}
            <table className="data-table">
                <thead>
                <tr>
                    <th>Название</th>
                    <th>Цена</th>
                    <th>Длительность</th>
                    <th>Действия</th>
                </tr>
                </thead>
                <tbody>
                {services.map(service => (
                    <tr key={service._id}>
                        <td>{service.name}</td>
                        <td>{service.price} BYN</td>
                        <td>{service.duration_minutes} мин.</td>
                        <td>
                            <div className="action-buttons">
                                <button className="btn-edit" onClick={() => handleEdit(service)}>Редактировать</button>
                                <button className="btn-delete" onClick={() => handleDelete(service._id)}>Удалить</button>
                            </div>
                        </td>
                    </tr>
                ))}
                </tbody>
            </table>
        </div>
    );
}

export default ManageServicesPage;