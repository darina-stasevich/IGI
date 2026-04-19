import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';

function withRouter(Component) {
    function ComponentWithRouterProp(props) {
        let params = useParams();
        let navigate = useNavigate();
        return <Component {...props} params={params} navigate={navigate} />;
    }
    return ComponentWithRouterProp;
}

function PageHeader({ title, subtitle }) {
    return (
        <header className="booking-header">
            <h1 className="page-title">{title}</h1>
            {subtitle && <h2 className="page-subtitle">"{subtitle}"</h2>}
        </header>
    );
}

function ServiceInfo({ service }) {
    if (!service) return null;

    return (
        <div className="service-info">
            <p>
                Стоимость: <strong>{service.price} BYN</strong> |
                Длительность: <strong>{service.duration_minutes} мин.</strong>
            </p>
        </div>
    );
}

function DateTimePicker({
                            value,
                            onChange,
                            minDateTime,
                            errorMessage
                        }) {
    return (
        <div className="form-group">
            <label htmlFor="date">Выберите дату и время:</label>
            <input
                type="datetime-local"
                id="date"
                name="date"
                className={`form-control ${errorMessage ? 'is-invalid' : ''}`}
                value={value}
                onChange={onChange}
                min={minDateTime}
                required
            />
            <small className="form-text text-muted">
                Выберите дату и время не ранее чем на час позже текущего момента
            </small>
            {errorMessage && (
                <div className="invalid-feedback">{errorMessage}</div>
            )}
        </div>
    );
}

function NotesField({
                        value,
                        onChange,
                        placeholder = "Например, информация об аллергиях"
                    }) {
    return (
        <div className="form-group">
            <label htmlFor="notes">Дополнительные комментарии (необязательно):</label>
            <textarea
                id="notes"
                name="notes"
                placeholder={placeholder}
                className="form-control"
                value={value}
                onChange={onChange}
                onFocus={(e) => e.target.style.backgroundColor = '#f9f9f9'}
                onBlur={(e) => e.target.style.backgroundColor = ''}
            />
        </div>
    );
}

function SubmitButton({
                          isLoading,
                          children = "Записаться"
                      }) {
    return (
        <button
            type="submit"
            className="btn btn-primary"
            disabled={isLoading}
        >
            {isLoading ? 'Отправка...' : children}
        </button>
    );
}

function FormMessage({ type, text }) {
    if (!text) return null;

    const className = type === 'error' ? 'error-text' : 'success-text';

    return (
        <div className="form-message">
            <p className={className}>
                {type === 'error' ? '❌ ' : '✅ '}
                {text}
            </p>
        </div>
    );
}

function LoadingSpinner({ message = "Загрузка информации об услуге..." }) {
    return (
        <div className="status-message loading-spinner">
            <div className="spinner"></div>
            <p>{message}</p>
        </div>
    );
}

function ErrorMessage({ message = "Услуга не найдена." }) {
    return (
        <div className="status-message error-message">
            <p>{message}</p>
        </div>
    );
}

class BookingPage extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            service: null,
            loading: true,
            date: '',
            notes: '',
            formMessage: { type: '', text: '' },
            dateError: '',
            isSubmitting: false
        };
    }

    componentDidMount() {
        this.fetchServiceData();
    }

    componentDidUpdate(prevProps) {
        if (this.props.params.serviceId !== prevProps.params.serviceId) {
            this.fetchServiceData();
        }
    }

    fetchServiceData = async () => {
        const { serviceId } = this.props.params;
        this.setState({ loading: true });
        try {
            const response = await fetch(`/api/services/${serviceId}`);
            if (!response.ok) throw new Error('Услуга не найдена');
            const serviceData = await response.json();
            this.setState({
                service: serviceData,
                loading: false,
                formMessage: { type: '', text: '' }
            });
        } catch (err) {
            this.setState({
                formMessage: { type: 'error', text: err.message },
                loading: false
            });
        }
    }

    validateDate = (dateString) => {
        const selectedDate = new Date(dateString);
        const now = new Date();

        const minAllowedTime = new Date(now.getTime() + 60 * 60 * 1000);

        if (!dateString) {
            return { isValid: false, message: 'Пожалуйста, выберите дату и время.' };
        }

        if (selectedDate < now) {
            return { isValid: false, message: 'Нельзя выбрать дату в прошлом.' };
        }

        if (selectedDate < minAllowedTime) {
            return { isValid: false, message: 'Выберите время хотя бы на час позже текущего.' };
        }

        return { isValid: true, message: '' };
    }

    handleInputChange = (event) => {
        const { name, value } = event.target;

        if (name === 'date' && this.state.dateError) {
            this.setState({ dateError: '' });
        }

        this.setState({ [name]: value });

        if (name === 'date' && value) {
            const validation = this.validateDate(value);
            if (!validation.isValid) {
                this.setState({ dateError: validation.message });
            }
        }
    }

    handleSubmit = async (event) => {
        event.preventDefault();

        // Валидация даты
        const dateValidation = this.validateDate(this.state.date);
        if (!dateValidation.isValid) {
            this.setState({
                formMessage: { type: 'error', text: dateValidation.message },
                dateError: dateValidation.message
            });
            return;
        }

        this.setState({
            isSubmitting: true,
            formMessage: { type: '', text: 'Отправляем данные...' }
        });

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

            this.setState({
                formMessage: {
                    type: 'success',
                    text: 'Вы успешно записаны! Перенаправляем...'
                },
                isSubmitting: false
            });

            setTimeout(() => this.props.navigate('/my-bookings'), 3000);

        } catch (err) {
            this.setState({
                formMessage: { type: 'error', text: err.message },
                isSubmitting: false
            });
        }
    };

    getMinDateTime = () => {
        const now = new Date();
        const minAllowedTime = new Date(now.getTime() + 60 * 60 * 1000);

        const year = minAllowedTime.getFullYear();
        const month = String(minAllowedTime.getMonth() + 1).padStart(2, '0');
        const day = String(minAllowedTime.getDate()).padStart(2, '0');
        const hours = String(minAllowedTime.getHours()).padStart(2, '0');
        const minutes = String(minAllowedTime.getMinutes()).padStart(2, '0');

        return `${year}-${month}-${day}T${hours}:${minutes}`;
    }

    render() {
        const {
            loading,
            service,
            formMessage,
            date,
            notes,
            dateError,
            isSubmitting
        } = this.state;

        if (loading) {
            return <LoadingSpinner />;
        }

        if (!service) {
            return <ErrorMessage message={formMessage.text} />;
        }

        return (
            <div className="booking-page">
                <PageHeader
                    title="Запись на процедуру (Class Component)"
                    subtitle={service.name}
                />

                <form className="admin-form" onSubmit={this.handleSubmit} noValidate>
                    <ServiceInfo service={service} />

                    <DateTimePicker
                        value={date}
                        onChange={this.handleInputChange}
                        minDateTime={this.getMinDateTime()}
                        errorMessage={dateError}
                    />

                    <NotesField
                        value={notes}
                        onChange={this.handleInputChange}
                    />

                    <div className="form-buttons">
                        <SubmitButton isLoading={isSubmitting} />
                    </div>

                    <FormMessage
                        type={formMessage.type}
                        text={formMessage.text}
                    />
                </form>
            </div>
        );
    }
}

export default withRouter(BookingPage);