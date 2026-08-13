import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import SearchPicker, { makeStaffFetcher } from '../components/SearchPicker';

const CATEGORIES = [
  { value: 'salary', label: 'Salary' },
  { value: 'rent', label: 'Rent' },
  { value: 'utilities', label: 'Utilities' },
  { value: 'security', label: 'Security' },
  { value: 'supplies', label: 'Supplies (outside inventory)' },
  { value: 'other', label: 'Other' },
];

const staffFetcher = makeStaffFetcher(api);

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

// Admin-only — this is money going OUT of the clinic (salaries, rent,
// security, utilities), deliberately separate from Billing, which is
// patient revenue coming IN.
export default function Expenses() {
  const [expenses, setExpenses] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const [category, setCategory] = useState('salary');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [expenseDate, setExpenseDate] = useState(todayISO());
  const [staff, setStaff] = useState(null);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const res = await api.expenses.list();
      setExpenses(res.expenses);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleAdd(e) {
    e.preventDefault();
    setError('');
    if (!description.trim() || !amount || Number(amount) <= 0) {
      setError('Description and a positive amount are required.');
      return;
    }
    try {
      await api.expenses.create({
        category,
        description: description.trim(),
        amount: Number(amount),
        staff_id: category === 'salary' && staff ? staff.id : undefined,
        expense_date: expenseDate,
      });
      setDescription('');
      setAmount('');
      setStaff(null);
      setShowForm(false);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this expense record?')) return;
    setError('');
    try {
      await api.expenses.remove(id);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  const total = expenses.reduce((sum, e) => sum + Number(e.amount), 0);

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="eyebrow">Money out</div>
          <h1>Expenses</h1>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm((s) => !s)}>
          {showForm ? 'Cancel' : '+ Add expense'}
        </button>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {showForm && (
        <div className="card" style={{ marginBottom: 24 }}>
          <h3 style={{ marginBottom: 16 }}>Record an expense</h3>
          <form onSubmit={handleAdd}>
            <div className="form-row">
              <div className="field">
                <label>Category</label>
                <select value={category} onChange={(e) => { setCategory(e.target.value); setStaff(null); }}>
                  {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
              <div className="field">
                <label>Amount</label>
                <input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
              </div>
              <div className="field">
                <label>Date</label>
                <input type="date" value={expenseDate} onChange={(e) => setExpenseDate(e.target.value)} />
              </div>
            </div>

            {category === 'salary' && (
              <div className="field">
                <label>Staff member (optional — only if they have a system account)</label>
                <SearchPicker value={staff} onSelect={setStaff} fetchResults={staffFetcher} placeholder="Search staff by name…" />
              </div>
            )}

            <div className="field">
              <label>Description</label>
              <input
                placeholder={category === 'salary' ? 'e.g. August salary - Dr. Sarah' : 'e.g. Security guard - Ahmed, Electricity bill'}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <button className="btn btn-primary">Save expense</button>
          </form>
        </div>
      )}

      <div className="stat-grid" style={{ marginBottom: 20 }}>
        <div className="stat-card">
          <div className="value">{total.toFixed(2)}</div>
          <div className="label">Total shown below</div>
        </div>
      </div>

      {loading ? (
        <p style={{ color: 'var(--muted)' }}>Loading…</p>
      ) : (
        <div className="card">
          {expenses.length === 0 ? (
            <p style={{ color: 'var(--muted)' }}>No expenses recorded yet.</p>
          ) : (
            <table>
              <thead>
                <tr><th>Date</th><th>Category</th><th>Description</th><th>Staff</th><th>Amount</th><th></th></tr>
              </thead>
              <tbody>
                {expenses.map((e) => (
                  <tr key={e.id}>
                    <td>{new Date(e.expense_date).toLocaleDateString()}</td>
                    <td style={{ textTransform: 'capitalize' }}>{e.category}</td>
                    <td>{e.description}</td>
                    <td>{e.staff_name || '—'}</td>
                    <td className="mono">{Number(e.amount).toFixed(2)}</td>
                    <td><button className="btn btn-ghost btn-sm" onClick={() => handleDelete(e.id)}>Delete</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
