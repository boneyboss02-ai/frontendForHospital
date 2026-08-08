import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../api/client';
import SearchPicker, { makePatientFetcher } from '../components/SearchPicker';

const STATUS_BADGE = { unpaid: 'busy', partially_paid: 'wait', paid: 'ok', cancelled: 'neutral' };

const patientFetcher = makePatientFetcher(api);

export default function Billing() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [invoices, setInvoices] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [fromFilter, setFromFilter] = useState('');
  const [toFilter, setToFilter] = useState('');
  const [patientFilter, setPatientFilter] = useState(null);
  const [overdueOnly, setOverdueOnly] = useState(searchParams.get('overdue') === 'true');
  const [selected, setSelected] = useState(null); // { invoice, items, payments }
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  // A standing reminder of who owes past-due money — independent of
  // whatever the table below is currently filtered to, so reception always
  // sees it without having to remember to check.
  const [overdueList, setOverdueList] = useState([]);

  const [showInvoiceForm, setShowInvoiceForm] = useState(false);
  const [invoicePatient, setInvoicePatient] = useState(null);
  const [invoiceForm, setInvoiceForm] = useState({ description: '', quantity: '1', unit_price: '', due_date: '' });

  const [showItemForm, setShowItemForm] = useState(false);
  const [itemForm, setItemForm] = useState({ description: '', quantity: '1', unit_price: '' });

  const [paymentForm, setPaymentForm] = useState({ amount: '', method: 'cash' });
  const [dueDateDraft, setDueDateDraft] = useState('');

  const [proofs, setProofs] = useState([]);
  const [proofsLoading, setProofsLoading] = useState(true);
  const [proofImages, setProofImages] = useState({}); // { [proofId]: blobUrl }

  async function loadProofs() {
    setProofsLoading(true);
    try {
      const { proofs } = await api.payments.proofs({ status: 'pending' });
      setProofs(proofs);
    } catch (err) {
      setError(err.message);
    } finally {
      setProofsLoading(false);
    }
  }

  useEffect(() => { loadProofs(); }, []);

  async function viewProofImage(id) {
    if (proofImages[id]) return;
    try {
      const url = await api.payments.openProofImage(id);
      setProofImages((imgs) => ({ ...imgs, [id]: url }));
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleApproveProof(id) {
    setError('');
    try {
      await api.payments.approveProof(id);
      loadProofs();
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleRejectProof(id) {
    const note = window.prompt('Reason for rejecting (optional):') || '';
    setError('');
    try {
      await api.payments.rejectProof(id, note);
      loadProofs();
    } catch (err) {
      setError(err.message);
    }
  }

  async function load() {
    setLoading(true);
    setError('');
    try {
      const params = {};
      if (statusFilter) params.status = statusFilter;
      if (fromFilter) params.from = fromFilter;
      if (toFilter) params.to = toFilter;
      if (patientFilter) params.patient_id = patientFilter.id;
      if (overdueOnly) params.overdue = 'true';
      const { invoices } = await api.billing.invoices(params);
      setInvoices(invoices);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function loadOverdue() {
    try {
      const { invoices } = await api.billing.invoices({ overdue: 'true' });
      setOverdueList(invoices);
    } catch {
      // Non-critical — the reminder card just stays empty if this fails;
      // the main table above still has its own error handling.
    }
  }

  useEffect(() => { load(); }, [statusFilter, fromFilter, toFilter, patientFilter, overdueOnly]);
  useEffect(() => { loadOverdue(); }, []);

  function toggleOverdueOnly(next) {
    setOverdueOnly(next);
    const params = new URLSearchParams(searchParams);
    if (next) params.set('overdue', 'true'); else params.delete('overdue');
    setSearchParams(params, { replace: true });
  }

  async function openInvoice(id) {
    setError('');
    try {
      const data = await api.billing.getInvoice(id);
      setSelected(data);
      setDueDateDraft(data.invoice.due_date ? data.invoice.due_date.slice(0, 10) : '');
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
      await api.billing.createInvoice({ patient_id: invoicePatient.id, items, due_date: invoiceForm.due_date || undefined });
      setInvoicePatient(null);
      setInvoiceForm({ description: '', quantity: '1', unit_price: '', due_date: '' });
      setShowInvoiceForm(false);
      load();
      loadOverdue();
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
      loadOverdue();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleSetDueDate(e) {
    e.preventDefault();
    setError('');
    try {
      await api.billing.updateDueDate(selected.invoice.id, dueDateDraft || null);
      refreshSelected();
      load();
      loadOverdue();
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

      {!proofsLoading && proofs.length > 0 && (
        <div className="card" style={{ marginBottom: 24, borderColor: 'var(--amber)' }}>
          <h3 style={{ marginBottom: 4 }}>Payment proofs awaiting review ({proofs.length})</h3>
          <p style={{ fontSize: '0.82rem', color: 'var(--muted)', marginTop: 0, marginBottom: 14 }}>
            Submitted by patients when a Chapa checkout was interrupted — confirm the transaction actually happened before approving.
          </p>
          {proofs.map((p) => (
            <div key={p.id} style={{ display: 'flex', gap: 14, alignItems: 'flex-start', padding: '12px 0', borderBottom: '1px solid var(--line)' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{p.patient_name} <span className="mono" style={{ color: 'var(--muted)', fontWeight: 400 }}>({p.patient_code})</span></div>
                <div style={{ fontSize: '0.82rem', color: 'var(--muted)', marginTop: 2 }}>
                  Invoice balance: {(Number(p.total_amount) - Number(p.amount_paid)).toFixed(2)} · Submitted {new Date(p.submitted_at).toLocaleString()}
                </div>
                <div className="mono" style={{ fontSize: '0.85rem', marginTop: 4 }}>Transaction: {p.transaction_ref}</div>
                {proofImages[p.id] ? (
                  <img src={proofImages[p.id]} alt="Payment proof" style={{ maxWidth: 220, marginTop: 8, borderRadius: 'var(--radius-sm)', border: '1px solid var(--line)' }} />
                ) : (
                  <button className="btn btn-ghost btn-sm" style={{ marginTop: 8 }} onClick={() => viewProofImage(p.id)}>View screenshot</button>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <button className="btn btn-primary btn-sm" onClick={() => handleApproveProof(p.id)}>Approve</button>
                <button className="btn btn-ghost btn-sm" onClick={() => handleRejectProof(p.id)}>Reject</button>
              </div>
            </div>
          ))}
        </div>
      )}

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
            <div className="field" style={{ maxWidth: 200 }}>
              <label>Payment due by (optional)</label>
              <input type="date" value={invoiceForm.due_date} onChange={(e) => setInvoiceForm({ ...invoiceForm, due_date: e.target.value })} />
            </div>
            <button className="btn btn-primary">Create invoice</button>
          </form>
        </div>
      )}

      {overdueList.length > 0 && (
        <div className="card" style={{ marginBottom: 24, borderColor: 'var(--red)' }}>
          <h3 style={{ marginBottom: 10, color: 'var(--red)' }}>
            {overdueList.length} patient{overdueList.length > 1 ? 's' : ''} past their payment deadline
          </h3>
          <table>
            <thead>
              <tr><th>Patient</th><th>Balance</th><th>Was due</th><th></th></tr>
            </thead>
            <tbody>
              {overdueList.map((inv) => (
                <tr key={inv.id}>
                  <td>{inv.patient_name} <span className="mono" style={{ color: 'var(--muted)' }}>({inv.patient_code})</span></td>
                  <td className="mono">{(Number(inv.total_amount) - Number(inv.amount_paid)).toFixed(2)}</td>
                  <td>{new Date(inv.due_date).toLocaleDateString()}</td>
                  <td><button className="btn btn-ghost btn-sm" onClick={() => openInvoice(inv.id)}>Open</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
        <div className="card" style={{ flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <h3>All invoices</h3>
          </div>

          <div className="form-row" style={{ alignItems: 'flex-end', marginBottom: 14 }}>
            <div className="field" style={{ maxWidth: 150 }}>
              <label>From</label>
              <input type="date" value={fromFilter} onChange={(e) => setFromFilter(e.target.value)} />
            </div>
            <div className="field" style={{ maxWidth: 150 }}>
              <label>To</label>
              <input type="date" value={toFilter} onChange={(e) => setToFilter(e.target.value)} />
            </div>
            <div style={{ flex: 1, minWidth: 180 }}>
              <SearchPicker label="Patient" value={patientFilter} onSelect={setPatientFilter} fetchResults={patientFetcher} placeholder="Any patient…" />
            </div>
            <div className="field" style={{ maxWidth: 160 }}>
              <label>Status</label>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="">All statuses</option>
                <option value="unpaid">Unpaid</option>
                <option value="partially_paid">Partially paid</option>
                <option value="paid">Paid</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', paddingBottom: 10, whiteSpace: 'nowrap' }}>
              <input type="checkbox" checked={overdueOnly} onChange={(e) => toggleOverdueOnly(e.target.checked)} />
              Overdue only
            </label>
            {(fromFilter || toFilter || patientFilter || statusFilter || overdueOnly) && (
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => { setFromFilter(''); setToFilter(''); setPatientFilter(null); setStatusFilter(''); toggleOverdueOnly(false); }}
              >
                Reset filters
              </button>
            )}
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
                    <td>
                      <span className={`badge ${STATUS_BADGE[inv.status]}`}>{inv.status.replace('_', ' ')}</span>
                      {inv.is_overdue && <span className="badge busy" style={{ marginLeft: 6 }}>overdue</span>}
                    </td>
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
              <div style={{ textAlign: 'right' }}>
                <span className={`badge ${STATUS_BADGE[selected.invoice.status]}`}>{selected.invoice.status.replace('_', ' ')}</span>
                {selected.invoice.is_overdue && <div><span className="badge busy" style={{ marginTop: 4, display: 'inline-block' }}>overdue</span></div>}
              </div>
            </div>

            <button
              className="btn btn-ghost btn-sm"
              style={{ marginTop: 10 }}
              onClick={() => window.open(`/print/invoice/${selected.invoice.id}`, '_blank')}
            >
              Print / Save as PDF
            </button>

            <form onSubmit={handleSetDueDate} style={{ display: 'flex', gap: 8, alignItems: 'flex-end', marginTop: 14 }}>
              <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                <label>Payment due by</label>
                <input type="date" value={dueDateDraft} onChange={(e) => setDueDateDraft(e.target.value)} />
              </div>
              <button className="btn btn-ghost btn-sm">Save</button>
            </form>
            <p style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: 4 }}>
              {selected.invoice.due_date
                ? `Currently due ${new Date(selected.invoice.due_date).toLocaleDateString()}. Clear the date and save to remove the deadline.`
                : 'No deadline set — this invoice will never show as overdue.'}
            </p>

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
