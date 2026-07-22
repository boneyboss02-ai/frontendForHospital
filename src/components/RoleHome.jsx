import { Navigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import Dashboard from '../pages/Dashboard';

// Dashboard pulls together appointments, beds, pharmacy, and billing —
// data that only admin and receptionist can see all of. Doctors, nurses,
// and pharmacists don't have full access to all of that (by design — see
// the authorize() lists in the backend routes), so sending them to
// Dashboard produced a permission error instead of anything useful.
// Send each role to the page that's actually their day-to-day home instead.
const ROLE_HOME = {
  doctor: '/appointments',
  nurse: '/beds',
  pharmacist: '/pharmacy',
};

export default function RoleHome() {
  const { user } = useAuth();
  const redirectTo = ROLE_HOME[user?.role];
  if (redirectTo) return <Navigate to={redirectTo} replace />;
  return <Dashboard />;
}
