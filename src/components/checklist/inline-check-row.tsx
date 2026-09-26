"use client";

import { PhotoUpload } from "@/components/checklist/photo-upload";
import { VoiceControls } from "@/components/checklist/voice-controls";
import type { ChecklistItemResponse, ChecklistStatusValue } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Check, MessageSquarePlus, X } from "lucide-react";
import { useState } from "react";

interface InlineCheckRowProps {
  item: ChecklistItemResponse;
  subtitle?: string;
  highlightMissing?: boolean;
  onChange: (updates: Partial<ChecklistItemResponse>) => void;
}

export function StatusLegendHeader() {
  return (
    <div className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 px-3 py-2.5 backdrop-blur">
      <div className="flex items-center gap-3">
        <p className="min-w-0 flex-1 text-xs font-bold uppercase tracking-wide text-slate-500">
          Item
        </p>
        <div className="flex shrink-0 items-center gap-2 pr-12">
          <div className="flex w-10 flex-col items-center gap-0.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500 text-white">
              <Check className="h-4 w-4 stroke-[3]" />
            </span>
            <span className="text-[10px] font-semibold text-emerald-700">OK</span>
          </div>
          <div className="flex w-10 flex-col items-center gap-0.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500 text-white">
              <X className="h-4 w-4 stroke-[3]" />
            </span>
            <span className="text-[10px] font-semibold text-orange-700">Not OK</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function InlineCheckRow({
  item,
  subtitle,
  highlightMissing = false,
  onChange,
}: InlineCheckRowProps) {
  const [showRemark, setShowRemark] = useState(
    Boolean(item.remarks?.trim() || item.photoData)
  );

  const setStatus = (status: ChecklistStatusValue) => {
    // Always set the chosen status (do not toggle off — keeps Submit enable correct)
    onChange({ status });
  };

  return (
    <div
      id={`check-item-${item.checklistItemId}`}
      className={cn(
        "scroll-mt-28 border-b border-slate-200 bg-white px-3 py-2 last:border-b-0 transition-shadow",
        item.status == null && "bg-orange-50/40",
        highlightMissing && "bg-orange-100 ring-2 ring-orange-400 ring-inset"
      )}
    >
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-slate-900">{item.name}</p>
          {subtitle ? (
            <p className="truncate text-xs text-slate-500">{subtitle}</p>
          ) : null}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => setStatus("OK")}
            aria-label="OK"
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-lg border-2 transition-all",
              item.status === "OK"
                ? "border-emerald-500 bg-emerald-500 text-white"
                : "border-slate-200 bg-white text-slate-300 hover:border-emerald-300 hover:text-emerald-500"
            )}
          >
            <Check className="h-5 w-5 stroke-[2.5]" />
          </button>

          <button
            type="button"
            onClick={() => setStatus("NOT_OK")}
            aria-label="Not OK"
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-lg border-2 transition-all",
              item.status === "NOT_OK"
                ? "border-orange-500 bg-orange-500 text-white"
                : "border-slate-200 bg-white text-slate-300 hover:border-orange-300 hover:text-orange-500"
            )}
          >
            <X className="h-5 w-5 stroke-[2.5]" />
          </button>

          <button
            type="button"
            onClick={() => setShowRemark((open) => !open)}
            className={cn(
              "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-colors",
              showRemark || item.remarks?.trim() || item.photoData
                ? "bg-blue-50 text-blue-600"
                : "text-slate-400 hover:bg-slate-50 hover:text-blue-600"
            )}
            title="Add remark (optional)"
            aria-label="Add remark (optional)"
          >
            {showRemark ? <X className="h-4 w-4" /> : <MessageSquarePlus className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {showRemark ? (
        <div className="mt-2 space-y-3 border-t border-slate-100 pt-2">
          <textarea
            value={item.remarks}
            onChange={(e) => onChange({ remarks: e.target.value })}
            rows={2}
            placeholder="Optional remark..."
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
          <VoiceControls
            value={item.remarks}
            onChange={(remarks) => onChange({ remarks })}
            compact
          />
          <PhotoUpload
            value={item.photoData}
            fileName={item.photoFileName}
            onChange={(photoData, photoFileName) => onChange({ photoData, photoFileName })}
          />
        </div>
      ) : null}
    </div>
  );
}
