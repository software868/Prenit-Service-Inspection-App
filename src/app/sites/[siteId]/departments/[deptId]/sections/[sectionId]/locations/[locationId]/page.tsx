"use client";

import { InlineCheckRow } from "@/components/checklist/inline-check-row";
import { PageShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ProgressBar } from "@/components/ui/progress-bar";
import {
  findDepartment,
  findLocation,
  findSection,
  findSite,
  useHierarchy,
} from "@/hooks/use-hierarchy";
import { getInspectionBreadcrumb, getNavBreadcrumbs } from "@/lib/extra-sites";
import { mergeNamedCatalog } from "@/lib/hierarchy-utils";
import { isOnline, saveOfflineDraft } from "@/lib/offline";
import { getMotDetailedChecklistItems, getMotEquipmentNames } from "@/lib/site-checklists";
import type { ChecklistItemResponse, SelectionPath } from "@/lib/types";
import { slugify } from "@/lib/utils";
import { useInspectionStore } from "@/store/inspection-store";
import { Save, Send } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type EquipmentGroup = {
  equipmentId: string;
  equipmentName: string;
  items: ChecklistItemResponse[];
};

export default function LocationPage() {
  const params = useParams();
  const router = useRouter();
  const siteId = params.siteId as string;
  const deptId = params.deptId as string;
  const sectionId = params.sectionId as string;
  const locationId = params.locationId as string;
  const { data } = useHierarchy();
  const {
    engineerName: storeEngineerName,
    setEngineerName,
    currentDraft,
    setCurrentDraft,
    setSelection,
    clearSelection,
  } = useInspectionStore();

  const site = findSite(data, siteId);
  const department = findDepartment(data, siteId, deptId);
  const section = findSection(data, siteId, deptId, sectionId);
  const location = findLocation(data, siteId, deptId, sectionId, locationId);

  const [localEngineerName, setLocalEngineerName] = useState(storeEngineerName);
  const [responses, setResponses] = useState<ChecklistItemResponse[]>([]);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [reportId, setReportId] = useState<string | undefined>();

  const otEquipment = useMemo(() => {
    const equipment =
      section?.equipment.filter((e) => e.locationId === locationId) || [];
    return equipment[0] ?? null;
  }, [section?.equipment, locationId]);

  const checklistItems = useMemo(
    () =>
      mergeNamedCatalog(
        [...(otEquipment?.checklistItems || [])].sort((a, b) => a.order - b.order),
        getMotEquipmentNames(site?.slug, site?.name),
        (name, index) => ({
          id: `${otEquipment?.id || "ot"}--${slugify(name)}`,
          name,
          slug: slugify(name),
          order: index + 1,
        })
      ),
    [otEquipment, site?.name, site?.slug]
  );

  const breadcrumb = useMemo(() => {
    if (!site || !department || !section || !location) return "";
    return getInspectionBreadcrumb({
      siteName: site.name,
      departmentName: department.name,
      departmentSlug: department.slug,
      rest: [section.name, location.name],
    });
  }, [site, department, section, location]);

  const selection: SelectionPath = useMemo(
    () => ({
      siteId,
      siteName: site?.name,
      siteSlug: site?.slug,
      departmentId: deptId,
      departmentName: department?.name,
      departmentSlug: department?.slug,
      sectionId,
      sectionName: section?.name,
      sectionSlug: section?.slug,
      locationId,
      locationName: location?.name,
      locationSlug: location?.slug,
      equipmentId: otEquipment?.id,
      equipmentName: otEquipment?.name,
    }),
    [
      siteId,
      deptId,
      sectionId,
      locationId,
      site,
      department,
      section,
      location,
      otEquipment,
    ]
  );

  const groups = useMemo((): EquipmentGroup[] => {
    return checklistItems.map((equipment) => {
      const detailed = getMotDetailedChecklistItems(
        equipment.id,
        equipment.name,
        site?.slug,
        site?.name
      );

      const items =
        detailed.length > 0
          ? detailed.map((item) => ({
              ...item,
              // Single sub-check: show equipment name as the row title
              name: detailed.length === 1 ? equipment.name : item.name,
            }))
          : [
              {
                checklistItemId: equipment.id,
                name: equipment.name,
                status: null,
                remarks: "",
              },
            ];

      return {
        equipmentId: equipment.id,
        equipmentName: equipment.name,
        items,
      };
    });
  }, [checklistItems, site?.name, site?.slug]);

  useEffect(() => {
    if (storeEngineerName && !localEngineerName) {
      setLocalEngineerName(storeEngineerName);
    }
  }, [storeEngineerName, localEngineerName]);

  useEffect(() => {
    if (!otEquipment || groups.length === 0) {
      setResponses([]);
      return;
    }

    let items = groups.flatMap((group) => group.items);

    if (currentDraft?.responses?.length) {
      const draftMatchesLocation =
        currentDraft.path.locationId === locationId ||
        currentDraft.path.equipmentId === otEquipment.id;

      if (draftMatchesLocation) {
        items = items.map((item) => {
          const saved = currentDraft.responses.find(
            (r) => r.checklistItemId === item.checklistItemId || r.name === item.name
          );
          return saved ? { ...item, ...saved, name: item.name } : item;
        });
        setReportId(currentDraft.id);
      }
    }

    setResponses(items);
  }, [groups, otEquipment, currentDraft, locationId]);

  useEffect(() => {
    if (!selection.equipmentId || !breadcrumb) return;
    setSelection(selection, breadcrumb);
    // Only sync when location / equipment identity changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    selection.siteId,
    selection.departmentId,
    selection.sectionId,
    selection.locationId,
    selection.equipmentId,
    breadcrumb,
    setSelection,
  ]);

  const activeEngineerName = localEngineerName.trim() || storeEngineerName.trim();
  const completedCount = responses.filter((r) => r.status !== null).length;

  const updateResponse = (checklistItemId: string, updates: Partial<ChecklistItemResponse>) => {
    setResponses((prev) =>
      prev.map((item) =>
        item.checklistItemId === checklistItemId ? { ...item, ...updates } : item
      )
    );
  };

  const buildPayload = (status: "DRAFT" | "SUBMITTED") => ({
    id: reportId,
    siteId: selection.siteId!,
    siteSlug: selection.siteSlug,
    siteName: selection.siteName,
    departmentId: selection.departmentId!,
    departmentSlug: selection.departmentSlug,
    departmentName: selection.departmentName,
    sectionId: selection.sectionId!,
    sectionSlug: selection.sectionSlug,
    sectionName: selection.sectionName,
    locationId: selection.locationId,
    locationSlug: selection.locationSlug,
    locationName: selection.locationName,
    equipmentId: selection.equipmentId!,
    engineerName: activeEngineerName,
    breadcrumb,
    status,
    responses,
  });

  const handleSaveDraft = async () => {
    if (!activeEngineerName) {
      setMessage("Please enter your engineer name before saving.");
      return;
    }
    if (!selection.equipmentId) {
      setMessage("Equipment not found for this location.");
      return;
    }

    setEngineerName(activeEngineerName);
    setSaving(true);
    setMessage("");

    const draft = {
      id: reportId,
      path: selection,
      breadcrumb,
      engineerName: activeEngineerName,
      responses,
      status: "DRAFT" as const,
    };

    saveOfflineDraft(draft);
    setCurrentDraft(draft);

    if (isOnline()) {
      try {
        const res = await fetch("/api/reports", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(buildPayload("DRAFT")),
        });
        if (res.ok) {
          const saved = await res.json();
          setReportId(saved.id);
          setMessage("Draft saved successfully!");
        } else {
          setMessage("Draft saved locally (offline backup)");
        }
      } catch {
        setMessage("Draft saved locally (offline)");
      }
    } else {
      setMessage("Draft saved locally (offline)");
    }

    setSaving(false);
  };

  const handleSubmit = async () => {
    if (!activeEngineerName) {
      setMessage("Please enter your engineer name before submitting.");
      return;
    }
    if (!selection.equipmentId) {
      setMessage("Equipment not found for this location.");
      return;
    }

    const incomplete = responses.filter((r) => r.status === null);
    if (incomplete.length > 0) {
      setMessage(`Please complete all items. ${incomplete.length} remaining.`);
      return;
    }

    setEngineerName(activeEngineerName);
    setSubmitting(true);
    setMessage("");

    try {
      if (isOnline()) {
        const res = await fetch("/api/reports", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(buildPayload("SUBMITTED")),
        });

        if (!res.ok) throw new Error("Submit failed");

        const saved = await res.json();
        setReportId(saved.id);
        clearSelection();
        router.push(`/reports/${saved.id}/success`);
      } else {
        saveOfflineDraft({
          ...buildPayload("SUBMITTED"),
          path: selection,
          status: "SUBMITTED",
        });
        setMessage("Saved offline. Will sync when back online.");
      }
    } catch {
      setMessage("Failed to submit. Try saving as draft.");
    } finally {
      setSubmitting(false);
    }
  };

  const responseById = useMemo(() => {
    const map = new Map<string, ChecklistItemResponse>();
    responses.forEach((item) => map.set(item.checklistItemId, item));
    return map;
  }, [responses]);

  return (
    <PageShell
      padBottom
      breadcrumbs={getNavBreadcrumbs({
        siteId,
        siteName: site?.name,
        departmentId: deptId,
        departmentName: department?.name,
        departmentSlug: department?.slug,
        section: section ? { id: sectionId, name: section.name } : undefined,
        current: location?.name || "Location",
      })}
      title={`${location?.name || "OT"} Inspection`}
      subtitle="Mark OK / Not OK — add remark only if needed"
    >
      <div className="mb-6 space-y-4">
        <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
          <Input
            label="Engineer Name"
            placeholder="Enter your name"
            value={localEngineerName}
            onChange={(e) => setLocalEngineerName(e.target.value)}
          />
        </div>

        <ProgressBar
          current={completedCount}
          total={responses.length}
          label="Checklist Progress"
        />
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {groups.map((group) => {
          const showGroupHeader = group.items.length > 1;

          return (
            <div key={group.equipmentId}>
              {showGroupHeader ? (
                <div className="border-b border-slate-100 bg-slate-50 px-3 py-1.5">
                  <h2 className="text-xs font-bold uppercase tracking-wide text-slate-500">
                    {group.equipmentName}
                  </h2>
                </div>
              ) : null}

              {group.items.map((template) => {
                const item = responseById.get(template.checklistItemId) || template;
                return (
                  <InlineCheckRow
                    key={item.checklistItemId}
                    item={item}
                    onChange={(updates) => updateResponse(item.checklistItemId, updates)}
                  />
                );
              })}
            </div>
          );
        })}
      </div>

      {message && (
        <div
          className={`mt-4 rounded-xl px-4 py-3 text-sm font-medium ${
            message.includes("success") || message.includes("saved")
              ? "bg-emerald-50 text-emerald-700"
              : "bg-orange-50 text-orange-700"
          }`}
        >
          {message}
        </div>
      )}

      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 bg-white/95 px-4 py-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))] backdrop-blur">
        <div className="mx-auto flex max-w-3xl gap-2 lg:max-w-5xl">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={handleSaveDraft}
            loading={saving}
          >
            <Save className="h-4 w-4" />
            Save Draft
          </Button>
          <Button
            variant="secondary"
            size="sm"
            className="flex-1"
            onClick={handleSubmit}
            loading={submitting}
          >
            <Send className="h-4 w-4" />
            Submit
          </Button>
        </div>
      </div>
    </PageShell>
  );
}
