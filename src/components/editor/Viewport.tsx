'use client';

import { useEffect, useRef, useState, useMemo } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import {
  OrbitControls,
  Grid,
  TransformControls,
  GizmoHelper,
  GizmoViewport,
  Environment,
} from '@react-three/drei';
import * as THREE from 'three';
import { useEditor } from '@/lib/editor-context';
import type { SceneObject, PrimitiveType } from '@/lib/scene-types';

// ─── Individual Mesh ─────────────────────────────────────────────

function PrimitiveMesh({ obj }: { obj: SceneObject }) {
  const { selectedId, selectObject, updateObject, transformMode } = useEditor();
  const isSelected = selectedId === obj.id;
  const meshRef = useRef<THREE.Mesh>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const geometry = useMemo(() => {
    switch (obj.type as PrimitiveType) {
      case 'box':       return <boxGeometry args={[1, 1, 1]} />;
      case 'sphere':    return <sphereGeometry args={[0.5, 32, 32]} />;
      case 'cylinder':  return <cylinderGeometry args={[0.5, 0.5, 1, 32]} />;
      case 'cone':      return <coneGeometry args={[0.5, 1, 32]} />;
      case 'torus':     return <torusGeometry args={[0.4, 0.15, 16, 64]} />;
      case 'plane':     return <planeGeometry args={[1, 1]} />;
      case 'capsule':   return <capsuleGeometry args={[0.3, 0.6, 8, 16]} />;
      default:          return <boxGeometry args={[1, 1, 1]} />;
    }
  }, [obj.type]);

  if (!obj.visible) return null;

  return (
    <>
      {isSelected && mounted && meshRef.current && (
        <TransformControls
          object={meshRef.current}
          mode={transformMode}
          onObjectChange={() => {
            if (!meshRef.current) return;
            const p = meshRef.current.position;
            const r = meshRef.current.rotation;
            const s = meshRef.current.scale;
            updateObject(obj.id, {
              position: [p.x, p.y, p.z],
              rotation: [r.x, r.y, r.z],
              scale: [s.x, s.y, s.z],
            });
          }}
        />
      )}
      <mesh
        ref={meshRef}
        position={obj.position}
        rotation={obj.rotation}
        scale={obj.scale}
        onClick={(e) => {
          e.stopPropagation();
          selectObject(obj.id);
        }}
        castShadow
        receiveShadow
      >
        {geometry}
        <meshStandardMaterial
          color={obj.color}
          wireframe={obj.wireframe}
          transparent={obj.opacity < 1}
          opacity={obj.opacity}
          metalness={obj.metalness}
          roughness={obj.roughness}
          emissive={isSelected ? new THREE.Color(obj.color) : new THREE.Color(0x000000)}
          emissiveIntensity={isSelected ? 0.15 : 0}
        />
      </mesh>
    </>
  );
}

// ─── Scene click handler to deselect ─────────────────────────────

function SceneBackground() {
  const { selectObject, scene } = useEditor();
  const { camera } = useThree();

  return (
    <>
      {/* Background color */}
      {scene?.background ? (
        <color attach="background" args={[scene.background]} />
      ) : null}

      {/* Click on empty space to deselect */}
      <mesh
        position={[0, 0, 0]}
        visible={false}
        onClick={() => selectObject(null)}
      >
        <sphereGeometry args={[100, 8, 8]} />
        <meshBasicMaterial side={THREE.BackSide} />
      </mesh>
    </>
  );
}

// ─── Main Scene Content ───────────────────────────────────────────

function SceneContent() {
  const { objects } = useEditor();

  return (
    <>
      <SceneBackground />

      {/* Lighting */}
      <ambientLight intensity={0.4} />
      <directionalLight
        position={[5, 8, 5]}
        intensity={1.2}
        castShadow
        shadow-mapSize={[2048, 2048]}
      />
      <directionalLight position={[-5, 3, -5]} intensity={0.3} />

      {/* Grid */}
      <Grid
        args={[20, 20]}
        position={[0, 0, 0]}
        cellSize={1}
        cellThickness={0.5}
        cellColor="#1c1a17"
        sectionSize={5}
        sectionThickness={1}
        sectionColor="#1c1a17"
        fadeDistance={30}
        fadeStrength={1.5}
        followCamera={false}
        infiniteGrid
      />

      {/* Objects */}
      {objects.map((obj) => (
        <PrimitiveMesh key={obj.id} obj={obj} />
      ))}

      {/* Camera gizmo */}
      <GizmoHelper alignment="bottom-right" margin={[70, 70]}>
        <GizmoViewport
          axisColors={['#ff4d4d', '#4dff4d', '#4d7fff']}
          labelColor="white"
        />
      </GizmoHelper>

      {/* Orbit Controls */}
      <OrbitControls
        makeDefault
        enableDamping
        dampingFactor={0.05}
        minDistance={1}
        maxDistance={100}
      />
    </>
  );
}

// ─── Viewport Export ──────────────────────────────────────────────

export default function Viewport({ canvasRef }: { canvasRef?: React.RefObject<HTMLCanvasElement | null> }) {
  return (
    <Canvas
      gl={{ antialias: true, preserveDrawingBuffer: true }}
      shadows
      camera={{ position: [5, 5, 8], fov: 50, near: 0.1, far: 1000 }}
      ref={canvasRef}
      style={{ width: '100%', height: '100%' }}
    >
      <SceneContent />
    </Canvas>
  );
}
