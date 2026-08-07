import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../AuthContext';

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}
function tomorrowISO() {
  return new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
}
function startOfWeekISO() {
  const d = new Date();
  const day = d.getDay(); // 0 = Sunday
  const diff = day === 0 ? 6 : day - 1; // days since Monday
  d.setDate(d.getDate() - diff);
  return d.toISOString().slice(0, 10);
}
function startOfMonthISO() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}

// Only reachable by admin/receptionist (see RoleHome.jsx). The two roles
// want fundamentally different things from a landing page — admin wants
// money and the shape of the business, reception wants "what's happening
// right now" — so this renders one of two very different bodies rather
// than trying to make one grid serve both.
export default function Dashboard() {
  const { user } = useAuth();
  if (user?.role === 'admin') return <AdminDashboard user={user} />;
  return <ReceptionistDashboard user={user} />;
}

function AdminDashboard({ user }) {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      const today = todayISO();
      const calls = [
        api.reports.overview({ from: today, to: today }),
        api.reports.overview({ from: startOfWeekISO(), to: today }),
        api.reports.overview({ from: startOfMonthISO(), to: today }),
        api.appointments.list({ date: today }),
        api.appointments.list({ date: tomorrowISO() }),
        api.billing.invoices({ overdue: 'true' }),
        api.inventory.items({ low_stock: 'true' }),
      ];
      const [revToday, revWeek, revMonth, apptsToday, apptsTomorrow, overdue, lowStock] = await Promise.allSettled(calls);

      const next = {};
      if (revToday.status === 'fulfilled') next.revenueToday = revToday.value.revenue;
      if (revWeek.status === 'fulfilled') next.revenueWeek = revWeek.value.revenue;
      if (revMonth.status === 'fulfilled') {
        next.revenueMonth = revMonth.value.revenue;
        next.expensesMonth = revMonth.value.expenses;
        next.profitMonth = revMonth.value.profit;
      }
      if (apptsToday.status === 'fulfilled') next.apptsToday = apptsToday.value.appointments.length;
      if (apptsTomorrow.status === 'fulfilled') next.apptsTomorrow = apptsTomorrow.value.appointments.length;
      if (overdue.status === 'fulfilled') next.overdue = overdue.value.invoices.length;
      if (lowStock.status === 'fulfilled') next.lowStock = lowStock.value.items.length;
      setStats(next);

      const failed = [revToday, revWeek, revMonth, apptsToday, apptsTomorrow, overdue, lowStock].find((r) => r.status === 'rejected');
      if (failed) setError(failed.reason.message);
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
        <>
          <div className="stat-grid" style={{ marginBottom: 20 }}>
            <div className="stat-card">
              <div className="value">{stats.revenueToday?.toFixed(2)}</div>
              <div className="label">Revenue today</div>
            </div>
            <div className="stat-card">
              <div className="value">{stats.revenueWeek?.toFixed(2)}</div>
              <div className="label">Revenue this week</div>
            </div>
            <div className="stat-card">
              <div className="value">{stats.revenueMonth?.toFixed(2)}</div>
              <div className="label">Revenue this month</div>
            </div>
            <div className="stat-card">
              <div className="value" style={{ color: stats.profitMonth >= 0 ? 'inherit' : 'var(--red)' }}>{stats.profitMonth?.toFixed(2)}</div>
              <div className="label">Profit this month (after expenses)</div>
            </div>
          </div>

          <div className="stat-grid" style={{ marginBottom: 20 }}>
            <div className="stat-card">
              <div className="value">{stats.apptsToday}</div>
              <div className="label">Booked today</div>
            </div>
            <div className="stat-card">
              <div className="value">{stats.apptsTomorrow}</div>
              <div className="label">Booked tomorrow</div>
            </div>
            <Link
              to="/billing?overdue=true"
              className="stat-card"
              style={{ display: 'block', textDecoration: 'none', color: 'inherit', borderColor: stats.overdue > 0 ? 'var(--red)' : undefined }}
            >
              <div className="value" style={{ color: stats.overdue > 0 ? 'var(--red)' : undefined }}>{stats.overdue}</div>
              <div className="label">Payments overdue</div>
            </Link>
            <Link to="/inventory" className="stat-card" style={{ display: 'block', textDecoration: 'none', color: 'inherit' }}>
              <div className="value">{stats.lowStock}</div>
              <div className="label">Low stock items</div>
            </Link>
          </div>
        </>
      )}

      <div className="card">
        <h3 style={{ marginBottom: 8 }}>Want the full picture?</h3>
        <p style={{ color: 'var(--muted)', fontSize: '0.9rem', lineHeight: 1.6 }}>
          <strong>Reports</strong> breaks revenue, expenses, and per-visit profit down by any date range,
          with a doctor/patient filter. <strong>Expenses</strong> is where those get logged.
        </p>
      </div>
    </div>
  );
}

// The pre-existing operational dashboard, unchanged — reception's daily
// queue/chairs/payments view.
function ReceptionistDashboard({ user }) {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      const today = todayISO();
      const calls = [
        api.appointments.list({ date: today }),
        api.inpatient.admissions({ status: 'admitted' }),
        api.inpatient.beds(),
        api.billing.invoices({ status: 'unpaid' }),
        api.billing.invoices({ overdue: 'true' }),
      ];
      const [appts, admissions, beds, unpaidInvoices, overdueInvoices] = await Promise.allSettled(calls);

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
      if (unpaidInvoices.status === 'fulfilled') {
        next.unpaidInvoices = unpaidInvoices.value.invoices.length;
      }
      if (overdueInvoices.status === 'fulfilled') {
        next.overdueInvoices = overdueInvoices.value.invoices.length;
      }
      setStats(next);

      const unexpectedFailure = [appts, admissions, beds, unpaidInvoices, overdueInvoices]
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
              <div className="label">In treatment now</div>
            </div>
          )}
          {stats.totalBeds !== undefined && (
            <div className="stat-card">
              <div className="value">{stats.availableBeds}/{stats.totalBeds}</div>
              <div className="label">Chairs available</div>
            </div>
          )}
          {stats.unpaidInvoices !== undefined && (
            <div className="stat-card">
              <div className="value">{stats.unpaidInvoices}</div>
              <div className="label">Unpaid invoices</div>
            </div>
          )}
          {stats.overdueInvoices !== undefined && (
            <Link
              to="/billing?overdue=true"
              className="stat-card"
              style={{ display: 'block', textDecoration: 'none', color: 'inherit', borderColor: stats.overdueInvoices > 0 ? 'var(--red)' : undefined }}
            >
              <div className="value" style={{ color: stats.overdueInvoices > 0 ? 'var(--red)' : undefined }}>{stats.overdueInvoices}</div>
              <div className="label">Payments overdue</div>
            </Link>
          )}
        </div>
      )}

      <div className="card">
        <h3 style={{ marginBottom: 8 }}>Getting started</h3>
        <p style={{ color: 'var(--muted)', fontSize: '0.9rem', lineHeight: 1.6 }}>
          Use <strong>Patients</strong> to register new patients or search existing records,
          <strong> Appointments</strong> to book and manage today's walk-in queue, and
          <strong> Chairs &amp; Rooms</strong> to seat patients and track which treatment chairs are free.
        </p>
      </div>
    </div>
  );
}
