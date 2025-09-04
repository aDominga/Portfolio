import { Environment, OrbitControls, } from "@react-three/drei";
import { Book } from "./Book";
export const Experience = () => {
  return (
    <>
      <Book />
      <OrbitControls enableRotate={true} enablePan={false} enableZoom={true} minDistance={2} maxDistance={4} />
      <Environment preset="studio" background={false}></Environment>
      <directionalLight
        color={"#edc280"}
        // position={[1, 2, -2]}
        intensity={0}
        // castShadow
        shadow-mapSize-width={148}
        shadow-mapSize-height={2048}
        shadow-bias={-0.0001}
      />
      <mesh position-y={-1.5} rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[100, 100]} />
        <shadowMaterial transparent opacity={0.2} />
      </mesh>
    </>
  );
};
