import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../../api/client';

const STATUS_BADGE = { unpaid: 'busy', partially_paid: 'wait', paid: 'ok', cancelled: 'neutral' };
const PROOF_BADGE = { pending: 'wait', approved: 'ok', rejected: 'busy' };

export default function PortalBilling() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [invoices, setInvoices] = useState([]);
  const [selected, setSelected] = useState(null); // { invoice, items, payments, proofs }
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(true);
  const [payingId, setPayingId] = useState(null);

  const [showProofForm, setShowProofForm] = useState(false);
  const [proofRef, setProofRef] = useState('');
  const [proofImage, setProofImage] = useState(null);
  const [submittingProof, setSubmittingProof] = useState(false);

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

  // Coming back from Chapa checkout — verify server-side (never trust the
  // redirect alone), then clean the tx_ref out of the URL so a page refresh
  // doesn't re-trigger verification.
  useEffect(() => {
    const txRef = searchParams.get('chapa_tx_ref');
    if (!txRef) return;
    (async () => {
      setNotice('Confirming your payment…');
      try {
        const result = await api.portal.payChapaVerify(txRef);
        setNotice(result.status === 'success' ? 'Payment confirmed — thank you!' : 'Payment was not completed. You can try again or submit a proof of payment below.');
        load();
      } catch (err) {
        setNotice('');
        setError(err.message);
      } finally {
        setSearchParams((params) => { params.delete('chapa_tx_ref'); return params; }, { replace: true });
      }
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function openInvoice(id) {
    setError('');
    setShowProofForm(false);
    try {
      const data = await api.portal.getInvoice(id);
      setSelected(data);
    } catch (err) {
      setError(err.message);
    }
  }

  async function handlePayChapa(invoiceId) {
    setError('');
    setPayingId(invoiceId);
    try {
      const { checkout_url } = await api.portal.payChapaInitialize(invoiceId);
      window.location.href = checkout_url;
    } catch (err) {
      setError(err.message);
      setPayingId(null);
    }
  }

  async function handleSubmitProof(e) {
    e.preventDefault();
    setError('');
    if (!proofRef.trim() || !proofImage) {
      setError('Enter the transaction number and attach a screenshot.');
      return;
    }
    setSubmittingProof(true);
    try {
      await api.portal.submitPaymentProof(selected.invoice.id, { transaction_ref: proofRef.trim(), image: proofImage });
      setProofRef('');
      setProofImage(null);
      setShowProofForm(false);
      setNotice('Submitted — staff will review it shortly.');
      openInvoice(selected.invoice.id);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmittingProof(false);
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
      {notice && <div className="notice-banner">{notice}</div>}

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
                    <td><span className={`badge ${STATUS_BADGE[inv.status]}`}>{inv.status.replace('_', ' ')}</span></td>
                    <td style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                      {inv.status !== 'paid' && inv.status !== 'cancelled' && (
                        <button className="btn btn-primary btn-sm" disabled={payingId === inv.id} onClick={() => handlePayChapa(inv.id)}>
                          {payingId === inv.id ? 'Redirecting…' : 'Pay now'}
                        </button>
                      )}
                      <button className="btn btn-ghost btn-sm" onClick={() => openInvoice(inv.id)}>View</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {selected && (
          <div className="card" style={{ width: 400 }}>
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
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: '0.85rem', color: 'var(--muted)' }}>
              <span>Balance remaining</span>
              <span className="mono">{(Number(selected.invoice.total_amount) - Number(selected.invoice.amount_paid)).toFixed(2)}</span>
            </div>

            {selected.payments.length > 0 && (
              <>
                <h4 style={{ marginTop: 14, fontSize: '0.85rem' }}>Payments</h4>
                {selected.payments.map((p) => (
                  <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', padding: '4px 0' }}>
                    <span>{p.method.replace('_', ' ')} — {new Date(p.paid_at).toLocaleDateString()}</span>
                    <span className="mono">{Number(p.amount).toFixed(2)}</span>
                  </div>
                ))}
              </>
            )}

            {selected.proofs && selected.proofs.length > 0 && (
              <>
                <h4 style={{ marginTop: 14, fontSize: '0.85rem' }}>Submitted proofs</h4>
                {selected.proofs.map((p) => (
                  <div key={p.id} style={{ padding: '6px 0', fontSize: '0.82rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span className="mono">{p.transaction_ref}</span>
                      <span className={`badge ${PROOF_BADGE[p.status]}`}>{p.status}</span>
                    </div>
                    {p.review_note && <div style={{ color: 'var(--muted)', marginTop: 2 }}>{p.review_note}</div>}
                  </div>
                ))}
              </>
            )}

            {selected.invoice.status !== 'paid' && selected.invoice.status !== 'cancelled' && (
              <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--line)' }}>
                {!showProofForm ? (
                  <button className="btn btn-ghost btn-sm" onClick={() => setShowProofForm(true)}>
                    Payment interrupted? Submit proof instead
                  </button>
                ) : (
                  <form onSubmit={handleSubmitProof}>
                    <p style={{ fontSize: '0.8rem', color: 'var(--muted)', marginTop: 0, marginBottom: 10 }}>
                      If your Chapa payment didn't go through cleanly, enter the transaction number and attach a screenshot — staff will confirm it.
                    </p>
                    <div className="field">
                      <label>Transaction number</label>
                      <input value={proofRef} onChange={(e) => setProofRef(e.target.value)} placeholder="e.g. TX-8f3a2b1c" />
                    </div>
                    <div className="field">
                      <label>Screenshot (JPG or PNG)</label>
                      <input type="file" accept="image/jpeg,image/png" onChange={(e) => setProofImage(e.target.files[0])} />
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="btn btn-primary btn-sm" disabled={submittingProof}>
                        {submittingProof ? 'Submitting…' : 'Submit for review'}
                      </button>
                      <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowProofForm(false)}>Cancel</button>
                    </div>
                  </form>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
