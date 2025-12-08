import React, { useState, useRef } from 'react';
import '../styles/gallery.css';

// Мы больше не используем VITE_API_BASE_URL, так как Vite будет проксировать запросы.

const BeforeAfterGallery = ({ serviceId, initialPhotos = [], onUploadSuccess }) => {
    const [uploadProgress, setUploadProgress] = useState(0);
    const [error, setError] = useState('');
    const fileInputRef = useRef(null); // Ref для прямого доступа к input[type=file]

    const handleUpload = () => {
        const file = fileInputRef.current.files[0];
        if (!file) {
            setError('Пожалуйста, выберите файл для загрузки.');
            return;
        }

        const formData = new FormData();
        formData.append('photo', file);
        formData.append('caption', 'До/После');

        const xhr = new XMLHttpRequest();

        // Отслеживаем прогресс загрузки
        xhr.upload.onprogress = (event) => {
            if (event.lengthComputable) {
                const percentComplete = Math.round((event.loaded / event.total) * 100);
                setUploadProgress(percentComplete);
            }
        };

        // Обрабатываем ответ от сервера
        xhr.onload = () => {
            setUploadProgress(0); // Сбрасываем прогресс-бар
            if (xhr.status >= 200 && xhr.status < 300) {
                const updatedService = JSON.parse(xhr.responseText);
                // Вызываем колбэк, переданный из родительского компонента,
                // чтобы обновить UI без перезагрузки страницы
                onUploadSuccess(updatedService.photoGallery);
                fileInputRef.current.value = null; // Очищаем поле выбора файла
                setError('');
            } else {
                try {
                    // Пытаемся получить сообщение об ошибке из JSON ответа сервера
                    const errorResponse = JSON.parse(xhr.responseText);
                    setError(errorResponse.message || `Ошибка сервера: ${xhr.statusText}`);
                } catch {
                    // Если ответ не JSON, просто показываем статус
                    setError(`Ошибка сервера: ${xhr.statusText}`);
                }
            }
        };

        // Обрабатываем ошибки сети (например, если бэкенд выключен)
        xhr.onerror = () => {
            setError('Произошла ошибка сети. Проверьте подключение.');
            setUploadProgress(0);
        };

        // Конфигурируем и отправляем запрос на относительный URL.
        // Vite перехватит этот запрос, так как он начинается с '/api', и перенаправит его на бэкенд.
        xhr.open('POST', `/api/services/${serviceId}/photos`, true);
        xhr.send(formData);
    };

    return (
        <div className="before-after-gallery">
            <h3>Галерея "До и После"</h3>
            <div className="photo-grid">
                {initialPhotos && initialPhotos.length > 0 ? (
                    initialPhotos.map((photo, index) => (
                        <div key={photo._id || index} className="photo-item">
                            {/*
                                Используем простой относительный путь.
                                Запрос на /uploads/... будет перехвачен прокси Vite
                                и перенаправлен на http://localhost:5000/uploads/...
                            */}
                            <img
                                src={photo.url}
                                alt={photo.caption || `Результат ${index + 1}`}
                            />
                            {photo.caption && <p className="photo-caption">{photo.caption}</p>}
                        </div>
                    ))
                ) : (
                    <p>Фотографий пока нет.</p>
                )}
            </div>

            {/* Форма для загрузки новых фотографий */}
            <div className="upload-form">
                <h4>Загрузить новое фото</h4>
                <input type="file" ref={fileInputRef} accept="image/*" />
                <button onClick={handleUpload} className="btn">Загрузить</button>
                {error && <p className="error-text">{error}</p>}
                {uploadProgress > 0 && (
                    <div className="progress-bar-container">
                        <div className="progress-bar" style={{ width: `${uploadProgress}%` }}>
                            {uploadProgress}%
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default BeforeAfterGallery;