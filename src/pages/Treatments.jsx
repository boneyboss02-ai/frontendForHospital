import { Fragment, useEffect, useState } from 'react';
import { api } from '../api/client';
import SearchPicker, { makeInventoryFetcher } from '../components/SearchPicker';

const inventoryFetcher = makeInventoryFetcher(api);

const EMPTY_ROW = { item: null, quantity: '1' };

// Shared by the "New treatment" and "Edit treatment" forms — a repeatable
// list of {inventory item, quantity} rows. Kept controlled from outside
// (rows/onChange) rather than owning its own state, so both forms can use
// it against their own separate state without stepping on each other.
function ItemRowsEditor({ rows, onChange }) {
  function updateRow(idx, patch) {
    onChange(rows.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  }
  function addRow() {
    onChange([...rows, { ...EMPTY_ROW }]);
  }
  function removeRow(idx) {
    onChange(rows.filter((_, i) => i !== idx));
  }

  return (
    <>
      {rows.map((row, idx) => (
        <div key={idx} className="form-row" style={{ alignItems: 'flex-end' }}>
          <div style={{ flex: 1 }}>
            <SearchPicker
              value={row.item}
              onSelect={(item) => updateRow(idx, { item })}
              fetchResults={inventoryFetcher}
              placeholder="Search inventory item…"
            />
          </div>
          <div className="field" style={{ maxWidth: 110 }}>
            <label>Qty</label>
            <input type="number" step="0.01" min="0" value={row.quantity} onChange={(e) => updateRow(idx, { quantity: e.target.value })} />
          </div>
          {rows.length > 1 && (
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => removeRow(idx)}>Remove</button>
          )}
        </div>
      ))}
      <button type="button" className="btn btn-ghost btn-sm" onClick={addRow} style={{ marginBottom: 16 }}>
        + Add another item
      </button>
    </>
  );
}

// Admin-only catalog of fixed-price procedures (e.g. "Tooth extraction —
// 2000") with an inventory "recipe" attached. This is what powers the
// one-click treatment picker on the doctor's consultation form — pick a
// treatment there and it auto-fills both the charge and the inventory
// usage from what's defined here.
export default function Treatments() {
  const [treatments, setTreatments] = useState([]);
  const [showInactive, setShowInactive] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [rows, setRows] = useState([{ ...EMPTY_ROW }]);

  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [editRows, setEditRows] = useState([{ ...EMPTY_ROW }]);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const { treatments } = await api.treatments.list(showInactive ? { include_inactive: 'true' } : {});
      setTreatments(treatments);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [showInactive]);

  function startEdit(t) {
    setShowForm(false);
    setEditingId(t.id);
    setEditName(t.name);
    setEditPrice(String(t.price));
    setEditRows(
      t.items.length > 0
        ? t.items.map((i) => ({ item: { id: i.item_id, label: i.item_name }, quantity: String(i.quantity) }))
        : [{ ...EMPTY_ROW }]
    );
  }

  async function handleSaveEdit(e) {
    e.preventDefault();
    setError('');
    if (!editName.trim() || editPrice === '') {
      setError('Please enter a name and price.');
      return;
    }
    const items = editRows
      .filter((r) => r.item && Number(r.quantity) > 0)
      .map((r) => ({ item_id: r.item.id, quantity: Number(r.quantity) }));

    try {
      await api.treatments.update(editingId, { name: editName.trim(), price: Number(editPrice), items });
      setEditingId(null);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleCreate(e) {
    e.preventDefault();
    setError('');
    if (!name.trim() || price === '') {
      setError('Please enter a name and price.');
      return;
    }
    const items = rows
      .filter((r) => r.item && Number(r.quantity) > 0)
      .map((r) => ({ item_id: r.item.id, quantity: Number(r.quantity) }));

    try {
      await api.treatments.create({ name: name.trim(), price: Number(price), items });
      setName('');
      setPrice('');
      setRows([{ ...EMPTY_ROW }]);
      setShowForm(false);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function toggleActive(t) {
    setError('');
    try {
      await api.treatments.update(t.id, { is_active: !t.is_active });
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="eyebrow">Catalog</div>
          <h1>Treatments &amp; Procedures</h1>
        </div>
        <button className="btn btn-primary" onClick={() => { setEditingId(null); setShowForm((s) => !s); }}>
          {showForm ? 'Cancel' : '+ New treatment'}
        </button>
      </div>

      <p style={{ color: 'var(--muted)', fontSize: '0.85rem', marginTop: -14, marginBottom: 20 }}>
        Doctors pick from this list during a consultation — it fills in the charge and the
        inventory used automatically, so nobody has to type it out or remember what a
        procedure consumes each time.
      </p>

      {error && <div className="error-banner">{error}</div>}

      {showForm && (
        <div className="card" style={{ marginBottom: 24 }}>
          <h3 style={{ marginBottom: 16 }}>New treatment</h3>
          <form onSubmit={handleCreate}>
            <div className="form-row">
              <div className="field">
                <label>Name</label>
                <input required placeholder="e.g. Tooth extraction" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="field" style={{ maxWidth: 160 }}>
                <label>Price</label>
                <input required type="number" step="0.01" min="0" value={price} onChange={(e) => setPrice(e.target.value)} />
              </div>
            </div>

            <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginTop: 6, marginBottom: 8 }}>
              Inventory used per treatment (optional)
            </label>
            <ItemRowsEditor rows={rows} onChange={setRows} />
            <div>
              <button className="btn btn-primary">Save treatment</button>
            </div>
          </form>
        </div>
      )}

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <h3>All treatments</h3>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem' }}>
            <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} />
            Show retired treatments
          </label>
        </div>

        {loading ? (
          <p style={{ color: 'var(--muted)' }}>Loading…</p>
        ) : treatments.length === 0 ? (
          <p style={{ color: 'var(--muted)' }}>No treatments yet. Add one above.</p>
        ) : (
          <table>
            <thead>
              <tr><th>Name</th><th>Price</th><th>Uses</th><th>Status</th><th></th></tr>
            </thead>
            <tbody>
              {treatments.map((t) => (
                <Fragment key={t.id}>
                  <tr>
                    <td>{t.name}</td>
                    <td className="mono">{Number(t.price).toFixed(2)}</td>
                    <td style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>
                      {t.items.length === 0 ? '—' : t.items.map((i) => `${i.quantity} ${i.unit || ''} ${i.item_name}`).join(', ')}
                    </td>
                    <td>
                      <span className={`badge ${t.is_active ? 'ok' : 'neutral'}`}>{t.is_active ? 'active' : 'retired'}</span>
                    </td>
                    <td style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => (editingId === t.id ? setEditingId(null) : startEdit(t))}>
                        {editingId === t.id ? 'Close' : 'Edit'}
                      </button>
                      <button className="btn btn-ghost btn-sm" onClick={() => toggleActive(t)}>
                        {t.is_active ? 'Retire' : 'Reactivate'}
                      </button>
                    </td>
                  </tr>
                  {editingId === t.id && (
                    <tr>
                      <td colSpan={5} style={{ background: 'var(--sky-100)' }}>
                        <form onSubmit={handleSaveEdit} style={{ padding: '14px 4px' }}>
                          <div className="form-row">
                            <div className="field">
                              <label>Name</label>
                              <input required value={editName} onChange={(e) => setEditName(e.target.value)} />
                            </div>
                            <div className="field" style={{ maxWidth: 160 }}>
                              <label>Price</label>
                              <input required type="number" step="0.01" min="0" value={editPrice} onChange={(e) => setEditPrice(e.target.value)} />
                            </div>
                          </div>
                          <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginTop: 6, marginBottom: 8 }}>
                            Inventory used per treatment
                          </label>
                          <ItemRowsEditor rows={editRows} onChange={setEditRows} />
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button className="btn btn-primary btn-sm">Save changes</button>
                            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditingId(null)}>Cancel</button>
                          </div>
                        </form>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
