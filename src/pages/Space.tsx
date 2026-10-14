// The entropy, drawn: four views of the same radioactive decay. One pull of archived bytes feeds the first three;
// the fourth plots the daemon's own bookkeeping. Moved here from tinymachines.ai/hotbits/space (and before that
// bradley.io/trng/space) on 2026-10-14; the components are the same, on the kiosk's tokens.
import { lazy, Suspense } from "react";
import { StatusTag } from "@tinymachines/kit/components/StatusTag";
import { onLink } from "@tinymachines/kit/lib/router";
import { useSharedEntropy } from "../space/use-entropy";

const SHARED_BYTES = 6144;

// three.js enters the page only here, when a view is on screen
const EntropyCube = lazy(() => import("../space/EntropyCube"));
const ReturnMap = lazy(() => import("../space/ReturnMap"));
const BitRaster = lazy(() => import("../space/BitRaster"));
const PhaseSpace = lazy(() => import("../space/PhaseSpace"));

const Loading = ({ what }: { what: string }) => <p className="note">bringing up {what}</p>;

export default function Space() {
  const { bytes, status, regenerate } = useSharedEntropy(SHARED_BYTES);
  const shared = { bytes, status, onRegenerate: regenerate };

  return (
    <article className="hb-space">
      <p className="kicker">hotbits · <b>the entropy, drawn</b></p>
      <h1>The entropy, drawn</h1>
      <p className="lede">Four ways of looking at the same radioactive decay. None of them is a summary statistic: they are the bytes themselves, arranged so that a flaw would be visible rather than reported.</p>
      <p><StatusTag kind="measured" /> These plots read the archive, the append-only record of bytes already emitted, {bytes ? `${bytes.length.toLocaleString("en-US")} bytes of it at the moment` : "6,144 bytes at a time"}. They never draw on the fresh pool, which refills at about 75 bytes a minute and would be starved by a picture. <a href="/instrument" onClick={onLink}>The instrument itself</a> reports what it is doing right now.</p>

      <section className="panel hb-sec">
        <h2>The field</h2>
        <p>Bytes taken three at a time and read as coordinates. A biased source draws structure here: planes, lattices, a clump in one corner. A good one fills the cube with nothing to see, which is the least interesting picture a generator can produce and exactly the one it should.</p>
        <Suspense fallback={<Loading what="the field" />}><EntropyCube {...shared} /></Suspense>
      </section>

      <section className="panel hb-sec">
        <h2>The return map</h2>
        <p>Each byte plotted against the one after it. Any rule connecting a value to its successor shows up as a shape.</p>
        <Suspense fallback={<Loading what="the return map" />}><ReturnMap {...shared} /></Suspense>
      </section>

      <section className="panel hb-sec">
        <h2>The raster</h2>
        <p>One pixel per bit, in order. The eye is very good at finding periodicity, and a stream with any is hard to look at without seeing it.</p>
        <Suspense fallback={<Loading what="the raster" />}><BitRaster {...shared} /></Suspense>
      </section>

      <section className="panel hb-sec">
        <h2>Phase space</h2>
        <p>This one plots the measurements rather than the bits. Each point is one window of output placed by its own bias, entropy and serial correlation, so the cloud is the source describing itself over the last day rather than a single snapshot.</p>
        <Suspense fallback={<Loading what="phase space" />}><PhaseSpace /></Suspense>
      </section>

      <p className="src">/random/archive, in 4,096-byte chunks, asked once when the page opens and again when you pour; /metrics?since=24h every five minutes. The three byte views share one buffer, so they are demonstrably pictures of the same bytes.</p>
    </article>
  );
}
