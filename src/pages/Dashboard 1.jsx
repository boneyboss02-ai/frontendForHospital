import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { useAuth } from '../AuthContext';

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const today = new Date().toISOString().slice(0, 10);
        const [appts, admissions, beds, pendingRx, unpaidInvoices] = await Promise.all([
          api.appointments.list({ date: today }),
          api.inpatient.admissions({ status: 'admitted' }),
          api.inpatient.beds(),
          api.pharmacy.prescriptions({ pending: 'true' }),
          api.billing.invoices({ status: 'unpaid' }),
        ]);
        const availableBeds = beds.beds.filter((b) => b.status === 'available').length;
        setStats({
          todayAppointments: appts.appointments.length,
          waiting: appts.appointments.filter((a) => a.status === 'scheduled' || a.status === 'checked_in').length,
          admitted: admissions.admissions.length,
          availableBeds,
          totalBeds: beds.beds.length,
          pendingRx: pendingRx.prescriptions.length,
          unpaidInvoices: unpaidInvoices.invoices.length,
        });
      } catch (err) {
        setError(err.message);
      }
    }
    load();
  }, []);

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="eyebrow">Overview</div>
          <h1>Good day, {user?.full_name?.split(' ')[0]}</h1>
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {stats && (
        <div className="stat-grid">
          <div className="stat-card">
            <div className="value">{stats.todayAppointments}</div>
            <div className="label">Appointments today</div>
          </div>
          <div className="stat-card">
            <div className="value">{stats.waiting}</div>
            <div className="label">Patients waiting</div>
          </div>
          <div className="stat-card">
            <div className="value">{stats.admitted}</div>
            <div className="label">Currently admitted</div>
          </div>
          <div className="stat-card">
            <div className="value">{stats.availableBeds}/{stats.totalBeds}</div>
            <div className="label">Beds available</div>
          </div>
          <div className="stat-card">
            <div className="value">{stats.pendingRx}</div>
            <div className="label">Prescriptions to dispense</div>
          </div>
          <div className="stat-card">
            <div className="value">{stats.unpaidInvoices}</div>
            <div className="label">Unpaid invoices</div>
          </div>
        </div>
      )}

      <div className="card">
        <h3 style={{ marginBottom: 8 }}>Getting started</h3>
        <p style={{ color: 'var(--muted)', fontSize: '0.9rem', lineHeight: 1.6 }}>
          Use <strong>Patients</strong> to register new patients or search existing records,
          <strong> Appointments</strong> to book and manage the outpatient queue, and
          <strong> Wards &amp; Beds</strong> to admit, discharge, and track inpatient beds.
        </p>
      </div>
    </div>
  );
}
