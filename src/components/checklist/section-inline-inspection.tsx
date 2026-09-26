"use client";

import { InlineCheckRow, StatusLegendHeader } from "@/components/checklist/inline-check-row";
import { PageShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { ProgressBar } from "@/components/ui/progress-bar";
import { useAuth } from "@/hooks/use-auth";
import { withSubmitLocation } from "@/lib/capture-submit-location";
import { isOnline, saveOfflineDraft } from "@/lib/offline";
import type { ChecklistItemResponse, SelectionPath } from "@/lib/types";
import { useInspectionStore } from "@/store/inspection-store";
import { Save, Send } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

export type InspectionGroup = {
  equipmentId: string;
  equipmentName: string;
  items: ChecklistItemResponse[];
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

interface SectionInlineInspectionProps {
  title: string;
  breadcrumbs: { label: string; href?: string }[];
  breadcrumb: string;
  selection: SelectionPath;
  groups: InspectionGroup[];
  initKey: string;
}

export function SectionInlineInspection({
  title,
  breadcrumbs,
  breadcrumb,
  selection,
  groups,
  initKey,
}: SectionInlineInspectionProps) {
  const router = useRouter();
  const { user } = useAuth();
  const { currentDraft, setCurrentDraft, setSelection, clearSelection } = useInspectionStore();
  const [responses, setResponses] = useState<ChecklistItemResponse[]>([]);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [reportId, setReportId] = useState<string | undefined>();
  const [highlightIncomplete, setHighlightIncomplete] = useState(false);
  const initializedRef = useRef<string | null>(null);

  useEffect(() => {
    if (groups.length === 0) {
      setResponses([]);
      initializedRef.current = null;
      return;
    }

    const templateItems = groups.flatMap((group) => group.items);
    setResponses((prev) => {
      const shouldReset = initializedRef.current !== initKey || prev.length === 0;
      initializedRef.current = initKey;

      return templateItems.map((item) => {
        const existing = prev.find(
          (row) => row.checklistItemId === item.checklistItemId || row.name === item.name
        );
        const fromDraft =
          currentDraft?.responses?.length &&
          currentDraft.path.sectionId === selection.sectionId &&
          !currentDraft.path.locationId
            ? currentDraft.responses.find(
                (row) => row.checklistItemId === item.checklistItemId || row.name === item.name
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

        if (fromDraft) return { ...item, ...fromDraft, name: item.name };
        return item;
      });
    });

    if (
      currentDraft?.id &&
      currentDraft.path.sectionId === selection.sectionId &&
      !currentDraft.path.locationId
    ) {
      setReportId(currentDraft.id);
    }
  }, [groups, initKey, currentDraft, selection.sectionId]);

  useEffect(() => {
    if (!selection.equipmentId || !breadcrumb) return;
    setSelection(selection, breadcrumb);
  }, [selection, breadcrumb, setSelection]);

  const activeEngineerName = user?.name?.trim() || "";
  const completedCount = responses.filter((row) => isMarked(row.status)).length;
  const incompleteItems = responses.filter((row) => !isMarked(row.status));

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

    const incomplete = responses.filter((row) => !isMarked(row.status));
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
      if (!isOnline()) {
        saveOfflineDraft({
          ...(await withSubmitLocation(buildPayload("SUBMITTED"))),
          path: selection,
          status: "SUBMITTED",
        });
        setMessage("Saved offline. Will sync when back online.");
        return;
      }

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
      clearSelection();
      router.push(`/reports/${saved.id}/success`);
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
      breadcrumbs={breadcrumbs}
      title={title}
      subtitle={
        user?.name
          ? `Inspector: ${user.name} — tap ✓ or ✕ for each item`
          : "Tap ✓ or ✕ for each item — add a remark only if needed"
      }
    >
      <div className="mb-4">
        <ProgressBar current={completedCount} total={responses.length} label="Checklist Progress" />
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <StatusLegendHeader />
        {groups.map((group) => (
          <div key={group.equipmentId}>
            {group.items.length > 1 ? (
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
        ))}
      </div>

      {incompleteItems.length > 0 ? (
        <p className="mt-3 text-center text-sm font-medium text-orange-600">
          {incompleteItems.length} item{incompleteItems.length === 1 ? "" : "s"} still unmarked
        </p>
      ) : null}

      {message ? (
        <div
          className={`mt-4 rounded-xl px-4 py-3 text-sm font-medium ${
            message.includes("success") || message.includes("saved")
              ? "bg-emerald-50 text-emerald-700"
              : "bg-orange-50 text-orange-700"
          }`}
        >
          {message}
        </div>
      ) : null}

      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 bg-white/95 px-4 py-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))] backdrop-blur">
        <div className="mx-auto flex max-w-3xl gap-2 lg:max-w-5xl">
          <Button variant="outline" size="sm" className="flex-1" onClick={handleSaveDraft} loading={saving}>
            <Save className="h-4 w-4" />
            Save Draft
          </Button>
          <Button variant="secondary" size="sm" className="flex-1" onClick={handleSubmit} loading={submitting}>
            <Send className="h-4 w-4" />
            Submit
          </Button>
        </div>
      </div>
    </PageShell>
  );
}
