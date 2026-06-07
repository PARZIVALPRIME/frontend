import * as THREE from "three";
import { BLOCKS } from "./data";

export interface ZoomLevel {
  id: number;
  name: string;
  subtitle: string;
  description: string;
  defaultPosition: [number, number, number];
  defaultTarget: [number, number, number];
  fov: number;
}

export const ZOOM_LEVELS: ZoomLevel[] = [
  {
    id: 1,
    name: "System Casing",
    subtitle: "Computer Enclosure Layer",
    description: "The macroscopic physical layer. The outer enclosure provides structural integrity, heat distribution channels, and electromagnetic shielding for the system.",
    defaultPosition: [0, 80, 100],
    defaultTarget: [0, 0, 0],
    fov: 30,
  },
  {
    id: 2,
    name: "MCM Package",
    subtitle: "Silicon Substrate Layer",
    description: "The Multi-Chip Module (MCM) packaging. Features an organic substrate, high-density interposer micro-bumps, and a copper heat spreader matching thermal expansion coefficients.",
    defaultPosition: [0, 32, 38],
    defaultTarget: [0, -1, 0],
    fov: 28,
  },
  {
    id: 3,
    name: "Silicon Die",
    subtitle: "3nm SoC Floorplan",
    description: "The monolithic semiconductor die. Spanning 22x18 units, containing ~12 Billion transistors constructed with EUV photolithography on a 3nm FinFET/GAA process node.",
    defaultPosition: [28, 22, 30],
    defaultTarget: [0.3, 1.5, 0.0],
    fov: 25,
  },
  {
    id: 4,
    name: "CPU Clusters",
    subtitle: "Compute Core Spotlight",
    description: "The main processing cluster. Spotlight on performance Cortex-X4 cores and Cortex-A720 efficiency cores, highlighting core layout and local cache interfaces.",
    defaultPosition: [-20.5, 21.8, -26.55],
    defaultTarget: [-2.5, 7.8, -4.55],
    fov: 35,
  },
  {
    id: 5,
    name: "Graphics Engine",
    subtitle: "GPU Spotlight",
    description: "Focusing on the 16-Core parallel mobile GPU. Spotlighting parallel execution units and high-speed local graphics caches.",
    defaultPosition: [25.44, 21.0, -17.33],
    defaultTarget: [3.44, 7.0, -2.33],
    fov: 38,
  },
  {
    id: 6,
    name: "Neural Accelerator",
    subtitle: "NPU Spotlight",
    description: "Zooming onto the Systolic Array NPU AI Engine, showing dedicated compute clusters and weight SRAM memory storage.",
    defaultPosition: [-28.9, 24.6, -20.41],
    defaultTarget: [-6.90, 6.6, -4.41],
    fov: 30,
  },
  {
    id: 7,
    name: "Baseband Modem",
    subtitle: "Modem Spotlight",
    description: "Focusing on the RF-isolated 5G Modem, highlighting baseband processors and electromagnetic boundary shield traces.",
    defaultPosition: [-30.9, 17.6, 10.47],
    defaultTarget: [-6.90, 5.6, 0.47],
    fov: 34,
  },
  {
    id: 8,
    name: "Media Pipeline",
    subtitle: "Media Spotlight",
    description: "Focusing on the ISP, Video Codecs, and Audio DSP blocks, highlighting raw camera pipelines and media decoding engines.",
    defaultPosition: [33.02, 22.8, -16.87],
    defaultTarget: [9.02, 4.8, -4.87],
    fov: 30,
  },
  {
    id: 9,
    name: "Memory Subsystem",
    subtitle: "SLC & Fabric Spotlight",
    description: "Focusing on System Cache, Memory Controller, and LPDDR memory interfaces, highlighting shared on-die data paths.",
    defaultPosition: [12.96, 21.6, 30.79],
    defaultTarget: [0.96, 3.6, 4.79],
    fov: 36,
  },
  {
    id: 10,
    name: "Execution Pipeline",
    subtitle: "Instruction Stage Flow",
    description: "Visualizing the pipeline instruction execution stage simulation inside the primary compute core.",
    defaultPosition: [-16.5, 24.81, -22.55],
    defaultTarget: [-2.5, 4.81, -4.55],
    fov: 28,
  },
  {
    id: 11,
    name: "The Hub",
    subtitle: "Complete Index Directory",
    defaultPosition: [0, 50, 60],
    defaultTarget: [0, -2, 0],
    fov: 32,
  },
];

export function getCameraParamsForLevel(
  level: number,
  selectedBlockCoords: { cx: number; cz: number; h: number } | null
): { position: THREE.Vector3; target: THREE.Vector3; fov: number } {
  const current = ZOOM_LEVELS.find((l) => l.id === level) || ZOOM_LEVELS[2];
  const position = new THREE.Vector3(...current.defaultPosition);
  const target = new THREE.Vector3(...current.defaultTarget);
  let fov = current.fov;

  if (selectedBlockCoords && level >= 4) {
    const { cx, cz, h } = selectedBlockCoords;
    target.set(cx, h, cz);
    
    const offsets: Record<number, [number, number, number]> = {
      4: [-18, 14, -22],
      5: [22, 14, -15],
      6: [-22, 18, -16],
      7: [-24, 12, 10],
      8: [24, 18, -12],
      9: [12, 18, 26],
      10: [-14, 20, -18],
    };
    const offset = offsets[level] || [-18, 14, -22];
    position.set(cx + offset[0], h + offset[1], cz + offset[2]);
  }

  return { position, target, fov };
}

export function getFocusedBlockCoordsForLevel(level: number): { cx: number; cz: number; h: number } | null {
  const PRIMARY_BLOCK_FOR_LEVEL: Record<number, string> = {
    4: "cpu-big",
    5: "gpu",
    6: "npu",
    7: "modem",
    8: "isp",
    9: "slc",
    10: "cpu-big",
  };
  const primaryId = PRIMARY_BLOCK_FOR_LEVEL[level];
  if (!primaryId) return null;
  const block = BLOCKS.find((b) => b.id === primaryId);
  if (!block) return null;
  
  // Return coords using the block's narrative lift height scaled by 0.4
  const LIFT_SCALE = 0.4;
  const liftHeight = level === 10 ? 0.35 * block.lift * LIFT_SCALE : block.lift * LIFT_SCALE;
  return { cx: block.cx, cz: block.cz, h: liftHeight + block.h };
}

export function getCameraParamsInterpolated(
  levelFloat: number,
  selectedBlockCoords: { cx: number; cz: number; h: number } | null
): { position: THREE.Vector3; target: THREE.Vector3; fov: number } {
  const baseLevel = Math.floor(levelFloat);
  const targetLevel = Math.min(ZOOM_LEVELS.length, baseLevel + 1);
  const alpha = levelFloat - baseLevel;

  // Retrieve focused coords specific to base and target levels to prevent coordinate jumps during transitions
  const baseFocusCoords = selectedBlockCoords || getFocusedBlockCoordsForLevel(baseLevel);
  const targetFocusCoords = selectedBlockCoords || getFocusedBlockCoordsForLevel(targetLevel);

  const baseParams = getCameraParamsForLevel(baseLevel, baseFocusCoords);
  const targetParams = getCameraParamsForLevel(targetLevel, targetFocusCoords);

  const position = new THREE.Vector3().lerpVectors(baseParams.position, targetParams.position, alpha);
  const target = new THREE.Vector3().lerpVectors(baseParams.target, targetParams.target, alpha);
  const fov = baseParams.fov + (targetParams.fov - baseParams.fov) * alpha;

  return { position, target, fov };
}
