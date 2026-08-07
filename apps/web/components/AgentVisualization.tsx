"use client";

import React, { useRef, useState, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Box, Cylinder, Sphere, Text, Line, Grid, Float } from "@react-three/drei";
import * as THREE from "three";

interface VisualizationProps {
  currentEvent: any;
}

const Robot = ({ position, color, label, isActive, rotation = [0, 0, 0] }: any) => {
  const groupRef = useRef<THREE.Group>(null);
  const headRef = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (groupRef.current && headRef.current) {
      // Gentle floating/breathing animation
      groupRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 2) * 0.1;
      
      if (isActive) {
        // Look around quickly if active
        headRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 10) * 0.5;
        headRef.current.position.y = 1.6 + Math.sin(state.clock.elapsedTime * 20) * 0.05;
      } else {
        // Idle
        headRef.current.rotation.y = Math.sin(state.clock.elapsedTime) * 0.2;
        headRef.current.position.y = 1.6;
      }
    }
  });

  return (
    <group position={position} rotation={rotation} ref={groupRef}>
      {/* Torso */}
      <Box args={[1, 1.2, 0.8]} position={[0, 0.6, 0]} castShadow>
        <meshStandardMaterial color="#c0c5ce" metalness={0.7} roughness={0.3} />
      </Box>
      
      {/* Neck */}
      <Cylinder args={[0.2, 0.2, 0.4]} position={[0, 1.3, 0]}>
        <meshStandardMaterial color="#8892b0" />
      </Cylinder>

      {/* Head */}
      <Box ref={headRef} args={[0.9, 0.7, 0.9]} position={[0, 1.6, 0]} castShadow>
        <meshStandardMaterial color="#e2e8f0" metalness={0.5} roughness={0.4} />
        {/* Eye Visor */}
        <Box args={[0.7, 0.2, 0.1]} position={[0, 0.1, 0.46]}>
          <meshStandardMaterial 
            color={color} 
            emissive={color} 
            emissiveIntensity={isActive ? 4 : 1} 
          />
        </Box>
      </Box>

      {/* Left Arm */}
      <Box args={[0.3, 1.2, 0.3]} position={[-0.7, 0.6, 0]}>
        <meshStandardMaterial color="#a0aec0" metalness={0.8} />
      </Box>
      {/* Right Arm */}
      <Box args={[0.3, 1.2, 0.3]} position={[0.7, 0.6, 0]}>
        <meshStandardMaterial color="#a0aec0" metalness={0.8} />
      </Box>

      {/* Label */}
      <Text
        position={[0, 2.5, 0]}
        fontSize={0.3}
        color={isActive ? color : "white"}
        anchorX="center"
        anchorY="middle"
      >
        {label}
      </Text>
      
      {/* Glowing Aura Ring */}
      {isActive && (
        <mesh position={[0, 0.1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[1.2, 1.3, 32]} />
          <meshBasicMaterial color={color} transparent opacity={0.5} />
        </mesh>
      )}
    </group>
  );
};

const KeeperHubBuilding = ({ position, isActive }: any) => {
  const buildingRef = useRef<THREE.Group>(null);
  
  useFrame((state) => {
    if (buildingRef.current && isActive) {
      // Subtle pulse on the building when executing
      const scale = 1 + Math.sin(state.clock.elapsedTime * 5) * 0.02;
      buildingRef.current.scale.set(1, scale, 1);
    } else if (buildingRef.current) {
      buildingRef.current.scale.lerp(new THREE.Vector3(1, 1, 1), 0.1);
    }
  });

  return (
    <group position={position} ref={buildingRef}>
      {/* Main Structure */}
      <Box args={[2.5, 4, 2.5]} position={[0, 2, 0]} castShadow receiveShadow>
        <meshStandardMaterial color="#c0c5ce" metalness={0.7} roughness={0.2} />
      </Box>
      
      {/* Wireframe overlay for tech look */}
      <Box args={[2.55, 4.05, 2.55]} position={[0, 2, 0]}>
        <meshBasicMaterial color={isActive ? "#33ff99" : "#113322"} wireframe transparent opacity={isActive ? 0.8 : 0.2} />
      </Box>

      {/* Server Lights */}
      {[...Array(4)].map((_, i) => (
        <Box key={i} args={[2.6, 0.1, 0.1]} position={[0, 0.8 + i * 0.8, 1.25]}>
          <meshStandardMaterial 
            color="#33ff99" 
            emissive="#33ff99" 
            emissiveIntensity={isActive ? 2 + Math.random() : 0.2} 
          />
        </Box>
      ))}

      <Text
        position={[0, 4.5, 0]}
        fontSize={0.4}
        color={isActive ? "#33ff99" : "white"}
        anchorX="center"
        anchorY="middle"
      >
        KeeperHub
      </Text>
    </group>
  );
};

const DataStream = ({ start, end, active, color }: { start: [number, number, number], end: [number, number, number], active: boolean, color: string }) => {
  const particleRef = useRef<THREE.Mesh>(null);
  const startVec = new THREE.Vector3(...start);
  const endVec = new THREE.Vector3(...end);

  useFrame((state) => {
    if (particleRef.current && active) {
      // Data packet traveling along the line
      const t = (state.clock.elapsedTime * 1.5) % 1; 
      
      // Arc trajectory
      const currentPos = new THREE.Vector3().lerpVectors(startVec, endVec, t);
      // Add a little height arc
      currentPos.y += Math.sin(t * Math.PI) * 1.5;
      
      particleRef.current.position.copy(currentPos);
      particleRef.current.visible = true;
      
      // Flash effect
      const mat = particleRef.current.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = 2 + Math.sin(state.clock.elapsedTime * 20);
    } else if (particleRef.current) {
      particleRef.current.visible = false;
    }
  });

  return (
    <group>
      {/* Floor pathway line */}
      <Line
        points={[
          [start[0], 0.05, start[2]], 
          [end[0], 0.05, end[2]]
        ]}
        color={active ? color : "#222"}
        lineWidth={3}
        transparent
        opacity={active ? 0.8 : 0.1}
      />
      {/* Flying Data Packet */}
      <mesh ref={particleRef}>
        <boxGeometry args={[0.3, 0.1, 0.3]} />
        <meshStandardMaterial color={color} emissive={color} />
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

    const timer = setTimeout(() => {
      setActiveNode(null);
      setActiveStream(null);
    }, 2500);

    return () => clearTimeout(timer);
  }, [currentEvent]);

  // Positions on the base
  const posAlpha: [number, number, number] = [-3, 0, -2];
  const posGamma: [number, number, number] = [-3, 0, 2];
  const posKeeperHub: [number, number, number] = [4, 0, 0];

  return (
    <div className="w-full h-[450px] bg-black/80 rounded-none border border-v-border/50 overflow-hidden relative shadow-[0_0_50px_rgba(0,0,0,0.5)_inset]">
      <div className="absolute top-4 left-4 z-10 flex items-center gap-2 bg-black/40 px-3 py-1.5 rounded-full border border-white/10 backdrop-blur-sm">
        <div className={`w-2 h-2 rounded-full ${activeNode ? 'bg-v-danger live-pulse' : 'bg-v-safe'}`} />
        <span className="text-xs font-bold text-white/80 uppercase tracking-widest">
          {activeNode ? `Active: ${activeNode}` : 'System Standby'}
        </span>
      </div>
      
      <Canvas shadows camera={{ position: [0, 6, 12], fov: 40 }}>
        <color attach="background" args={["#050505"]} />
        <fog attach="fog" args={["#050505", 10, 25]} />
        
        <ambientLight intensity={0.7} />
        {/* Main directional light */}
        <directionalLight 
          position={[5, 10, 5]} 
          intensity={2} 
          castShadow 
          shadow-bias={-0.0001}
        />
        {/* Fill light from the other side to illuminate shadows */}
        <directionalLight 
          position={[-10, 10, -10]} 
          intensity={1} 
        />
        
        {/* Glowing Base Grid */}
        <Grid 
          position={[0, 0, 0]} 
          args={[30, 30]} 
          cellSize={1} 
          cellThickness={1} 
          cellColor="#333" 
          sectionSize={5} 
          sectionThickness={1.5} 
          sectionColor="#555" 
          fadeDistance={20} 
        />

        {/* Entities */}
        <Robot 
          position={posAlpha} 
          color="#ff3366" 
          label="Warden (Detector)" 
          isActive={activeNode === "alpha"} 
          rotation={[0, Math.PI / 4, 0]}
        />
        <Robot 
          position={posGamma} 
          color="#33ccff" 
          label="Judge (Critique)" 
          isActive={activeNode === "gamma"} 
          rotation={[0, Math.PI / 4, 0]}
        />
        <KeeperHubBuilding 
          position={posKeeperHub} 
          isActive={activeNode === "keeperhub"} 
        />

        {/* Data Connections */}
        <DataStream 
          start={posAlpha} 
          end={posGamma} 
          active={activeStream === "gamma"} 
          color="#33ccff"
        />
        <DataStream 
          start={posGamma} 
          end={posKeeperHub} 
          active={activeStream === "keeperhub"} 
          color="#33ff99"
        />
        
        <OrbitControls 
          enableZoom={true} 
          maxDistance={20} 
          minDistance={5} 
          maxPolarAngle={Math.PI / 2 - 0.1} // Prevent going below ground
        />
      </Canvas>
    </div>
  );
}
