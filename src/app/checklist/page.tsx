"use client";

import { ChecklistItemForm } from "@/components/checklist/checklist-item-form";
import { PageShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ProgressBar } from "@/components/ui/progress-bar";
import { hasValidSelection, parseChecklistParams, buildBreadcrumbNavItems } from "@/lib/checklist-navigation";
import { isOnline, saveOfflineDraft } from "@/lib/offline";
import { resolveChecklistItems } from "@/lib/resolve-checklist-items";
import type { ChecklistItemResponse, SelectionPath } from "@/lib/types";
import { useInspectionStore } from "@/store/inspection-store";
import { Loader2, Save, Send } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState, Suspense } from "react";

function ChecklistPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    engineerName: storeEngineerName,
    setEngineerName,
    currentDraft,
    setCurrentDraft,
    setSelection,
    clearSelection,
  } = useInspectionStore();

  const urlData = useMemo(
    () => parseChecklistParams(searchParams),
    [searchParams]
  );

  const selection: SelectionPath | null = urlData?.selection ?? null;
  const breadcrumb = urlData?.breadcrumb ?? "";
  const engineerName = urlData?.engineerName || storeEngineerName;
  const [localEngineerName, setLocalEngineerName] = useState(engineerName);

  const [responses, setResponses] = useState<ChecklistItemResponse[]>([]);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [reportId, setReportId] = useState<string | undefined>();

  useEffect(() => {
    if (urlData) {
      setSelection(urlData.selection, urlData.breadcrumb);
      if (urlData.engineerName) {
        setEngineerName(urlData.engineerName);
        setLocalEngineerName(urlData.engineerName);
      }
    }
  }, [urlData, setSelection, setEngineerName]);

  useEffect(() => {
    if (storeEngineerName && !localEngineerName) {
      setLocalEngineerName(storeEngineerName);
    }
  }, [storeEngineerName, localEngineerName]);

  useEffect(() => {
    if (!urlData || !hasValidSelection(urlData.selection)) {
      setResponses([]);
      return;
    }

    let items = resolveChecklistItems(urlData.selection);
    if (currentDraft?.responses?.length) {
      items = items.map((item) => {
        const saved = currentDraft.responses.find(
          (r) => r.checklistItemId === item.checklistItemId || r.name === item.name
        );
        return saved ? { ...item, ...saved } : item;
      });
      setReportId(currentDraft.id);
    }
    setResponses(items);
  }, [urlData, currentDraft]);

  const activeEngineerName = localEngineerName.trim() || engineerName.trim();
  const completedCount = responses.filter((r) => r.status !== null).length;

  const updateResponse = (index: number, updates: Partial<ChecklistItemResponse>) => {
    setResponses((prev) =>
      prev.map((item, i) => (i === index ? { ...item, ...updates } : item))
    );
  };

  const buildPayload = (status: "DRAFT" | "SUBMITTED") => ({
    id: reportId,
    siteId: selection!.siteId!,
    siteSlug: selection!.siteSlug,
    siteName: selection!.siteName,
    departmentId: selection!.departmentId!,
    departmentSlug: selection!.departmentSlug,
    departmentName: selection!.departmentName,
    sectionId: selection!.sectionId!,
    sectionSlug: selection!.sectionSlug,
    sectionName: selection!.sectionName,
    locationId: selection!.locationId,
    locationSlug: selection!.locationSlug,
    locationName: selection!.locationName,
    equipmentId: selection!.equipmentId!,
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

    setEngineerName(activeEngineerName);
    setSaving(true);
    setMessage("");

    const draft = {
      id: reportId,
      path: selection!,
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
          path: selection!,
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

  if (!selection || !hasValidSelection(selection)) {
    return (
      <PageShell title="Invalid checklist link">
        <p className="text-slate-600">
          Could not load this inspection. Please start again from the home page.
        </p>
        <Button className="mt-4" onClick={() => router.push("/")}>
          Go to Home
        </Button>
      </PageShell>
    );
  }

  if (responses.length === 0) {
    return (
      <PageShell title="Checklist not found" subtitle={breadcrumb}>
        <p className="text-slate-600">Unable to load checklist items. Please try again.</p>
        <Button className="mt-4" onClick={() => router.back()}>
          Go Back
        </Button>
      </PageShell>
    );
  }

  const breadcrumbItems = buildBreadcrumbNavItems(selection, breadcrumb);

  return (
    <PageShell
      padBottom
      breadcrumbs={breadcrumbItems}
      title={selection.checklistItemName || "Inspection Checklist"}
      subtitle={
        selection.parentChecklistItemName || (selection.locationId && selection.checklistItemName)
          ? "Detailed equipment checklist"
          : undefined
      }
    >
      <div className="mb-6 space-y-4">
        <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
          <Input
            label="Engineer Name"
            placeholder="Enter your name"
            value={localEngineerName}
            onChange={(e) => setLocalEngineerName(e.target.value)}
          />
          <p className="mt-3 text-sm text-blue-700">
            <span className="font-semibold">Location:</span> {breadcrumb}
          </p>
        </div>

        <ProgressBar
          current={completedCount}
          total={responses.length}
          label="Checklist Progress"
        />
      </div>

      <div className="space-y-4">
        {responses.map((item, index) => (
          <ChecklistItemForm
            key={item.checklistItemId}
            item={item}
            index={index}
            onChange={updateResponse}
          />
        ))}
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

      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 bg-white/95 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur">
        <div className="mx-auto flex max-w-3xl gap-3 lg:max-w-5xl">
          <Button
            variant="outline"
            size="lg"
            className="flex-1"
            onClick={handleSaveDraft}
            loading={saving}
          >
            <Save className="h-5 w-5" />
            Save Draft
          </Button>
          <Button
            variant="secondary"
            size="lg"
            className="flex-1"
            onClick={handleSubmit}
            loading={submitting}
          >
            <Send className="h-5 w-5" />
            Submit
          </Button>
        </div>
      </div>
    </PageShell>
  );
}

export default function ChecklistPage() {
  return (
    <Suspense
      fallback={
        <PageShell>
          <div className="flex items-center justify-center py-24">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        </PageShell>
      }
    >
      <ChecklistPageContent />
    </Suspense>
  );
}
