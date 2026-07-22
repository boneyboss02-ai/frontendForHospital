import { useEffect, useState } from 'react';
import { api } from '../../api/client';

const STATUS_BADGE = { unpaid: 'busy', partially_paid: 'wait', paid: 'ok', cancelled: 'neutral' };

export default function PortalBilling() {
  const [invoices, setInvoices] = useState([]);
  const [selected, setSelected] = useState(null); // { invoice, items, payments }
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const { invoices } = await api.portal.invoices();
      setInvoices(invoices);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function openInvoice(id) {
    setError('');
    try {
      const data = await api.portal.getInvoice(id);
      setSelected(data);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="eyebrow">Patient portal</div>
          <h1>Billing</h1>
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div className="card" style={{ flex: 1, minWidth: 320 }}>
          {loading ? (
            <p style={{ color: 'var(--muted)' }}>Loading…</p>
          ) : invoices.length === 0 ? (
            <p style={{ color: 'var(--muted)' }}>No invoices on file.</p>
          ) : (
            <table>
              <thead>
                <tr><th>Date</th><th>Total</th><th>Paid</th><th>Status</th><th></th></tr>
              </thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr key={inv.id}>
                    <td>{new Date(inv.created_at).toLocaleDateString()}</td>
                    <td>{Number(inv.total_amount).toFixed(2)}</td>
                    <td>{Number(inv.amount_paid).toFixed(2)}</td>
                    <td><span className={`badge ${STATUS_BADGE[inv.status]}`}>{inv.status}</span></td>
                    <td><button className="btn btn-ghost btn-sm" onClick={() => openInvoice(inv.id)}>View</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {selected && (
          <div className="card" style={{ width: 380 }}>
            <h3 style={{ marginBottom: 2 }}>Invoice #{selected.invoice.id}</h3>
            <p className="mono" style={{ color: 'var(--muted)', fontSize: '0.8rem', marginBottom: 10 }}>
              {new Date(selected.invoice.created_at).toLocaleDateString()}
            </p>
            <button
              className="btn btn-ghost btn-sm"
              style={{ marginBottom: 14 }}
              onClick={() => window.open(`/print/invoice/${selected.invoice.id}`, '_blank')}
            >
              Print / Save as PDF
            </button>

            {selected.items.map((item) => (
              <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: '0.85rem' }}>
                <span>{item.description} × {item.quantity}</span>
                <span className="mono">{Number(item.line_total).toFixed(2)}</span>
              </div>
            ))}

            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderTop: '1px solid var(--line)', marginTop: 6, fontWeight: 600 }}>
              <span>Total</span>
              <span className="mono">{Number(selected.invoice.total_amount).toFixed(2)}</span>
            </div>

            {selected.payments.length > 0 && (
              <>
                <h4 style={{ marginTop: 14, fontSize: '0.85rem' }}>Payments</h4>
                {selected.payments.map((p) => (
                  <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', padding: '4px 0' }}>
                    <span>{p.method} — {new Date(p.paid_at).toLocaleDateString()}</span>
                    <span className="mono">{Number(p.amount).toFixed(2)}</span>
                  </div>
                ))}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
