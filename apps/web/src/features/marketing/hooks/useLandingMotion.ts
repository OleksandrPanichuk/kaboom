import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { type RefObject, useLayoutEffect } from "react";

const tiltOn = (element: HTMLElement, strength: number) => {
  const move = (event: PointerEvent) => {
    const box = element.getBoundingClientRect();
    const x = (event.clientX - box.left) / box.width - 0.5;
    const y = (event.clientY - box.top) / box.height - 0.5;

    gsap.to(element, {
      rotateY: x * strength,
      rotateX: -y * strength,
      transformPerspective: 900,
      duration: 0.5,
      ease: "power3.out",
    });
  };
  const leave = () => {
    gsap.to(element, {
      rotateX: 0,
      rotateY: 0,
      duration: 0.8,
      ease: "power3.out",
    });
  };

  element.addEventListener("pointermove", move);
  element.addEventListener("pointerleave", leave);

  return () => {
    element.removeEventListener("pointermove", move);
    element.removeEventListener("pointerleave", leave);
  };
};

export const useLandingMotion = (root: RefObject<HTMLElement | null>) => {
  useLayoutEffect(() => {
    const scope = root.current;

    if (!scope) return;

    gsap.registerPlugin(ScrollTrigger);

    const media = gsap.matchMedia(scope);

    media.add("(prefers-reduced-motion: no-preference)", () => {
      gsap.from("[data-word]", {
        yPercent: 115,
        duration: 1.1,
        ease: "expo.out",
        stagger: 0.07,
        delay: 0.1,
      });
      gsap.from("[data-hero]", {
        y: 24,
        autoAlpha: 0,
        filter: "blur(8px)",
        duration: 1,
        ease: "power3.out",
        stagger: 0.09,
        delay: 0.45,
      });
      gsap.from("[data-hero-visual]", {
        y: 48,
        autoAlpha: 0,
        scale: 0.95,
        duration: 1.4,
        ease: "expo.out",
        delay: 0.55,
      });
      gsap.to("[data-hero-visual]", {
        yPercent: -10,
        ease: "none",
        scrollTrigger: {
          trigger: "[data-hero-section]",
          start: "top top",
          end: "bottom top",
          scrub: true,
        },
      });

      gsap.set("[data-reveal]", { autoAlpha: 0, y: 40 });
      ScrollTrigger.batch("[data-reveal]", {
        start: "top 88%",
        once: true,
        onEnter: (elements) =>
          gsap.to(elements, {
            autoAlpha: 1,
            y: 0,
            duration: 0.9,
            ease: "power3.out",
            stagger: 0.08,
            overwrite: true,
          }),
      });

      gsap.fromTo(
        "[data-steps-progress]",
        { scaleX: 0 },
        {
          scaleX: 1,
          ease: "none",
          scrollTrigger: {
            trigger: "[data-steps]",
            start: "top 80%",
            end: "bottom 55%",
            scrub: 0.6,
          },
        },
      );

      gsap.utils.toArray<HTMLElement>("[data-highlight]").forEach((element) => {
        gsap.to(element.querySelectorAll("[data-highlight-word]"), {
          color: "var(--foreground)",
          stagger: 0.1,
          ease: "none",
          scrollTrigger: {
            trigger: element,
            start: "top 80%",
            end: "bottom 45%",
            scrub: 0.5,
          },
        });
      });

      gsap.from("[data-grow]", {
        scaleX: 0,
        transformOrigin: "left center",
        duration: 1.2,
        ease: "expo.out",
        stagger: 0.08,
        scrollTrigger: { trigger: "[data-grow]", start: "top 85%", once: true },
      });

      gsap.utils.toArray<HTMLElement>("[data-count]").forEach((element) => {
        const target = Number(element.dataset.count);
        const counter = { value: 0 };

        gsap.to(counter, {
          value: target,
          duration: 1.6,
          ease: "power2.out",
          scrollTrigger: { trigger: element, start: "top 90%", once: true },
          onUpdate: () => {
            element.textContent = String(Math.round(counter.value));
          },
        });
      });
    });

    media.add(
      "(prefers-reduced-motion: no-preference) and (pointer: fine)",
      () => {
        const cleanups = [
          ...gsap.utils
            .toArray<HTMLElement>("[data-tilt]")
            .map((element) => tiltOn(element, 6)),
          ...gsap.utils
            .toArray<HTMLElement>("[data-tilt-soft]")
            .map((element) => tiltOn(element, 3)),
        ];

        return () => cleanups.forEach((cleanup) => cleanup());
      },
    );

    return () => media.revert();
  }, [root]);
};
