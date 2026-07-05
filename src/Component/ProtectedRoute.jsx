import { Navigate, useLocation } from 'react-router-dom';
import PropTypes from 'prop-types';
import { isRegisteredSession } from './authSession';

export const ProtectedRoute = ({ children, requireRegistered = false }) => {
  const location = useLocation();

  if (requireRegistered && !isRegisteredSession()) {
    return <Navigate to="/menuPrincipal" replace state={{ from: location.pathname }} />;
  }

  return children;
};

ProtectedRoute.propTypes = {
  children: PropTypes.node.isRequired,
  requireRegistered: PropTypes.bool,
};

export default ProtectedRoute;
