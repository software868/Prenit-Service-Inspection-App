import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { DraftReport, SelectionPath } from "@/lib/types";

interface InspectionStore {
  engineerName: string;
  selection: SelectionPath;
  breadcrumb: string;
  currentDraft: DraftReport | null;
  setEngineerName: (name: string) => void;
  setSelection: (selection: SelectionPath, breadcrumb: string) => void;
  setCurrentDraft: (draft: DraftReport | null) => void;
  clearSelection: () => void;
}

export const useInspectionStore = create<InspectionStore>()(
  persist(
    (set) => ({
      engineerName: "",
      selection: {},
      breadcrumb: "",
      currentDraft: null,
      setEngineerName: (name) => set({ engineerName: name }),
      setSelection: (selection, breadcrumb) => set({ selection, breadcrumb }),
      setCurrentDraft: (draft) => set({ currentDraft: draft }),
      clearSelection: () =>
        set({
          selection: {},
          breadcrumb: "",
          currentDraft: null,
        }),
    }),
    {
      name: "prenit-inspection-store",
      skipHydration: true,
    }
  )
);
