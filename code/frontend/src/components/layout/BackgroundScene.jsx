import React, { useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Line } from '@react-three/drei';
import * as THREE from 'three';

function seededValue(index, scale) {
  const seed = Math.sin(index * 999) * 10000;
  const normalized = seed - Math.floor(seed);
  return (normalized - 0.5) * scale;
}

function NodeCloud() {
  const pointsRef = useRef();
  const groupRef = useRef();

  const nodePositions = useMemo(() => {
    const values = [];
    for (let i = 0; i < 120; i += 1) {
      values.push(seededValue(i + 1, 12));
      values.push(seededValue(i + 2, 8));
      values.push(seededValue(i + 3, 6));
    }
    return new Float32Array(values);
  }, []);

  const edges = useMemo(() => {
    const vectors = [];
    for (let i = 0; i < nodePositions.length; i += 9) {
      const a = new THREE.Vector3(nodePositions[i], nodePositions[i + 1], nodePositions[i + 2]);
      const b = new THREE.Vector3(nodePositions[i + 3], nodePositions[i + 4], nodePositions[i + 5]);
      vectors.push([a, b]);
    }
    return vectors;
  }, [nodePositions]);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (groupRef.current) {
      groupRef.current.rotation.z = t * 0.03;
      groupRef.current.rotation.y = Math.sin(t * 0.15) * 0.08;
    }
    if (pointsRef.current) {
      pointsRef.current.rotation.y = t * 0.04;
    }
  });

  return (
    <group ref={groupRef}>
      <points ref={pointsRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" count={nodePositions.length / 3} array={nodePositions} itemSize={3} />
        </bufferGeometry>
        <pointsMaterial color="#70d7ff" size={0.042} transparent opacity={0.75} sizeAttenuation />
      </points>
      {edges.map((pair, index) => (
        <Line key={index} points={pair} color={index % 2 === 0 ? '#3B82F6' : '#8B5CF6'} lineWidth={0.35} transparent opacity={0.16} />
      ))}
    </group>
  );
}

export default function BackgroundScene() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 opacity-80">
      <Canvas camera={{ position: [0, 0, 7], fov: 55 }}>
        <color attach="background" args={['#09090f']} />
        <fog attach="fog" args={['#09090f', 4, 18]} />
        <ambientLight intensity={0.35} />
        <pointLight position={[0, 2, 6]} intensity={1.8} color="#3B82F6" />
        <pointLight position={[-5, -2, 4]} intensity={1.2} color="#8B5CF6" />
        <NodeCloud />
      </Canvas>
    </div>
  );
}
