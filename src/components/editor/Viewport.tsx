'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Grid, TransformControls, GizmoHelper, GizmoViewport, Sparkles } from '@react-three/drei';
import { Physics, RigidBody } from '@react-three/rapier';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import * as THREE from 'three';
import { useEditor } from '@/lib/editor-context';
import type { SceneObject, PrimitiveType } from '@/lib/scene-types';

const DEFAULT_CAMERA_MOUSE = {
  LEFT: THREE.MOUSE.ROTATE,
  MIDDLE: THREE.MOUSE.DOLLY,
  RIGHT: THREE.MOUSE.PAN,
};

const SCULPT_CAMERA_MOUSE = {
  MIDDLE: THREE.MOUSE.DOLLY,
  RIGHT: THREE.MOUSE.ROTATE,
};

function getPrimitiveGeometry(type: PrimitiveType): THREE.BufferGeometry {
  switch (type) {
    case 'box': return new THREE.BoxGeometry(1, 1, 1, 16, 16, 16);
    case 'sphere': return new THREE.SphereGeometry(0.5, 64, 64);
    case 'cylinder': return new THREE.CylinderGeometry(0.5, 0.5, 1, 32, 16);
    case 'cone': return new THREE.ConeGeometry(0.5, 1, 32, 16);
    case 'torus': return new THREE.TorusGeometry(0.4, 0.15, 32, 64);
    case 'plane': return new THREE.PlaneGeometry(1, 1, 64, 64);
    case 'capsule': return new THREE.CapsuleGeometry(0.3, 0.6, 16, 32);
    default: return new THREE.BoxGeometry(1, 1, 1, 16, 16, 16);
  }
}

function useObjectMaterial(obj: SceneObject, isSelected: boolean) {
  const texture = useMemo(() => {
    if (!obj.textureMap) return null;
    const loaded = new THREE.TextureLoader().load(obj.textureMap);
    loaded.colorSpace = THREE.SRGBColorSpace;
    return loaded;
  }, [obj.textureMap]);

  return useMemo(() => {
    const emissive = obj.shadingMode === 'emissive' || isSelected ? new THREE.Color(obj.color) : new THREE.Color(0x000000);
    return {
      color: obj.color,
      wireframe: obj.wireframe,
      transparent: obj.opacity < 1,
      opacity: obj.opacity,
      metalness: obj.metalness,
      roughness: obj.roughness,
      emissive,
      emissiveIntensity: obj.shadingMode === 'emissive' ? 0.9 : isSelected ? 0.15 : 0,
      map: texture ?? undefined,
      side: obj.type === 'plane' ? THREE.DoubleSide : THREE.FrontSide,
    };
  }, [isSelected, obj.color, obj.metalness, obj.opacity, obj.roughness, obj.shadingMode, obj.type, obj.wireframe, texture]);
}

function TransformHandle({ object, obj }: { object: THREE.Object3D | null; obj: SceneObject }) {
  const { selectedId, updateObject, transformMode, sculptMode, environment } = useEditor();
  const isSelected = selectedId === obj.id;

  if (!isSelected || !object || sculptMode || obj.locked) return null;

  const snap = environment.snapEnabled ? environment.snapSize ?? 0.5 : null;
  return (
    <TransformControls
      object={object}
      mode={transformMode}
      translationSnap={snap ?? undefined}
      rotationSnap={environment.snapEnabled ? THREE.MathUtils.degToRad(15) : undefined}
      scaleSnap={snap ?? undefined}
      onObjectChange={() => {
        const p = object.position;
        const r = object.rotation;
        const s = object.scale;
        updateObject(obj.id, {
          position: [p.x, p.y, p.z],
          rotation: [r.x, r.y, r.z],
          scale: [s.x, s.y, s.z],
        });
      }}
    />
  );
}

function PrimitiveMesh({ obj }: { obj: SceneObject }) {
  const { selectedId, selectObject, sculptMode, sculptBrushSize, sculptBrushStrength, sculptBrushType } = useEditor();
  const isSelected = selectedId === obj.id;
  const meshRef = useRef<THREE.Mesh>(null);
  const [meshObject, setMeshObject] = useState<THREE.Mesh | null>(null);
  const brushCursorRef = useRef<THREE.Mesh>(null);
  const isSculptingDown = useRef(false);
  const geometry = useMemo(() => getPrimitiveGeometry(obj.type as PrimitiveType).clone(), [obj.type]);
  const materialProps = useObjectMaterial(obj, isSelected);

  useFrame((state) => {
    if (!meshRef.current || obj.animationType === 'none' || obj.isPhysicsBody) return;
    const t = state.clock.getElapsedTime();
    if (obj.animationType === 'spin') meshRef.current.rotation.y += 0.02;
    if (obj.animationType === 'float') meshRef.current.position.y = obj.position[1] + Math.sin(t * 2) * 0.2;
    if (obj.animationType === 'pulse') {
      const s = 1 + Math.sin(t * 4) * 0.1;
      meshRef.current.scale.set(obj.scale[0] * s, obj.scale[1] * s, obj.scale[2] * s);
    }
  });

  if (!obj.visible) return null;

  const handlePointerDown = (e: { stopPropagation: () => void; target: EventTarget; pointerId: number }) => {
    if (sculptMode && isSelected && !obj.locked) {
      e.stopPropagation();
      isSculptingDown.current = true;
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    }
  };

  const handlePointerUp = (e: { target: EventTarget; pointerId: number }) => {
    isSculptingDown.current = false;
    (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
  };

  const handlePointerMove = (e: {
    stopPropagation: () => void;
    intersections: Array<{ object: THREE.Object3D; point: THREE.Vector3; face?: { normal: THREE.Vector3 } | null }>;
  }) => {
    if (!sculptMode || !isSelected || !meshRef.current || obj.locked) return;
    const hit = e.intersections.find((item) => item.object === meshRef.current);
    if (!hit) return;
    e.stopPropagation();

    if (brushCursorRef.current) {
      brushCursorRef.current.position.copy(hit.point);
      if (hit.face) {
        const n = hit.face.normal.clone().transformDirection(meshRef.current.matrixWorld);
        brushCursorRef.current.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), n);
      }
      brushCursorRef.current.visible = true;
    }

    if (!isSculptingDown.current) return;
    const positions = geometry.attributes.position;
    const normals = geometry.attributes.normal;
    if (!positions || !normals) return;

    const hitNormal = hit.face?.normal.clone().transformDirection(meshRef.current.matrixWorld) ?? new THREE.Vector3(0, 0, 1);
    const v = new THREE.Vector3();
    const n = new THREE.Vector3();
    const worldV = new THREE.Vector3();
    const worldN = new THREE.Vector3();
    let modified = false;

    for (let i = 0; i < positions.count; i += 1) {
      v.fromBufferAttribute(positions, i);
      worldV.copy(v).applyMatrix4(meshRef.current.matrixWorld);
      const dist = worldV.distanceTo(hit.point);
      if (dist >= sculptBrushSize) continue;
      n.fromBufferAttribute(normals, i);
      worldN.copy(n).transformDirection(meshRef.current.matrixWorld);
      if (worldN.dot(hitNormal) < 0.1) continue;
      const falloff = (1 - dist / sculptBrushSize) ** 2;
      const moveLocal = (falloff * sculptBrushStrength) / Math.max(meshRef.current.scale.x, 0.001);
      if (sculptBrushType === 'push') v.sub(n.multiplyScalar(moveLocal));
      else v.add(n.multiplyScalar(moveLocal));
      positions.setXYZ(i, v.x, v.y, v.z);
      modified = true;
    }

    if (modified) {
      // Sculpting intentionally edits the live BufferGeometry used by Three.js.
      // eslint-disable-next-line react-hooks/immutability
      positions.needsUpdate = true;
      geometry.computeVertexNormals();
      geometry.computeBoundingSphere();
      geometry.computeBoundingBox();
    }
  };

  const handlePointerOut = (e: { target: EventTarget; pointerId: number }) => {
    if (brushCursorRef.current) brushCursorRef.current.visible = false;
    handlePointerUp(e);
  };

  const meshNode = (
    <>
      <mesh
        ref={(node) => {
          meshRef.current = node;
          setMeshObject(node);
        }}
        geometry={geometry}
        position={obj.position}
        rotation={obj.rotation}
        scale={obj.scale}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerOut={handlePointerOut}
        // eslint-disable-next-line react-hooks/immutability
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
      <TransformHandle object={meshObject} obj={obj} />
      {obj.isPhysicsBody ? <RigidBody colliders="hull" type="dynamic">{meshNode}</RigidBody> : meshNode}
    </>
  );
}

function ImportedObject({ obj }: { obj: SceneObject }) {
  const { selectedId, selectObject } = useEditor();
  const groupRef = useRef<THREE.Group>(null);
  const [groupObject, setGroupObject] = useState<THREE.Group | null>(null);
  const [loaded, setLoaded] = useState<THREE.Object3D | null>(null);
  const isSelected = selectedId === obj.id;
  const materialProps = useObjectMaterial(obj, isSelected);

  useEffect(() => {
    if (!obj.importData) return;
    const loader = obj.importFormat === 'fbx' ? new FBXLoader() : new OBJLoader();
    loader.load(obj.importData, (asset) => {
      asset.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.castShadow = true;
          child.receiveShadow = true;
          child.material = new THREE.MeshStandardMaterial(materialProps);
        }
      });
      setLoaded(asset);
    });
  }, [materialProps, obj.importData, obj.importFormat]);

  if (!obj.visible) return null;

  return (
    <>
      <TransformHandle object={groupObject} obj={obj} />
      <group
        ref={(node) => {
          groupRef.current = node;
          setGroupObject(node);
        }}
        position={obj.position}
        rotation={obj.rotation}
        scale={obj.scale}
        onClick={(e) => {
          e.stopPropagation();
          selectObject(obj.id);
        }}
      >
        {loaded ? <primitive object={loaded} /> : (
          <mesh>
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial {...materialProps} wireframe />
          </mesh>
        )}
      </group>
    </>
  );
}

function SceneEnvironmentLayer() {
  const { environment, selectObject } = useEditor();

  return (
    <>
      <color attach="background" args={[environment.background]} />
      {environment.fogEnabled && <fog attach="fog" args={[environment.fogColor, environment.fogNear, environment.fogFar]} />}
      <mesh visible={false} onClick={() => selectObject(null)}>
        <sphereGeometry args={[100, 8, 8]} />
        <meshBasicMaterial side={THREE.BackSide} />
      </mesh>
      {environment.floorEnabled && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
          <planeGeometry args={[40, 40]} />
          <meshStandardMaterial color={environment.floorColor} />
        </mesh>
      )}
      {environment.gridEnabled && (
        <Grid
          args={[20, 20]}
          position={[0, 0.01, 0]}
          cellSize={environment.snapSize ?? 1}
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
      {environment.bloomEnabled ? <Bloom luminanceThreshold={0.4} mipmapBlur intensity={1.25} /> : <></>}
      {environment.vignetteEnabled ? <Vignette eskil={false} offset={0.1} darkness={1.1} /> : <></>}
    </EffectComposer>
  );
}

function CameraController() {
  const { camera, controls, scene: threeScene } = useThree();
  const { selectedId, focusRequest } = useEditor();

  useEffect(() => {
    if (!selectedId && focusRequest.nonce === 0) return;
    const target = selectedId ? threeScene.getObjectByProperty('uuid', '') : null;
    void target;
    const box = new THREE.Box3();
    threeScene.traverse((child) => {
      if (child.userData.sceneObjectId === selectedId) box.expandByObject(child);
    });
    if (box.isEmpty()) return;
    const center = box.getCenter(new THREE.Vector3());
    const size = Math.max(box.getSize(new THREE.Vector3()).length(), 1);
    camera.position.copy(center.clone().add(new THREE.Vector3(size, size * 0.7, size * 1.25)));
    camera.lookAt(center);
    const orbit = controls as { target?: THREE.Vector3; update?: () => void } | undefined;
    orbit?.target?.copy(center);
    orbit?.update?.();
  }, [camera, controls, focusRequest.nonce, selectedId, threeScene]);

  return null;
}

function SceneObjectLayer({ obj }: { obj: SceneObject }) {
  const wrapperRef = useRef<THREE.Group>(null);
  useEffect(() => {
    if (wrapperRef.current) wrapperRef.current.userData.sceneObjectId = obj.id;
  }, [obj.id]);

  return (
    <group ref={wrapperRef}>
      {obj.type.startsWith('imported') ? <ImportedObject obj={obj} /> : <PrimitiveMesh obj={obj} />}
    </group>
  );
}

function SceneContent() {
  const { objects, environment, sculptMode } = useEditor();

  const objectNodes = objects.map((obj) => <SceneObjectLayer key={obj.id} obj={obj} />);

  return (
    <>
      <SceneEnvironmentLayer />
      <ambientLight intensity={environment.ambientLightIntensity ?? 0.5} />
      <directionalLight position={[5, 8, 5]} intensity={environment.directionalLightIntensity ?? 1.2} castShadow shadow-mapSize={[2048, 2048]} />
      {environment.spotLightEnabled && <spotLight position={[0, 10, 0]} intensity={2} angle={0.3} penumbra={1} castShadow />}
      <directionalLight position={[-5, 3, -5]} intensity={0.3} />
      {environment.physicsEnabled ? (
        <Physics>
          {environment.floorEnabled && (
            <RigidBody type="fixed" position={[0, -0.1, 0]}>
              <mesh visible={false}>
                <boxGeometry args={[40, 0.2, 40]} />
              </mesh>
            </RigidBody>
          )}
          {objectNodes}
        </Physics>
      ) : objectNodes}
      <PostProcessingLayer />
      <CameraController />
      <GizmoHelper alignment="bottom-right" margin={[70, 70]}>
        <GizmoViewport axisColors={['#f24e1e', '#1a5cff', '#ffd000']} labelColor="white" />
      </GizmoHelper>
      <OrbitControls
        makeDefault
        enableDamping
        dampingFactor={0.05}
        minDistance={1}
        maxDistance={100}
        mouseButtons={sculptMode ? SCULPT_CAMERA_MOUSE : DEFAULT_CAMERA_MOUSE}
      />
    </>
  );
}

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
