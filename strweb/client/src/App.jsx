import React, {useState, useEffect, useContext} from 'react';
import { Routes, Route, useLocation, Navigate} from 'react-router-dom';

import Header from './components/Header';
import Footer from './components/Footer';
import Aside from './components/Aside';
import HomePage from './pages/HomePage';
import ServicesPage from './pages/ServicesPage';
import ServiceDetailsPage from "./pages/ServiceDetailsPage.jsx";
import BookingPage from './pages/BookingPage';
import MyBookingsPage from "./pages/MyBookingsPage.jsx";
import SkinAnalyzerPage from "./pages/SkinAnalyzerPage.jsx";
import AdminPage from './pages/AdminPage.jsx';
import ManageServicesPage from './pages/ManageServicesPage';
import LoginPage from "./pages/LoginPage.jsx";
import {ThemeContext} from "./context/ThemeContext.jsx";

const PrivateRoute = ({user, isLoading, children}) => {
    if (isLoading) {
        return <div className="status-message">Проверка авторизации...</div>;
    }
    if (!user) {
        return <Navigate to="/login" replace/>;
    }
    return children;
};

const AdminRoute = ({user, isLoading, children}) => {
    if (isLoading) {
        return <div className="status-message">Проверка авторизации...</div>;
    }
    if (!user) {
        return <Navigate to="/login" replace/>;
    }
    if (user.role !== 'admin') {
        return <div className="status-message error-message">Доступ запрещен. У вас нет прав администратора.</div>;
    }
    return children;
};

function App() {
    const [user, setUser] = useState(null);
    const [loadingUser, setLoadingUser] = useState(true);
    const [nextAppointment, setNextAppointment] = useState(null);
    const location = useLocation();
    const [isAnimating, setIsAnimating] = useState(false);

    const { theme } = useContext(ThemeContext);

    const handleLogout = async () => {
        try {
            await fetch('/api/auth/logout', {method: 'POST', credentials: 'include'});
            setUser(null);
            setNextAppointment(null);
            localStorage.removeItem('nextAppointment');
        } catch (error) {
            console.error('Logout failed:', error);
        }
    };

    useEffect(() => {
        const fetchInitialData = async () => {
            setLoadingUser(true);
            try {
                const userResponse = await fetch('/api/auth/current_user', {credentials: 'include'});
                if (userResponse.ok) {
                    const currentUser = await userResponse.json();
                    setUser(currentUser);

                    const bookingsResponse = await fetch('/api/appointments/my', {credentials: 'include'});
                    if (bookingsResponse.ok) {
                        const bookings = await bookingsResponse.json();
                        const upcoming = bookings
                            .filter(b => b.status === 'confirmed' && new Date(b.date) > new Date())
                            .sort((a, b) => new Date(a.date) - new Date(b.date));

                        if (upcoming.length > 0) {
                            setNextAppointment(upcoming[0]);
                        }
                    }
                } else {
                    setUser(null);
                }
            } catch (error) {
                console.error("Failed to fetch initial data", error);
                setUser(null);
            } finally {
                setLoadingUser(false);
            }
        };
        fetchInitialData();
    }, []);

    useEffect(() => {
        setIsAnimating(true);
        const timer = setTimeout(() => setIsAnimating(false), 200);
        return () => clearTimeout(timer);
    }, [location.pathname]);

    return (
        <div className={`app-container ${theme === 'dark' ? 'theme-dark' : ''}`}>
            <Header user={user} onLogout={handleLogout}/>
            <div className="main-wrapper">
                <Aside nextAppointment={nextAppointment}/>
                <main className={`page-transition-container ${isAnimating ? 'page-exit' : 'page-enter'}`}>
                    <Routes location={location}>
                        <Route path="/" element={<HomePage/>}/>
                        <Route path="/services" element={<ServicesPage/>}/>
                        <Route path="/services/:id" element={<ServiceDetailsPage/>}/>
                        <Route path="/skin-analyzer" element={<SkinAnalyzerPage/>}/>
                        <Route path="/login" element={<LoginPage/>}/>

                        <Route path="/my-bookings" element={
                            <PrivateRoute user={user} isLoading={loadingUser}>
                                <MyBookingsPage/>
                            </PrivateRoute>
                        }/>
                        <Route path="/book/:serviceId" element={
                            <PrivateRoute user={user} isLoading={loadingUser}>
                                <BookingPage/>
                            </PrivateRoute>
                        }/>

                        <Route path="/admin" element={
                            <AdminRoute user={user} isLoading={loadingUser}>
                                <AdminPage/>
                            </AdminRoute>
                        }/>
                        <Route path="/admin/services" element={
                            <AdminRoute user={user} isLoading={loadingUser}>
                                <ManageServicesPage/>
                            </AdminRoute>
                        }/>
                    </Routes>
                </main>
            </div>
            <Footer/>
        </div>
    );
}

export default App;