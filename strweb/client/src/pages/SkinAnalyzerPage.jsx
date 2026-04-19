import React, { useState, useRef } from 'react';
import { analyzeSkin } from '../services/apiService';
import '../styles/analyzer.css';

function SkinAnalyzerPage() {
    const [imageFile, setImageFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState('');
    const [message, setMessage] = useState('');
    const [sessionId, setSessionId] = useState('');

    const [loading, setLoading] = useState(false);
    const [apiResponse, setApiResponse] = useState(null);
    const [error, setError] = useState('');

    const fileInputRef = useRef(null);

    const handleFileChange = (event) => {
        const file = event.target.files[0];
        if (file) {
            setImageFile(file);
            setPreviewUrl(URL.createObjectURL(file));
            setApiResponse(null);
            setError(''); // Сбрасываем ошибку при выборе файла
        }
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        if (!imageFile) {
            setError('Пожалуйста, загрузите фотографию. Это обязательное поле.');
            return;
        }

        setLoading(true);
        setApiResponse(null);
        setError('');

        try {
            const result = await analyzeSkin(message, imageFile, sessionId);
            setApiResponse(result);
            setSessionId(result.session_id);
        } catch (err) {
            setError(err.message || 'Произошла непредвиденная ошибка.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="analyzer-page">
            <h1 className="page-title">AI-Анализатор Состояния Кожи</h1>
            <p className="page-subtitle">Загрузите фотографию вашей кожи, и наш ИИ-ассистент даст персональные рекомендации.</p>

            <form onSubmit={handleSubmit} className="analyzer-form">

                <div className="form-group">
                    <label htmlFor="file-upload">
                        Шаг 1: Загрузите фото <span className="required-star">*</span>
                    </label>
                    <div
                        id="file-upload"
                        className={`upload-area ${error && !imageFile ? 'has-error' : ''}`}
                        onClick={() => fileInputRef.current.click()}
                    >
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            accept="image/*"
                            style={{ display: 'none' }}
                        />
                        {previewUrl ? (
                            <img src={previewUrl} alt="Предпросмотр" className="image-preview" />
                        ) : (
                            <div className="upload-placeholder">
                                <span className="upload-icon">+</span>
                                <p>Нажмите, чтобы выбрать файл</p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="form-group">
                    <label htmlFor="message">Шаг 2: Добавьте комментарий (необязательно)</label>
                    <textarea
                        id="message"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="Например: 'Беспокоят высыпания на щеках в течение последней недели.'"
                        className="form-control"
                    />
                </div>

                <div className="analyze-button-container">
                    <button type="submit" className="btn btn-primary" disabled={loading}>
                        {loading ? 'Анализируем...' : 'Получить рекомендации'}
                    </button>
                </div>
            </form>

            {error && <div className="status-message error-message">{error}</div>}

            {apiResponse && (
                <div className="results-container ai-response">
                    <h3>Результаты от {apiResponse.assistant_name}</h3>
                    <p className="response-text">{apiResponse.response}</p>
                    <div className="api-meta">
                        <small>Стоимость запроса: {apiResponse.price}$</small>
                        <small>Остаток на балансе: {apiResponse.balance}$</small>
                    </div>
                </div>
            )}
        </div>
    );
}

export default SkinAnalyzerPage;