// A small line over a window of readings, drawn in SVG so it reads the theme's tokens itself. The ideal value a
// perfect source would give is a dashed rule, so the eye reads distance from it rather than the line's own wobble.
export function Sparkline({ values, ideal, label, min, max }: { values: number[]; ideal?: number; label: string; min?: number; max?: number }) {
  const W = 240, H = 48, P = 3;
  if (values.length < 2) return <svg className="hb-spark" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${label}: not enough readings`} />;
  const all = ideal === undefined ? values : [...values, ideal];
  const lo = min ?? Math.min(...all), hi = max ?? Math.max(...all);
  const span = hi - lo || 1;
  const x = (i: number) => P + (i / (values.length - 1)) * (W - 2 * P);
  const y = (v: number) => H - P - ((v - lo) / span) * (H - 2 * P);
  const d = values.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join("");
  const last = values[values.length - 1];
  return (
    <svg className="hb-spark" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${label}: ${values.length} readings, latest ${last}`}>
      {ideal !== undefined ? <line x1={P} x2={W - P} y1={y(ideal)} y2={y(ideal)} stroke="var(--mute)" strokeWidth="1" strokeDasharray="3 4" /> : null}
      <path d={d} fill="none" stroke="var(--c1)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={x(values.length - 1)} cy={y(last)} r="3" fill="var(--c1)" stroke="var(--sheet)" strokeWidth="1.5" />
    </svg>
  );
}
