import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';

// --- Компонент-обертка (HOC) ---
// Этот функциональный компонент использует хуки и передает их значения
// как props в наш классовый компонент.
function withRouter(Component) {
    function ComponentWithRouterProp(props) {
        let params = useParams();
        let navigate = useNavigate();
        return <Component {...props} params={params} navigate={navigate} />;
    }
    return ComponentWithRouterProp;
}

// --- Наш классовый компонент `AppointmentBooker` ---
class BookingPage extends React.Component {

    // 1. Использование state через this.state в конструкторе
    constructor(props) {
        super(props);
        this.state = {
            service: null,
            loading: true,
            // Состояние для полей формы
            date: '',
            notes: '',
            // Состояние для сообщений пользователю
            formMessage: { type: '', text: '' },
        };

        // Привязка this не нужна, если использовать стрелочные функции для методов
    }

    // 2. Использование componentDidMount для начальной загрузки данных
    // Срабатывает один раз после первого рендера компонента.
    componentDidMount() {
        this.fetchServiceData();
    }

    // 3. Использование componentDidUpdate для отслеживания изменений
    // Срабатывает при каждом обновлении props или state.
    // Мы проверяем, изменился ли ID услуги, чтобы перезагрузить данные.
    componentDidUpdate(prevProps) {
        if (this.props.params.serviceId !== prevProps.params.serviceId) {
            this.fetchServiceData();
        }
    }

    // Метод для загрузки данных, вынесен для переиспользования
    fetchServiceData = async () => {
        const { serviceId } = this.props.params;
        this.setState({ loading: true });
        try {
            const response = await fetch(`/api/services/${serviceId}`);
            if (!response.ok) throw new Error('Услуга не найдена');
            const serviceData = await response.json();
            this.setState({ service: serviceData, loading: false });
        } catch (err) {
            this.setState({ formMessage: { type: 'error', text: err.message }, loading: false });
        }
    }

    // 4. Обработчик событий onChange
    // Универсальный обработчик для всех полей ввода
    handleInputChange = (event) => {
        const { name, value } = event.target;
        this.setState({ [name]: value });
    }

    // 5. Обработчик событий onSubmit
    handleSubmit = async (event) => {
        event.preventDefault();

        if (!this.state.date) {
            this.setState({ formMessage: { type: 'error', text: 'Пожалуйста, выберите дату и время.' } });
            return;
        }

        this.setState({ formMessage: { type: '', text: 'Отправляем данные...' } });

        try {
            const response = await fetch('/api/appointments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    serviceId: this.props.params.serviceId,
                    date: this.state.date,
                    notes: this.state.notes,
                }),
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.message || 'Ошибка при записи.');

            this.setState({ formMessage: { type: 'success', text: 'Вы успешно записаны! Перенаправляем...' } });

            // Используем this.props.navigate, полученный из HOC
            setTimeout(() => this.props.navigate('/my-bookings'), 3000);

        } catch (err) {
            this.setState({ formMessage: { type: 'error', text: err.message } });
        }
    };

    // 6. Метод render() - обязательный для классовых компонентов
    render() {
        const { loading, service, formMessage, date, notes } = this.state;

        if (loading) return <div className="status-message">Загрузка информации об услуге...</div>;
        if (!service) return <div className="status-message error-message">{formMessage.text || 'Услуга не найдена.'}</div>;

        return (
            <div className="booking-page">
                <h1 className="page-title">Запись на процедуру (Class Component)</h1>
                <h2 className="page-subtitle">"{service.name}"</h2>

                <form className="admin-form" onSubmit={this.handleSubmit} noValidate>
                    <p>Стоимость: <strong>{service.price} BYN</strong> | Длительность: <strong>{service.duration_minutes} мин.</strong></p>

                    <div className="form-group">
                        <label htmlFor="date">Выберите дату и время:</label>
                        <input
                            type="datetime-local"
                            id="date"
                            name="date"
                            className="form-control"
                            value={date}
                            onChange={this.handleInputChange}
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="notes">Дополнительные комментарии (необязательно):</label>
                        <textarea
                            id="notes"
                            name="notes"
                            placeholder="Например, информация об аллергиях"
                            className="form-control"
                            value={notes}
                            onChange={this.handleInputChange}
                            // 7. Добавляем еще обработчики событий
                            onFocus={(e) => e.target.style.backgroundColor = '#f9f9f9'}
                            onBlur={(e) => e.target.style.backgroundColor = ''}
                        />
                    </div>

                    <div className="form-buttons">
                        <button type="submit" className="btn btn-primary">Записаться</button>
                    </div>

                    {formMessage.text && (
                        <p className={formMessage.type === 'error' ? 'error-text' : 'success-text'}>
                            {formMessage.text}
                        </p>
                    )}
                </form>
            </div>
        );
    }
}

// Экспортируем наш классовый компонент, "обернутый" в HOC
export default withRouter(BookingPage);