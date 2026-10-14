// What a game's draw cost, under its result: the bits of decay used, the draws thrown away to keep the result
// unbiased, the requests made of the gateway, and the gateway's own note on what these bits are.
import type { Receipt as R } from "../lib/bits";

const n = (v: number) => v.toLocaleString("en-US");

export function Receipt({ r }: { r: R | null }) {
  if (!r) return null;
  return (
    <p className="src hb-receipt">
      <b>{n(r.bits)} bits</b> of decay used, {n(r.rejected)} {r.rejected === 1 ? "draw" : "draws"} rejected to stay unbiased,{" "}
      {r.requests === 0 ? "no new request (bits left from the last game)" : `${r.requests} ${r.requests === 1 ? "request" : "requests"} to /v1/seeds`}.
      {r.note ? <> The gateway's own note: &ldquo;{r.note}&rdquo;.</> : null}
    </p>
  );
}
