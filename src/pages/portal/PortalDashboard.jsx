import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';
import { useAuth } from '../../AuthContext';

export default function PortalDashboard() {
  const { user } = useAuth();
  const [me, setMe] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [labOrders, setLabOrders] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [meData, apptData, labData, rxData] = await Promise.all([
          api.portal.me(),
          api.portal.appointments(),
          api.portal.labResults(),
          api.portal.prescriptions(),
        ]);
        setMe(meData.patient);
        setAppointments(apptData.appointments);
        setLabOrders(labData.orders);
        setPrescriptions(rxData.prescriptions);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const upcoming = appointments
    .filter((a) => a.status === 'scheduled' && new Date(a.scheduled_at) >= new Date())
    .sort((a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at));

  const pendingLab = labOrders.filter((o) => o.status === 'pending');
  const activeRx = prescriptions.slice(0, 3);

  if (loading) return <p style={{ color: 'var(--muted)' }}>Loading…</p>;

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="eyebrow">Patient portal</div>
          <h1>Welcome, {(me?.full_name || user?.full_name || '').split(' ')[0]}</h1>
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div className="stat-grid">
        <div className="stat-card">
          <div className="value">{upcoming.length}</div>
          <div className="label">Upcoming appointments</div>
        </div>
        <div className="stat-card">
          <div className="value">{pendingLab.length}</div>
          <div className="label">Lab tests pending</div>
        </div>
        <div className="stat-card">
          <div className="value">{prescriptions.length}</div>
          <div className="label">Prescriptions on file</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div className="card" style={{ flex: 1, minWidth: 280 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <h3>Next appointment</h3>
            <Link to="/portal/appointments" className="btn btn-ghost btn-sm">View all</Link>
          </div>
          {upcoming.length === 0 ? (
            <p style={{ color: 'var(--muted)', fontSize: '0.88rem' }}>Nothing scheduled. Book a visit any time.</p>
          ) : (
            <div>
              <div style={{ fontWeight: 600 }}>{upcoming[0].doctor_name}</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>{upcoming[0].specialty || 'Doctor'}</div>
              <div style={{ marginTop: 8, fontSize: '0.9rem' }}>{new Date(upcoming[0].scheduled_at).toLocaleString()}</div>
              <div className="mono" style={{ fontSize: '0.8rem', color: 'var(--muted)', marginTop: 4 }}>Token #{upcoming[0].token_number}</div>
            </div>
          )}
        </div>

        <div className="card" style={{ flex: 1, minWidth: 280 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <h3>Recent prescriptions</h3>
            <Link to="/portal/prescriptions" className="btn btn-ghost btn-sm">View all</Link>
          </div>
          {activeRx.length === 0 ? (
            <p style={{ color: 'var(--muted)', fontSize: '0.88rem' }}>No prescriptions on file.</p>
          ) : (
            activeRx.map((rx) => (
              <div key={rx.id} style={{ padding: '8px 0', borderBottom: '1px solid var(--line)', fontSize: '0.88rem' }}>
                Prescribed by {rx.prescribed_by_name} — {new Date(rx.created_at).toLocaleDateString()}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
