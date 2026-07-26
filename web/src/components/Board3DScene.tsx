"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import {
  ContactShadows,
  Environment,
  Lightformer,
  OrbitControls,
  RoundedBox,
} from "@react-three/drei";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { useSim } from "@/lib/sim";
import {
  ANTENNA,
  BOARD,
  BUTTONS,
  HEADER,
  MAPPED_PINS,
  MM,
  MODULE,
  PINOUT_LEFT,
  PINOUT_RIGHT,
  SMD_PARTS,
  USB,
  type PinRole,
} from "@/lib/board-spec";
import {
  makeAntennaTexture,
  makeCanTexture,
  makeSilkscreenTexture,
} from "@/lib/silkscreen";

/**
 * An ESP32-WROOM-32S NodeMCU-32S, built to the published mechanical spec.
 *
 * The onboard LED on GPIO2 is driven by the shared firmware simulation, so it
 * blinks on whatever interval the sketch computed from the knob. Everything
 * else is geometry: 38 gold headers, the shield can with its stamped lid, the
 * exposed meander antenna, the micro USB shell and the EN and BOOT buttons.
 */

const ACCENT: Record<PinRole["accent"], string> = {
  led: "#ffb020",
  trace: "#22d3ee",
  gold: "#e3c766",
};

function HeaderPin({
  x,
  z,
  label,
  onHover,
}: {
  x: number;
  z: number;
  label: string;
  onHover: (p: (PinRole & { silk: string }) | null) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const mapped = MAPPED_PINS[label];
  const color = mapped ? ACCENT[mapped.accent] : "#c9a227";

  return (
    <group position={[x * MM, 0, z * MM]}>
      {/* Black header strip beneath the pin */}
      <mesh position={[0, (BOARD.thickness / 2 + HEADER.stripHeight / 2) * MM, 0]}>
        <boxGeometry
          args={[HEADER.pitch * MM, HEADER.stripHeight * MM, 2.4 * MM]}
        />
        <meshStandardMaterial color="#0c0e12" roughness={0.85} />
      </mesh>

      {/* Gold square pin */}
      <mesh
        position={[
          0,
          (BOARD.thickness / 2 + HEADER.stripHeight + HEADER.pinHeight / 2) * MM,
          0,
        ]}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
          if (mapped) onHover({ ...mapped, silk: label });
        }}
        onPointerOut={() => {
          setHovered(false);
          onHover(null);
        }}
      >
        <boxGeometry
          args={[HEADER.pinSize * MM, HEADER.pinHeight * MM, HEADER.pinSize * MM]}
        />
        <meshStandardMaterial
          color={color}
          metalness={0.95}
          roughness={0.18}
          emissive={color}
          emissiveIntensity={hovered ? 1.1 : mapped ? 0.4 : 0}
        />
      </mesh>
    </group>
  );
}

/** The blue user LED on GPIO2, plus the always-on red power LED. */
function OnboardLeds() {
  const { state } = useSim();
  const matRef = useRef<THREE.MeshStandardMaterial>(null);
  const lightRef = useRef<THREE.PointLight>(null);

  useFrame((_, delta) => {
    const target = state.ledState ? 1 : 0;
    // Snappy but not strobing, so a 100ms blink still reads on camera.
    const k = 1 - Math.pow(0.00005, delta);
    if (matRef.current) {
      matRef.current.emissiveIntensity +=
        (target * 3.4 - matRef.current.emissiveIntensity) * k;
    }
    if (lightRef.current) {
      lightRef.current.intensity += (target * 1.1 - lightRef.current.intensity) * k;
    }
  });

  return (
    <group>
      {/* User LED, GPIO2 */}
      <group position={[6.0 * MM, (BOARD.thickness / 2 + 0.35) * MM, -6.0 * MM]}>
        <mesh>
          <boxGeometry args={[1.6 * MM, 0.7 * MM, 0.9 * MM]} />
          <meshStandardMaterial
            ref={matRef}
            color="#cfe6ff"
            emissive="#4ea8ff"
            emissiveIntensity={0}
            roughness={0.3}
          />
        </mesh>
        <pointLight
          ref={lightRef}
          color="#5cb0ff"
          intensity={0}
          distance={1.8}
          position={[0, 0.12, 0]}
        />
      </group>

      {/* Power LED, always lit */}
      <mesh position={[6.0 * MM, (BOARD.thickness / 2 + 0.35) * MM, -3.6 * MM]}>
        <boxGeometry args={[1.6 * MM, 0.7 * MM, 0.9 * MM]} />
        <meshStandardMaterial
          color="#ffb3ad"
          emissive="#ff3b30"
          emissiveIntensity={1.5}
          roughness={0.3}
        />
      </mesh>
    </group>
  );
}

function BoardModel({
  onHover,
}: {
  onHover: (p: (PinRole & { silk: string }) | null) => void;
}) {
  const silk = useMemo(() => makeSilkscreenTexture(), []);
  const antenna = useMemo(() => makeAntennaTexture(), []);
  const can = useMemo(() => makeCanTexture(), []);

  useEffect(() => {
    return () => {
      silk.dispose();
      antenna.dispose();
      can.dispose();
    };
  }, [silk, antenna, can]);

  const pins = useMemo(() => {
    const startX = -((HEADER.perSide - 1) * HEADER.pitch) / 2;
    const inset = BOARD.width / 2 - 2.0;
    const out: { x: number; z: number; label: string; key: string }[] = [];
    for (let i = 0; i < HEADER.perSide; i++) {
      // Labels are listed from the USB end, which is +X.
      const x = startX + (HEADER.perSide - 1 - i) * HEADER.pitch;
      out.push({ x, z: -inset, label: PINOUT_LEFT[i], key: `l${i}` });
      out.push({ x, z: inset, label: PINOUT_RIGHT[i], key: `r${i}` });
    }
    return out;
  }, []);

  return (
    <group>
      {/* PCB with rounded corners */}
      <RoundedBox
        args={[BOARD.length * MM, BOARD.thickness * MM, BOARD.width * MM]}
        radius={BOARD.cornerRadius * MM}
        smoothness={4}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial color="#0b0e11" roughness={0.62} metalness={0.08} />
      </RoundedBox>

      {/* Silkscreen, floated a hair above the mask to avoid z-fighting */}
      <mesh
        position={[0, (BOARD.thickness / 2 + 0.02) * MM, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <planeGeometry args={[BOARD.length * MM, BOARD.width * MM]} />
        <meshStandardMaterial
          map={silk}
          roughness={0.7}
          metalness={0.05}
          transparent
        />
      </mesh>

      {/* Module PCB */}
      <mesh position={[MODULE.centerX * MM, (BOARD.thickness / 2 + MODULE.pcbThickness / 2) * MM, 0]}>
        <boxGeometry
          args={[MODULE.pcbLength * MM, MODULE.pcbThickness * MM, MODULE.pcbWidth * MM]}
        />
        <meshStandardMaterial color="#0d1013" roughness={0.7} />
      </mesh>

      {/* Shield can */}
      <RoundedBox
        args={[MODULE.canLength * MM, MODULE.canHeight * MM, MODULE.canWidth * MM]}
        radius={0.35 * MM}
        smoothness={3}
        position={[
          (MODULE.centerX + 3.4) * MM,
          (BOARD.thickness / 2 + MODULE.pcbThickness + MODULE.canHeight / 2) * MM,
          0,
        ]}
        castShadow
      >
        <meshStandardMaterial
          map={can}
          color="#aeb4bc"
          metalness={0.92}
          roughness={0.28}
        />
      </RoundedBox>

      {/* Exposed meander antenna on the module tail */}
      <mesh
        position={[
          ANTENNA.centerX * MM,
          (BOARD.thickness / 2 + MODULE.pcbThickness + 0.02) * MM,
          0,
        ]}
        rotation={[-Math.PI / 2, 0, Math.PI / 2]}
      >
        <planeGeometry args={[ANTENNA.width * MM, ANTENNA.length * MM]} />
        <meshStandardMaterial map={antenna} roughness={0.35} metalness={0.55} />
      </mesh>

      {/* Micro USB shell */}
      <group position={[USB.centerX * MM, (BOARD.thickness / 2 + 1.3) * MM, 0]}>
        <RoundedBox
          args={[5.9 * MM, 2.6 * MM, 7.9 * MM]}
          radius={0.25 * MM}
          smoothness={3}
          castShadow
        >
          <meshStandardMaterial color="#b9bfc7" metalness={0.95} roughness={0.22} />
        </RoundedBox>
        <mesh position={[3.0 * MM, 0, 0]}>
          <boxGeometry args={[0.6 * MM, 1.4 * MM, 5.6 * MM]} />
          <meshStandardMaterial color="#15181d" roughness={0.9} />
        </mesh>
      </group>

      {/* EN and BOOT tactile buttons */}
      {BUTTONS.map((b) => (
        <group key={b.label} position={[b.x * MM, (BOARD.thickness / 2) * MM, b.z * MM]}>
          <mesh position={[0, 0.85 * MM, 0]} castShadow>
            <boxGeometry args={[3.5 * MM, 1.7 * MM, 3.5 * MM]} />
            <meshStandardMaterial color="#15181e" roughness={0.75} />
          </mesh>
          <mesh position={[0, 1.85 * MM, 0]}>
            <cylinderGeometry args={[0.9 * MM, 0.9 * MM, 0.5 * MM, 16]} />
            <meshStandardMaterial color="#c9ced6" metalness={0.85} roughness={0.35} />
          </mesh>
        </group>
      ))}

      {/* Passives and the USB-UART bridge */}
      {SMD_PARTS.map(([x, z, l, wd, ht, color], i) => (
        <mesh
          key={`smd${i}`}
          position={[x * MM, (BOARD.thickness / 2 + ht / 2) * MM, z * MM]}
          castShadow
        >
          <boxGeometry args={[l * MM, ht * MM, wd * MM]} />
          <meshStandardMaterial color={color} roughness={0.55} metalness={0.35} />
        </mesh>
      ))}

      <OnboardLeds />

      {pins.map((p) => (
        <HeaderPin key={p.key} x={p.x} z={p.z} label={p.label} onHover={onHover} />
      ))}
    </group>
  );
}

function Rig({
  autoRotate,
  onHover,
}: {
  autoRotate: boolean;
  onHover: (p: (PinRole & { silk: string }) | null) => void;
}) {
  const group = useRef<THREE.Group>(null);
  const { reducedMotion } = useSim();

  useFrame((st, delta) => {
    if (!group.current || reducedMotion) return;
    if (autoRotate) group.current.rotation.y += delta * 0.22;
    group.current.position.y = Math.sin(st.clock.elapsedTime * 0.6) * 0.015;
  });

  return (
    <group ref={group} rotation={[0, -0.45, 0]}>
      <BoardModel onHover={onHover} />
    </group>
  );
}

export default function Board3DScene({
  height = 460,
  autoRotate = true,
}: {
  height?: number;
  autoRotate?: boolean;
}) {
  const [hover, setHover] = useState<(PinRole & { silk: string }) | null>(null);
  const { state } = useSim();

  return (
    <div className="relative w-full" style={{ height }}>
      <Canvas
        shadows
        camera={{ position: [0, 3.6, 5.2], fov: 34 }}
        dpr={[1, 1.75]}
        gl={{ antialias: true, powerPreference: "high-performance" }}
      >
        <color attach="background" args={["#07080a"]} />

        <ambientLight intensity={0.35} />
        <directionalLight
          position={[4, 7, 3]}
          intensity={2.1}
          castShadow
          shadow-mapSize={[1024, 1024]}
        />
        <directionalLight position={[-5, 3, -4]} intensity={0.5} color="#22d3ee" />

        {/* Built from Lightformers, so the metal reflects something without
            fetching an HDR from a CDN. */}
        <Environment resolution={192} frames={1}>
          <Lightformer
            intensity={2.2}
            position={[0, 5, -2]}
            scale={[10, 4, 1]}
            color="#ffffff"
          />
          <Lightformer
            intensity={1.1}
            position={[-4, 2, 3]}
            scale={[6, 3, 1]}
            color="#8fd8ff"
          />
          <Lightformer
            intensity={0.8}
            position={[4, 1, 3]}
            scale={[6, 3, 1]}
            color="#ffcf94"
          />
        </Environment>

        <Rig autoRotate={autoRotate} onHover={setHover} />

        <ContactShadows
          position={[0, -0.35, 0]}
          opacity={0.55}
          scale={9}
          blur={2.4}
          far={2}
          resolution={512}
          color="#000000"
        />

        <OrbitControls
          enablePan={false}
          minDistance={2.6}
          maxDistance={9}
          minPolarAngle={0.1}
          maxPolarAngle={Math.PI / 2.08}
          enableDamping
          dampingFactor={0.08}
        />
      </Canvas>

      <div className="pointer-events-none absolute top-3 left-3 flex flex-col gap-1.5">
        <div className="border-edge bg-pcb/80 text-ink-dim rounded-md border px-2.5 py-1.5 font-mono text-[10px] backdrop-blur-sm">
          ESP32-WROOM-32S · NodeMCU-32S
        </div>
        <div className="border-edge bg-pcb/80 rounded-md border px-2.5 py-1.5 font-mono text-[10px] backdrop-blur-sm">
          <span className="text-ink-faint">GPIO2 </span>
          <span className={state.ledState ? "text-trace" : "text-ink-faint"}>
            {state.ledState ? "HIGH" : "LOW"}
          </span>
          <span className="text-ink-faint"> at {state.interval}ms</span>
        </div>
      </div>

      <div className="pointer-events-none absolute right-3 bottom-3 left-3 flex justify-center">
        <div
          className={`border-edge bg-pcb/90 rounded-md border px-3 py-1.5 font-mono text-[11px] backdrop-blur-sm transition-opacity duration-150 ${
            hover ? "opacity-100" : "opacity-0"
          }`}
        >
          {hover ? (
            <>
              <span className="text-ink-faint">{hover.silk} · </span>
              <span className="text-led">{hover.label}</span>
              <span className="text-ink-faint"> · {hover.role}</span>
            </>
          ) : (
            <span>&nbsp;</span>
          )}
        </div>
      </div>
    </div>
  );
}
