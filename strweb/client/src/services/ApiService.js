const API_KEY = 'Dwr_2a85e66a0ff805f5c61eaae39d0a081ada2f30fc5f01f5452ab22a1a7556afca';
const API_URL = `https://dewiar.com/dew_ai/api?key=${API_KEY}`;
const ASSISTANT_ID = 1765212446;

const toBase64 = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
});

export const analyzeSkin = async (message, imageFile, sessionId = '') => {
    let imageBase64 = '';
    if (imageFile) {
        imageBase64 = await toBase64(imageFile);
    }

    const requestData = {
        data: {
            message: message || "Проанализируй состояние кожи по этой фотографии и дай рекомендации.",
            image: imageBase64,
            idb: ASSISTANT_ID,
            session_id: sessionId,
            midnight_clear: "yes",
        }
    };

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestData)
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.response || `HTTP error! status: ${response.status}`);
        }

        const result = await response.json();

        if (result.reaction === 'error') {
            throw new Error(result.response || 'API вернуло неизвестную ошибку.');
        }

        return result;

    } catch (error) {
        console.error('Ошибка при вызове API анализатора:', error);
        throw error;
    }
};