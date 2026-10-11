import { useEffect, useState } from "react";

export const useActiveSection = (ids: readonly string[]): string | null => {
  const [active, setActive] = useState<string | null>(ids[0] ?? null);
  const key = ids.join(",");

  useEffect(() => {
    const visible = new Map<string, boolean>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const id = (entry.target as HTMLElement).dataset.section;

          if (id) visible.set(id, entry.isIntersecting);
        }

        const first = key.split(",").find((id) => visible.get(id));

        if (first) setActive(first);
      },
      { rootMargin: "-160px 0px -55% 0px" },
    );

    for (const id of key.split(",")) {
      const element = document.getElementById(`section-${id}`);

      if (element) observer.observe(element);
    }

    return () => observer.disconnect();
  }, [key]);

  return active;
};
