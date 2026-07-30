import { useEffect, useRef, useState } from 'react';

// A small type-ahead picker. `fetchResults(query)` should return an array of
// { id, label, sublabel? }. Selecting an option calls onSelect(option) and
// shows the chosen label; clicking "change" clears it and reopens search.
export default function SearchPicker({ label, placeholder, fetchResults, onSelect, value, required }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!query || query.length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const items = await fetchResults(query);
        setResults(items);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function handleSelect(item) {
    onSelect(item);
    setOpen(false);
    setQuery('');
    setResults([]);
  }

  function handleChangeSelection() {
    onSelect(null);
    setOpen(true);
  }

  return (
    <div className="field" ref={containerRef} style={{ position: 'relative' }}>
      {label && <label>{label}{required ? ' *' : ''}</label>}

      {value ? (
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          border: '1px solid var(--line)', borderRadius: 'var(--radius)', padding: '9px 11px',
          background: '#FBFAF7',
        }}>
          <span style={{ fontSize: '0.9rem' }}>
            {value.label}
            {value.sublabel && <span className="mono" style={{ color: 'var(--muted)', marginLeft: 6, fontSize: '0.8rem' }}>{value.sublabel}</span>}
          </span>
          <button type="button" className="btn btn-ghost btn-sm" onClick={handleChangeSelection}>Change</button>
        </div>
      ) : (
        <>
          <input
            placeholder={placeholder || 'Type to search…'}
            value={query}
            onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            autoComplete="off"
          />
          {open && (query.length >= 2) && (
            <div style={{
              position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 20,
              background: '#fff', border: '1px solid var(--line)', borderRadius: 'var(--radius)',
              marginTop: 4, maxHeight: 220, overflowY: 'auto', boxShadow: '0 4px 14px rgba(18,36,43,0.1)',
            }}>
              {loading ? (
                <div style={{ padding: '10px 12px', fontSize: '0.85rem', color: 'var(--muted)' }}>Searching…</div>
              ) : results.length === 0 ? (
                <div style={{ padding: '10px 12px', fontSize: '0.85rem', color: 'var(--muted)' }}>No matches</div>
              ) : (
                results.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => handleSelect(item)}
                    style={{ padding: '9px 12px', fontSize: '0.88rem', cursor: 'pointer', borderBottom: '1px solid var(--line)' }}
                    onMouseDown={(e) => e.preventDefault()}
                  >
                    {item.label}
                    {item.sublabel && <span className="mono" style={{ color: 'var(--muted)', marginLeft: 6, fontSize: '0.78rem' }}>{item.sublabel}</span>}
                  </div>
                ))
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// Convenience wrappers pre-wired to the right endpoint/shape.
export function makePatientFetcher(api) {
  return async (query) => {
    const { patients } = await api.patients.list(query);
    return patients.map((p) => ({ id: p.id, label: p.full_name, sublabel: p.patient_code }));
  };
}

export function makeDoctorFetcher(api) {
  return async (query) => {
    const { staff } = await api.staff.list({ role: 'doctor', search: query });
    return staff.map((s) => ({ id: s.id, label: s.full_name, sublabel: s.specialty || 'Doctor' }));
  };
}

// Any staff member (not patients) — used for assigning shifts. The backend
// endpoint doesn't have a "staff only" filter server-side, so this filters
// out role='patient' client-side after fetching.
export function makeStaffFetcher(api) {
  return async (query) => {
    const { staff } = await api.staff.list({ search: query });
    return staff
      .filter((s) => s.role !== 'patient')
      .map((s) => ({ id: s.id, label: s.full_name, sublabel: s.role }));
  };
}

export function makeMedicineFetcher(api) {
  return async (query) => {
    const { medicines } = await api.pharmacy.medicines({ search: query });
    return medicines.map((m) => ({ id: m.id, label: m.name, sublabel: `${m.stock_quantity} ${m.unit} in stock` }));
  };
}
