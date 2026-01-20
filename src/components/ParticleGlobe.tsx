'use client';

import { useRef, useMemo, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Points, PointMaterial } from '@react-three/drei';
import * as THREE from 'three';

// 生成球面上的点
function generateSpherePoints(count: number, radius: number): Float32Array {
  const positions = new Float32Array(count * 3);
  
  for (let i = 0; i < count; i++) {
    // 使用斐波那契球面采样获得均匀分布
    const phi = Math.acos(1 - 2 * (i + 0.5) / count);
    const theta = Math.PI * (1 + Math.sqrt(5)) * i;
    
    const x = radius * Math.sin(phi) * Math.cos(theta);
    const y = radius * Math.sin(phi) * Math.sin(theta);
    const z = radius * Math.cos(phi);
    
    positions[i * 3] = x;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = z;
  }
  
  return positions;
}

// 市场标记点位置（经纬度转换为3D坐标）
const MARKET_LOCATIONS = [
  { name: '美股', lat: 40.7128, lng: -74.006, color: '#4285f4' }, // 纽约
  { name: 'A股', lat: 31.2304, lng: 121.4737, color: '#ea4335' }, // 上海
  { name: '港股', lat: 22.3193, lng: 114.1694, color: '#fbbc04' }, // 香港
  { name: '日股', lat: 35.6762, lng: 139.6503, color: '#34a853' }, // 东京
];

function latLngToVector3(lat: number, lng: number, radius: number): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  
  const x = -(radius * Math.sin(phi) * Math.cos(theta));
  const z = radius * Math.sin(phi) * Math.sin(theta);
  const y = radius * Math.cos(phi);
  
  return new THREE.Vector3(x, y, z);
}

function Globe() {
  const pointsRef = useRef<THREE.Points>(null);
  const markersRef = useRef<THREE.Group>(null);
  
  // 生成球面点
  const positions = useMemo(() => generateSpherePoints(3000, 2), []);
  
  // 市场标记点
  const markerPositions = useMemo(() => {
    return MARKET_LOCATIONS.map(loc => latLngToVector3(loc.lat, loc.lng, 2.05));
  }, []);
  
  useFrame((state) => {
    if (pointsRef.current) {
      pointsRef.current.rotation.y = state.clock.elapsedTime * 0.05;
    }
    if (markersRef.current) {
      markersRef.current.rotation.y = state.clock.elapsedTime * 0.05;
    }
  });
  
  return (
    <group>
      {/* 粒子球体 */}
      <Points ref={pointsRef} positions={positions} stride={3} frustumCulled={false}>
        <PointMaterial
          transparent
          color="#14b8a6"
          size={0.02}
          sizeAttenuation={true}
          depthWrite={false}
          opacity={0.6}
        />
      </Points>
      
      {/* 经线 */}
      <group ref={markersRef}>
        {/* 市场标记点 */}
        {markerPositions.map((pos, i) => (
          <mesh key={i} position={pos}>
            <sphereGeometry args={[0.06, 16, 16]} />
            <meshBasicMaterial color={MARKET_LOCATIONS[i].color} />
          </mesh>
        ))}
      </group>
      
      {/* 内部发光球体 */}
      <mesh>
        <sphereGeometry args={[1.95, 32, 32]} />
        <meshBasicMaterial
          color="#14b8a6"
          transparent
          opacity={0.03}
        />
      </mesh>
    </group>
  );
}

export default function ParticleGlobe() {
  return (
    <div className="globe-container">
      <Canvas
        camera={{ position: [0, 0, 5], fov: 45 }}
        style={{ background: 'transparent' }}
        dpr={[1, 2]}
      >
        <Suspense fallback={null}>
          <ambientLight intensity={0.5} />
          <Globe />
        </Suspense>
      </Canvas>
      
      {/* 市场标签覆盖层 */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="relative w-full h-full">
          {/* 美股 - 左侧 */}
          <div className="absolute left-[10%] top-[35%] flex items-center gap-2 opacity-80">
            <div className="w-2 h-2 rounded-full bg-[#4285f4] animate-pulse" />
            <span className="text-sm font-medium text-white/80">美股</span>
          </div>
          
          {/* A股 - 右侧 */}
          <div className="absolute right-[15%] top-[40%] flex items-center gap-2 opacity-80">
            <div className="w-2 h-2 rounded-full bg-[#ea4335] animate-pulse" />
            <span className="text-sm font-medium text-white/80">A股</span>
          </div>
          
          {/* 港股 - 右下 */}
          <div className="absolute right-[20%] bottom-[35%] flex items-center gap-2 opacity-80">
            <div className="w-2 h-2 rounded-full bg-[#fbbc04] animate-pulse" />
            <span className="text-sm font-medium text-white/80">港股</span>
          </div>
          
          {/* 日股 - 右上 */}
          <div className="absolute right-[12%] top-[25%] flex items-center gap-2 opacity-80">
            <div className="w-2 h-2 rounded-full bg-[#34a853] animate-pulse" />
            <span className="text-sm font-medium text-white/80">日股</span>
          </div>
        </div>
      </div>
    </div>
  );
}
