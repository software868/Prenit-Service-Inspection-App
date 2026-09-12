type ChecklistItemRecord = {
  id: string;
  name: string;
  slug: string;
  order: number;
  parentId?: string | null;
};

export function nestChecklistItems<T extends ChecklistItemRecord>(items: T[]) {
  const parents = items
    .filter((item) => !item.parentId)
    .sort((a, b) => a.order - b.order);

  const childrenByParent = items
    .filter((item) => item.parentId)
    .reduce<Record<string, T[]>>((acc, item) => {
      const parentId = item.parentId!;
      if (!acc[parentId]) acc[parentId] = [];
      acc[parentId].push(item);
      return acc;
    }, {});

  return parents.map((parent) => ({
    ...parent,
    children: (childrenByParent[parent.id] || [])
      .sort((a, b) => a.order - b.order)
      .map(({ id, name, slug, order }) => ({ id, name, slug, order })),
  }));
}

export function nestEquipmentChecklist<
  T extends {
    checklistItems: ChecklistItemRecord[];
  },
>(equipment: T[]) {
  return equipment.map((eq) => ({
    ...eq,
    checklistItems: nestChecklistItems(eq.checklistItems),
  }));
}

export function selectNamedCatalog<T extends { name: string }>(
  existing: T[],
  catalogNames: readonly string[]
): T[] {
  const byName = new Map(existing.map((item) => [item.name, item]));
  return catalogNames.flatMap((name) => {
    const match = byName.get(name);
    return match ? [match] : [];
  });
}

export function mergeNamedCatalog<T extends { id: string; name: string }>(
  existing: T[],
  catalogNames: readonly string[],
  makeMissing: (name: string, index: number) => T
): T[] {
  const byName = new Map(existing.map((item) => [item.name, item]));
  return catalogNames.map((name, index) => byName.get(name) ?? makeMissing(name, index));
}
