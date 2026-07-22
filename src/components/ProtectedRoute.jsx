import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../AuthContext';

// `roles`, if given, restricts this route to those roles — anyone else
// (still logged in, just wrong area) is bounced to their own home instead
// of the staff dashboard or portal they don't belong in.
export default function ProtectedRoute({ children, roles }) {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) return <Navigate to="/login" replace />;

  if (user.must_change_password && location.pathname !== '/change-password') {
    return <Navigate to="/change-password" replace />;
  }

  if (roles && !roles.includes(user.role)) {
    return <Navigate to={user.role === 'patient' ? '/portal' : '/'} replace />;
  }

  return children;
}
