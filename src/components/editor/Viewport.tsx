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

// ─── Individual Mesh ─────────────────────────────────────────────

import { Geometry, Base, Addition, Subtraction, Intersection } from '@react-three/csg';

function getPrimitiveGeometry(type: PrimitiveType) {
  switch (type) {
    case 'box':       return <boxGeometry args={[1, 1, 1, 16, 16, 16]} />;
    case 'sphere':    return <sphereGeometry args={[0.5, 64, 64]} />;
    case 'cylinder':  return <cylinderGeometry args={[0.5, 0.5, 1, 32, 16]} />;
    case 'cone':      return <coneGeometry args={[0.5, 1, 32, 16]} />;
    case 'torus':     return <torusGeometry args={[0.4, 0.15, 32, 64]} />;
    case 'plane':     return <planeGeometry args={[1, 1, 64, 64]} />;
    case 'capsule':   return <capsuleGeometry args={[0.3, 0.6, 16, 32]} />;
    default:          return <boxGeometry args={[1, 1, 1, 16, 16, 16]} />;
  }
}

function PrimitiveMesh({ obj }: { obj: SceneObject }) {
  const { selectedId, selectObject, updateObject, transformMode, sculptMode, sculptBrushSize, sculptBrushStrength, sculptBrushType } = useEditor();
  const isSelected = selectedId === obj.id;
  const meshRef = useRef<THREE.Mesh>(null);
  const [mounted, setMounted] = useState(false);
  const isSculptingDown = useRef(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const geometry = useMemo(() => {
    if (obj.type !== 'csg') {
      return getPrimitiveGeometry(obj.type as PrimitiveType);
    }
    return null; // CSG handled differently
  }, [obj.type]);

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

  const transformNode = isSelected && mounted && meshRef.current ? (
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

  // CSG rendering
  if (obj.type === 'csg' && obj.csgBaseType) {
    return (
      <>
        {transformNode}
        <mesh
          ref={meshRef}
          position={obj.position}
          rotation={obj.rotation}
          scale={obj.scale}
          onClick={(e) => { e.stopPropagation(); selectObject(obj.id); }}
          castShadow
          receiveShadow
        >
          <Geometry>
            <Base>{getPrimitiveGeometry(obj.csgBaseType)}</Base>
            {obj.csgOperations?.map((op, i) => {
              const OpComponent = op.op === 'subtract' ? Subtraction : op.op === 'intersect' ? Intersection : Addition;
              return (
                <OpComponent key={i} position={op.position} rotation={op.rotation} scale={op.scale}>
                  {getPrimitiveGeometry(op.type)}
                </OpComponent>
              );
            })}
          </Geometry>
          <meshStandardMaterial {...materialProps} />
          {obj.hasSparkles && <Sparkles count={50} scale={2} size={4} speed={0.4} color={obj.color} />}
        </mesh>
      </>
    );
  }

  // Sculpting logic
  const handlePointerDown = (e: any) => {
    if (sculptMode && isSelected) {
      e.stopPropagation();
      isSculptingDown.current = true;
    }
  };

  const handlePointerUp = () => {
    isSculptingDown.current = false;
  };

  const handlePointerMove = (e: any) => {
    if (!sculptMode || !isSelected || !isSculptingDown.current || !meshRef.current) return;
    e.stopPropagation();
    
    // Check if we hit this object
    if (e.intersections && e.intersections.length > 0) {
      const hit = e.intersections[0];
      if (hit.object !== meshRef.current) return;

      const geometry = meshRef.current.geometry as THREE.BufferGeometry;
      const positions = geometry.attributes.position;
      const normals = geometry.attributes.normal;
      if (!positions || !normals) return;

      const hitPoint = meshRef.current.worldToLocal(hit.point.clone());
      const v = new THREE.Vector3();
      const n = new THREE.Vector3();

      let modified = false;
      for (let i = 0; i < positions.count; i++) {
        v.fromBufferAttribute(positions, i);
        const dist = v.distanceTo(hitPoint);
        if (dist < sculptBrushSize) {
          n.fromBufferAttribute(normals, i);
          const falloff = 1 - (dist / sculptBrushSize);
          const move = falloff * sculptBrushStrength;
          
          if (sculptBrushType === 'push') {
            v.sub(n.multiplyScalar(move));
          } else {
            v.add(n.multiplyScalar(move));
          }
          positions.setXYZ(i, v.x, v.y, v.z);
          modified = true;
        }
      }

      if (modified) {
        positions.needsUpdate = true;
        geometry.computeVertexNormals();
      }
    }
  };

  // Normal primitive rendering
  const meshNode = (
    <mesh
      ref={meshRef}
      position={obj.position}
      rotation={obj.rotation}
      scale={obj.scale}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerOut={handlePointerUp}
      onPointerMove={handlePointerMove}
      onClick={(e) => {
        if (!sculptMode) {
          e.stopPropagation();
          selectObject(obj.id);
        }
      }}
      castShadow
      receiveShadow
    >
      {geometry}
      <meshStandardMaterial {...materialProps} />
      {obj.hasSparkles && <Sparkles count={50} scale={2} size={4} speed={0.4} color={obj.color} />}
    </mesh>
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
