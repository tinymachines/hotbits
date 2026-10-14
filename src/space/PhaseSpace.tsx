// Phase space: the instrument's own measurements, not the bits. Each 5-minute quality window of the last day is a
// point placed by its bias, entropy and chi-square p-value, each a trailing mean over twelve windows (about an hour),
// because at a kilobyte a window a single chi-square swings across its whole range by design and raw points would
// paint noise as drift. Coloured from oldest (mute) to newest (the brand).
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { useTheme } from "@tinymachines/kit/lib/theme";
import { getMetrics, type MetricRow } from "../lib/api";
import { rollingMean } from "./entropy-lib";
import { hex, mix, palette, reducedMotion } from "../lib/tokens";

const ROLL = 12;
const clamp = (v: number, lo = -1, hi = 1) => Math.max(lo, Math.min(hi, v));

export default function PhaseSpace() {
  const well = useRef<HTMLDivElement>(null);
  const [rows, setRows] = useState<MetricRow[] | null>(null);
  const [error, setError] = useState(false);
  const [noGl, setNoGl] = useState(false);
  const theme = useTheme();

  useEffect(() => {
    const ac = new AbortController();
    const load = () => getMetrics("24h", ac.signal).then((w) => { if (!ac.signal.aborted) { setRows(w.rows ?? []); setError(false); } }).catch((e) => { if (!ac.signal.aborted && (e as Error).name !== "AbortError") setError(true); });
    void load();
    const id = setInterval(load, 300_000);
    return () => { ac.abort(); clearInterval(id); };
  }, []);

  useEffect(() => {
    const el = well.current;
    if (!el || !rows || rows.length === 0) return;
    const p = palette();
    const n = rows.length;
    const positions = new Float32Array(n * 3), colors = new Float32Array(n * 3);
    const bias = rollingMean(rows.map((r) => r.bias), ROLL), ent = rollingMean(rows.map((r) => r.ent_bpb), ROLL), chi = rollingMean(rows.map((r) => r.chi_pct), ROLL);
    for (let i = 0; i < n; i++) {
      const o = i * 3;
      positions[o] = clamp(bias[i] / 0.03);
      positions[o + 1] = clamp((ent[i] - 7.8) / 0.1);
      positions[o + 2] = clamp((chi[i] / 100) * 2 - 1);
      const c = mix(p.mute, p.brand, n > 1 ? i / (n - 1) : 1);
      colors[o] = c[0] / 255; colors[o + 1] = c[1] / 255; colors[o + 2] = c[2] / 255;
    }
    let renderer: THREE.WebGLRenderer;
    try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }); } catch { setNoGl(true); return; }
    const w = el.clientWidth || 300, h = el.clientHeight || 300;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(w, h);
    renderer.domElement.setAttribute("aria-hidden", "true");
    el.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, w / h, 0.1, 100);
    camera.position.set(2.3, 1.7, 2.3);
    const L = 1.25;
    const axes = new THREE.BufferGeometry();
    axes.setAttribute("position", new THREE.BufferAttribute(new Float32Array([-L, 0, 0, L, 0, 0, 0, -L, 0, 0, L, 0, 0, 0, -L, 0, 0, L]), 3));
    const lines = new THREE.LineSegments(axes, new THREE.LineBasicMaterial({ color: new THREE.Color(hex(p.mute)), transparent: true, opacity: 0.7 }));
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    g.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    const cloud = new THREE.Points(g, new THREE.PointsMaterial({ vertexColors: true, size: 0.055, sizeAttenuation: true, transparent: true, opacity: 0.95, depthWrite: false }));
    scene.add(lines, cloud);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enablePan = false; controls.enableDamping = true; controls.dampingFactor = 0.08;
    controls.minDistance = 1.8; controls.maxDistance = 7;
    controls.autoRotate = !reducedMotion(); controls.autoRotateSpeed = 0.6;
    let raf = 0;
    const tick = () => { controls.update(); renderer.render(scene, camera); raf = requestAnimationFrame(tick); };
    tick();
    const ro = new ResizeObserver(() => { const w2 = el.clientWidth, h2 = el.clientHeight; if (!w2 || !h2) return; renderer.setSize(w2, h2); camera.aspect = w2 / h2; camera.updateProjectionMatrix(); });
    ro.observe(el);
    return () => {
      cancelAnimationFrame(raf); ro.disconnect(); controls.dispose();
      g.dispose(); axes.dispose(); (lines.material as THREE.Material).dispose(); (cloud.material as THREE.Material).dispose();
      renderer.dispose(); if (renderer.domElement.parentNode === el) el.removeChild(renderer.domElement);
    };
  }, [rows, theme]);

  const overlay = noGl ? "this browser has no WebGL" : error && !rows ? "metrics unreachable" : rows && rows.length === 0 ? "no windows in the last day" : !rows ? "reading the day" : null;

  return (
    <div className="hb-viz">
      <div className="hb-well hb-well--tall" ref={well} data-ready={rows && rows.length ? "1" : undefined}>
        {overlay ? <div className="hb-fallback">{overlay}</div> : null}
        <span className="hb-hint" aria-hidden="true">{rows ? `${rows.length} windows · last 24 h` : ""}</span>
      </div>
      <p className="legend"><span>x: bias</span><span>y: entropy, bits/byte</span><span>z: chi-square p</span><span className="hb-ramp"><i />oldest to newest</span></p>
      <p className="hb-caption"><b>Quality, drifting in real time.</b> Each dot is an hour's trailing mean of the source's health: bias, Shannon entropy and the chi-square uniformity p-value. A healthy source hovers in a tight knot near the origin; sustained drift in any direction is the first sign of trouble, and it would show here before any single test reported it.</p>
    </div>
  );
}
