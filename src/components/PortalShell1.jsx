import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import NotificationBell from './NotificationBell';

const NAV_ITEMS = [
  { to: '/portal', label: 'Overview', end: true },
  { to: '/portal/appointments', label: 'Appointments' },
  { to: '/portal/lab-results', label: 'Lab Results' },
  { to: '/portal/prescriptions', label: 'Prescriptions' },
  { to: '/portal/billing', label: 'Billing' },
];

export default function PortalShell() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">Wardline<span className="dot">.</span></div>
        <nav>
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="nav-role">
          <div style={{ color: '#EDEFEC', fontWeight: 600 }}>{user?.full_name}</div>
          <div style={{ textTransform: 'capitalize', marginBottom: 10 }}>Patient portal</div>
          <button className="btn btn-ghost btn-sm" style={{ color: '#EDEFEC', borderColor: 'rgba(255,255,255,0.2)' }} onClick={handleLogout}>
            Log out
          </button>
        </div>
      </aside>
      <main className="main">
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
          <NotificationBell />
        </div>
        <Outlet />
      </main>
    </div>
  );
}
