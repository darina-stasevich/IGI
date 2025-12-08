import React, { useState, useEffect } from 'react';

function ServiceFilter({ onFilterChange, selectedSort }) {
    const [categories, setCategories] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('');

    // 1. Загружаем категории при монтировании компонента
    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const response = await fetch('/api/categories');
                const data = await response.json();
                setCategories(data);
            } catch (error) {
                console.error("Failed to fetch categories:", error);
            }
        };
        fetchCategories();
    }, []);

    // 2. Обработчики изменений в полях ввода
    const handleFilterUpdate = (key, value) => {
        const newFilters = {
            searchTerm,
            category: selectedCategory,
            sort: selectedSort,
            [key]: value // Обновляем измененное поле
        };
        onFilterChange(newFilters);
    };

    const handleSearchChange = (e) => {
        setSearchTerm(e.target.value);
        handleFilterUpdate('searchTerm', e.target.value);
    };

    const handleCategoryChange = (e) => {
        setSelectedCategory(e.target.value);
        handleFilterUpdate('category', e.target.value);
    };

    // Новый обработчик для сортировки
    const handleSortChange = (e) => {
        handleFilterUpdate('sort', e.target.value);
    };

    return (
        <div className="filters-panel">
            <input
                type="text"
                placeholder="Поиск по названию..."
                className="filter-input"
                value={searchTerm}
                onChange={handleSearchChange}
            />
            <select
                className="filter-select"
                value={selectedCategory}
                onChange={handleCategoryChange}
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
                value={selectedSort}
                onChange={handleSortChange}
            >
                <option value="">Сортировка по умолчанию</option>
                <option value="price_asc">Цена: по возрастанию</option>
                <option value="price_desc">Цена: по убыванию</option>
                <option value="duration_asc">Время: по возрастанию</option>
                <option value="duration_desc">Время: по убыванию</option>
            </select>
        </div>
    );
}

export default ServiceFilter;