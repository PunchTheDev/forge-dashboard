import { useEffect, useRef, useState } from "react";
import type React from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

// Material colours — visually distinct, physically inspired
const MATERIAL_COLORS: Record<string, THREE.Color> = {
  pla:           new THREE.Color(0.92, 0.90, 0.86),  // warm off-white
  petg:          new THREE.Color(0.72, 0.83, 0.94),  // light translucent blue
  aluminum_6061: new THREE.Color(0.76, 0.78, 0.82),  // silvery aluminium
  stainless_316: new THREE.Color(0.55, 0.57, 0.62),  // cool dark steel
  steel_mild:    new THREE.Color(0.50, 0.48, 0.44),  // warm dark grey carbon steel
};

interface Props {
  stepUrl: string | null;
  label?: string;
  /** Material key (pla, petg, aluminum_6061, stainless_316) — used for mesh tinting. */
  material?: string;
  /** Rendered instead of the viewer when loading fails (e.g. a SpecDiagram). */
  fallback?: React.ReactNode;
}

/**
 * 3D STEP viewer using Three.js + occt-import-js (loaded from CDN).
 * Renders the actual agent-generated CAD output — the STEP file produced
 * by the winning submission's CadQuery code.
 */
export function StepViewer({ stepUrl, label, material, fallback }: Props) {
  const mountRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string>("");

  useEffect(() => {
    if (!stepUrl || !mountRef.current) return;

    const mount = mountRef.current;
    const w = mount.clientWidth;
    const h = mount.clientHeight;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#0a0a0f");

    const camera = new THREE.PerspectiveCamera(45, w / h, 0.01, 10000);
    camera.position.set(200, 150, 200);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(w, h);
    renderer.shadowMap.enabled = true;
    mount.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;

    // Lights — four-point rig to eliminate dark-face gaps
    const ambient = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambient);

    const key = new THREE.DirectionalLight(0xffffff, 1.0);
    key.position.set(300, 400, 200);
    scene.add(key);

    const fill = new THREE.DirectionalLight(0x8090ff, 0.45);
    fill.position.set(-250, 80, -150);
    scene.add(fill);

    const rim = new THREE.DirectionalLight(0xffffff, 0.3);
    rim.position.set(0, -300, 150);
    scene.add(rim);

    // Grid
    const grid = new THREE.GridHelper(400, 20, "#1e1e2e", "#1e1e2e");
    scene.add(grid);

    let animId: number;
    function animate() {
      animId = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    }
    animate();

    setStatus("loading");

    let cancelled = false;

    // occt-import-js is loaded async from CDN — poll until it's ready or timeout.
    function waitForOcct(timeout = 15000, interval = 100): Promise<() => Promise<unknown>> {
      return new Promise((resolve, reject) => {
        const deadline = Date.now() + timeout;
        function check() {
          const fn = (window as unknown as { occtimportjs?: () => Promise<unknown> }).occtimportjs;
          if (fn) return resolve(fn);
          if (Date.now() > deadline) return reject(new Error("occt-import-js timed out — check CDN connectivity"));
          setTimeout(check, interval);
        }
        check();
      });
    }

    type OcctMesh = {
      attributes: {
        position: { array: number[] };
        normal: { array: number[] };
      };
      // index is a top-level property, NOT inside attributes
      index?: { array: number[] };
      color: { r: number; g: number; b: number };
    };
    type OcctReadParams = {
      linearUnit?: string;
      linearDeflectionType?: string;
      linearDeflection?: number;
      angularDeflection?: number;
    };
    type OcctInstance = {
      ReadStepFile: (bytes: Uint8Array, params: OcctReadParams | null) => { success: boolean; meshes: OcctMesh[] };
    };

    async function loadStep(url: string) {
      const occtModule = await waitForOcct();
      const occt = (await occtModule()) as OcctInstance;
      if (cancelled) return;

      const r = await fetch(url);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const buf = await r.arrayBuffer();
      if (cancelled) return;

      // Fine tessellation — correct occt-import-js key names (not linearTolerance/angularTolerance)
      const result = occt.ReadStepFile(new Uint8Array(buf), {
        linearUnit: "millimeter",
        linearDeflectionType: "absolute_value",
        linearDeflection: 0.005,
        angularDeflection: 0.3,
      });
      if (!result.success) throw new Error("failed to parse STEP");

      const group = new THREE.Group();
      for (const mesh of result.meshes) {
        const pos = mesh.attributes?.position?.array;
        if (!pos?.length) continue;
        const geo = new THREE.BufferGeometry();
        geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
        const nor = mesh.attributes?.normal?.array;
        if (nor?.length) {
          geo.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3));
        } else {
          geo.computeVertexNormals();
        }
        // index is top-level on mesh, not inside .attributes — critical for correct triangle winding
        const idx = mesh.index?.array;
        if (idx?.length) geo.setIndex(idx);
        // Material-based tinting: use spec material colour if available, else fall back to STEP face colour
        const matKey = material?.toLowerCase();
        const baseColor = (matKey && MATERIAL_COLORS[matKey])
          ? MATERIAL_COLORS[matKey]
          : new THREE.Color(mesh.color?.r ?? 0.6, mesh.color?.g ?? 0.6, mesh.color?.b ?? 0.6);
        const isMetallic = matKey === "aluminum_6061" || matKey === "stainless_316";
        const mat = new THREE.MeshStandardMaterial({
          color: baseColor,
          metalness: isMetallic ? 0.7 : 0.15,
          roughness: isMetallic ? 0.3 : 0.6,
          side: THREE.DoubleSide,
        });
        group.add(new THREE.Mesh(geo, mat));
      }

      scene.add(group);

      const box = new THREE.Box3().setFromObject(group);
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3()).length();
      controls.target.copy(center);
      camera.position.copy(center).addScaledVector(new THREE.Vector3(1, 0.7, 1).normalize(), size * 1.5);
      camera.near = size * 0.001;
      camera.far = size * 50;
      camera.updateProjectionMatrix();
      controls.update();

      // Snap grid to base of part
      grid.position.y = box.min.y;

      setStatus("ready");
    }

    loadStep(stepUrl).catch((e: Error) => {
      if (!cancelled) {
        setStatus("error");
        setErrorMsg(e.message);
      }
    });

    const handleResize = () => {
      const nw = mount.clientWidth;
      const nh = mount.clientHeight;
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
      renderer.setSize(nw, nh);
    };
    window.addEventListener("resize", handleResize);

    return () => {
      cancelled = true;
      cancelAnimationFrame(animId);
      controls.dispose();
      renderer.dispose();
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
      rendererRef.current = null;
      window.removeEventListener("resize", handleResize);
    };
  }, [stepUrl]);

  if (!stepUrl) {
    return (
      <div className="bg-forge-surface border border-forge-border rounded-xl flex items-center justify-center h-64 text-forge-muted text-sm">
        Select a submission to view the 3D part
      </div>
    );
  }

  // When errored and a fallback is provided, show that instead of the failed canvas.
  if (status === "error" && fallback) {
    return (
      <div className="bg-forge-surface border border-forge-border rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-forge-border flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white">3D viewer</h2>
          <span className="text-xs text-forge-muted" title={errorMsg}>
            3D unavailable — showing diagram
          </span>
        </div>
        <div className="p-4">{fallback}</div>
      </div>
    );
  }

  return (
    <div className="bg-forge-surface border border-forge-border rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-forge-border flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <h2 className="text-sm font-semibold text-white shrink-0">Agent-generated CAD</h2>
          {label && <span className="text-xs text-forge-muted truncate">{label}</span>}
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {status === "loading" && (
            <span className="text-xs text-forge-accent animate-pulse">loading STEP…</span>
          )}
          {status === "error" && (
            <span className="text-xs text-forge-red font-mono" title={errorMsg}>
              error — {errorMsg.length > 50 ? errorMsg.slice(0, 47) + "…" : errorMsg}
            </span>
          )}
          {status === "ready" && (
            <span className="text-xs text-forge-green">drag to rotate · scroll to zoom</span>
          )}
          {stepUrl && (
            <a
              href={stepUrl}
              download
              className="text-xs text-forge-accent hover:text-white transition-colors border border-forge-border/60 hover:border-forge-accent px-2 py-0.5 rounded"
              title="Download STEP file — open in FreeCAD, Fusion 360, SolidWorks, etc."
            >
              ↓ STEP
            </a>
          )}
        </div>
      </div>
      <div ref={mountRef} className="h-96 w-full" />
    </div>
  );
}
