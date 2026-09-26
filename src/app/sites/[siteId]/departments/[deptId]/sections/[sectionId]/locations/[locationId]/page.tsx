"use client";

import { InlineCheckRow, StatusLegendHeader } from "@/components/checklist/inline-check-row";
import { PageShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { ProgressBar } from "@/components/ui/progress-bar";
import {
  findDepartment,
  findLocation,
  findSection,
  findSite,
  useHierarchy,
} from "@/hooks/use-hierarchy";
import { useAuth } from "@/hooks/use-auth";
import { getExcelMotHeading } from "@/lib/excel-mot-checklist";
import { getInspectionBreadcrumb, getNavBreadcrumbs } from "@/lib/extra-sites";
import { usesExcelChecklists } from "@/lib/site-checklists";
import { mergeNamedCatalog } from "@/lib/hierarchy-utils";
import { withSubmitLocation } from "@/lib/capture-submit-location";
import { isOnline, saveOfflineDraft } from "@/lib/offline";
import { getMotDetailedChecklistItems, getMotEquipmentNames } from "@/lib/site-checklists";
import type { ChecklistItemResponse, SelectionPath } from "@/lib/types";
import { slugify } from "@/lib/utils";
import { useInspectionStore } from "@/store/inspection-store";
import { Save, Send } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

type EquipmentGroup = {
  equipmentId: string;
  equipmentName: string;
  items: ChecklistItemResponse[];
  showHeading?: boolean;
};

function isMarked(status: ChecklistItemResponse["status"]) {
  return status === "OK" || status === "NOT_OK";
}

function scrollToChecklistItem(checklistItemId: string) {
  const el = document.getElementById(`check-item-${checklistItemId}`);
  if (!el) return;
  el.scrollIntoView({ behavior: "smooth", block: "center" });
  el.classList.add("ring-2", "ring-orange-400", "ring-offset-2");
  window.setTimeout(() => {
    el.classList.remove("ring-2", "ring-orange-400", "ring-offset-2");
  }, 1800);
}

export default function LocationPage() {
  const params = useParams();
  const router = useRouter();
  const siteId = params.siteId as string;
  const deptId = params.deptId as string;
  const sectionId = params.sectionId as string;
  const locationId = params.locationId as string;
  const { data } = useHierarchy();
  const { user } = useAuth();
  const {
    currentDraft,
    setCurrentDraft,
    setSelection,
    clearSelection,
  } = useInspectionStore();

  const site = findSite(data, siteId);
  const department = findDepartment(data, siteId, deptId);
  const section = findSection(data, siteId, deptId, sectionId);
  const location = findLocation(data, siteId, deptId, sectionId, locationId);

  const [responses, setResponses] = useState<ChecklistItemResponse[]>([]);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [reportId, setReportId] = useState<string | undefined>();
  const [highlightIncomplete, setHighlightIncomplete] = useState(false);
  const initializedLocationRef = useRef<string | null>(null);

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
      const excel = usesExcelChecklists(site?.slug, site?.name);
      const heading = excel ? getExcelMotHeading(equipment.name) : equipment.name;

      const hasLetteredPoints = detailed.some((item) => /^\s*[a-z]\.\s/i.test(item.name));
      const items =
        detailed.length > 0
          ? detailed.map((item) => ({
              ...item,
              name: excel || detailed.length > 1 ? item.name : equipment.name,
            }))
          : [
              {
                checklistItemId: equipment.id,
                name: heading,
                status: null,
                remarks: "",
              },
            ];

      return {
        equipmentId: equipment.id,
        equipmentName: heading,
        items,
        showHeading: excel ? hasLetteredPoints : detailed.length > 1,
      };
    });
  }, [checklistItems, site?.name, site?.slug]);

  // preserve already marked answers so Submit enable state is not wiped.
  useEffect(() => {
    if (!otEquipment || groups.length === 0) {
      setResponses([]);
      initializedLocationRef.current = null;
      return;
    }

    const locationKey = `${locationId}:${otEquipment.id}:${groups.length}`;
    const templateItems = groups.flatMap((group) => group.items);

    setResponses((prev) => {
      const shouldReset =
        initializedLocationRef.current !== locationKey || prev.length === 0;

      initializedLocationRef.current = locationKey;

      return templateItems.map((item) => {
        const existing = prev.find(
          (r) => r.checklistItemId === item.checklistItemId || r.name === item.name
        );
        const fromDraft =
          currentDraft?.responses?.length &&
          (currentDraft.path.locationId === locationId ||
            currentDraft.path.equipmentId === otEquipment.id)
            ? currentDraft.responses.find(
                (r) =>
                  r.checklistItemId === item.checklistItemId || r.name === item.name
              )
            : undefined;

        if (!shouldReset && existing) {
          return {
            ...item,
            status: existing.status,
            remarks: existing.remarks,
            photoData: existing.photoData,
            audioData: existing.audioData,
            photoFileName: existing.photoFileName,
            audioFileName: existing.audioFileName,
          };
        }

        if (fromDraft) {
          return { ...item, ...fromDraft, name: item.name };
        }

        return item;
      });
    });

    if (
      currentDraft?.id &&
      (currentDraft.path.locationId === locationId ||
        currentDraft.path.equipmentId === otEquipment.id)
    ) {
      setReportId(currentDraft.id);
    }
  }, [groups, otEquipment, currentDraft, locationId]);

  useEffect(() => {
    if (!selection.equipmentId || !breadcrumb) return;
    setSelection(selection, breadcrumb);
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

  const activeEngineerName = user?.name?.trim() || "";
  const completedCount = responses.filter((r) => isMarked(r.status)).length;
  const incompleteItems = responses.filter((r) => !isMarked(r.status));
  const incompleteCount = incompleteItems.length;

  const updateResponse = (checklistItemId: string, updates: Partial<ChecklistItemResponse>) => {
    setHighlightIncomplete(false);
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
      setMessage("Please login again. Your name could not be loaded.");
      return;
    }
    if (!selection.equipmentId) {
      setMessage("Equipment not found for this location.");
      return;
    }

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
      setMessage("Please login again. Your name could not be loaded.");
      return;
    }
    if (!selection.equipmentId) {
      setMessage("Equipment not found for this location.");
      return;
    }

    const incomplete = responses.filter((r) => !isMarked(r.status));
    if (incomplete.length > 0) {
      setHighlightIncomplete(true);
      setMessage(
        `Mark OK or Not OK on ${incomplete.length} remaining item${incomplete.length === 1 ? "" : "s"}. Remark is optional.`
      );
      scrollToChecklistItem(incomplete[0].checklistItemId);
      return;
    }

    setSubmitting(true);
    setMessage("");
    setHighlightIncomplete(false);

    try {
      if (isOnline()) {
        const res = await fetch("/api/reports", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(await withSubmitLocation(buildPayload("SUBMITTED"))),
        });

        if (!res.ok) {
          const failed = await res.json().catch(() => ({}));
          throw new Error(failed.error || "Submit failed");
        }

        const saved = await res.json();
        setReportId(saved.id);
        clearSelection();
        router.push(`/reports/${saved.id}/success`);
      } else {
        saveOfflineDraft({
          ...(await withSubmitLocation(buildPayload("SUBMITTED"))),
          path: selection,
          status: "SUBMITTED",
        });
        setMessage("Saved offline. Will sync when back online.");
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to submit. Try saving as draft.");
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
      subtitle={
        user?.name
          ? `Inspector: ${user.name} — tap ✓ or ✕ for each item`
          : "Tap ✓ or ✕ for each item — add remark only if needed"
      }
    >
      <div className="mb-4">
        <ProgressBar
          current={completedCount}
          total={responses.length}
          label="Checklist Progress"
        />
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <StatusLegendHeader />

        {groups.map((group) => {
          const showGroupHeader = group.showHeading ?? group.items.length > 1;

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
                    highlightMissing={highlightIncomplete && !isMarked(item.status)}
                    onChange={(updates) => updateResponse(item.checklistItemId, updates)}
                  />
                );
              })}
            </div>
          );
        })}
      </div>

      {incompleteCount > 0 && (
        <p className="mt-3 text-center text-sm font-medium text-orange-600">
          {incompleteCount} item{incompleteCount === 1 ? "" : "s"} still unmarked
        </p>
      )}

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
