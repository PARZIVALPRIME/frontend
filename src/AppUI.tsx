import { Suspense, useState, useEffect, useRef } from "react";
import { Canvas } from "@react-three/fiber";
import { QualityContext } from "./soc/quality";
import { CHAPTERS, TOTAL } from "./chapters";
import { getArticleForLevel, parseMarkdown } from "./chapterArticles";
import { TRACKS, getTrackArticle } from "./trackArticles";

interface SceneProps {
  t: number;
  showLabels: boolean;
  selected: string | null;
  setSelected: (id: string | null) => void;
  mode: "Idle";
  levelFloat: number;
  visMode: string;
}

interface UiProps {
  sceneComponent: React.ComponentType<SceneProps>;
  quality?: "desktop" | "mobile";
}

function CircuitBackground({ active }: { active: boolean }) {
  return (
    <div
      className="absolute inset-0 z-0 pointer-events-none transition-opacity duration-1000 ease-in-out"
      style={{ opacity: active ? 0.45 : 0 }}
    >
      <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <radialGradient id="ambientGlow" cx="20%" cy="50%" r="55%">
            <stop offset="0%" stopColor="rgba(232, 162, 58, 0.12)" />
            <stop offset="100%" stopColor="rgba(8, 9, 14, 0)" />
          </radialGradient>
          <linearGradient id="traceGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgba(232, 162, 58, 0.3)" />
            <stop offset="50%" stopColor="rgba(232, 162, 58, 0.8)" />
            <stop offset="100%" stopColor="rgba(232, 162, 58, 0.1)" />
          </linearGradient>
        </defs>

        <style>{`
          @keyframes circuitDash {
            to {
              stroke-dashoffset: -160;
            }
          }
          .circuit-line {
            stroke: url(#traceGrad);
            stroke-width: 1.5;
            stroke-linecap: round;
            stroke-dasharray: 12 48;
            animation: circuitDash 10s linear infinite;
          }
          .circuit-node {
            fill: #e8a23a;
            filter: drop-shadow(0 0 4px rgba(232,162,58,0.7));
          }
        `}</style>

        {/* Ambient warm glow behind text */}
        <rect width="100%" height="100%" fill="url(#ambientGlow)" />

        {/* Tech Grid */}
        <pattern id="bgGrid" width="50" height="50" patternUnits="userSpaceOnUse">
          <path d="M 50 0 L 0 0 0 50" fill="none" stroke="rgba(255, 255, 255, 0.015)" strokeWidth="1" />
        </pattern>
        <rect width="100%" height="100%" fill="url(#bgGrid)" />

        <g opacity="0.55">
          {/* Main bus lines */}
          <path d="M -10 120 L 180 120 L 280 220 L 460 220" fill="none" className="circuit-line" />
          <path d="M 60 170 L 200 170 L 250 220" fill="none" className="circuit-line" style={{ animationDelay: "-2.5s" }} />
          <path d="M -20 380 L 320 380 L 420 480 L 680 480" fill="none" className="circuit-line" style={{ animationDelay: "-5s" }} />
          
          <path d="M 220 0 L 220 120" fill="none" stroke="rgba(232, 162, 58, 0.08)" strokeWidth="1" />
          <path d="M 320 380 L 320 540 L 280 580" fill="none" className="circuit-line" style={{ animationDelay: "-1.2s" }} />
          <path d="M 180 120 L 180 240 L 110 310 L 110 480" fill="none" className="circuit-line" style={{ animationDelay: "-6.2s" }} />

          {/* Solder circles */}
          <circle cx="180" cy="120" r="3.2" className="circuit-node" />
          <circle cx="280" cy="220" r="3.2" className="circuit-node" />
          <circle cx="320" cy="380" r="3.2" className="circuit-node" />
          <circle cx="420" cy="480" r="3.5" className="circuit-node" />
          <circle cx="110" cy="310" r="2.5" className="circuit-node" />
          
          {/* Silicon footprint pads array */}
          <g opacity="0.25" transform="translate(195, 260)">
            {Array.from({ length: 4 }).map((_, r) =>
              Array.from({ length: 6 }).map((_, c) => (
                <circle key={`${r}-${c}`} cx={c * 14} cy={r * 14} r="1" fill="#e8a23a" />
              ))
            )}
          </g>
        </g>
      </svg>
    </div>
  );
}

export function AppUI({ sceneComponent: SceneComp, quality = "desktop" }: UiProps) {
  // ── State ─────────────────────────────────────────────────────────────────
  const [targetLevel, setTargetLevel] = useState(1);       // snap destination (1-7)
  const [levelFloat, setLevelFloat] = useState(1.0);        // smooth float fed to camera
  const [chapterVisible, setChapterVisible] = useState(true); // text fade state
  const [t, setT] = useState(0.0);
  const [visMode] = useState("physical");
  const [selectedTrack, setSelectedTrack] = useState<string | null>(null);
  const [selectedBlock, setSelectedBlock] = useState<string | null>(null);

  useEffect(() => {
    setSelectedTrack(null);
    setSelectedBlock(null);
  }, [targetLevel]);

  // ── Scroll accumulator (avoids skipping chapters on fast scrolling) ───────
  const accumRef = useRef(0);
  const cooldownRef = useRef(false);

  // ── Snap-to-chapter scroll: wheel + keyboard ──────────────────────────────
  useEffect(() => {
    const advance = (dir: 1 | -1) => {
      setTargetLevel((prev) => {
        const next = Math.max(1, Math.min(TOTAL, prev + dir));
        if (next !== prev) {
          // Briefly hide chapter text so it fades back in for new chapter
          setChapterVisible(false);
          setTimeout(() => setChapterVisible(true), 320);
        }
        return next;
      });
    };

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (cooldownRef.current) return;
      accumRef.current += e.deltaY;
      const threshold = 120;
      if (accumRef.current > threshold) {
        advance(1);
        accumRef.current = 0;
        cooldownRef.current = true;
        setTimeout(() => { cooldownRef.current = false; }, 400);
      } else if (accumRef.current < -threshold) {
        advance(-1);
        accumRef.current = 0;
        cooldownRef.current = true;
        setTimeout(() => { cooldownRef.current = false; }, 400);
      }
    };

    const handleKey = (e: KeyboardEvent) => {
      if (["ArrowDown", "PageDown"].includes(e.key)) { e.preventDefault(); advance(1); }
      if (["ArrowUp", "PageUp"].includes(e.key))   { e.preventDefault(); advance(-1); }
    };

    window.addEventListener("wheel", handleWheel, { passive: false });
    window.addEventListener("keydown", handleKey);
    return () => {
      window.removeEventListener("wheel", handleWheel);
      window.removeEventListener("keydown", handleKey);
    };
  }, []);

  // ── Smooth lerp: levelFloat → targetLevel (drives camera interpolation) ───
  useEffect(() => {
    let raf: number;
    const ease = () => {
      setLevelFloat((prev) => {
        const diff = targetLevel - prev;
        // Stop when close enough to avoid perpetual rAF
        if (Math.abs(diff) < 0.001) return targetLevel;
        return prev + diff * 0.10; // snappier transition
      });
      raf = requestAnimationFrame(ease);
    };
    raf = requestAnimationFrame(ease);
    return () => cancelAnimationFrame(raf);
  }, [targetLevel]);

  const currentChapter = CHAPTERS.find((c) => c.level === targetLevel) ?? CHAPTERS[3];
  const SceneEl = SceneComp;

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-[#08090e] font-sans text-white select-none">

      {/* ── Landing Page Background Grid & Circuits ─────────────────────── */}
      <CircuitBackground active={targetLevel === 1} />

      {/* ── 3D Canvas ─────────────────────────────────────────────────────── */}
      <div className="absolute inset-0 z-1">
        <Canvas
          shadows
          dpr={[1, 2]}
          camera={{ position: [20, 16, 22], fov: 25 }}
          gl={{ antialias: true, powerPreference: "high-performance" }}
          className="absolute inset-0"
        >
          <QualityContext.Provider value={quality}>
            <Suspense fallback={null}>
              <SceneEl
                t={t}
                showLabels={targetLevel === 3}
                selected={selectedBlock}
                setSelected={setSelectedBlock}
                mode="Idle"
                levelFloat={levelFloat}
                visMode={visMode}
              />
            </Suspense>
          </QualityContext.Provider>
        </Canvas>
      </div>

      {/* ── Vignette: two layers that cross-fade between ch1 and ch2+ ───── */}
      <div
        className="pointer-events-none absolute inset-0 z-10"
        style={{
          background: "linear-gradient(to right, rgba(8,9,14,0.95) 0%, rgba(8,9,14,0.85) 30%, transparent 60%)",
          opacity: targetLevel === 1 ? 1 : 0,
          transition: "opacity 700ms ease",
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 z-10"
        style={{
          background: "radial-gradient(ellipse at center, transparent 30%, rgba(8,9,14,0.55))",
          opacity: targetLevel === 1 ? 0 : 1,
          transition: "opacity 700ms ease",
        }}
      />

      {/* ── Top-left: Publication wordmark ───────────────────────────────── */}
      <div className="absolute top-6 left-8 z-20">
        <div className="text-[10px] font-mono font-semibold tracking-[0.35em] text-white/30 uppercase">
          Bits'nBrews
        </div>
        <div className="text-[11px] font-semibold tracking-[0.15em] text-white/20 uppercase mt-0.5">
          Architecture Explorer
        </div>
      </div>

      {/* ── Top-right: Explode toggle ─────────────────────────────────────── */}
      <div className="absolute top-6 right-8 z-20">
        <button
          onClick={() => setT((p) => (p === 0 ? 1 : 0))}
          className="text-[9px] font-mono font-semibold tracking-[0.2em] uppercase text-white/35 hover:text-white/70 transition-colors duration-200 border border-white/10 hover:border-white/30 px-3 py-1.5 rounded-sm"
        >
          {t === 0 ? "EXPLODE VIEW" : "ASSEMBLE"}
        </button>
      </div>

      {/* ── Chapter 1: Editorial hero — always mounted, fades in/out ────────── */}
      <div
        className="absolute left-0 top-0 bottom-0 z-20 flex flex-col justify-center pl-16 pr-8 w-[52%]"
        style={{
          opacity: targetLevel === 1 && chapterVisible ? 1 : 0,
          transform: targetLevel === 1 && chapterVisible ? "translateY(0)" : "translateY(14px)",
          transition: "opacity 600ms ease, transform 600ms ease",
          pointerEvents: targetLevel === 1 ? "auto" : "none",
        }}
      >
        {/* Technical metadata badges */}
        <div className="flex gap-4 items-center mb-6">
          <span className="text-[8px] font-mono font-bold tracking-[0.25em] text-[#e8a23a] uppercase bg-[#e8a23a]/5 border border-[#e8a23a]/15 px-2.5 py-1 rounded-sm">
            3nm GAA EUV PROCESS
          </span>
          <span className="text-[8px] font-mono font-bold tracking-[0.25em] text-white/40 uppercase">
            EDITION 2026
          </span>
        </div>

        <h1 className="text-[56px] font-bold leading-[1.02] tracking-[-0.03em] text-white/95 mb-6">
          Where Silicon <br />
          <span className="bg-gradient-to-r from-white via-white to-white/40 bg-clip-text text-transparent">Meets Intent.</span>
        </h1>
        <div className="w-16 h-px bg-[#e8a23a]/40 mb-8" />
        <p className="text-[14px] leading-[1.75] text-white/50 max-w-[440px] mb-8 font-light">
          Bits&apos;nBrews bridges the gap between dense academic papers
          and practical computer architecture &mdash; delivered through a bespoke,
          high-performance physical and spatial engineering simulation.
        </p>
        <button
          onClick={() => {
            setTargetLevel(2);
            setChapterVisible(false);
            setTimeout(() => setChapterVisible(true), 320);
          }}
          className="self-start flex items-center gap-3 text-[10px] font-mono font-bold tracking-[0.25em] uppercase text-[#e8a23a]/90 hover:text-white transition-colors duration-200 group border border-[#e8a23a]/30 hover:border-white px-5 py-2.5 rounded-sm bg-black/25 backdrop-blur-sm"
        >
          <span>Explore the Architecture</span>
          <span className="inline-block transition-transform duration-200 group-hover:translate-x-1">&rarr;</span>
        </button>
      </div>

      {/* ── Chapters 2–10: Compact bottom-left — always mounted, fades in/out ── */}
      <div
        className="absolute bottom-16 left-8 z-20 max-w-sm"
        style={{
          opacity: targetLevel > 1 && targetLevel <= 10 && chapterVisible ? 1 : 0,
          transform: targetLevel > 1 && targetLevel <= 10 && chapterVisible ? "translateY(0)" : "translateY(12px)",
          transition: "opacity 500ms ease, transform 500ms ease",
          pointerEvents: targetLevel > 1 && targetLevel <= 10 ? "auto" : "none",
        }}
      >
        <div className="text-[8px] font-mono font-bold tracking-[0.3em] text-white/40 uppercase mb-2">
          {currentChapter.tag}
        </div>
        <div className="flex items-baseline gap-3 mb-1">
          <span className="text-[11px] font-mono text-white/20 tracking-widest">
            {currentChapter.chapter}
          </span>
          <h1 className="text-[28px] font-bold leading-none tracking-tight text-white/90">
            {currentChapter.title}
          </h1>
        </div>
        <div className="text-[11px] font-mono text-white/40 tracking-wider mb-3">
          {currentChapter.subtitle}
        </div>
        <div className="w-8 h-px bg-white/20 mb-3" />
        <p className="text-[12px] leading-[1.7] text-white/55 max-w-[340px]">
          {currentChapter.description}
        </p>
      </div>
      
      {/* ── Right: Component detail panel (levels 4–10, or level 3 selected track/block) ── */}
      {(() => {
        const hasSelectionInCh3 = targetLevel === 3 && (selectedTrack !== null || selectedBlock !== null);
        const activeArticle =
          targetLevel === 3 && selectedTrack !== null
            ? getTrackArticle(selectedTrack)
            : targetLevel === 3 && selectedBlock !== null
            ? (() => {
                const blockLevelMap: Record<string, number> = {
                  "cpu-big": 4,
                  "gpu": 5,
                  "npu": 6,
                  "modem": 7,
                  "isp": 8,
                  "slc": 9,
                };
                const lvl = blockLevelMap[selectedBlock];
                return lvl ? getArticleForLevel(lvl) : getArticleForLevel(3);
              })()
            : getArticleForLevel(targetLevel);

        const isVisible = ((targetLevel >= 4 && targetLevel <= 10) || hasSelectionInCh3) && chapterVisible;

        return (
          <div
            className="absolute right-8 top-1/2 -translate-y-1/2 z-20 w-[320px] max-h-[65vh] overflow-y-auto rounded-xl border border-white/8 bg-black/50 backdrop-blur-xl p-5 scrollbar-thin"
            style={{
              opacity: isVisible ? 1 : 0,
              transform: isVisible
                ? "translateY(-50%) translateX(0)"
                : "translateY(-50%) translateX(16px)",
              transition: "opacity 500ms ease, transform 500ms ease",
              pointerEvents: isVisible ? "auto" : "none",
            }}
          >
            <div className="flex justify-between items-center mb-2">
              <div className="text-[8px] font-mono font-bold tracking-[0.25em] text-[#e8a23a]/70 uppercase">
                {targetLevel === 3
                  ? selectedTrack !== null
                    ? "Technical Track"
                    : "Block Detail"
                  : "Component Detail"}
              </div>
              {targetLevel === 3 && hasSelectionInCh3 && (
                <button
                  onClick={() => {
                    setSelectedTrack(null);
                    setSelectedBlock(null);
                  }}
                  className="text-[9px] font-mono text-white/40 hover:text-[#e8a23a] transition-colors"
                >
                  [CLOSE]
                </button>
              )}
            </div>
            <div className="text-left text-white/80">
              {parseMarkdown(activeArticle)}
            </div>
          </div>
        );
      })()}

      {/* ── Right side: Chapter navigation dots ──────────────────────────── */}
      <div
        className="absolute right-8 top-1/2 -translate-y-1/2 z-20 flex flex-col gap-3 items-center transition-all duration-500"
        style={{
          opacity: targetLevel === 11 ? 0 : 1,
          pointerEvents: targetLevel === 11 ? "none" : "auto",
        }}
      >
        {CHAPTERS.map((c) => (
          <button
            key={c.level}
            onClick={() => {
              setTargetLevel(c.level);
              setChapterVisible(false);
              setTimeout(() => setChapterVisible(true), 320);
            }}
            title={c.title}
            className="group relative flex items-center justify-end gap-2"
          >
            {/* Label on hover */}
            <span className="absolute right-5 text-[8px] font-mono tracking-widest text-white/50 uppercase opacity-0 group-hover:opacity-100 transition-opacity duration-150 whitespace-nowrap">
              {c.title}
            </span>
            {/* Dot */}
            <div
              className="transition-all duration-300 rounded-full"
              style={{
                width: targetLevel === c.level ? "6px" : "4px",
                height: targetLevel === c.level ? "6px" : "4px",
                backgroundColor:
                  targetLevel === c.level
                    ? "rgba(255,255,255,0.9)"
                    : "rgba(255,255,255,0.2)",
                boxShadow: targetLevel === c.level
                  ? "0 0 6px rgba(255,255,255,0.4)"
                  : "none",
              }}
            />
          </button>
        ))}
      </div>

      {/* ── Chapter 3: Technical Tracks Menu ───────────────────────────────── */}
      <div
        className="absolute top-[110px] left-8 z-20 w-[270px] bg-black/40 border border-white/8 backdrop-blur-xl rounded-xl p-4 text-left"
        style={{
          opacity: targetLevel === 3 && chapterVisible ? 1 : 0,
          transform: targetLevel === 3 && chapterVisible ? "translateY(0)" : "translateY(-12px)",
          pointerEvents: targetLevel === 3 ? "auto" : "none",
          transition: "opacity 500ms ease, transform 500ms ease",
        }}
      >
        <div className="text-[8px] font-mono font-bold tracking-[0.25em] text-[#e8a23a]/75 uppercase mb-1.5">
          Tech Tracks Directory
        </div>
        <div className="w-10 h-px bg-[#e8a23a]/30 mb-3" />
        <div className="flex flex-col gap-1.5 max-h-[55vh] overflow-y-auto pr-1 scrollbar-none">
          {TRACKS.map((track) => {
            const active = selectedTrack === track.id;
            return (
              <button
                key={track.id}
                onClick={() => {
                  setSelectedTrack(track.id);
                  setSelectedBlock(null);
                }}
                className={`flex items-start gap-2.5 text-left p-2 rounded transition-all duration-200 border group ${
                  active
                    ? "bg-[#e8a23a]/10 border-[#e8a23a]/30"
                    : "bg-white/[0.01] border-transparent hover:bg-white/[0.04] hover:border-white/5"
                }`}
              >
                <span className="text-[11px] mt-0.5">{track.icon}</span>
                <div className="flex flex-col">
                  <span className={`text-[9.5px] font-semibold tracking-wide transition-colors ${
                    active ? "text-[#e8a23a]" : "text-white/80 group-hover:text-white"
                  }`}>
                    {track.name}
                  </span>
                  <span className="text-[8px] text-white/40 leading-normal mt-0.5 font-light">
                    {track.desc}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Level 11: Full-screen Dark Backdrop Overlay ───────────────────── */}
      <div
        className="pointer-events-none absolute inset-0 z-15 bg-black/75 transition-opacity duration-1000 ease-in-out"
        style={{
          opacity: levelFloat >= 10.5 ? 1 : 0,
        }}
      />

      {/* ── Level 11: Hub Directory & Team Dashboard ──────────────────────── */}
      <div
        className="absolute inset-x-8 top-24 bottom-20 z-25 text-left"
        style={{
          opacity: targetLevel === 11 && chapterVisible ? 1 : 0,
          transform: targetLevel === 11 && chapterVisible ? "translateY(0)" : "translateY(16px)",
          pointerEvents: targetLevel === 11 ? "auto" : "none",
          transition: "opacity 600ms ease, transform 600ms ease",
        }}
      >
        <div className="grid grid-cols-12 gap-6 h-full">
          {/* Column 1: About & Team */}
          <div className="col-span-3 bg-black/40 border border-white/8 backdrop-blur-xl rounded-xl p-5 flex flex-col justify-between overflow-y-auto scrollbar-thin">
            <div>
              <div className="text-[9px] font-mono font-bold tracking-[0.3em] text-[#e8a23a] uppercase mb-1">
                Bits&apos;nBrews
              </div>
              <div className="text-[10px] font-semibold tracking-[0.1em] text-white/30 uppercase mb-4">
                Architecture Explorer
              </div>
              <div className="w-12 h-px bg-[#e8a23a]/30 mb-4" />
              <p className="text-[11px] leading-[1.65] text-white/55 font-light">
                Bits&apos;nBrews is an interactive digital engineering museum. We bridge the gap between dense academic hardware briefs and practical systems design using real-time spatial simulation.
              </p>
            </div>

            <div className="mt-8 border-t border-white/5 pt-4">
              <div className="text-[8px] font-mono font-bold tracking-[0.2em] text-[#e8a23a]/75 uppercase mb-3">
                Development Team
              </div>
              <div className="flex flex-col gap-3">
                <div>
                  <div className="text-[10px] font-semibold text-white/80">Dhruv</div>
                  <div className="text-[8px] font-mono text-white/35 uppercase tracking-wider mt-0.5">
                    Lead Architectural Developer
                  </div>
                </div>
                <div>
                  <div className="text-[10px] font-semibold text-white/80">Gemini Partner</div>
                  <div className="text-[8px] font-mono text-white/35 uppercase tracking-wider mt-0.5">
                    AI Pair Programmer
                  </div>
                </div>
                <div>
                  <div className="text-[10px] font-semibold text-white/80">Parzival Prime</div>
                  <div className="text-[8px] font-mono text-white/35 uppercase tracking-wider mt-0.5">
                    Graphics Director
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Column 2: All Technical Tracks Index */}
          <div className="col-span-4 bg-black/40 border border-white/8 backdrop-blur-xl rounded-xl p-5 flex flex-col overflow-hidden">
            <div className="text-[8px] font-mono font-bold tracking-[0.25em] text-[#e8a23a]/75 uppercase mb-1.5">
              Technical Index Directory
            </div>
            <div className="w-8 h-px bg-[#e8a23a]/30 mb-3" />
            <div className="flex-1 overflow-y-auto pr-1 scrollbar-thin flex flex-col gap-1.5">
              {TRACKS.map((track) => {
                const active = selectedTrack === track.id;
                return (
                  <button
                    key={track.id}
                    onClick={() => setSelectedTrack(track.id)}
                    className={`flex items-start gap-3 text-left p-2.5 rounded transition-all duration-200 border group ${
                      active
                        ? "bg-[#e8a23a]/10 border-[#e8a23a]/30"
                        : "bg-white/[0.01] border-transparent hover:bg-white/[0.04] hover:border-white/5"
                    }`}
                  >
                    <span className="text-[13px] mt-0.5">{track.icon}</span>
                    <div className="flex flex-col">
                      <span className={`text-[10px] font-semibold tracking-wide transition-colors ${
                        active ? "text-[#e8a23a]" : "text-white/80 group-hover:text-white"
                      }`}>
                        {track.name}
                      </span>
                      <span className="text-[8.5px] text-white/40 leading-normal mt-0.5 font-light">
                        {track.desc}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Column 3: Article Content Reader */}
          <div className="col-span-5 bg-black/40 border border-white/8 backdrop-blur-xl rounded-xl p-6 overflow-y-auto scrollbar-thin">
            {selectedTrack ? (
              <div className="text-white/85 text-left transition-all duration-300">
                {parseMarkdown(getTrackArticle(selectedTrack))}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center opacity-40 px-8">
                <span className="text-3xl mb-3">📖</span>
                <div className="text-[10px] font-mono font-bold tracking-[0.2em] uppercase text-[#e8a23a]/80 mb-2">
                  Technical Spec Reader
                </div>
                <p className="text-[9.5px] leading-relaxed max-w-[260px] font-light">
                  Select an architectural technical track from the directory index to read the full specifications and design briefs.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Bottom: progress bar + scroll hint ───────────────────────────── */}
      <div 
        className="absolute bottom-6 left-8 right-8 z-20 flex items-center gap-4 transition-all duration-500"
        style={{
          opacity: targetLevel === 11 ? 0 : 1,
          pointerEvents: targetLevel === 11 ? "none" : "auto",
        }}
      >
        {/* Progress bar */}
        <div className="flex-1 h-px bg-white/[0.07] relative overflow-hidden rounded-full">
          <div
            className="absolute left-0 top-0 h-full bg-white/30 rounded-full transition-all duration-700 ease-in-out"
            style={{ width: `${((targetLevel - 1) / (TOTAL - 1)) * 100}%` }}
          />
        </div>
        {/* Chapter counter */}
        <div className="text-[9px] font-mono text-white/25 tracking-widest shrink-0">
          {String(targetLevel).padStart(2, "0")} / {String(TOTAL).padStart(2, "0")}
        </div>
        {/* Scroll hint — fades after first interaction */}
        <div className="text-[8px] font-mono text-white/20 tracking-[0.2em] uppercase shrink-0">
          ↑ ↓ scroll or arrow keys
        </div>
      </div>
    </div>
  );
}
