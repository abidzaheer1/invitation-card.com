"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float, OrbitControls, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import type { Model3DConfig } from "@invitation/shared";

function Rings({ color }: { color: string }) {
  return (
    <group rotation={[0.4, 0, 0.2]}>
      <mesh position={[-0.42, 0, 0]} rotation={[0, Math.PI / 2.4, 0]}>
        <torusGeometry args={[0.7, 0.13, 32, 80]} />
        <meshStandardMaterial color={color} metalness={0.85} roughness={0.25} />
      </mesh>
      <mesh position={[0.42, 0, 0]} rotation={[0, -Math.PI / 2.4, 0]}>
        <torusGeometry args={[0.7, 0.13, 32, 80]} />
        <meshStandardMaterial color={color} metalness={0.85} roughness={0.25} />
      </mesh>
    </group>
  );
}

function Heart({ color }: { color: string }) {
  const geometry = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(0.25, 0.25);
    s.bezierCurveTo(0.25, 0.25, 0.2, 0, 0, 0);
    s.bezierCurveTo(-0.3, 0, -0.3, 0.35, -0.3, 0.35);
    s.bezierCurveTo(-0.3, 0.55, -0.1, 0.77, 0.25, 0.95);
    s.bezierCurveTo(0.6, 0.77, 0.8, 0.55, 0.8, 0.35);
    s.bezierCurveTo(0.8, 0.35, 0.8, 0, 0.5, 0);
    s.bezierCurveTo(0.35, 0, 0.25, 0.25, 0.25, 0.25);
    return new THREE.ExtrudeGeometry(s, {
      depth: 0.25,
      bevelEnabled: true,
      bevelSize: 0.06,
      bevelThickness: 0.06,
      bevelSegments: 6,
    });
  }, []);
  useEffect(() => () => geometry.dispose(), [geometry]);

  return (
    <mesh geometry={geometry} position={[-0.35, -0.6, -0.1]} scale={1.4} rotation={[Math.PI, 0, 0]}>
      <meshStandardMaterial color={color} metalness={0.3} roughness={0.35} />
    </mesh>
  );
}

function Balloons({ color }: { color: string }) {
  const palette = [color, "#e9a8b8", "#8fb7e8"];
  const spots: [number, number, number][] = [
    [-0.7, 0.35, 0],
    [0, 0.65, -0.2],
    [0.7, 0.3, 0.1],
  ];
  return (
    <group position={[0, -0.2, 0]}>
      {spots.map((p, i) => (
        <group key={i} position={p}>
          <mesh scale={[1, 1.2, 1]}>
            <sphereGeometry args={[0.45, 32, 32]} />
            <meshStandardMaterial color={palette[i]} metalness={0.2} roughness={0.2} />
          </mesh>
          <mesh position={[0, -1, 0]}>
            <cylinderGeometry args={[0.008, 0.008, 1, 6]} />
            <meshStandardMaterial color="#d8d2c4" />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function Cake({ color }: { color: string }) {
  return (
    <group position={[0, -0.5, 0]}>
      <mesh position={[0, 0.2, 0]}>
        <cylinderGeometry args={[0.9, 0.9, 0.4, 48]} />
        <meshStandardMaterial color="#f5e6d3" roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.65, 0]}>
        <cylinderGeometry args={[0.6, 0.6, 0.5, 48]} />
        <meshStandardMaterial color={color} roughness={0.5} />
      </mesh>
      <mesh position={[0, 1.15, 0]}>
        <cylinderGeometry args={[0.04, 0.04, 0.45, 12]} />
        <meshStandardMaterial color="#fffdf5" />
      </mesh>
      <mesh position={[0, 1.45, 0]}>
        <coneGeometry args={[0.06, 0.16, 12]} />
        <meshStandardMaterial color="#ffb347" emissive="#ff8c00" emissiveIntensity={0.8} />
      </mesh>
    </group>
  );
}

function CustomModel({ url }: { url: string }) {
  const { scene } = useGLTF(url);
  const cloned = useMemo(() => scene.clone(true), [scene]);
  return <primitive object={cloned} />;
}

function Model({ config }: { config: Model3DConfig }) {
  const color = config.color ?? "#d4a017";
  switch (config.kind) {
    case "rings":
      return <Rings color={color} />;
    case "heart":
      return <Heart color={color} />;
    case "balloons":
      return <Balloons color={color} />;
    case "cake":
      return <Cake color={color} />;
    case "custom":
      return config.url ? <CustomModel url={config.url} /> : null;
    default:
      return null;
  }
}

function Spinner({ enabled, children }: { enabled: boolean; children: React.ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  useFrame((_, delta) => {
    if (enabled && ref.current) ref.current.rotation.y += delta * 0.6;
  });
  return <group ref={ref}>{children}</group>;
}

export default function Scene3D({ model }: { model: Model3DConfig }) {
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(query.matches);
    const onChange = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  if (model.kind === "none") return null;

  return (
    <Canvas camera={{ position: [0, 0, 4], fov: 45 }} dpr={[1, 1.5]} gl={{ antialias: true }}>
      <ambientLight intensity={0.7} />
      <hemisphereLight args={["#ffffff", "#444444", 0.6]} />
      <directionalLight position={[3, 4, 5]} intensity={2.2} />
      <pointLight position={[-4, -2, 3]} intensity={25} color="#ffd9a0" />
      <Suspense fallback={null}>
        <Float
          speed={reducedMotion ? 0 : 1.4}
          rotationIntensity={reducedMotion ? 0 : 0.3}
          floatIntensity={reducedMotion ? 0 : 0.6}
        >
          <Spinner enabled={Boolean(model.autoRotate) && !reducedMotion}>
            <Model config={model} />
          </Spinner>
        </Float>
      </Suspense>
      <OrbitControls enableZoom={false} enablePan={false} />
    </Canvas>
  );
}
