import type { Layout } from "react-resizable-panels";
import { create } from "zustand";
import { persist } from "zustand/middleware";

interface WorkspaceState {
  layout: Layout | undefined;
  setLayout: (layout: Layout) => void;
}

export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set) => ({
      layout: undefined,
      setLayout: (layout) => set({ layout }),
    }),
    {
      name: "kaboom:workspace",
      partialize: ({ layout }) => ({ layout }),
    },
  ),
);
