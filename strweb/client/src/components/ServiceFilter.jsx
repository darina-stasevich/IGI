import React, { useState, useEffect } from 'react';

const ServiceFilter = ({ filters, onFilterChange }) => {

    const [categories, setCategories] = useState([]);

    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const response = await fetch('/api/categories');
                if (!response.ok) throw new Error('Failed to fetch categories');
                const data = await response.json();
                setCategories(data);
            } catch (error) {
                console.error(error);
            }
        };
        fetchCategories();
    }, []);

    const handleFilterUpdate = (key, value) => {
        onFilterChange({
            ...filters,
            [key]: value
        });
    };

    return (
        <div className="filters-panel">
            <input
                type="text"
                placeholder="Поиск по названию..."
                className="filter-input"
                value={filters.searchTerm}
                onChange={(e) => handleFilterUpdate('searchTerm', e.target.value)}
            />
            <select
                className="filter-select"
                value={filters.category}
                onChange={(e) => handleFilterUpdate('category', e.target.value)}
            >
                <option value="">Все категории</option>
                {categories.map((category) => (
                    <option key={category._id} value={category._id}>
                        {category.name}
                    </option>
                ))}
            </select>
            <select
                className="filter-select"
                value={filters.sort}
                onChange={(e) => handleFilterUpdate('sort', e.target.value)}
            >
                <option value="">Сортировка по умолчанию</option>
                <option value="price_asc">Цена: по возрастанию</option>
                <option value="price_desc">Цена: по убыванию</option>
                <option value="duration_asc">Время: по возрастанию</option>
                <option value="duration_desc">Время: по убыванию</option>
            </select>
        </div>
    );
};

export default ServiceFilter;