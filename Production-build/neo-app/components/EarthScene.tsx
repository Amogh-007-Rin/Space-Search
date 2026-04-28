"use client";

import { useRef, Suspense, useMemo, useEffect, useState } from "react";
import { Canvas, useFrame, useLoader } from "@react-three/fiber";
import { Stars } from "@react-three/drei";
import * as THREE from "three";
import { TextureLoader } from "three";
import { motion } from "framer-motion";
import { BACKEND_URL } from "@/lib/config";

const EARTH_R   = 2;
const NEO_TOTAL = 90_836;

// ── Earth mesh ──────────────────────────────────────────────────────────────
function Earth() {
  const earthRef = useRef<THREE.Mesh>(null!);
  const atmoRef  = useRef<THREE.Mesh>(null!);

  const [color, normal, specular] = useLoader(TextureLoader, [
    "/textures/earth_atmos.jpg",
    "/textures/earth_normal.jpg",
    "/textures/earth_specular.jpg",
  ]);

  useFrame((_, dt) => {
    earthRef.current.rotation.y += dt * 0.08;
    atmoRef.current.rotation.y  += dt * 0.095;
  });

  return (
    <group>
      <mesh ref={earthRef}>
        <sphereGeometry args={[EARTH_R, 64, 64]} />
        <meshPhongMaterial
          map={color}
          normalMap={normal}
          specularMap={specular}
          specular={new THREE.Color(0x333333)}
          shininess={22}
        />
      </mesh>

      {/* atmosphere tint */}
      <mesh ref={atmoRef} scale={1.013}>
        <sphereGeometry args={[EARTH_R, 64, 64]} />
        <meshPhongMaterial color={0x4488ff} transparent opacity={0.055} depthWrite={false} />
      </mesh>

      {/* outer halo */}
      <mesh scale={1.2}>
        <sphereGeometry args={[EARTH_R, 32, 32]} />
        <meshBasicMaterial color={0x0044cc} transparent opacity={0.035} side={THREE.BackSide} depthWrite={false} />
      </mesh>
    </group>
  );
}

function EarthFallback() {
  const ref = useRef<THREE.Mesh>(null!);
  useFrame((_, dt) => { ref.current.rotation.y += dt * 0.08; });
  return (
    <mesh ref={ref}>
      <sphereGeometry args={[EARTH_R, 32, 32]} />
      <meshPhongMaterial color={0x1a3d6e} shininess={20} />
    </mesh>
  );
}

// ── Orbit rings ─────────────────────────────────────────────────────────────
const RING_DEFS = [
  { r: 2.7,  tilt: [0.31, 0,    0.28] },
  { r: 3.2,  tilt: [1.41, 0,    0.80] },
  { r: 3.75, tilt: [2.19, 0,    1.20] },
  { r: 4.3,  tilt: [0.63, 0,    2.10] },
  { r: 4.85, tilt: [2.67, 0,    0.55] },
] as const;

function OrbitRings() {
  const primitives = useMemo(() =>
    RING_DEFS.map(({ r, tilt }) => {
      const pts: THREE.Vector3[] = [];
      for (let i = 0; i <= 128; i++) {
        const a = (i / 128) * Math.PI * 2;
        pts.push(new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r));
      }
      const geo = new THREE.BufferGeometry().setFromPoints(pts);
      const mat = new THREE.LineBasicMaterial({ color: 0x1a3357, transparent: true, opacity: 0.38 });
      const loop = new THREE.LineLoop(geo, mat);
      loop.rotation.set(tilt[0], tilt[1], tilt[2]);
      return loop;
    }),
  []);

  return (
    <group>
      {primitives.map((obj, i) => <primitive key={i} object={obj} />)}
    </group>
  );
}

// ── NEO particle swarm ───────────────────────────────────────────────────────
function NeoParticles({ count, color, minR, maxR }: {
  count: number; color: string; minR: number; maxR: number;
}) {
  const pos    = useMemo(() => new Float32Array(count * 3), [count]);
  const speeds = useMemo(() => Float32Array.from({ length: count }, () => 0.06 + Math.random() * 0.28), [count]);
  const radii  = useMemo(() => Float32Array.from({ length: count }, () => minR + Math.random() * (maxR - minR)), [count, minR, maxR]);
  const incs   = useMemo(() => Float32Array.from({ length: count }, () => (Math.random() - 0.5) * Math.PI * 1.6), [count]);
  const phases = useMemo(() => Float32Array.from({ length: count }, () => Math.random() * Math.PI * 2), [count]);

  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    return g;
  }, [pos]);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    for (let i = 0; i < count; i++) {
      const a   = phases[i] + t * speeds[i];
      const r   = radii[i];
      const inc = incs[i];
      pos[i * 3]     = Math.cos(a) * r;
      pos[i * 3 + 1] = Math.sin(a) * Math.sin(inc) * r;
      pos[i * 3 + 2] = Math.sin(a) * Math.cos(inc) * r;
    }
    (geo.attributes.position as THREE.BufferAttribute).needsUpdate = true;
  });

  return (
    <points geometry={geo}>
      <pointsMaterial size={0.055} color={color} transparent opacity={0.85} sizeAttenuation depthWrite={false} />
    </points>
  );
}

// ── Full 3-D scene ───────────────────────────────────────────────────────────
function Scene() {
  return (
    <>
      <ambientLight intensity={0.35} />
      <directionalLight position={[5, 3, 5]} intensity={1.6} />
      <pointLight position={[-8, -4, -6]} color="#3b82f6" intensity={0.45} />
      <Stars radius={120} depth={60} count={6000} factor={4} saturation={0} fade speed={0.4} />
      <OrbitRings />
      <Suspense fallback={<EarthFallback />}>
        <Earth />
      </Suspense>
      <NeoParticles count={200} color="#4a6080" minR={2.5} maxR={5.2} />
      <NeoParticles count={40}  color="#ef4444" minR={2.4} maxR={3.8} />
    </>
  );
}

// ── Animated number counter ──────────────────────────────────────────────────
function CountUp({ target, duration = 2.4 }: { target: number; duration?: number }) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    const t0  = performance.now();
    const ms  = duration * 1000;
    let raf: number;
    const tick = (now: number) => {
      const p = Math.min((now - t0) / ms, 1);
      const e = 1 - Math.pow(1 - p, 4);          // ease-out-quart
      setVal(Math.round(e * target));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return <>{val.toLocaleString()}</>;
}

// ── Public component ─────────────────────────────────────────────────────────
export default function EarthScene() {
  const [liveTotal, setLiveTotal] = useState(NEO_TOTAL);

  useEffect(() => {
    fetch(`${BACKEND_URL}/neo/stats`)
      .then((r) => r.json())
      .then((d) => { if (d?.total_records) setLiveTotal(d.total_records); })
      .catch(() => {});
  }, []);

  return (
    <div className="relative w-full h-full" style={{ background: "#030712" }}>
      <Canvas
        camera={{ position: [0, 0, 7.8], fov: 42 }}
        gl={{ antialias: true, alpha: false }}
        className="w-full h-full"
      >
        <Scene />
      </Canvas>

      {/* Top label */}
      <motion.div
        initial={{ opacity: 0, y: -14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.7 }}
        className="absolute top-8 inset-x-0 flex flex-col items-center gap-1 pointer-events-none select-none"
      >
        <span className="text-[10px] tracking-[0.32em] uppercase text-slate-600 font-semibold">
          Live Orbital Simulation
        </span>
        <span className="text-xs text-slate-500 font-medium">NASA · Near Earth Object Tracking</span>
      </motion.div>

      {/* Bottom counter */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.65, duration: 0.8 }}
        className="absolute bottom-10 inset-x-0 flex flex-col items-center gap-3 pointer-events-none select-none"
      >
        <div
          className="text-5xl font-bold tabular-nums tracking-tight leading-none"
          style={{
            background: "linear-gradient(90deg, #60a5fa 0%, #06b6d4 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          <CountUp target={liveTotal} />
        </div>
        <p className="text-[11px] font-semibold tracking-[0.22em] uppercase text-slate-600">
          Near Earth Objects
        </p>
        <div className="flex items-center gap-5">
          <span className="flex items-center gap-1.5 text-xs text-slate-600">
            <span className="inline-block w-2 h-2 rounded-full bg-slate-600" />
            Safe orbits
          </span>
          <span className="flex items-center gap-1.5 text-xs text-red-500">
            <span className="inline-block w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            Hazardous
          </span>
        </div>
      </motion.div>
    </div>
  );
}
