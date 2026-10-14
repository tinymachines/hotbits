// The field: bytes three at a time as points in a cube, beside RANDU. Plain three.js, drawn into a well; the
// colours are the theme's, read when the scene is built and rebuilt when the theme changes.
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { useTheme } from "@tinymachines/kit/lib/theme";
import { bytesToPoints, pointColors, randuPoints } from "./entropy-lib";
import { hex, palette, reducedMotion } from "../lib/tokens";
import type { EntropyStatus } from "./use-entropy";

type Source = "live" | "randu";
const MAX_POINTS = 2000;

export default function EntropyCube({ bytes, status, onRegenerate }: { bytes: Uint8Array | null; status: EntropyStatus; onRegenerate: () => void }) {
  const well = useRef<HTMLDivElement>(null);
  const [source, setSource] = useState<Source>("live");
  const [reseed, setReseed] = useState(1);
  const [noGl, setNoGl] = useState(false);
  const theme = useTheme();

  useEffect(() => {
    const el = well.current;
    if (!el) return;
    const positions = source === "live"
      ? (bytes ? bytesToPoints(bytes, Math.min(MAX_POINTS, Math.floor(bytes.length / 3))) : null)
      : randuPoints(MAX_POINTS, reseed * 2654435761);
    if (!positions) return;
    const p = palette();
    let renderer: THREE.WebGLRenderer;
    try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }); } catch { setNoGl(true); return; }
    const w = el.clientWidth || 300, h = el.clientHeight || 300;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(w, h);
    renderer.domElement.setAttribute("aria-hidden", "true");
    el.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(48, w / h, 0.1, 100);
    camera.position.set(2.6, 1.9, 2.6);
    const frame = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(2, 2, 2)), new THREE.LineBasicMaterial({ color: new THREE.Color(hex(p.mute)), transparent: true, opacity: 0.7 }));
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    g.setAttribute("color", new THREE.BufferAttribute(pointColors(positions, p.brand, p.ink), 3));
    const cloud = new THREE.Points(g, new THREE.PointsMaterial({ vertexColors: true, size: 0.022, sizeAttenuation: true, transparent: true, opacity: 0.92, depthWrite: false }));
    scene.add(frame, cloud);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enablePan = false; controls.enableDamping = true; controls.dampingFactor = 0.08;
    controls.minDistance = 2; controls.maxDistance = 8;
    controls.autoRotate = !reducedMotion(); controls.autoRotateSpeed = 0.5;
    let raf = 0;
    const tick = () => { controls.update(); renderer.render(scene, camera); raf = requestAnimationFrame(tick); };
    tick();
    const ro = new ResizeObserver(() => { const w2 = el.clientWidth, h2 = el.clientHeight; if (!w2 || !h2) return; renderer.setSize(w2, h2); camera.aspect = w2 / h2; camera.updateProjectionMatrix(); });
    ro.observe(el);
    return () => {
      cancelAnimationFrame(raf); ro.disconnect(); controls.dispose();
      g.dispose(); frame.geometry.dispose(); (frame.material as THREE.Material).dispose(); (cloud.material as THREE.Material).dispose();
      renderer.dispose(); if (renderer.domElement.parentNode === el) el.removeChild(renderer.domElement);
    };
  }, [bytes, source, reseed, theme]);

  const overlay = noGl ? "this browser has no WebGL; the other views below still draw"
    : source === "live" && !bytes ? (status === "unavailable" ? "archive unavailable, retrying" : "drawing entropy") : null;

  return (
    <div className="hb-viz">
      <div className="controls">
        <div className="seg" role="group" aria-label="Source">
          <button type="button" aria-pressed={source === "live"} onClick={() => setSource("live")}>Live decay</button>
          <button type="button" aria-pressed={source === "randu"} onClick={() => setSource("randu")}>RANDU (broken)</button>
        </div>
        {source === "live"
          ? <button type="button" className="btn quiet" onClick={onRegenerate} disabled={status === "loading"}>Pour fresh entropy</button>
          : <button type="button" className="btn quiet" onClick={() => setReseed((n) => n + 1)}>Reseed</button>}
      </div>
      <div className="hb-well hb-well--cube" ref={well} data-source={source} data-ready={source === "randu" || !!bytes ? "1" : undefined}>
        {overlay ? <div className="hb-fallback">{overlay}</div> : null}
        <span className="hb-hint" aria-hidden="true">drag to orbit · scroll to zoom</span>
      </div>
      <p className="hb-caption">
        {source === "live"
          ? <><b>Live radioactive decay.</b> Every byte from the Geiger source becomes one axis of a point. True entropy has no structure: the cloud fills the cube as a uniform mist, with no plane, axis or seam anywhere you turn it.</>
          : <><b>RANDU, a deterministic generator.</b> The same plot, fed by IBM&rsquo;s infamous LCG of the 1960s. Its arithmetic (z = 6y &minus; 9x mod 1) forces every point onto 15 parallel planes. Turn it until they snap into view. That hidden lattice is what radioactive decay does not have.</>}
      </p>
    </div>
  );
}
