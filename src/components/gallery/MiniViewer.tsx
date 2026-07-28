'use client';

import { useEffect, useState, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { SceneData } from '@/lib/scene-types';

function SpinningScene({ sceneData }: { sceneData: SceneData }) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.5;
    }
  });

  return (
    <group ref={groupRef}>
      <ambientLight intensity={1.5} />
      <directionalLight position={[5, 10, 5]} intensity={2} />
      {sceneData.objects.map((obj) => {
        if (!obj.visible || obj.type.startsWith('imported')) return null;
        
        let geo: THREE.BufferGeometry;
        if (obj.type === 'custom-mesh' && obj.importData) {
          try {
            const loader = new THREE.BufferGeometryLoader();
            geo = loader.parse(JSON.parse(obj.importData));
          } catch {
            geo = new THREE.BoxGeometry(1, 1, 1);
          }
        } else {
          switch (obj.type) {
            case 'sphere': geo = new THREE.SphereGeometry(0.5, 32, 32); break;
            case 'cylinder': geo = new THREE.CylinderGeometry(0.5, 0.5, 1, 32); break;
            case 'cone': geo = new THREE.ConeGeometry(0.5, 1, 32); break;
            case 'torus': geo = new THREE.TorusGeometry(0.4, 0.15, 16, 64); break;
            case 'plane': geo = new THREE.PlaneGeometry(1, 1); break;
            case 'capsule': geo = new THREE.CapsuleGeometry(0.3, 0.6, 8, 16); break;
            case 'box':
            default:
              geo = new THREE.BoxGeometry(1, 1, 1);
              break;
          }
        }

        const emissive = obj.shadingMode === 'emissive' ? obj.color : 0x000000;
        
        return (
          <mesh
            key={obj.id}
            position={obj.position}
            rotation={obj.rotation}
            scale={obj.scale}
            geometry={geo}
          >
            <meshStandardMaterial
              color={obj.color}
              wireframe={obj.wireframe}
              transparent={obj.opacity < 1}
              opacity={obj.opacity}
              metalness={obj.metalness}
              roughness={obj.roughness}
              emissive={emissive}
              emissiveIntensity={obj.shadingMode === 'emissive' ? 0.9 : 0}
              side={obj.type === 'plane' ? THREE.DoubleSide : THREE.FrontSide}
            />
          </mesh>
        );
      })}
    </group>
  );
}

export default function MiniViewer({ sceneId }: { sceneId: string }) {
  const [sceneData, setSceneData] = useState<SceneData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/gallery/${sceneId}/scene`)
      .then((r) => r.json())
      .then((data) => {
        if (data.scene) setSceneData(data.scene);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [sceneId]);

  if (loading) {
    return <div className="mini-viewer-loading">Loading 3D...</div>;
  }
  if (!sceneData) {
    return <div className="mini-viewer-loading">Failed to load</div>;
  }

  return (
    <Canvas camera={{ position: [0, 2, 5], fov: 45 }}>
      <SpinningScene sceneData={sceneData} />
    </Canvas>
  );
}
