'use client';

import React, { useEffect, useRef, useState, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import {
  OrbitControls,
  Grid,
  TransformControls,
  GizmoHelper,
  GizmoViewport,
  Sparkles,
} from '@react-three/drei';
import { Physics, RigidBody } from '@react-three/rapier';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';
import { useEditor } from '@/lib/editor-context';
import type { SceneObject, PrimitiveType } from '@/lib/scene-types';


function getPrimitiveGeometry(type: PrimitiveType): THREE.BufferGeometry {
  switch (type) {
    case 'box':       return new THREE.BoxGeometry(1, 1, 1, 16, 16, 16);
    case 'sphere':    return new THREE.SphereGeometry(0.5, 64, 64);
    case 'cylinder':  return new THREE.CylinderGeometry(0.5, 0.5, 1, 32, 16);
    case 'cone':      return new THREE.ConeGeometry(0.5, 1, 32, 16);
    case 'torus':     return new THREE.TorusGeometry(0.4, 0.15, 32, 64);
    case 'plane':     return new THREE.PlaneGeometry(1, 1, 64, 64);
    case 'capsule':   return new THREE.CapsuleGeometry(0.3, 0.6, 16, 32);
    default:          return new THREE.BoxGeometry(1, 1, 1, 16, 16, 16);
  }
}

function PrimitiveMesh({ obj }: { obj: SceneObject }) {
  const { selectedId, selectObject, updateObject, transformMode, sculptMode, sculptBrushSize, sculptBrushStrength, sculptBrushType } = useEditor();
  const isSelected = selectedId === obj.id;
  const meshRef = useRef<THREE.Mesh>(null);
  const [mounted, setMounted] = useState(false);
  const isSculptingDown = useRef(false);
  
  // Brush Cursor State
  const brushCursorRef = useRef<THREE.Mesh>(null);

  // Maintain an independent clone of the geometry so R3F doesn't reset it
  const geometry = useMemo(() => {
    return getPrimitiveGeometry(obj.type as PrimitiveType).clone();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [obj.type]); // Intentionally omitting ID so it doesn't reset on simple updates

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!obj.visible) return null;

  const texture = useMemo(() => {
    if (!obj.textureMap) return null;
    const loader = new THREE.TextureLoader();
    return loader.load(obj.textureMap);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [obj.textureMap]);

  const materialProps = {
    color: obj.color,
    wireframe: obj.wireframe,
    transparent: obj.opacity < 1,
    opacity: obj.opacity,
    metalness: obj.metalness,
    roughness: obj.roughness,
    emissive: isSelected ? new THREE.Color(obj.color) : new THREE.Color(0x000000),
    emissiveIntensity: isSelected ? 0.15 : 0,
    map: texture ?? undefined,
  };

  useFrame((state) => {
    if (!meshRef.current || obj.animationType === 'none' || obj.isPhysicsBody) return;
    const t = state.clock.getElapsedTime();
    if (obj.animationType === 'spin') {
      meshRef.current.rotation.y += 0.02;
    } else if (obj.animationType === 'float') {
      meshRef.current.position.y = obj.position[1] + Math.sin(t * 2) * 0.2;
    } else if (obj.animationType === 'pulse') {
      const s = 1 + Math.sin(t * 4) * 0.1;
      meshRef.current.scale.set(obj.scale[0] * s, obj.scale[1] * s, obj.scale[2] * s);
    }
  });

  const transformNode = isSelected && mounted && meshRef.current && !sculptMode ? (
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
  ) : null;


  // Sculpting logic
  const handlePointerDown = (e: any) => {
    if (sculptMode && isSelected) {
      e.stopPropagation();
      isSculptingDown.current = true;
      (e.target as any).setPointerCapture?.(e.pointerId); // In R3F, e.target has setPointerCapture
    }
  };

  const handlePointerUp = (e: any) => {
    isSculptingDown.current = false;
    (e.target as any).releasePointerCapture?.(e.pointerId);
  };

  const handlePointerMove = (e: any) => {
    if (!sculptMode || !isSelected || !meshRef.current) return;
    
    // Always update cursor position if hovered
    if (e.intersections && e.intersections.length > 0) {
      const hit = e.intersections[0];
      if (hit.object !== meshRef.current) return;
      e.stopPropagation();

      if (brushCursorRef.current) {
        brushCursorRef.current.position.copy(hit.point);
        if (hit.face) {
          // Align ring to surface normal
          const n = hit.face.normal.clone().transformDirection(meshRef.current.matrixWorld);
          brushCursorRef.current.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), n);
        }
        brushCursorRef.current.visible = true;
      }

      // If not dragging, we just updated the cursor. Return.
      if (!isSculptingDown.current) return;

      const positions = geometry.attributes.position;
      const normals = geometry.attributes.normal;
      if (!positions || !normals) return;

      const hitNormal = hit.face?.normal.clone().transformDirection(meshRef.current.matrixWorld) || new THREE.Vector3(0, 0, 1);
      
      const v = new THREE.Vector3();
      const n = new THREE.Vector3();
      const worldV = new THREE.Vector3();
      const worldN = new THREE.Vector3();

      let modified = false;
      for (let i = 0; i < positions.count; i++) {
        v.fromBufferAttribute(positions, i);
        worldV.copy(v).applyMatrix4(meshRef.current.matrixWorld);
        
        const dist = worldV.distanceTo(hit.point);
        if (dist < sculptBrushSize) {
          n.fromBufferAttribute(normals, i);
          worldN.copy(n).transformDirection(meshRef.current.matrixWorld);
          
          // Backface culling: don't pull vertices on the other side of the model
          if (worldN.dot(hitNormal) < 0.1) continue;

          // Quadratic falloff for smoother, tighter brush edges
          const falloff = Math.pow(1 - (dist / sculptBrushSize), 2);
          
          // Convert world strength to local push amount (assuming uniform scale)
          const moveLocal = (falloff * sculptBrushStrength) / meshRef.current.scale.x;
          
          if (sculptBrushType === 'push') {
            v.sub(n.multiplyScalar(moveLocal));
          } else {
            v.add(n.multiplyScalar(moveLocal));
          }
          positions.setXYZ(i, v.x, v.y, v.z);
          modified = true;
        }
      }

      if (modified) {
        positions.needsUpdate = true;
        geometry.computeVertexNormals();
        geometry.computeBoundingSphere();
        geometry.computeBoundingBox();
      }
    }
  };

  const handlePointerOut = (e: any) => {
    if (brushCursorRef.current) brushCursorRef.current.visible = false;
    handlePointerUp(e);
  };

  // Normal primitive rendering
  const meshNode = (
    <>
      <mesh
        ref={meshRef}
        geometry={geometry}
        position={obj.position}
        rotation={obj.rotation}
        scale={obj.scale}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerOut={handlePointerOut}
        onPointerMove={handlePointerMove}
        onClick={(e) => {
          e.stopPropagation();
          selectObject(obj.id);
        }}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial {...materialProps} />
        {obj.hasSparkles && <Sparkles count={50} scale={2} size={4} speed={0.4} color={obj.color} />}
      </mesh>
      
      {/* Brush Cursor */}
      {sculptMode && isSelected && (
        <mesh ref={brushCursorRef} visible={false}>
          <ringGeometry args={[sculptBrushSize * 0.9, sculptBrushSize, 32]} />
          <meshBasicMaterial color="#ff4d4d" side={THREE.DoubleSide} depthTest={false} transparent opacity={0.8} />
        </mesh>
      )}
    </>
  );

  return (
    <>
      {transformNode}
      {obj.isPhysicsBody ? (
        <RigidBody colliders="hull" type="dynamic">
          {meshNode}
        </RigidBody>
      ) : (
        meshNode
      )}
    </>
  );
}

// ─── Scene Environment ────────────────────────────────────────────

function SceneEnvironmentLayer() {
  const { environment, selectObject } = useEditor();

  return (
    <>
      {/* Background color */}
      <color attach="background" args={[environment.background]} />

      {/* Fog */}
      {environment.fogEnabled && (
        <fog
          attach="fog"
          args={[environment.fogColor, environment.fogNear, environment.fogFar]}
        />
      )}

      {/* Click empty space to deselect */}
      <mesh visible={false} onClick={() => selectObject(null)}>
        <sphereGeometry args={[100, 8, 8]} />
        <meshBasicMaterial side={THREE.BackSide} />
      </mesh>

      {/* Optional flat floor plane */}
      {environment.floorEnabled && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
          <planeGeometry args={[40, 40]} />
          <meshStandardMaterial color={environment.floorColor} />
        </mesh>
      )}

      {/* Grid */}
      {environment.gridEnabled && (
        <Grid
          args={[20, 20]}
          position={[0, 0, 0]}
          cellSize={1}
          cellThickness={0.5}
          cellColor={environment.gridColor}
          sectionSize={5}
          sectionThickness={1}
          sectionColor={environment.gridColor}
          fadeDistance={30}
          fadeStrength={1.5}
          followCamera={false}
          infiniteGrid
        />
      )}
    </>
  );
}

function PostProcessingLayer() {
  const { environment } = useEditor();
  if (!environment.postProcessingEnabled) return null;

  return (
    <EffectComposer enableNormalPass={false}>
      {environment.bloomEnabled ? <Bloom luminanceThreshold={0.5} mipmapBlur intensity={1.5} /> : <></>}
      {environment.vignetteEnabled ? <Vignette eskil={false} offset={0.1} darkness={1.1} /> : <></>}
    </EffectComposer>
  );
}

// ─── Main Scene Content ───────────────────────────────────────────

function SceneContent() {
  const { objects, environment } = useEditor();

  return (
    <>
      <SceneEnvironmentLayer />

      {/* Lighting */}
      <ambientLight intensity={environment.ambientLightIntensity ?? 0.5} />
      <directionalLight
        position={[5, 8, 5]}
        intensity={environment.directionalLightIntensity ?? 1.2}
        castShadow
        shadow-mapSize={[2048, 2048]}
      />
      {environment.spotLightEnabled && (
        <spotLight position={[0, 10, 0]} intensity={2} angle={0.3} penumbra={1} castShadow />
      )}
      <directionalLight position={[-5, 3, -5]} intensity={0.3} />

      {/* Objects */}
      {environment.physicsEnabled ? (
        <Physics>
          {environment.floorEnabled && (
            <RigidBody type="fixed" position={[0, -0.1, 0]}>
              <mesh visible={false}>
                <boxGeometry args={[40, 0.2, 40]} />
              </mesh>
            </RigidBody>
          )}
          {objects.map((obj) => (
            <PrimitiveMesh key={obj.id} obj={obj} />
          ))}
        </Physics>
      ) : (
        objects.map((obj) => <PrimitiveMesh key={obj.id} obj={obj} />)
      )}

      <PostProcessingLayer />

      {/* Camera gizmo */}
      <GizmoHelper alignment="bottom-right" margin={[70, 70]}>
        <GizmoViewport
          axisColors={['#f24e1e', '#1a5cff', '#ffd000']}
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
        enabled={!useEditor().sculptMode}
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
