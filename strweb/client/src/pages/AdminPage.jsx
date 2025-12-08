import React, { useState, useEffect } from 'react';
import '../styles/admin.css'; // Создадим этот файл позже

function AdminPage() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const fetchUsers = async () => {
        try {
            const response = await fetch('/api/users', { credentials: 'include' });
            if (response.status === 403) throw new Error('Доступ запрещен. Только для администраторов.');
            if (!response.ok) throw new Error('Ошибка загрузки пользователей.');

            const data = await response.json();
            setUsers(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const handleRoleChange = async (userId, newRole) => {
        try {
            const response = await fetch(`/api/users/${userId}/role`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ role: newRole }),
            });

            if (!response.ok) throw new Error('Не удалось обновить роль.');

            // Обновляем список пользователей локально для мгновенного отклика
            setUsers(users.map(user =>
                user._id === userId ? { ...user, role: newRole } : user
            ));

        } catch (err) {
            alert(err.message); // Показываем ошибку
        }
    };

    if (loading) return <div className="status-message">Загрузка...</div>;
    if (error) return <div className="status-message error-message">{error}</div>;

    return (
        <div className="admin-page">
            <h1>Панель администратора: Управление ролями</h1>
            <table className="users-table">
                <thead>
                <tr>
                    <th>Пользователь</th>
                    <th>Email</th>
                    <th>Текущая роль</th>
                    <th>Изменить роль</th>
                </tr>
                </thead>
                <tbody>
                {users.map(user => (
                    <tr key={user._id}>
                        <td>{user.displayName}</td>
                        <td>{user.email}</td>
                        <td>{user.role}</td>
                        <td>
                            <select
                                value={user.role}
                                onChange={(e) => handleRoleChange(user._id, e.target.value)}
                            >
                                <option value="client">Клиент</option>
                                <option value="employee">Сотрудник</option>
                                <option value="admin">Администратор</option>
                            </select>
                        </td>
                    </tr>
                ))}
                </tbody>
            </table>
        </div>
    );
}

export default AdminPage;