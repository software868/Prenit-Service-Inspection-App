"use client";

import { VoiceControls } from "@/components/checklist/voice-controls";
import {
  STATUS_OPTIONS,
  type ChecklistItemResponse,
  type ChecklistStatusValue,
} from "@/lib/types";
import { cn } from "@/lib/utils";
import { MessageSquarePlus, X } from "lucide-react";
import { useState } from "react";

interface InlineCheckRowProps {
  item: ChecklistItemResponse;
  subtitle?: string;
  onChange: (updates: Partial<ChecklistItemResponse>) => void;
}

export function InlineCheckRow({ item, subtitle, onChange }: InlineCheckRowProps) {
  const [showRemark, setShowRemark] = useState(Boolean(item.remarks?.trim()));

  return (
    <div className="border-b border-slate-200 bg-white px-3 py-2.5 last:border-b-0">
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-slate-900">{item.name}</p>
          {subtitle ? (
            <p className="truncate text-xs text-slate-500">{subtitle}</p>
          ) : null}
        </div>

        <div className="flex shrink-0 gap-1">
          {STATUS_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange({ status: option.value as ChecklistStatusValue })}
              className={cn(
                "min-h-9 min-w-[2.75rem] rounded-lg border px-2 text-xs font-bold transition-all sm:min-w-[3.25rem]",
                item.status === option.value
                  ? `${option.color} border-transparent text-white`
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
              )}
            >
              {option.label}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => setShowRemark((open) => !open)}
          className={cn(
            "inline-flex shrink-0 items-center justify-center rounded-lg p-2 transition-colors",
            showRemark || item.remarks?.trim()
              ? "bg-blue-50 text-blue-600"
              : "text-slate-400 hover:bg-slate-50 hover:text-blue-600"
          )}
          title="Add remark"
          aria-label="Add remark"
        >
          {showRemark ? <X className="h-4 w-4" /> : <MessageSquarePlus className="h-4 w-4" />}
        </button>
      </div>

      {showRemark ? (
        <div className="mt-2 space-y-2 border-t border-slate-100 pt-2">
          <textarea
            value={item.remarks}
            onChange={(e) => onChange({ remarks: e.target.value })}
            rows={2}
            placeholder="Add remark..."
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
          <VoiceControls
            value={item.remarks}
            onChange={(remarks) => onChange({ remarks })}
            compact
          />
        </div>
      ) : null}
    </div>
  );
}
