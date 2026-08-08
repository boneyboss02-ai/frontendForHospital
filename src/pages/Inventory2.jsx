import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import { useAuth } from '../AuthContext';

// General clinic inventory — medicines and dental supplies (gloves,
// anesthesia, filling material, etc.) together in one place. Purely
// internal stock tracking; not connected to billing or prescriptions.
export default function Inventory() {
  const { user } = useAuth();
  const canManage = user?.role === 'admin';
  const [tab, setTab] = useState('all'); // 'all' | 'medicine' | 'supply'
  const [items, setItems] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', category: 'medicine', unit: 'tablet', stock_quantity: '', reorder_level: '10', unit_price: '' });

  async function load() {
    setLoading(true);
    setError('');
    try {
      const params = tab === 'all' ? {} : { category: tab };
      const res = await api.inventory.items(params);
      setItems(res.items);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [tab]);

  async function handleAddItem(e) {
    e.preventDefault();
    setError('');
    try {
      await api.inventory.createItem({
        name: form.name,
        category: form.category,
        unit: form.unit,
        stock_quantity: Number(form.stock_quantity) || 0,
        reorder_level: Number(form.reorder_level) || 10,
        unit_price: Number(form.unit_price) || 0,
      });
      setForm({ name: '', category: 'medicine', unit: 'tablet', stock_quantity: '', reorder_level: '10', unit_price: '' });
      setShowForm(false);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleRestock(id) {
    const raw = window.prompt('Quantity to add to stock:');
    const delta = Number(raw);
    if (!raw || Number.isNaN(delta)) return;
    setError('');
    try {
      await api.inventory.adjustStock(id, delta);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="eyebrow">Stock</div>
          <h1>Inventory</h1>
        </div>
        {canManage && (
          <button className="btn btn-primary" onClick={() => setShowForm((s) => !s)}>
            {showForm ? 'Cancel' : '+ Add item'}
          </button>
        )}
      </div>

      {error && <div className="error-banner">{error}</div>}

      {showForm && (
        <div className="card" style={{ marginBottom: 24 }}>
          <h3 style={{ marginBottom: 16 }}>Add item to inventory</h3>
          <form onSubmit={handleAddItem}>
            <div className="form-row">
              <div className="field">
                <label>Name</label>
                <input required placeholder="e.g. Amoxicillin 500mg, Nitrile gloves" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="field">
                <label>Category</label>
                <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                  <option value="medicine">Medicine</option>
                  <option value="supply">Supply</option>
                </select>
              </div>
              <div className="field">
                <label>Unit</label>
                <select value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })}>
                  <option>tablet</option>
                  <option>capsule</option>
                  <option>ml</option>
                  <option>vial</option>
                  <option>bottle</option>
                  <option>box</option>
                  <option>syringe</option>
                  <option>cartridge</option>
                  <option>pack</option>
                </select>
              </div>
            </div>
            <div className="form-row">
              <div className="field">
                <label>Starting stock</label>
                <input type="number" value={form.stock_quantity} onChange={(e) => setForm({ ...form, stock_quantity: e.target.value })} />
              </div>
              <div className="field">
                <label>Reorder level</label>
                <input type="number" value={form.reorder_level} onChange={(e) => setForm({ ...form, reorder_level: e.target.value })} />
              </div>
              <div className="field">
                <label>Unit price</label>
                <input type="number" step="0.01" value={form.unit_price} onChange={(e) => setForm({ ...form, unit_price: e.target.value })} />
              </div>
            </div>
            <button className="btn btn-primary">Save item</button>
          </form>
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
        <button className={`btn btn-sm ${tab === 'all' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setTab('all')}>All</button>
        <button className={`btn btn-sm ${tab === 'medicine' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setTab('medicine')}>Medicines</button>
        <button className={`btn btn-sm ${tab === 'supply' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setTab('supply')}>Supplies</button>
      </div>

      {loading ? (
        <p style={{ color: 'var(--muted)' }}>Loading…</p>
      ) : (
        <div className="card">
          <table>
            <thead>
              <tr><th>Name</th><th>Category</th><th>Unit</th><th>Stock</th><th>Reorder level</th><th>Price</th><th></th></tr>
            </thead>
            <tbody>
              {items.map((it) => (
                <tr key={it.id}>
                  <td>{it.name}</td>
                  <td style={{ textTransform: 'capitalize' }}>{it.category}</td>
                  <td>{it.unit}</td>
                  <td className="mono">{it.stock_quantity}</td>
                  <td className="mono">{it.reorder_level}</td>
                  <td className="mono">{Number(it.unit_price).toFixed(2)}</td>
                  <td>
                    {it.stock_quantity <= it.reorder_level && <span className="badge wait" style={{ marginRight: 8 }}>low stock</span>}
                    {canManage && (
                      <button className="btn btn-ghost btn-sm" onClick={() => handleRestock(it.id)}>Restock</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
