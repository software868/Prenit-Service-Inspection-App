"use client";

import { useEffect, useState } from "react";
import { useInspectionStore } from "@/store/inspection-store";

export function useStoreHydrated() {
  const [hydrated, setHydrated] = useState(
    () => useInspectionStore.persist.hasHydrated()
  );

  useEffect(() => {
    if (hydrated) return;

    const unsub = useInspectionStore.persist.onFinishHydration(() => {
      setHydrated(true);
    });

    if (useInspectionStore.persist.hasHydrated()) {
      setHydrated(true);
    }

    return unsub;
  }, [hydrated]);

  return hydrated;
}
