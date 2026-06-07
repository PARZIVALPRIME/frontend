**Bits and Brews**

**Hi, I'm Preetam, a 4th-year Electrical Engineering student at IIT Bombay. I've always been passionate about computer architecture, especially the cycle of discovering a new design choice: first being astonished by its logical simplicity, then analyzing the trade-offs to see if it truly fits an application. That cycle is what excites me, and it's the core of what I want to explore here at Bits and Brews. That's why for this inaugural post, we'll explore the fascinating journey of Qualcomm's Oryon CPU: a processor that started with server ambitions and achieved immense success in the consumer world.**

**Computer architecture is all about applying common sense and analyzing trade-offs. Qualcomm recently launched the fastest mobile processor, the Snapdragon 8 Elite Gen 5, but did you know it consumes about 60% more power than Apple’s processors? Every design choice involves trade-offs—gaining something often means sacrificing something else.**

**With that in mind, I decided to start this blog to share fascinating journeys of the Oryon CPUs along with in-depth analysis behind some of their architectural decisions. So, grab a coffee, relax, and enjoy the reading.**

**Oryon** is Qualcomm’s new custom CPU core. It didn’t start at Qualcomm, it was created by **NuVia**, a startup founded by ex-Apple and other CPU veterans. Their original project (“Phoenix”) was a **server CPU** to compete with Intel Xeon, AMD EPYC, and Arm’s Neoverse designs. Qualcomm bought NuVia in **2021**, repurposed Phoenix for **consumer hardware**, and renamed it **Oryon**.

Current Oryon cores use **Arm v8.7-A ISA** (Instruction Set Architecture).Since Phoenix was meant for servers, the first Oryon cores still carry many of those **server-style design choices**. Qualcomm will tweak them for **client devices (phones, laptops, tablets)** in future generations.

Phoenix was built to go toe-to-toe with **high-performance CPUs** (Xeon/EPYC).  
This means Oryon cores are unusually **wide, powerful, and scalable** compared to typical mobile-first designs.

Mobile/consumer chips care about **burst performance, thermal limits, and idle efficiency** even more than servers do.First-gen Oryon (Snapdragon X) inherits a lot from Phoenix but lacks some “consumer-specific” refinements. So hopefully they made most of the required changes in the Third-gen Oryon processors.

**1st generation**

Development of the first generation of Oryon started in 2021 under Nuvia. This generation consists of Snapdragon X-series chips that are targeted at laptops.

**2nd generation**

The second generation consists only of Snapdragon 8-series chips targeted at smartphones and tablets.

**3rd generation**

The 3rd generation is the first to include both 8 and X series chips. The Snapdragon 8 Elite Gen 5 is the first mobile processor to use the 3rd generation Qualcomm Oryon cores.

**Reverse Engineering \- DieShot Analysis(Snapdragon 8 Elite Gen 5\)**:  
![][image1]  
**Figure 1 \- DieShot of Snapdragon 8 elite gen 5**  
**Source:**https://x.com/Kurnalsalts/status/1971234108111192402

The Snapdragon 8 Elite Gen 5 (SN8850), has landed, and while it might look familiar from the outside, there are some intriguing shifts happening within its core processing units and design choices from the previous versions.  
The 8 Elite Gen 5 maintains the familiar 2+6 CPU configuration: two high-performance "L Cores" and six power-efficient "M Cores." These clusters each boast a shared 12MB of L3 cache, a setup that mirrors its predecessor. What's truly interesting is the continued reliance on Qualcomm's self-developed, third-generation Oryon cores. This isn't a ground-up redesign, but rather a focused iteration aimed at squeezing more performance and efficiency out of the established architecture.  
whereas,  
X series had **12 cores \= 3 clusters of 4**  
The Oryon microarchitecture was built to scale up to **8-core clusters**. This is typical of server CPUs, which group many cores together for throughput.   
With 4-core clusters we can achieve higher granularity in power management, the SoC can **power-gate** or **clock-gate** entire clusters more flexibly e.g. for light workload → keep 1 cluster active, put 2 clusters to sleep. But with higher cluster size let’s say 8, you’d waste more energy because it’s harder to partially shut down without losing too much compute.  
But the tradeoff here is slower inter-core communication. In Intel/AMD CPUs, **6–8 performance cores** sit in a single cluster (CCX/ring). Intra-cluster communication \= fast (shared L3 or ring bus). In Qualcomm’s 4-core clusters, Cores within a cluster communicate quickly via shared L2.But if a core in cluster A needs data from cluster B, it must go through the **bus interface unit (BIU)**. This adds an extra latency compared to larger clusters.

**Performance Cores (L Cores)**:  
The two Oryon L Cores are where the heavy lifting happens, and while their overall area saw only a modest increase of 0.39 sq mm, the internal layout has shifted from a side-by-side arrangement to a top-and-bottom configuration. Crucially, the frequency has been bumped up to a zippy 4.61 GHz—a 6.71% increase over the previous generation's 4.32 GHz. This clock speed boost, combined with the removal of a powergate design, suggests a more direct and potentially efficient power delivery system to these critical cores. We also noticed the introduction of a newly independent SME (Scalable Matrix Extension) module, hinting at enhanced matrix computation capabilities, a feature increasingly important for AI and machine learning tasks.

**Efficiency Cores (M Cores)**:  
The six Oryon M Cores, now in their third generation, also see a frequency jump to 3.63 GHz. However, the most significant changes here are in their internal organization. The layout has been tweaked, moving from a top-and-bottom arrangement to a left-and-right setup around the central L3 cache. Like their larger siblings, the M Cores now feature independent SM units. Despite these additions and a slight increase in individual core area (up by 9.37%), the overall M Core cluster area only grew by 0.77 sq mm. This is a testament to clever L3 cache optimization, which managed to reduce its area while maintaining capacity – a smart move to pack more punch without significant bloat.

![][image2]  
**Figure 2 \- Oryon M & L clusters of Snapdragon 8 elite gen 5**

Both the L and M Core clusters benefit from L3 cache optimizations. While the L3 cache capacity remains at 12MB, its area has actually been *reduced* by 0.7 sq mm in the L Core cluster, indicating a significant 13% increase in cache density. This means more data can be stored in a smaller physical space, leading to faster access and improved efficiency.

**Deep dive into the Microarchitectural insights**:

Since Qualcomm has yet to release a full architectural overview of the Snapdragon 8 Elite Gen 5, our best reference point is the X series architecture overview presented by Williams. Although there might have been advancements in 3rd gen Oryon CPUs microarchitecture, the X series gives us enough detail to understand the kind of design choices modern processors make. Using this as our guide, we can start breaking down what design choices are being made in the modern processors which most of the textbooks fail to deliver.

The X series design is closer to AMD’s Zen or Intel’s old Core designs (homogeneous cores). For this they didn’t follow the typical “big vs little” split (like ARM big.LITTLE or Intel’s P-cores \+ E-cores). All clusters use the same Oryon cores. The X series design was in a way that **only 2 cores (in different clusters)** can hit the very top single-core turbo frequency. The others are capped at a lower “all-core turbo” speed. Each cluster has its own **PLL (phase-locked loop)**, which controls its clock speed.That means clusters can run at different frequencies, or even be **completely powered off**. In practice, when workloads are light, it will **put 2 clusters to sleep** and keep 1 cluster awake. If performance demand spikes, the sleeping clusters can be quickly powered back on for efficient operation.

Why Does This Matter?

1\. Simpler Scheduling:

* With Intel/AMD or traditional Snapdragon mobile SoCs, the OS scheduler must decide whether to run a task on a “big” or “small” core.  
* With Oryon, **all cores are equal** → the OS just spreads workloads across them. That makes scheduling more predictable and performance scaling smoother.

2\. Turbo strategy  
Allowing only 2 cores to hit max turbo might sound like a marketing trick to advertise big GHz numbers. But in reality, it’s a **deliberate engineering choice** that balances performance, thermals, and battery life:

* Running all 12 cores at peak turbo would push package power well beyond **45–80 W**, levels unsustainable in thin-and-light laptops with \~50 Wh batteries.  
* At those power levels, a laptop could drain its battery in barely over an hour and require bulky cooling which is completely impractical for mobile devices.  
* By allowing just two cores to reach the highest turbo, Qualcomm ensures that **single-threaded and lightly-threaded tasks** (which dominate most everyday usage and benchmarks) feel snappy and competitive against Intel/AMD chips.

3\. Power gating at the cluster level

* This is especially important for **mobile devices**, where idle leakage (background power drain) is a big deal. This is a crucial factor because Power is proportional to the frequency of operation .

 In more recent chipsets, such as the 3rd-gen Oryon CPUs in the Snapdragon 8 Elite Gen 5 — Qualcomm has shifted to a heterogeneous core design. The specific reasons for this change have not been disclosed publicly.

**Cache Hierarchy: Shared L2 Cache:**

Normally, each core has its **own private L2 cache**.Qualcomm does it differently: in Oryon, they have **one big shared L2 cache** for all the cores that are present in that cluster. This means less duplication of data across cores, and more efficient sharing.

Till now they have used 12 MB and 12 way associative L2 cache per cluster(Higher the associativity lesser is the number of cache conflicts).  
That’s very large for an L2 (most CPUs give 512 KB – 2 MB per core). 12 MB shared across 4 cores \= \~3 MB “per core equivalent”, though this isn't the right way to judge it but we can arguably say they have been using larger L2 caches. A large shared L2 allows bigger portions of the working set to be kept close to the cores, **reducing costly trips to DRAM and helping maintain coherence across clusters.**

So doing this helps with workloads that use large data sets or where multiple cores are working on the same data. Despite being huge, the L2 only takes **17 CPU cycles** to access after an L1 miss which is a good engineering balance between size and speed, most of the x86 CPUs have 30+ cycle L2 latencies.

Qualcomm disclosed that they are using inclusive cache i.e. everything in L1 cache is present in L2 and this is an energy efficient approach since   
Fewer data movements between L1 and L2 \= less switching activity \= lower power consumption. In a multi-core system, you need to make sure every core sees the latest version of memory.Oryon uses the **MOESI Protocol**(Modified, Owned, Exclusive, Shared, Invalid) allows efficient sharing and avoids unnecessary memory writes, while maintaining correctness.

Qualcomm keeps L2 cache running at the same clock as the CPU cores. This makes **L1 → L2 misses very fast**, because there’s no frequency divide. It helps maximize **single-thread IPC** and responsiveness, especially in bursty mobile workloads. The trade-off is higher power cost, but Qualcomm balances this with inclusive cache design and shared L2 per cluster.

Each cache line is **64 bytes**. Transfers between L1 and L2 happen in full 64-byte chunks. At GHz clock speeds, this yields **hundreds of GB/s bandwidth** per core.This ensures the cores don’t starve for data, which is critical in **AI, multimedia, and high-performance apps**.

Normally, an L2 only services its **own cluster** of 4 cores. But what if core A in cluster 0 needs data that’s sitting in cluster 1’s L2? This is where the cluster-to-cluster snooping comes into play. Qualcomm adds **optimized snoop protocols** so that instead of going all the way to DRAM, a cluster can fetch data directly from another cluster’s L2. This reduces latency and avoids wasting off-chip memory bandwidth. In effect, L2s can “talk to each other” efficiently through the interconnect fabric.  
![][image3]

**Instruction Fetch and Decode:**  
Moving deeper into the core, the instruction fetch and decode front end shows just how aggressively Qualcomm has tuned Oryon to maximize instruction throughput.

Oryon begins with a **192 KB Level 1 instruction cache (L1 I-Cache)**, unusually large for a consumer CPU core. With six-way associativity, it stores far more instructions than Intel’s Redwood Cove (64 KB) or AMD’s Zen 4 (32 KB). By keeping a larger code footprint close to the core, Qualcomm reduces instruction-cache misses and a key advantage for complex applications with wide and branching code paths. The generous instruction cache also complements Oryon’s **superscalar front end**: by ensuring more instructions are immediately available, it can consistently feed the wide decode engine and lessen the performance penalty of branch mispredictions, since a greater portion of the code path is already cached.

From this I-Cache, the **fetch unit can supply up to 16 instructions per cycle**. These instructions are grouped into fetch bundles and sent to the decoder stage, ensuring that the wide decode machinery is never starved.

The **decode stage itself is one of Oryon’s standout features**. Capable of decoding **up to 8 instructions per cycle**, it surpasses the front ends of Redwood Cove (6-wide) and Zen 4 (4-wide). All decoders are symmetrical, meaning every instruction type can be handled by any decoder, avoiding bottlenecks that plague asymmetric designs. Once decoded, instructions are emitted as micro-ops (uOps). While an Arm instruction can expand into as many as seven uOps, in practice Armv8-A instructions are usually very close to a one-to-one mapping, keeping decode throughput efficient.

Like any modern CPU, Oryon relies heavily on **branch prediction** to maintain smooth instruction flow. Its predictors include a single-cycle branch target buffer (BTB) for quick path decisions, along with more advanced conditional, indirect, and return address stack (RAS) predictors for deeper accuracy. When a misprediction occurs, the cost is a **13-cycle penalty** before the front end is redirected — competitive with today’s high-performance cores.

Supporting all of this is a **256-entry instruction TLB (iTLB)**, which translates virtual to physical addresses for instruction fetches, with support for both 4 KB and 64 KB pages. This reduces the likelihood of expensive page walks, helping sustain the front end’s high bandwidth. Meanwhile, the fetch unit coordinates with the broader memory system to manage cache misses, prefetch requests, and invalidations, ensuring smooth operation even under heavy code churn.

Altogether, Oryon’s instruction fetch and decode front end reflects its **server-class origins**. A massive instruction cache, wide fetch and decode bandwidth, and robust branch prediction machinery all work in tandem to keep the execution engine saturated. It’s a design philosophy that emphasizes throughput and efficiency.

![][image4]

**Register Rename, Dispatch, Execution, and Retirement:**

Moving past the front end, the execution backend of Oryon shows just how aggressively Qualcomm has provisioned resources to sustain high throughput. Nearly every structure here is oversized by mobile standards, underscoring the server-class DNA of this design.

At the heart of the backend lies a **large register rename and scheduling system**. Incoming micro-ops (uOps) are first renamed from their architected registers to a dedicated pool of physical registers, breaking false dependencies and enabling out-of-order execution. Oryon provides more than **400 physical registers each for integer and vector operations**, along with status registers. This deep register file ensures that the core can sustain a very wide scheduling window without running out of resources, which is essential for finding instruction-level parallelism in complex workloads.

Once renamed, uOps are dispatched into **reservation stations**, which hold them until all source operands are ready. When dependencies are resolved, the scheduler selects instructions (often oldest-ready first) and issues them into the execution pipelines. A wide forwarding network ensures results from in-flight instructions are immediately available to dependent uOps, minimizing latency.

Oryon backs this up with a **massive 650+ entry reorder buffer (ROB)**, one of the largest seen in a consumer-oriented CPU. The ROB tracks all in-flight uOps, enabling aggressive out-of-order execution, speculative branching, and recovery from mispredictions. On retirement, up to **8 uOps per cycle** can be committed in order, matching the decode width of the front end. This symmetry between fetch, decode, and retire ensures consistent throughput across the pipeline.

Execution resources are similarly abundant. On the integer side, Oryon includes **six 64-bit ALU pipelines**, all capable of arithmetic and logic operations. Two of these double as branch units, and two can handle multiply–accumulate instructions, while a dedicated unit handles integer division. Most common ALU operations execute in a single cycle, keeping integer workloads extremely fast.

For floating-point and vector work, Oryon provides **four 128-bit SIMD/FP pipelines**, each equipped with NEON units. These pipelines support FP16, FP32, and FP64 formats, as well as integer SIMD operations across INT8, INT16, INT32, and INT64. Common instructions like add, multiply, multiply–accumulate, divide, and square root are supported, along with reciprocal approximations for faster math. While Oryon does not support Arm’s more advanced SVE or SME matrix extensions, its FP/vector units cover the datatypes most relevant to mobile and laptop workloads, including INT8 for AI inference. The notable omission is BF16, though Qualcomm’s design philosophy is to offload heavy AI work to the integrated NPU.

Altogether, the backend of Oryon emphasizes **width, depth, and flexibility**. With hundreds of registers, a giant ROB, a wide set of reservation stations, and plentiful execution pipelines, the core is built to extract maximum instruction-level parallelism. This approach ensures that Oryon can keep its wide front end busy and deliver high sustained throughput, even under complex, branch-heavy, or mixed workloads.

**Load/Store Unit**:

The **Load/Store Unit (LSU)** is one of the most important parts of Oryon’s backend, ensuring that data movement between registers, caches, and memory happens with high throughput and strict correctness. Qualcomm has equipped Oryon with a wide and flexible memory system that can sustain multiple in-flight operations, while also enforcing memory ordering rules critical for multiprocessor systems.

At the core of the LSU are **four fully flexible execution pipelines**, capable of handling loads and stores in any combination per cycle. Supporting these pipelines are deep queues: the **Load Queue (192 entries)** and the **Store Queue (56 entries)**. These buffers allow the core to issue memory operations out-of-order, while specialized logic ensures program order is preserved when necessary. For example, if a younger load speculatively bypasses an older store, the LSU uses mechanisms like **store-to-load forwarding** and replay logic to guarantee that the load eventually observes the correct data. This careful handling of memory hazards ensures correct execution, even under aggressive out-of-order scheduling.

The LSU also plays a critical role in enforcing **memory consistency models** across cores. It handles **barrier instructions** (like acquire/release semantics) and provides hardware support for synchronization primitives such as **load-reserve/store-conditional pairs and atomic read–modify–write instructions**. These mechanisms form the building blocks for locks, semaphores, and other synchronization tools that software relies on in multithreaded environments.

Backing the LSU is a sizable **96 KB Level 1 Data Cache (L1 D-Cache)**. This cache is **6-way associative, multiported, finely banked, and fully coherent** with the rest of the SoC. With a 64-byte line size, it is designed to handle multiple concurrent reads and writes efficiently, supporting high throughput from both loads and stores. The L1 D-Cache uses the MESI coherence protocol and interacts with the last-level cluster cache to process fills, evictions, and writebacks. Its size — twice that of Intel’s Redwood Cove — provides Oryon with a significant buffer against costly memory trips.

A major contributor to LSU performance is Qualcomm’s **hardware prefetching system**. While the exact details remain proprietary, Qualcomm describes it as highly sophisticated, capable of detecting access patterns ranging from simple strides to complex historical correlations. Prefetched data can be brought into both L1 and L2 caches, reducing cache-miss penalties. The LSU also integrates **TLB prefetching**, anticipating virtual-to-physical translations to hide page-walk latencies.

Beyond performance, the LSU also manages **system-level instructions** such as cache maintenance (e.g., clean-and-evict), TLB invalidates (TLBIs), and synchronization barriers across the SoC. These flows require cooperation between the LSU, the coherence fabric, the shared system-level cache, and the memory controller, ensuring that the processor behaves correctly in a multiprocessor environment.

**Memory Management Unit**:

While much of Oryon’s backend is ambitious and oversized, its **Memory Management Unit (MMU)** reflects a more balanced, standards-driven design — but with a few important enhancements that align with modern virtualization and high-throughput needs.

At its core, the MMU performs **virtual-to-physical address translation** using hierarchical page tables. Like other Armv8 designs, Oryon supports **48-bit virtual addressing** with 4 KB pages, which translates into a four-level page table walk. Each level of the table is indexed by a portion of the virtual address, until a final leaf entry provides the physical frame number plus attributes. This mechanism underpins **virtual memory**, allowing the OS to provide protection, isolation, and efficient use of physical RAM.

Where Oryon stands out is in its **full support for virtualization and nested virtualization**. In addition to standard two-stage address translation (Stage 1 managed by the guest OS, Stage 2 by the hypervisor), the MMU can support guest hypervisors inside virtual machines — a capability known as nested virtualization. This allows an already virtualized environment to host additional VMs, a feature more commonly associated with server-class CPUs than mobile chips.

### **Multi-Level TLB Hierarchy**

To avoid frequent page table walks, Oryon employs a **two-level TLB (Translation Lookaside Buffer) hierarchy**:

* **L1 instruction TLB (iTLB)** and **L1 data TLB (dTLB)** handle the most immediate lookups.

* Both are backed by a large unified **L2 TLB (mTLB)**, with **8192 entries, 8-way associative**.

* Specialized **Table Walk Caches** store intermediate-level page table entries, further reducing the penalty of walking a hierarchical table in memory.

When a translation request misses the iTLB/dTLB, it is passed to the mTLB. If that too misses, the hardware performs a **table walk**, consulting cached descriptors when possible. Critically, Oryon’s hardware can sustain **up to 16 concurrent table walks per core** meaning a full 12-core Snapdragon X chip could have nearly **200 table walks in flight at once**. This ensures that long-latency DRAM page walks do not stall the pipeline.

**Maintenance, Prefetch, and System Flows:**  
Beyond raw translation, the MMU is responsible for **TLB maintenance operations** (such as invalidates triggered by OS-level page table changes). These propagate across microarchitectural structures and ensure correctness in multiprocessor environments. The MMU also supports **TLB prefetching**, predicting future page table entries and preloading them into the L1 and L2 TLBs to reduce misses.

**Memory Controller (DDRSS) and Shared Last-Level Cache (SLC):**

Beyond the CPU clusters, Oryon cores depend on a **shared memory subsystem** that connects the processors, GPU, NPU, and other SoC agents to DRAM. This subsystem is anchored by Qualcomm’s DDR subsystem (DDRSS), which integrates the **memory controller** and a relatively small but fast **System-Level Cache (SLC)**.

**Shared Last-Level Cache (SLC / L3)**

The Snapdragon X family employs a **6 MB shared cache** at the SoC level. Unlike the massive L1 and L2 caches (192 KB I-cache per core, 96 KB D-cache per core, and up to 36 MB L2 shared across clusters), the last-level cache is relatively modest. Qualcomm treats this cache primarily as a **victim cache**, catching evicted lines from lower levels, rather than a large working buffer as in traditional x86 CPUs.

This design philosophy reflects Qualcomm’s mobile SoC heritage, where chip designs often rely on large L1/L2 caches and leaner L3 caches to balance **power efficiency and die area**. The upside is low latency: the SLC offers access times of just **26–29 nanoseconds**, significantly faster than DRAM, while also offering full **135 GB/s of bandwidth** — the same as the attached DRAM itself.

**DRAM Subsystem (DDRSS)**

System memory is handled by the DDRSS memory controller, which supports **LPDDR5X-8448 memory** over a **128-bit bus** (8 channels × 16 bits). This delivers **135 GB/s peak bandwidth**, comparable to many PC-class laptop CPUs, while keeping power efficiency tuned for thin-and-light systems.

Memory capacity is currently validated up to **64 GB of LPDDR5X**, though Qualcomm could eventually certify larger capacities (128 GB) once higher-density LPDDR5X modules arrive. Importantly, unlike Apple’s M-series chips or some ARM server designs, Qualcomm does **not use on-package memory (HMB/stacked DRAM)**. Instead, LPDDR5X chips are placed on the device motherboard, giving OEMs flexibility in memory configuration.

The memory subsystem has carefully tuned latency characteristics:

* **SLC access latency:** \~26–29 ns  
* **DRAM access latency:** \~102–104 ns (unloaded system)

This balance allows frequently accessed data to be quickly served by the SLC, while larger data streams spill out to DRAM with tolerable latencies.

**References**:

1. G. Williams, “Snapdragon X Elite Qualcomm Oryon CPU: Design & architecture overview,” in Proc. IEEE Symp. High Perform. Comput. Archit. (Hot Chips), 2024\.  
2. Figure 1&2: https://x.com/Kurnalsalts/status/1971234108111192402  
3. [https://en.wikipedia.org/wiki/Oryon](https://en.wikipedia.org/wiki/Oryon)







