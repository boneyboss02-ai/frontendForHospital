import { useEffect, useState } from 'react';
import { api } from '../api/client';
import SearchPicker, { makePatientFetcher } from '../components/SearchPicker';

const STATUS_BADGE = { unpaid: 'busy', partially_paid: 'wait', paid: 'ok', cancelled: 'neutral' };

const patientFetcher = makePatientFetcher(api);

export default function Billing() {
  const [invoices, setInvoices] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [selected, setSelected] = useState(null); // { invoice, items, payments }
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const [showInvoiceForm, setShowInvoiceForm] = useState(false);
  const [invoicePatient, setInvoicePatient] = useState(null);
  const [invoiceForm, setInvoiceForm] = useState({ description: '', quantity: '1', unit_price: '' });

  const [showItemForm, setShowItemForm] = useState(false);
  const [itemForm, setItemForm] = useState({ description: '', quantity: '1', unit_price: '' });

  const [paymentForm, setPaymentForm] = useState({ amount: '', method: 'cash' });

  async function load() {
    setLoading(true);
    setError('');
    try {
      const { invoices } = await api.billing.invoices(statusFilter ? { status: statusFilter } : {});
      setInvoices(invoices);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [statusFilter]);

  async function openInvoice(id) {
    setError('');
    try {
      const data = await api.billing.getInvoice(id);
      setSelected(data);
    } catch (err) {
      setError(err.message);
    }
  }

  async function refreshSelected() {
    if (selected) await openInvoice(selected.invoice.id);
  }

  async function handleCreateInvoice(e) {
    e.preventDefault();
    setError('');
    if (!invoicePatient) {
      setError('Please select a patient.');
      return;
    }
    try {
      const items = invoiceForm.description
        ? [{ description: invoiceForm.description, quantity: Number(invoiceForm.quantity) || 1, unit_price: Number(invoiceForm.unit_price) }]
        : [];
      await api.billing.createInvoice({ patient_id: invoicePatient.id, items });
      setInvoicePatient(null);
      setInvoiceForm({ description: '', quantity: '1', unit_price: '' });
      setShowInvoiceForm(false);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleAddItem(e) {
    e.preventDefault();
    setError('');
    try {
      await api.billing.addItem(selected.invoice.id, {
        description: itemForm.description,
        quantity: Number(itemForm.quantity) || 1,
        unit_price: Number(itemForm.unit_price),
      });
      setItemForm({ description: '', quantity: '1', unit_price: '' });
      setShowItemForm(false);
      refreshSelected();
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleAddPayment(e) {
    e.preventDefault();
    setError('');
    try {
      await api.billing.addPayment(selected.invoice.id, {
        amount: Number(paymentForm.amount),
        method: paymentForm.method,
      });
      setPaymentForm({ amount: '', method: 'cash' });
      refreshSelected();
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="eyebrow">Billing</div>
          <h1>Invoices</h1>
        </div>
        <button className="btn btn-primary" onClick={() => setShowInvoiceForm((s) => !s)}>
          {showInvoiceForm ? 'Cancel' : '+ New invoice'}
        </button>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {showInvoiceForm && (
        <div className="card" style={{ marginBottom: 24 }}>
          <h3 style={{ marginBottom: 16 }}>New invoice</h3>
          <form onSubmit={handleCreateInvoice}>
            <SearchPicker label="Patient" required value={invoicePatient} onSelect={setInvoicePatient} fetchResults={patientFetcher} placeholder="Search patient by name or code…" />
            <p style={{ fontSize: '0.8rem', color: 'var(--muted)', margin: '-6px 0 12px' }}>
              Optionally add a first line item now (e.g. consultation fee) — you can add more after creating the invoice.
            </p>
            <div className="form-row">
              <div className="field">
                <label>Description</label>
                <input placeholder="e.g. Consultation - Dr. Bekele" value={invoiceForm.description} onChange={(e) => setInvoiceForm({ ...invoiceForm, description: e.target.value })} />
              </div>
              <div className="field">
                <label>Quantity</label>
                <input type="number" value={invoiceForm.quantity} onChange={(e) => setInvoiceForm({ ...invoiceForm, quantity: e.target.value })} />
              </div>
              <div className="field">
                <label>Unit price</label>
                <input type="number" step="0.01" value={invoiceForm.unit_price} onChange={(e) => setInvoiceForm({ ...invoiceForm, unit_price: e.target.value })} />
              </div>
            </div>
            <button className="btn btn-primary">Create invoice</button>
          </form>
        </div>
      )}

      <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
        <div className="card" style={{ flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <h3>All invoices</h3>
            <select style={{ width: 160 }} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">All statuses</option>
              <option value="unpaid">Unpaid</option>
              <option value="partially_paid">Partially paid</option>
              <option value="paid">Paid</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          {loading ? (
            <p style={{ color: 'var(--muted)' }}>Loading…</p>
          ) : invoices.length === 0 ? (
            <p style={{ color: 'var(--muted)' }}>No invoices found.</p>
          ) : (
            <table>
              <thead>
                <tr><th>Patient</th><th>Total</th><th>Paid</th><th>Status</th><th></th></tr>
              </thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr key={inv.id}>
                    <td>{inv.patient_name} <span className="mono" style={{ color: 'var(--muted)' }}>({inv.patient_code})</span></td>
                    <td className="mono">{Number(inv.total_amount).toFixed(2)}</td>
                    <td className="mono">{Number(inv.amount_paid).toFixed(2)}</td>
                    <td><span className={`badge ${STATUS_BADGE[inv.status]}`}>{inv.status.replace('_', ' ')}</span></td>
                    <td><button className="btn btn-ghost btn-sm" onClick={() => openInvoice(inv.id)}>Open</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {selected && (
          <div className="card" style={{ width: 380 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h3 style={{ marginBottom: 2 }}>{selected.invoice.patient_name}</h3>
                <p className="mono" style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>{selected.invoice.patient_code}</p>
              </div>
              <span className={`badge ${STATUS_BADGE[selected.invoice.status]}`}>{selected.invoice.status.replace('_', ' ')}</span>
            </div>

            <button
              className="btn btn-ghost btn-sm"
              style={{ marginTop: 10 }}
              onClick={() => window.open(`/print/invoice/${selected.invoice.id}`, '_blank')}
            >
              Print / Save as PDF
            </button>

            <div style={{ margin: '14px 0' }}>
              {selected.items.length === 0 ? (
                <p style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>No line items yet.</p>
              ) : (
                selected.items.map((item) => (
                  <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', padding: '6px 0', borderBottom: '1px solid var(--line)' }}>
                    <span>{item.description} {item.quantity > 1 ? `× ${item.quantity}` : ''}</span>
                    <span className="mono">{Number(item.line_total).toFixed(2)}</span>
                  </div>
                ))
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 10, fontWeight: 700 }}>
                <span>Total</span>
                <span className="mono">{Number(selected.invoice.total_amount).toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--muted)' }}>
                <span>Paid</span>
                <span className="mono">{Number(selected.invoice.amount_paid).toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--red)' }}>
                <span>Balance</span>
                <span className="mono">{(Number(selected.invoice.total_amount) - Number(selected.invoice.amount_paid)).toFixed(2)}</span>
              </div>
            </div>

            {!showItemForm ? (
              <button className="btn btn-ghost btn-sm" onClick={() => setShowItemForm(true)}>+ Add line item</button>
            ) : (
              <form onSubmit={handleAddItem} style={{ marginBottom: 14 }}>
                <div className="field">
                  <input required placeholder="Description" value={itemForm.description} onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })} />
                </div>
                <div className="form-row">
                  <input type="number" placeholder="Qty" value={itemForm.quantity} onChange={(e) => setItemForm({ ...itemForm, quantity: e.target.value })} />
                  <input required type="number" step="0.01" placeholder="Unit price" value={itemForm.unit_price} onChange={(e) => setItemForm({ ...itemForm, unit_price: e.target.value })} />
                </div>
                <button className="btn btn-primary btn-sm" style={{ marginTop: 8 }}>Add</button>
              </form>
            )}

            <div style={{ borderTop: '1px solid var(--line)', paddingTop: 14, marginTop: 4 }}>
              <h3 style={{ fontSize: '0.9rem', marginBottom: 10 }}>Record payment</h3>
              <form onSubmit={handleAddPayment}>
                <div className="form-row">
                  <input required type="number" step="0.01" placeholder="Amount" value={paymentForm.amount} onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })} />
                  <select value={paymentForm.method} onChange={(e) => setPaymentForm({ ...paymentForm, method: e.target.value })}>
                    <option value="cash">Cash</option>
                    <option value="card">Card</option>
                    <option value="insurance">Insurance</option>
                    <option value="mobile_money">Mobile money</option>
                  </select>
                </div>
                <button className="btn btn-primary btn-sm" style={{ marginTop: 8 }}>Record payment</button>
              </form>

              {selected.payments.length > 0 && (
                <div style={{ marginTop: 14 }}>
                  {selected.payments.map((p) => (
                    <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--muted)', padding: '4px 0' }}>
                      <span>{p.method} — {new Date(p.paid_at).toLocaleDateString()}</span>
                      <span className="mono">{Number(p.amount).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
