"use client";

import { PageShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { buildChecklistUrl } from "@/lib/checklist-navigation";
import { getOfflineDrafts } from "@/lib/offline";
import { formatDate } from "@/lib/utils";
import type { DraftReport } from "@/lib/types";
import { useInspectionStore } from "@/store/inspection-store";
import { FileText, Loader2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function DraftsPage() {
  const [drafts, setDrafts] = useState<DraftReport[]>([]);
  const [serverDrafts, setServerDrafts] = useState<DraftReport[]>([]);
  const [loading, setLoading] = useState(true);
  const { setSelection, setCurrentDraft, setEngineerName } = useInspectionStore();

  useEffect(() => {
    const load = async () => {
      const local = getOfflineDrafts();
      setDrafts(local.filter((d) => d.status === "DRAFT"));

      try {
        const res = await fetch("/api/reports?status=DRAFT");
        if (res.ok) {
          const data = await res.json();
          setServerDrafts(
            data.map(
              (r: {
                id: string;
                reportNumber: string;
                breadcrumb: string;
                engineerName: string;
                siteId: string;
                departmentId: string;
                sectionId: string;
                locationId?: string;
                equipmentId: string;
                updatedAt: string;
                responses: {
                  checklistItemId: string | null;
                  itemName: string;
                  status: string | null;
                  remarks: string | null;
                  checklistItem: { name: string } | null;
                }[];
              }) => ({
                id: r.id,
                reportNumber: r.reportNumber,
                breadcrumb: r.breadcrumb,
                engineerName: r.engineerName,
                status: "DRAFT" as const,
                updatedAt: r.updatedAt,
                path: {
                  siteId: r.siteId,
                  departmentId: r.departmentId,
                  sectionId: r.sectionId,
                  locationId: r.locationId,
                  equipmentId: r.equipmentId,
                },
                responses: r.responses.map((resp) => ({
                  checklistItemId: resp.checklistItemId || "",
                  name: resp.itemName || resp.checklistItem?.name || "",
                  status: resp.status as DraftReport["responses"][0]["status"],
                  remarks: resp.remarks || "",
                })),
              })
            )
          );
        }
      } catch {
        // offline
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const resumeDraft = (draft: DraftReport) => {
    setEngineerName(draft.engineerName);
    setSelection(draft.path, draft.breadcrumb);
    setCurrentDraft(draft);
  };

  const allDrafts = [...serverDrafts, ...drafts].reduce((acc, draft) => {
    const key = draft.id || draft.breadcrumb;
    if (!acc.find((d) => (d.id || d.breadcrumb) === key)) acc.push(draft);
    return acc;
  }, [] as DraftReport[]);

  return (
    <PageShell title="Saved Drafts" subtitle="Resume your in-progress inspections">
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      ) : allDrafts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
          <FileText className="mx-auto h-12 w-12 text-slate-300" />
          <p className="mt-3 font-medium text-slate-600">No drafts found</p>
          <Link href="/" className="mt-4 inline-block text-blue-600 hover:underline">
            Start a new inspection
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {allDrafts.map((draft) => (
            <div
              key={draft.id || draft.breadcrumb}
              className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <p className="font-semibold text-slate-900">{draft.breadcrumb}</p>
              <p className="mt-1 text-sm text-slate-500">
                {draft.engineerName} · {formatDate(draft.updatedAt)}
              </p>
              <p className="mt-1 text-xs text-blue-600">
                {draft.responses.filter((r) => r.status).length}/{draft.responses.length}{" "}
                items completed
              </p>
              <div className="mt-3 flex gap-2">
                <Link
                  href={buildChecklistUrl(draft.path, draft.breadcrumb, draft.engineerName)}
                  onClick={() => resumeDraft(draft)}
                  className="flex-1"
                >
                  <Button variant="primary" size="sm" className="w-full">
                    Resume
                  </Button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </PageShell>
  );
}
