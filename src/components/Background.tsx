// THEME HOOK: to swap this component, replace Background.tsx only — no other files change

import { useEffect, useRef } from "react";

const SKIP = 'button, input, textarea, select, a, label, [role="button"]';
const randomHex = () => "#" + Math.floor(Math.random() * 16777215).toString(16).padStart(6, "0");
const randomColors = (n: number) => Array.from({ length: n }, randomHex);

export default function Background() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const tubesRef = useRef<any>(null);

  useEffect(() => {
    let mounted = true;
    if (!canvasRef.current) return;

    (async () => {
      try {
        // @ts-ignore
        const mod = await import(/* @vite-ignore */ "https://cdn.jsdelivr.net/npm/threejs-components@0.0.19/build/cursors/tubes1.min.js");
        if (!mounted) return;
        tubesRef.current = mod.default(canvasRef.current!, {
          tubes: {
            colors: ["#f967fb", "#53bc28", "#6958d5"],
            lights: { intensity: 200, colors: ["#83f36e", "#fe8a2e", "#ff008a", "#60aed5"] },
          },
        });
      } catch {
        // WebGL unavailable — canvas stays black, app still functional
      }
    })();

    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if ((e.target as Element).closest(SKIP)) return;
      if (!tubesRef.current) return;
      tubesRef.current.tubes.setColors(randomColors(3));
      tubesRef.current.tubes.setLightsColors(randomColors(4));
    };
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed",
        inset: 0,
        width: "100%",
        height: "100%",
        zIndex: 0,
        display: "block",
        touchAction: "none",
        pointerEvents: "none",
      }}
    />
  );
}
