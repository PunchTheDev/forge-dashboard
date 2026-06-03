import { useEffect, useRef, useState } from "react";
import type React from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

interface Props {
  stepUrl: string | null;
  label?: string;
  /** Rendered instead of the viewer when loading fails (e.g. a SpecDiagram). */
  fallback?: React.ReactNode;
}

/**
 * 3D STEP viewer using Three.js + occt-import-js (loaded from CDN).
 * Falls back to a placeholder when no URL is provided or the library is loading.
 */
export function StepViewer({ stepUrl, label, fallback }: Props) {
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
    mount.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;

    // Lights
    const ambient = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambient);
    const sun = new THREE.DirectionalLight(0xffffff, 1.2);
    sun.position.set(300, 400, 200);
    scene.add(sun);
    const fill = new THREE.DirectionalLight(0x6080ff, 0.3);
    fill.position.set(-200, -100, -100);
    scene.add(fill);

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
        index: { array: number[] };
      };
      color: { r: number; g: number; b: number };
    };
    type OcctInstance = {
      ReadStepFile: (bytes: Uint8Array, params: null) => { success: boolean; meshes: OcctMesh[] };
    };

    async function loadStep(url: string) {
      const occtModule = await waitForOcct();
      const occt = (await occtModule()) as OcctInstance;
      if (cancelled) return;

      const r = await fetch(url);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const buf = await r.arrayBuffer();
      if (cancelled) return;

      const result = occt.ReadStepFile(new Uint8Array(buf), null);
      if (!result.success) throw new Error("failed to parse STEP");

      const group = new THREE.Group();
      for (const mesh of result.meshes) {
        const geo = new THREE.BufferGeometry();
        geo.setAttribute("position", new THREE.Float32BufferAttribute(mesh.attributes.position.array, 3));
        geo.setAttribute("normal", new THREE.Float32BufferAttribute(mesh.attributes.normal.array, 3));
        geo.setIndex(mesh.attributes.index.array);
        const mat = new THREE.MeshStandardMaterial({
          color: new THREE.Color(mesh.color.r, mesh.color.g, mesh.color.b),
          metalness: 0.4,
          roughness: 0.6,
        });
        group.add(new THREE.Mesh(geo, mat));
      }

      scene.add(group);

      const box = new THREE.Box3().setFromObject(group);
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3()).length();
      controls.target.copy(center);
      camera.position.copy(center).addScaledVector(new THREE.Vector3(1, 0.7, 1).normalize(), size * 1.5);
      controls.update();

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
      <div className="px-4 py-3 border-b border-forge-border flex items-center justify-between">
        <h2 className="text-sm font-semibold text-white">3D viewer</h2>
        {label && <span className="text-xs text-forge-muted">{label}</span>}
        {status === "loading" && (
          <span className="text-xs text-forge-accent animate-pulse">loading STEP…</span>
        )}
        {status === "error" && (
          <span className="text-xs text-forge-red font-mono" title={errorMsg}>
            error — {errorMsg.length > 60 ? errorMsg.slice(0, 57) + "…" : errorMsg}
          </span>
        )}
        {status === "ready" && (
          <span className="text-xs text-forge-green">drag to rotate</span>
        )}
      </div>
      <div ref={mountRef} className="h-96 w-full" />
    </div>
  );
}
