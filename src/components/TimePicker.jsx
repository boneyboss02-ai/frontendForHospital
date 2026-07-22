// A plain <input type="time"> displays in whatever format the OS/browser
// locale dictates — on Windows set to a 24-hour region/format, that's
// military time, with no HTML attribute able to override it. This
// component sidesteps that entirely with three explicit selects, so it
// always shows 12-hour + AM/PM no matter what the visitor's machine is set to.
//
// `value`/`onChange` still use "HH:MM" 24-hour strings — that's what the
// backend stores and compares against; this is purely the display/input layer.
const HOURS_12 = Array.from({ length: 12 }, (_, i) => i + 1); // 1..12
const MINUTES = ['00', '15', '30', '45'];

export default function TimePicker({ label, value, onChange }) {
  const { hour12, minute, meridiem } = to12Hour(value);

  function update(next) {
    onChange(to24Hour(next.hour12 ?? hour12, next.minute ?? minute, next.meridiem ?? meridiem));
  }

  return (
    <div className="field">
      {label && <label>{label}</label>}
      <div style={{ display: 'flex', gap: 8 }}>
        <select value={hour12} onChange={(e) => update({ hour12: Number(e.target.value) })} style={{ flex: 1 }}>
          {HOURS_12.map((h) => <option key={h} value={h}>{h}</option>)}
        </select>
        <select value={minute} onChange={(e) => update({ minute: e.target.value })} style={{ flex: 1 }}>
          {MINUTES.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
        <select value={meridiem} onChange={(e) => update({ meridiem: e.target.value })} style={{ flex: 1 }}>
          <option value="AM">AM</option>
          <option value="PM">PM</option>
        </select>
      </div>
    </div>
  );
}

function to12Hour(value) {
  const [h, m] = (value || '09:00').split(':').map(Number);
  const meridiem = h >= 12 ? 'PM' : 'AM';
  let hour12 = h % 12;
  if (hour12 === 0) hour12 = 12;
  const minute = MINUTES.reduce((closest, m2) => (Math.abs(Number(m2) - m) < Math.abs(Number(closest) - m) ? m2 : closest), MINUTES[0]);
  return { hour12, minute, meridiem };
}

function to24Hour(hour12, minute, meridiem) {
  let h = Number(hour12) % 12;
  if (meridiem === 'PM') h += 12;
  return `${String(h).padStart(2, '0')}:${minute}`;
}
