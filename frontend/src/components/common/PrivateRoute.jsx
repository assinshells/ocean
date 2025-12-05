// frontend/src/components/common/PrivateRoute.jsx
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import Loader from './Loader';

const PrivateRoute = ({ children }) => {
    const { user, loading } = useAuth();

    if (loading) {
        return <Loader message="Проверка авторизации..." />;
    }

    return user ? children : <Navigate to="/login" replace />;
};

export default PrivateRoute;