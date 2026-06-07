import React from "react";

export interface Track {
  id: string;
  name: string;
  icon: string;
  desc: string;
}

export const TRACKS: Track[] = [
  { id: "isa", name: "Instruction Sets (ISAs)", icon: "📜", desc: "The hardware-software contract (RISC-V, ARM, x86)" },
  { id: "pipelines", name: "Processor Pipelines", icon: "⚙️", desc: "Out-of-order execution, renaming, and scheduling" },
  { id: "memory", name: "Caches & Memory", icon: "⚡", desc: "Cache coherence, virtual memory, and DRAM" },
  { id: "interconnects", name: "Silicon Interconnects", icon: "🌐", desc: "On-die buses and Network-on-Chip (NoC) systems" },
  { id: "gpu", name: "GPU & Parallelism", icon: "🎮", desc: "Throughput-oriented shader cores & raytracing" },
  { id: "ai", name: "AI Accelerators", icon: "🧠", desc: "Matrix multiplication and systolic dataflow arrays" },
  { id: "vlsi", name: "VLSI Fabrication", icon: "🔬", desc: "Photolithography, GAA transistors, and physics" },
  { id: "power", name: "Power & DVFS", icon: "🔋", desc: "Voltage islands, thermal sensors, and DVFS" },
  { id: "os-compilers", name: "OS & Compilers", icon: "🛠️", desc: "Register allocation, scheduling, and MMU control" },
];

export function getTrackArticle(trackId: string): string {
  switch (trackId) {
    case "isa":
      return `# Instruction Set Architecture
## The Hardware-Software Contract

An Instruction Set Architecture (ISA) serves as the abstract boundary between software programs and physical processor hardware, defining supported instructions, registers, memory models, and data types.

### Architectural Approaches
- **RISC (Reduced Instruction Set Computer)**: Prioritizes simple, single-cycle instructions. Compilers combine simple operations to perform complex work (e.g., RISC-V, ARM).
- **CISC (Complex Instruction Set Computer)**: Emphasizes dense instruction encoding where single instructions perform multiple operations (e.g., x86).
- **VLIW (Very Long Instruction Word)**: Shifts instruction scheduling and dependency resolution entirely to the compiler, executing instructions in parallel bundles.

### The RISC-V Revolution
RISC-V has emerged as an open, royalty-free standard, enabling modular hardware customization. Through base instruction sets (RV32I/RV64I) and modular extensions (M: Math, A: Atomic, F/D: Floating Point, V: Vector), developers can tailor compute architectures without legacy overhead.`;

    case "pipelines":
      return `# Processor Pipelines
## Instruction Flow & Out-of-Order Execution

Modern execution pipelines split instruction processing into sequential stages, running multiple instructions in parallel to maximize instruction throughput (IPC).

### Classic Pipeline Stages
- **Fetch**: Reads instruction bytes from the L1 instruction cache using the branch predictor's target address.
- **Decode**: Translates binary instructions into internal micro-operations (uOps).
- **Register Rename**: Maps architectural registers to a larger physical register file to eliminate artificial read-after-write dependencies.
- **Dispatch & Issue**: Buffers uOps in reservation stations and issues them out-of-order to execution ports once their source operands are ready.
- **Execute**: Computes results in integer ALUs, address generation units (AGUs), or floating-point units.
- **Retire**: Commits results back to architectural state in original program order to maintain precise interrupts.

### Out-of-Order Execution (OoO)
By tracking dynamic data dependencies rather than literal assembly ordering, OoO execution engines bypass stall points (like cache misses) to continue doing useful compute on independent instruction paths.`;

    case "memory":
      return `# Caches & Memory
## Bridging the Processor-Memory Wall

The speed gap between processors and main memory (DRAM) has grown exponentially over decades. Modern architectures employ a deep memory hierarchy to keep execution pipelines fed.

### Cache Hierarchy
- **L1 Cache**: Ultra-fast (1-3 cycles latency) split caches for instructions and data, integrated directly inside each core.
- **L2 Cache**: Larger, slightly slower coherent cache serving as a private buffer for individual cores.
- **L3 / System Cache**: Massive, shared SRAM pool acting as a central victim cache and interconnect buffer.
- **DRAM**: High-density external memory (LPDDR5x/HBM) connected via wide, high-speed physical interfaces (PHY).

### Coherence & Protocols
To maintain a single unified view of memory across multiple processor cores, hardware controllers enforce cache coherence protocols (such as MESI or MOESI), invalidating or updating stale cache lines as write operations occur.`;

    case "interconnects":
      return `# Silicon Interconnects
## On-Die Fabrics & Networks-on-Chip (NoC)

As core counts scale, communication between heterogeneous components (CPUs, GPUs, memory, peripherals) becomes the primary bottleneck of system performance and energy efficiency.

### Interconnect Topologies
- **Crossbar Switches**: Dedicated peer-to-peer connections between all nodes. High performance, but wiring complexity scales quadratically ($O(N^2)$).
- **Ring Buses**: Nodes communicate via a shared circular loop. Simple, cost-effective routing, but latency increases linearly with ring size.
- **Network-on-Chip (NoC)**: Employs packet-switched routing nodes mapped in 2D grid meshes. Scales horizontally to handle hundreds of independent nodes.

### Protocol Domains
On-die fabrics bridge multiple voltage and clock frequency boundaries using asynchronous FIFOs, ensuring clean packet transitions without corrupting packet headers.`;

    case "gpu":
      return `# GPU & Parallelism
## Throughput-Oriented Shader Pipelines

Unlike latency-focused CPUs, GPUs are engineered for massive data throughput, dedicating most of their die area to execution units (ALUs) rather than caches and control logic.

### Compute Model
- **SIMT (Single Instruction, Multiple Threads)**: Groups execution threads into bundles (warps/wavefronts). A single control unit issues instructions to dozens of ALUs executing in lockstep.
- **Tile-Based Rendering (TBDR)**: Divides screen space into small tiles, processing geometry and rasterization locally inside on-chip caches to conserve memory bandwidth.
- **Hardware BVH Accelerators**: Traverses Bounding Volume Hierarchies in silicon, calculating ray-geometry intersections for real-time path tracing.`;

    case "ai":
      return `# AI Accelerators
## Systolic Arrays & Matrix Math Engines

Deep learning models rely heavily on high-density matrix multiplications. Domain-specific accelerators (NPUs, TPUs) achieve extreme efficiency by optimizing data reuse patterns.

### Systolic Array Dataflow
A systolic array passes input activations and weight parameters through a 2D grid of processing elements (multiply-accumulate cells). Data flows step-by-step through neighboring cells, eliminating the need to read and write intermediate results back to registers or caches.

### Architectural Features
- **Quantization Support**: Native hardware support for low-precision data types (INT8, FP16, INT4) to quadruple compute density.
- **Adjacent Weights Cache**: Massive local SRAM pools (like 12MB SRAM) placed right next to execution columns to minimize external DRAM power draw.`;

    case "vlsi":
      return `# VLSI Fabrication
## EUV Photolithography & GAA Transistors

Fabricating microscopic integrated circuits on silicon wafers requires pushing the physical limits of chemistry, optics, and material science.

### Manufacturing Pipeline
- **EUV Lithography**: Employs extreme ultraviolet light ($\lambda = 13.5\text{nm}$) to print transistor designs onto silicon wafers with sub-nanometer accuracy.
- **FinFET**: Transistor design using vertical channel fins wrapped by gates on 3 sides to prevent leakage currents.
- **GAA (Gate-All-Around) Nanosheet**: Next-generation transistor structure wrapping the gate completely around horizontal channel nanosheets, offering superior electrostatic control.`;

    case "power":
      return `# Power & DVFS
## Thermal Budgets & Power Delivery

Every active gate dissipates dynamic energy ($C V^2 f$). Dynamic Power Management systems balance performance against battery and thermal limits.

### Power Mitigation
- **Power Islands**: Isolates blocks within independent power domains, allowing unused sections (like the GPU or NPU) to be fully turned off (gated).
- **DVFS (Dynamic Voltage and Frequency Scaling)**: Adjusts voltage and clock frequency on the fly to match processing load.
- **Thermal Throttling**: Monitors on-die thermal sensors and dynamically caps frequency when local silicon temperature approaches critical junction limits ($~105^\circ\text{C}$).`;

    case "os-compilers":
      return `# OS & Compilers
## Hardware-Software Co-Design

The runtime behavior of compute hardware depends entirely on compilers translating code and Operating Systems scheduling execution threads.

### Compiler Role
Compilers analyze instruction sequences, resolving data hazards, scheduling instructions to hide memory latency, and allocating physical registers via graph coloring.

### OS Runtime Control
The OS kernel manages virtual-to-physical address mapping via Page Tables, coordinates Page Walks on TLB misses, and schedules execution threads across asymmetric cores (big.LITTLE scheduling) to optimize power and performance.`;

    default:
      return "";
  }
}
