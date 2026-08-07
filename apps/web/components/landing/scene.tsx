"use client";

import React, { useRef, useMemo, useEffect, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

// We'll create a particle system for the spheres
function ParticleSystem({ count = 200 }) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  
  // Define positions and colors for torus formation
  const { positions, colors } = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const colorA = new THREE.Color("#10b981"); // emerald-400 (safe)
    const colorB = new THREE.Color("#f43f5e"); // rose-500 (threat)
    const tempColor = new THREE.Color();
    
    // Torus parameters
    const R = 3; // major radius
    const r = 1; // minor radius

    for (let i = 0; i < count; i++) {
      const u = Math.random() * Math.PI * 2;
      const v = Math.random() * Math.PI * 2;
      
      const x = (R + r * Math.cos(v)) * Math.cos(u);
      const y = (R + r * Math.cos(v)) * Math.sin(u);
      const z = r * Math.sin(v);
      
      pos[i * 3] = x;
      pos[i * 3 + 1] = y;
      pos[i * 3 + 2] = z;

      // Interpolate color based on angle or random
      tempColor.lerpColors(colorA, colorB, Math.random());
      col[i * 3] = tempColor.r;
      col[i * 3 + 1] = tempColor.g;
      col[i * 3 + 2] = tempColor.b;
    }
    return { positions: pos, colors: col };
  }, [count]);

  const dummy = useMemo(() => new THREE.Object3D(), []);

  useEffect(() => {
    if (meshRef.current) {
      for (let i = 0; i < count; i++) {
        dummy.position.set(positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2]);
        dummy.updateMatrix();
        meshRef.current.setMatrixAt(i, dummy.matrix);
        meshRef.current.setColorAt(i, new THREE.Color(colors[i * 3], colors[i * 3 + 1], colors[i * 3 + 2]));
      }
      meshRef.current.instanceMatrix.needsUpdate = true;
      if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true;
    }
  }, [count, positions, colors, dummy]);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 1 / 30); // clamp delta to at least 30fps equivalence
    if (meshRef.current) {
      meshRef.current.rotation.y += dt * 0.05;
      meshRef.current.rotation.x += dt * 0.02;
    }
  });

  // Cleanup geometries/materials on unmount handled by R3F
  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      <sphereGeometry args={[0.02, 8, 8]} />
      <meshBasicMaterial vertexColors />
    </instancedMesh>
  );
}

function Icosahedron() {
  const meshRef = useRef<THREE.LineSegments>(null);
  
  useFrame((state, delta) => {
    const dt = Math.min(delta, 1 / 30);
    if (meshRef.current) {
      meshRef.current.rotation.y += dt * 0.1;
      meshRef.current.rotation.z += dt * 0.05;
    }
  });

  return (
    <lineSegments ref={meshRef}>
      <edgesGeometry args={[new THREE.IcosahedronGeometry(1.5, 0)]} />
      <lineBasicMaterial color="#94a3b8" transparent opacity={0.15} />
    </lineSegments>
  );
}

function PulseRipples() {
  const [ripples, setRipples] = useState<{ id: number; pos: THREE.Vector3; createdAt: number }[]>([]);
  const meshRef = useRef<THREE.Group>(null);
  const R = 3;
  const r = 1;

  useEffect(() => {
    const interval = setInterval(() => {
      // Create a ripple at a random torus position
      const u = Math.random() * Math.PI * 2;
      const v = Math.random() * Math.PI * 2;
      const x = (R + r * Math.cos(v)) * Math.cos(u);
      const y = (R + r * Math.cos(v)) * Math.sin(u);
      const z = r * Math.sin(v);
      
      setRipples((prev) => [
        ...prev,
        { id: Date.now(), pos: new THREE.Vector3(x, y, z), createdAt: performance.now() }
      ]);
    }, 2000); // New pulse every 2 seconds

    return () => clearInterval(interval);
  }, []);

  useFrame(() => {
    const now = performance.now();
    setRipples((prev) => prev.filter((ripple) => now - ripple.createdAt < 2000));
  });

  return (
    <group ref={meshRef}>
      {ripples.map((ripple) => (
        <Ripple key={ripple.id} position={ripple.pos} createdAt={ripple.createdAt} />
      ))}
    </group>
  );
}

function Ripple({ position, createdAt }: { position: THREE.Vector3; createdAt: number }) {
  const meshRef = useRef<THREE.Mesh>(null);
  
  useFrame(() => {
    if (meshRef.current) {
      const age = performance.now() - createdAt;
      const progress = Math.min(age / 2000, 1); // 0 to 1 over 2 seconds
      
      const scale = 1 + progress * 5;
      meshRef.current.scale.set(scale, scale, scale);
      
      const material = meshRef.current.material as THREE.MeshBasicMaterial;
      material.opacity = 1 - progress; // fade out
    }
  });

  return (
    <mesh ref={meshRef} position={position}>
      <ringGeometry args={[0.1, 0.12, 32]} />
      <meshBasicMaterial color="#f43f5e" transparent opacity={1} side={THREE.DoubleSide} />
    </mesh>
  );
}

function CameraRig() {
  const { camera } = useThree();
  const target = new THREE.Vector3();

  useFrame((state, delta) => {
    const dt = Math.min(delta, 1 / 30);
    // pointer is normalized -1 to 1
    target.set(state.pointer.x * 2, state.pointer.y * 2, camera.position.z);
    camera.position.x += (target.x - camera.position.x) * 2 * dt;
    camera.position.y += (target.y - camera.position.y) * 2 * dt;
    camera.lookAt(0, 0, 0);
  });
  
  return null;
}

export function Scene() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  return (
    <div className="fixed inset-0 z-0 pointer-events-none">
      <Canvas camera={{ position: [0, 0, 7], fov: 60 }} gl={{ alpha: true, antialias: false }}>
        <fog attach="fog" args={["#020617", 5, 20]} />
        <CameraRig />
        <Icosahedron />
        <ParticleSystem count={isMobile ? 50 : 200} />
        <PulseRipples />
      </Canvas>
    </div>
  );
}
