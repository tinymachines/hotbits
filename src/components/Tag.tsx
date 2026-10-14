// A state in a word, with a glyph, so colour is never the only signal. live: as it should be. warn: attention,
// the instrument is answering but something is off. fail: an assertion failed. quiet: a fact with no verdict.
export type TagState = "live" | "warn" | "fail" | "quiet";

const GLYPH: Record<TagState, string> = { live: "●", warn: "▲", fail: "✕", quiet: "○" };

export function Tag({ state, children, title }: { state: TagState; children: React.ReactNode; title?: string }) {
  return (
    <span className={`hb-tag hb-tag--${state}`} title={title}>
      <span aria-hidden="true">{GLYPH[state]}</span>{children}
    </span>
  );
}
