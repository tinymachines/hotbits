// The games' controls: a labelled number, a labelled select, a checkbox. Large targets, the kiosk's type.
export function NumberField({ label, value, min, max, onChange, id }: { label: string; value: number; min: number; max: number; onChange: (v: number) => void; id: string }) {
  return (
    <label className="ctl hb-field" htmlFor={id}>
      <span>{label}</span>
      <input id={id} type="number" inputMode="numeric" min={min} max={max} value={value}
        onChange={(e) => { const v = parseInt(e.target.value, 10); onChange(Number.isNaN(v) ? min : Math.max(min, Math.min(max, v))); }} />
    </label>
  );
}

export function Check({ label, checked, onChange, id }: { label: string; checked: boolean; onChange: (v: boolean) => void; id: string }) {
  return (
    <label className="ctl hb-check" htmlFor={id}>
      <input id={id} type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>{label}</span>
    </label>
  );
}

export function Seg<T extends string>({ label, options, value, onChange }: { label: string; options: { id: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="ctl">
      <span>{label}</span>
      <div className="seg" role="group" aria-label={label}>
        {options.map((o) => (
          <button key={o.id} type="button" aria-pressed={o.id === value} onClick={() => onChange(o.id)}>{o.label}</button>
        ))}
      </div>
    </div>
  );
}
