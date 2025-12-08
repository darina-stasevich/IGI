import {useState, useEffect} from 'react';
import {Routes, Route, useLocation} from 'react-router-dom';
import Header from './components/Header';
import Footer from './components/Footer';
import Aside from './components/Aside';
import HomePage from './pages/HomePage';
import ServicesPage from './pages/ServicesPage';
import AdminPage from './pages/AdminPage.jsx';
import ManageServicesPage from './pages/ManageServicesPage';
import BookingPage from './pages/BookingPage';
import ServiceDetailsPage from "./pages/ServiceDetailsPage.jsx";
import MyBookingsPage from "./pages/MyBookingsPage.jsx";
import SkinAnalyzerPage from "./pages/SkinAnalyzerPage.jsx";
import TreatmentPlannerPage from "./pages/TreatmentPlannerPage.jsx";

const AdminRoute = ({user, children}) => {
    if (!user) return <div>Загрузка...</div>;
    if (user.role !== 'admin') {
        return <div className="status-message error-message">Доступ запрещен.</div>;
    }
    return children;
};

const PrivateRoute = ({ user, isLoading, children }) => {
    if (isLoading) return <div className="status-message">Проверка авторизации...</div>;
    // Если пользователь не загружен (не авторизован), перенаправляем на главную
    if (!user) return <Navigate to="/" replace />;
    return children;
};


function App() {
    const [user, setUser] = useState(null);
    const [loadingUser, setLoadingUser] = useState(true);

    const location = useLocation(); // 2. Получаем текущий URL
    const [isAnimating, setIsAnimating] = useState(false); // 3. Состояние для управления анимацией

    const [nextAppointmentDate, setNextAppointmentDate] = useState(null);

    const handleLogout = async () => {
        try {
            await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
            setUser(null);
            setNextAppointmentDate(null);
            // --- КЛЮЧЕВОЕ ДЕЙСТВИЕ: ОЧИЩАЕМ localStorage ---
            localStorage.removeItem('nextAppointmentDate');
        } catch (error) {
            console.error('Logout failed:', error);
        }
    };


    useEffect(() => {
        const fetchInitialData = async () => {
            setLoadingUser(true);
            try {
                const userResponse = await fetch('/api/auth/current_user', { credentials: 'include' });
                if (userResponse.ok) {
                    const currentUser = await userResponse.json();
                    setUser(currentUser);

                    // Если пользователь есть, загружаем его записи
                    const bookingsResponse = await fetch('/api/appointments/my', { credentials: 'include' });
                    if (bookingsResponse.ok) {
                        const bookings = await bookingsResponse.json();
                        const upcoming = bookings
                            .filter(b => b.status === 'confirmed' && new Date(b.date) > new Date())
                            .sort((a, b) => new Date(a.date) - new Date(b.date));

                        if (upcoming.length > 0) {
                            // Сохраняем только дату ближайшей записи
                            setNextAppointmentDate(upcoming[0].date);
                        }
                    }
                } else {
                    setUser(null);
                }
            } catch (error) {
                setUser(null);
            } finally {
                setLoadingUser(false);
            }
        };
        fetchInitialData();
    }, []);

    // 4. Отслеживаем изменение URL (location.pathname)
    useEffect(() => {
        // Когда URL меняется, сначала запускаем анимацию "исчезновения"
        setIsAnimating(true);
        // Через короткое время (равное половине времени анимации)
        // запускаем анимацию "появления". Это создает эффект Cross-fade.
        const timer = setTimeout(() => {
            setIsAnimating(false);
        }, 200); // 200ms - половина от 400ms в CSS

        return () => clearTimeout(timer); // Очищаем таймер при смене компонента
    }, [location.pathname]); // Эффект срабатывает при каждой смене пути


    useEffect(() => {
        const fetchCurrentUser = async () => {
            try {
                const response = await fetch('/api/auth/current_user', {credentials: 'include'});
                if (response.ok) setUser(await response.json());
            } catch (error) {
                console.error("Could not fetch user", error);
            } finally {
                setLoadingUser(false);
            }
        };
        fetchCurrentUser();
    }, []);

    return (
        <div className="app-container">
            <Header user={user} onLogout={handleLogout} />
            <div className="main-wrapper">
                <Aside nextAppointmentDate={nextAppointmentDate} />
                <main className={`page-transition-container ${isAnimating ? 'page-exit' : 'page-enter'}`}>
                    <Routes location={location}>
                        <Route path="/" element={<HomePage/>}/>
                        <Route path="/services/:id" element={<ServiceDetailsPage />} />
                        <Route path="/services" element={<ServicesPage/>}/>
                        <Route path="/skin-analyzer" element={<SkinAnalyzerPage />} />
                        <Route path="/treatment-planner" element={<TreatmentPlannerPage />} />
                        <Route path="/my-bookings" element={ // 2. Добавляем новый роут
                            <PrivateRoute user={user} isLoading={loadingUser}> <MyBookingsPage /> </PrivateRoute>
                        }/>
                        <Route path="/admin" element={
                            <AdminRoute user={user} isLoading={loadingUser}> <AdminPage/> </AdminRoute>
                        }/>
                        <Route path="/admin/services" element={
                            <AdminRoute user={user} isLoading={loadingUser}> <ManageServicesPage/> </AdminRoute>
                        }/>
                        <Route path="/book/:serviceId" element={
                                <PrivateRoute user={user} isLoading={loadingUser}> <BookingPage /> </PrivateRoute>
                            }
                        />
                    </Routes>
                </main>
            </div>
            <Footer/>
        </div>
    );
}

export default App;