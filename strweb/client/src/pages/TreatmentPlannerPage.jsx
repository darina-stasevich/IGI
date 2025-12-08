import React, { useReducer } from 'react';
import { Link } from 'react-router-dom';
import '../styles/planner.css'; // Стили для этой страницы

// --- Логика для useReducer ---
// 1. Определяем начальное состояние
const initialState = {
    step: 'initial', // 'initial', 'analyzing', 'planning', 'booking', 'tracking'
    analysisData: null,
    recommendedPlan: null,
    bookedAppointmentId: null,
    progressNotes: '',
};

// 2. Создаем reducer, который будет обрабатывать все изменения состояния
function plannerReducer(state, action) {
    switch (action.type) {
        case 'ANALYZE_SKIN':
            return { ...state, step: 'analyzing', analysisData: action.payload };
        case 'CREATE_PLAN':
            return { ...state, step: 'planning', recommendedPlan: action.payload };
        case 'BOOK_APPOINTMENT':
            return { ...state, step: 'booking', bookedAppointmentId: action.payload };
        case 'TRACK_PROGRESS':
            return { ...state, step: 'tracking', progressNotes: action.payload };
        case 'RESET':
            return initialState;
        default:
            throw new Error();
    }
}

// --- Компонент, определенный через стрелочную функцию ---
const TreatmentPlannerPage = () => {
    // 3. Используем хук useReducer
    const [state, dispatch] = useReducer(plannerReducer, initialState);

    // --- ОБРАБОТЧИКИ СОБЫТИЙ ---

    // 1. onSkinAnalyze: симулирует вызов Amazon Rekognition
    const onSkinAnalyze = () => {
        console.log('Запущен анализ кожи (симуляция вызова Amazon Rekognition)...');
        // Заглушка: через 1.5 секунды получаем "результат"
        setTimeout(() => {
            const mockAnalysis = {
                confidence: 95.5,
                concerns: ['dryness', 'pigmentation'],
                faceId: 'mock-face-id-123',
            };
            dispatch({ type: 'ANALYZE_SKIN', payload: mockAnalysis });
            console.log('Анализ завершен:', mockAnalysis);
        }, 1500);
    };

    // 2. onTreatmentPlan: симулирует вызов OpenAI для создания плана
    const onTreatmentPlan = () => {
        console.log('Запрошен план лечения (симуляция вызова OpenAI)...');
        // Заглушка: через 2 секунды получаем "план"
        setTimeout(() => {
            const mockPlan = {
                summary: 'Курс направлен на глубокое увлажнение и осветление пигментации.',
                steps: ['Химический пилинг (3 сеанса)', 'Курс увлажняющих масок (5 сеансов)'],
                recommendedProducts: ['Сыворотка с витамином C', 'Увлажняющий крем с SPF 50+'],
            };
            dispatch({ type: 'CREATE_PLAN', payload: mockPlan });
            console.log('План получен:', mockPlan);
        }, 2000);
    };

    // 3. onProductRecommend: этот обработчик может просто отображать рекомендации
    const onProductRecommend = () => {
        alert(`Рекомендуемые продукты: ${state.recommendedPlan.recommendedProducts.join(', ')}`);
    };

    // 4. onAppointmentBook: просто перенаправляет на страницу записи
    // В реальном приложении он мог бы передавать ID рекомендуемой процедуры
    const onAppointmentBook = () => {
        alert('Перенаправляем на страницу записи для бронирования первой процедуры из плана.');
        // Для реальной навигации понадобится `useNavigate`, но для демонстрации хватит alert
    };

    // 5. onProgressTrack: симулирует сохранение заметки о прогрессе
    const onProgressTrack = () => {
        const notes = prompt('Введите ваши наблюдения о прогрессе:', 'Кожа стала менее сухой.');
        if (notes) {
            dispatch({ type: 'TRACK_PROGRESS', payload: notes });
            console.log('Прогресс сохранен:', notes);
        }
    };

    // Обработчик для сброса состояния
    const onReset = () => {
        dispatch({ type: 'RESET' });
    };

    return (
        <div className="planner-page">
            <h1 className="page-title">Планировщик Курса Процедур</h1>
            <p className="page-subtitle">Интеллектуальная система для создания персонального плана ухода.</p>

            {/* Начальное состояние */}
            {state.step === 'initial' && (
                <div className="planner-step">
                    <h3>Шаг 1: Анализ кожи</h3>
                    <p>Нажмите, чтобы начать анализ состояния вашей кожи. В будущем здесь будет использоваться камера и Amazon Rekognition.</p>
                    <button className="btn btn-primary" onClick={onSkinAnalyze}>Начать анализ</button>
                </div>
            )}

            {/* Шаг анализа */}
            {state.step === 'analyzing' && (
                <div className="planner-step">
                    <h3>Шаг 2: Создание плана</h3>
                    <p>Анализ завершен! На основе данных (проблемы: {state.analysisData.concerns.join(', ')}) мы можем составить для вас план лечения с помощью AI-консультанта.</p>
                    <button className="btn btn-primary" onClick={onTreatmentPlan}>Создать план лечения</button>
                </div>
            )}

            {/* Шаг планирования и действий */}
            {state.step === 'planning' && state.recommendedPlan && (
                <div className="planner-step">
                    <h3>Шаг 3: Ваш персональный план</h3>
                    <div className="plan-card">
                        <h4>Рекомендации AI:</h4>
                        <p><strong>Обзор:</strong> {state.recommendedPlan.summary}</p>
                        <ul>
                            {state.recommendedPlan.steps.map((step, i) => <li key={i}>{step}</li>)}
                        </ul>
                    </div>
                    <div className="planner-actions">
                        <button className="btn btn-secondary" onClick={onProductRecommend}>Рекомендации по продуктам</button>
                        <Link to="/services" className="btn btn-primary" onClick={onAppointmentBook}>Записаться на процедуру</Link>
                    </div>
                    <button className="btn btn-edit" onClick={onProgressTrack}>Отследить прогресс</button>
                </div>
            )}

            {/* Шаг отслеживания прогресса */}
            {state.step === 'tracking' && (
                <div className="planner-step">
                    <h3>Прогресс сохранен!</h3>
                    <p><strong>Ваша заметка:</strong> "{state.progressNotes}"</p>
                    <p>Продолжайте следовать плану и отслеживать изменения.</p>
                </div>
            )}

            {/* Кнопка сброса */}
            {state.step !== 'initial' && (
                <button className="btn-reset" onClick={onReset}>Начать заново</button>
            )}
        </div>
    );
};

export default TreatmentPlannerPage;