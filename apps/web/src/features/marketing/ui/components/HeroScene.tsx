import { cn } from "cn";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useEffect, useRef, useState } from "react";

const supportsWebGL = (): boolean => {
  try {
    return Boolean(document.createElement("canvas").getContext("webgl2"));
  } catch {
    return false;
  }
};

export function HeroScene() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const element = canvas.current;

    if (!element || !supportsWebGL()) return;

    gsap.registerPlugin(ScrollTrigger);

    let cancelled = false;
    let dispose: (() => void) | undefined;
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    void import("@/features/marketing/utils/networkScene.lazy").then(
      ({ createNetworkScene }) => {
        if (cancelled) return;

        const scene = createNetworkScene(element, {
          reducedMotion,
          onFirstFrame: () => setReady(true),
        });
        const trigger = ScrollTrigger.create({
          trigger: element.parentElement,
          start: "top top",
          end: "bottom top",
          scrub: true,
          onUpdate: (self) => scene.setScroll(self.progress),
        });

        dispose = () => {
          trigger.kill();
          scene.dispose();
        };
      },
    );

    return () => {
      cancelled = true;
      dispose?.();
    };
  }, []);

  return (
    <canvas
      ref={canvas}
      aria-hidden="true"
      className={cn(
        "absolute inset-0 size-full transition-opacity duration-[1500ms] ease-out",
        ready ? "opacity-100" : "opacity-0",
      )}
    />
  );
}
