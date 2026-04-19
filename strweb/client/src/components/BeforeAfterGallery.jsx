import React, { useState, useRef } from 'react';
import '../styles/gallery.css';

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

        xhr.upload.onprogress = (event) => {
            if (event.lengthComputable) {
                const percentComplete = Math.round((event.loaded / event.total) * 100);
                setUploadProgress(percentComplete);
            }
        };

        xhr.onload = () => {
            setUploadProgress(0);
            if (xhr.status >= 200 && xhr.status < 300) {
                const updatedService = JSON.parse(xhr.responseText);
                onUploadSuccess(updatedService.photoGallery);
                fileInputRef.current.value = null;
                setError('');
            } else {
                try {
                    const errorResponse = JSON.parse(xhr.responseText);
                    setError(errorResponse.message || `Ошибка сервера: ${xhr.statusText}`);
                } catch {
                    setError(`Ошибка сервера: ${xhr.statusText}`);
                }
            }
        };

        xhr.onerror = () => {
            setError('Произошла ошибка сети. Проверьте подключение.');
            setUploadProgress(0);
        };

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