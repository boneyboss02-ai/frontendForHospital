import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import NotificationBell from './NotificationBell';
import Brand from './Brand';

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', end: true, roles: ['admin', 'receptionist'] },
  { to: '/patients', label: 'Patients' },
  { to: '/appointments', label: 'Appointments' },
  { to: '/beds', label: 'Chairs & Rooms', roles: ['nurse', 'receptionist'] },
  { to: '/lab', label: 'Lab', roles: ['doctor', 'nurse'] },
  { to: '/prescriptions', label: 'Prescriptions', roles: ['doctor', 'nurse'] },
  { to: '/inventory', label: 'Inventory', roles: ['admin', 'nurse'] },
  { to: '/treatments', label: 'Treatments', roles: ['admin'] },
  { to: '/billing', label: 'Billing', roles: ['admin', 'receptionist'] },
  { to: '/reports', label: 'Reports', roles: ['admin', 'receptionist'] },
  { to: '/expenses', label: 'Expenses', roles: ['admin'] },
  { to: '/availability', label: 'My Schedule', roles: ['admin', 'doctor'] },
  { to: '/schedule', label: "Who's on Duty" },
  { to: '/messages', label: 'Messages', roles: ['doctor'] },
  { to: '/team-chat', label: 'Team Chat' },
];

export default function Shell() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand"><Brand size={24} />Yoma<span className="dot">.</span></div>
        <nav>
          {NAV_ITEMS.filter((item) => !item.roles || item.roles.includes(user?.role)).map((item) => (
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
          <div style={{ textTransform: 'capitalize', marginBottom: 10 }}>{user?.role}</div>
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
