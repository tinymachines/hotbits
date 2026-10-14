// One shared read of archived decay bytes, fed to every view on the page, so the three byte views are demonstrably
// of the SAME bytes, which is the point of showing them together. It reads /random/archive, never the fresh pool.
import { useCallback, useEffect, useRef, useState } from "react";
import { getArchiveBytes } from "../lib/api";

export type EntropyStatus = "loading" | "ready" | "unavailable";

export function useSharedEntropy(targetBytes: number) {
  const [bytes, setBytes] = useState<Uint8Array | null>(null);
  const [failed, setFailed] = useState(false);
  const ctrl = useRef<AbortController | null>(null);
  // derived, not stored: the state is "some bytes" and "the last attempt failed"; loading is the absence of both
  const status: EntropyStatus = failed ? "unavailable" : bytes ? "ready" : "loading";

  const regenerate = useCallback(async () => {
    ctrl.current?.abort();
    const c = new AbortController();
    ctrl.current = c;
    try {
      const b = await getArchiveBytes(targetBytes, c.signal);
      if (c.signal.aborted) return;
      setBytes(b);   // the old bytes stay on screen until the new ones land
      setFailed(false);
    } catch (e) {
      if ((e as Error).name !== "AbortError") setFailed(true);
    }
  }, [targetBytes]);

  useEffect(() => {
    void regenerate();
    return () => ctrl.current?.abort();
  }, [regenerate]);

  // a failure should be rare (the archive is a file, append-only); retry on a long backoff rather than hammering
  useEffect(() => {
    if (status !== "unavailable") return;
    const id = window.setTimeout(() => void regenerate(), 25_000);
    return () => clearTimeout(id);
  }, [status, regenerate]);

  return { bytes, status, regenerate };
}
