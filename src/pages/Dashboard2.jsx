import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { useAuth } from '../AuthContext';

// Only reachable by admin/receptionist (see RoleHome.jsx) — but still built
// defensively with allSettled rather than assuming both roles always have
// access to everything. If a stat's endpoint isn't accessible for whatever
// reason, that card is just quietly skipped instead of breaking every
// other card too (which is what happened before, using Promise.all —
// one 403 among five calls took the whole dashboard down).
export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      const today = new Date().toISOString().slice(0, 10);
      const [appts, admissions, beds, pendingRx, unpaidInvoices] = await Promise.allSettled([
        api.appointments.list({ date: today }),
        api.inpatient.admissions({ status: 'admitted' }),
        api.inpatient.beds(),
        api.pharmacy.prescriptions({ pending: 'true' }),
        api.billing.invoices({ status: 'unpaid' }),
      ]);

      const next = {};
      if (appts.status === 'fulfilled') {
        next.todayAppointments = appts.value.appointments.length;
        next.waiting = appts.value.appointments.filter((a) => a.status === 'scheduled' || a.status === 'checked_in').length;
      }
      if (admissions.status === 'fulfilled') {
        next.admitted = admissions.value.admissions.length;
      }
      if (beds.status === 'fulfilled') {
        next.availableBeds = beds.value.beds.filter((b) => b.status === 'available').length;
        next.totalBeds = beds.value.beds.length;
      }
      if (pendingRx.status === 'fulfilled') {
        next.pendingRx = pendingRx.value.prescriptions.length;
      }
      if (unpaidInvoices.status === 'fulfilled') {
        next.unpaidInvoices = unpaidInvoices.value.invoices.length;
      }
      setStats(next);

      // Only surface an error if something genuinely unexpected failed
      // (e.g. the server is down) — a 403 on a permission this role
      // doesn't have just means that card is quietly omitted above.
      const unexpectedFailure = [appts, admissions, beds, pendingRx, unpaidInvoices]
        .find((r) => r.status === 'rejected' && !String(r.reason?.message).includes('permission'));
      if (unexpectedFailure) setError(unexpectedFailure.reason.message);
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
          {stats.todayAppointments !== undefined && (
            <div className="stat-card">
              <div className="value">{stats.todayAppointments}</div>
              <div className="label">Appointments today</div>
            </div>
          )}
          {stats.waiting !== undefined && (
            <div className="stat-card">
              <div className="value">{stats.waiting}</div>
              <div className="label">Patients waiting</div>
            </div>
          )}
          {stats.admitted !== undefined && (
            <div className="stat-card">
              <div className="value">{stats.admitted}</div>
              <div className="label">Currently admitted</div>
            </div>
          )}
          {stats.totalBeds !== undefined && (
            <div className="stat-card">
              <div className="value">{stats.availableBeds}/{stats.totalBeds}</div>
              <div className="label">Beds available</div>
            </div>
          )}
          {stats.pendingRx !== undefined && (
            <div className="stat-card">
              <div className="value">{stats.pendingRx}</div>
              <div className="label">Prescriptions to dispense</div>
            </div>
          )}
          {stats.unpaidInvoices !== undefined && (
            <div className="stat-card">
              <div className="value">{stats.unpaidInvoices}</div>
              <div className="label">Unpaid invoices</div>
            </div>
          )}
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
