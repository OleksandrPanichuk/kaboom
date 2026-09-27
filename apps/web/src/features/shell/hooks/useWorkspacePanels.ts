import { createContext, useContext } from "react";

export interface WorkspacePanels {
  closePanels: () => void;
}

export const WorkspacePanelsContext = createContext<WorkspacePanels>({
  closePanels: () => undefined,
});

export const useWorkspacePanels = (): WorkspacePanels =>
  useContext(WorkspacePanelsContext);
