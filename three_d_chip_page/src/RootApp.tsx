import { useEffect, useState } from "react";
import DesktopApp from "./DesktopApp";
import MobileApp from "./MobileApp";

export default function RootApp() {
  const [deviceClass, setDeviceClass] = useState<"desktop" | "mobile">("desktop");
  const [autoDetected, setAutoDetected] = useState(false);

  // One-time detection — use a simple touch + viewport threshold.
  useEffect(() => {
    const hasTouch = "ontouchstart" in window || navigator.maxTouchPoints > 1;
    const small = window.innerWidth < 900 || window.innerHeight < 600;
    if (hasTouch && small) setDeviceClass("mobile");
    else setDeviceClass("desktop");
    setAutoDetected(true);
  }, []);

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-[#08090e] text-white">
      {deviceClass === "desktop" ? <DesktopApp /> : <MobileApp />}

      {/* Render-mode toggle — raised to top so it's always visible */}
      <div className="absolute top-[68px] left-1/2 z-30 -translate-x-1/2 flex flex-col items-center gap-1">
        <div className="flex items-center gap-1 rounded-full border border-white/10 bg-black/55 p-1 shadow-lg shadow-black/40 backdrop-blur-md">
          <span className="pl-2 pr-1 text-[8px] font-semibold uppercase tracking-[0.18em] text-white/30">
            Render
          </span>
          <button
            onClick={() => setDeviceClass("desktop")}
            className={`rounded-full px-3 py-1 text-[10px] font-semibold tracking-wide transition ${
              deviceClass === "desktop"
                ? "bg-amber-300/90 text-black shadow"
                : "text-white/50 hover:text-white/85"
            }`}
            title="Laptops & PCs — full shadows, labels, post-processing"
          >
            💻 Laptop / PC
          </button>
          <button
            onClick={() => setDeviceClass("mobile")}
            className={`rounded-full px-3 py-1 text-[10px] font-semibold tracking-wide transition ${
              deviceClass === "mobile"
                ? "bg-amber-300/90 text-black shadow"
                : "text-white/50 hover:text-white/85"
            }`}
            title="Phones — lightweight render for smooth performance"
          >
            📱 Mobile
          </button>
        </div>
        {autoDetected && (
          <span className="pointer-events-none text-[8px] tracking-widest text-white/20">
            same diagram · {deviceClass === "mobile" ? "optimized for phones" : "full quality"}
          </span>
        )}
      </div>
    </div>
  );
}
