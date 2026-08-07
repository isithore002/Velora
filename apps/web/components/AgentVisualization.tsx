"use client";

import React, { useRef, useState, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Box, Octahedron, Sphere, Text, Line, Float } from "@react-three/drei";
import * as THREE from "three";

interface VisualizationProps {
  currentEvent: any;
}

const Node = ({ position, color, label, isActive, shape: Shape }: any) => {
  const meshRef = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (meshRef.current) {
      // Rotation animation
      meshRef.current.rotation.x += 0.01;
      meshRef.current.rotation.y += 0.01;

      // Pulse animation if active
      if (isActive) {
        const scale = 1 + Math.sin(state.clock.elapsedTime * 8) * 0.15;
        meshRef.current.scale.set(scale, scale, scale);
      } else {
        meshRef.current.scale.lerp(new THREE.Vector3(1, 1, 1), 0.1);
      }
    }
  });

  return (
    <group position={position}>
      <Float speed={2} rotationIntensity={0.5} floatIntensity={1}>
        <Shape ref={meshRef} args={[1, 32, 32]}>
          <meshStandardMaterial 
            color={color} 
            emissive={color}
            emissiveIntensity={isActive ? 2 : 0.5}
            transparent
            opacity={0.9}
            wireframe={!isActive}
          />
        </Shape>
      </Float>
      <Text
        position={[0, -1.8, 0]}
        fontSize={0.4}
        color="white"
        anchorX="center"
        anchorY="middle"
      >
        {label}
      </Text>
    </group>
  );
};

const ParticleStream = ({ start, end, active }: { start: [number, number, number], end: [number, number, number], active: boolean }) => {
  const particleRef = useRef<THREE.Mesh>(null);
  const startVec = new THREE.Vector3(...start);
  const endVec = new THREE.Vector3(...end);

  useFrame((state) => {
    if (particleRef.current && active) {
      // Move particle from start to end
      const t = (state.clock.elapsedTime * 2) % 1; // Loops from 0 to 1
      particleRef.current.position.lerpVectors(startVec, endVec, t);
      particleRef.current.visible = true;
    } else if (particleRef.current) {
      particleRef.current.visible = false;
    }
  });

  return (
    <group>
      <Line
        points={[start, end]}
        color={active ? "white" : "#333"}
        lineWidth={2}
        transparent
        opacity={active ? 0.8 : 0.3}
      />
      <mesh ref={particleRef}>
        <sphereGeometry args={[0.2, 16, 16]} />
        <meshBasicMaterial color="white" />
      </mesh>
    </group>
  );
};

export function AgentVisualization({ currentEvent }: VisualizationProps) {
  const [activeNode, setActiveNode] = useState<string | null>(null);
  const [activeStream, setActiveStream] = useState<string | null>(null);

  useEffect(() => {
    if (!currentEvent) {
      setActiveNode(null);
      setActiveStream(null);
      return;
    }

    // Determine which node and stream should be active based on status
    switch (currentEvent.status) {
      case "pending":
        setActiveNode("alpha");
        setActiveStream("alpha");
        break;
      case "critiquing":
        setActiveNode("gamma");
        setActiveStream("gamma");
        break;
      case "executing":
        setActiveNode("keeperhub");
        setActiveStream("keeperhub");
        break;
      case "confirmed":
        // If it got confirmed and has a transaction hash, it executed
        if (currentEvent.executeTxHash) {
          setActiveNode("keeperhub");
          setActiveStream("keeperhub");
        } else {
          setActiveNode(null);
          setActiveStream(null);
        }
        break;
      default:
        setActiveNode(null);
        setActiveStream(null);
    }

    // Auto-clear active state after a short delay
    const timer = setTimeout(() => {
      setActiveNode(null);
      setActiveStream(null);
    }, 2000);

    return () => clearTimeout(timer);
  }, [currentEvent]);

  // Positions
  const posAlpha: [number, number, number] = [-4, 0, 0];
  const posGamma: [number, number, number] = [0, 0, 0];
  const posKeeperHub: [number, number, number] = [4, 0, 0];

  return (
    <div className="w-full h-[400px] bg-black/40 rounded-lg border border-white/10 overflow-hidden relative">
      <div className="absolute top-4 left-4 z-10">
        <h3 className="text-sm font-semibold text-white/80 uppercase tracking-wider">Execution Flow</h3>
      </div>
      <Canvas camera={{ position: [0, 0, 8], fov: 45 }}>
        <color attach="background" args={["#000000"]} />
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={1} />
        
        {/* Nodes */}
        <Node 
          position={posAlpha} 
          color="#ff3366" 
          label="Alpha (Detector)" 
          isActive={activeNode === "alpha"} 
          shape={Octahedron}
        />
        <Node 
          position={posGamma} 
          color="#33ccff" 
          label="Gamma (Critique)" 
          isActive={activeNode === "gamma"} 
          shape={Box}
        />
        <Node 
          position={posKeeperHub} 
          color="#33ff99" 
          label="KeeperHub (Exec)" 
          isActive={activeNode === "keeperhub"} 
          shape={Sphere}
        />

        {/* Streams */}
        <ParticleStream 
          start={posAlpha} 
          end={posGamma} 
          active={activeStream === "gamma"} 
        />
        <ParticleStream 
          start={posGamma} 
          end={posKeeperHub} 
          active={activeStream === "keeperhub"} 
        />
        
        <OrbitControls enableZoom={false} enablePan={false} maxPolarAngle={Math.PI / 2} minPolarAngle={Math.PI / 2} />
      </Canvas>
    </div>
  );
}
