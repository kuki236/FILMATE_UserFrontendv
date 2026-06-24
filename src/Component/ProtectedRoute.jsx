import { Navigate, useLocation } from 'react-router-dom';
import { isRegisteredSession } from './authSession';

export const ProtectedRoute = ({ children, requireRegistered = false }) => {
  const location = useLocation();

  if (requireRegistered && !isRegisteredSession()) {
    return <Navigate to="/menuPrincipal" replace state={{ from: location.pathname }} />;
  }

  return children;
};

export default ProtectedRoute;
