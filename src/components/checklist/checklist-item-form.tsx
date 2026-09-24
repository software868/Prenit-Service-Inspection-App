"use client";

import { AudioNote } from "@/components/checklist/audio-note";
import { PhotoUpload } from "@/components/checklist/photo-upload";
import { VoiceControls } from "@/components/checklist/voice-controls";
import { STATUS_OPTIONS, type ChecklistItemResponse, type ChecklistStatusValue } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";

interface ChecklistItemFormProps {
  item: ChecklistItemResponse;
  index: number;
  onChange: (index: number, updates: Partial<ChecklistItemResponse>) => void;
}

export function ChecklistItemForm({ item, index, onChange }: ChecklistItemFormProps) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div
      id={`check-item-${item.checklistItemId}`}
      className="scroll-mt-24 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
    >
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between gap-3 p-4 text-left"
      >
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-wide text-blue-600">
            Item {index + 1}
          </p>
          <h3 className="mt-0.5 text-base font-semibold text-slate-900">{item.name}</h3>
        </div>
        <div className="flex items-center gap-2">
          {item.status && (
            <span
              className={cn(
                "rounded-full px-2.5 py-1 text-xs font-bold text-white",
                STATUS_OPTIONS.find((s) => s.value === item.status)?.color
              )}
            >
              {STATUS_OPTIONS.find((s) => s.value === item.status)?.label}
            </span>
          )}
          {expanded ? (
            <ChevronUp className="h-5 w-5 text-slate-400" />
          ) : (
            <ChevronDown className="h-5 w-5 text-slate-400" />
          )}
        </div>
      </button>

      {expanded && (
        <div className="space-y-5 border-t border-slate-100 p-4">
          <div>
            <p className="mb-2 text-sm font-medium text-slate-700">Status</p>
            <div className="grid grid-cols-2 gap-2">
              {STATUS_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => onChange(index, { status: option.value as ChecklistStatusValue })}
                  className={cn(
                    "min-h-12 rounded-xl border-2 text-sm font-bold transition-all",
                    item.status === option.value
                      ? `${option.color} border-transparent text-white shadow-md`
                      : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Remarks <span className="font-normal text-slate-400">(optional)</span>
            </label>
            <textarea
              value={item.remarks}
              onChange={(e) => onChange(index, { remarks: e.target.value })}
              rows={3}
              placeholder="Optional remark..."
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-base focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
            <VoiceControls
              value={item.remarks}
              onChange={(remarks) => onChange(index, { remarks })}
              className="mt-3"
            />
          </div>

          <div>
            <p className="mb-2 text-sm font-medium text-slate-700">
              Photo <span className="font-normal text-slate-400">(optional)</span>
            </p>
            <PhotoUpload
              value={item.photoData}
              fileName={item.photoFileName}
              onChange={(photoData, photoFileName) =>
                onChange(index, { photoData, photoFileName })
              }
            />
          </div>

          <div>
            <p className="mb-2 text-sm font-medium text-slate-700">Audio Note</p>
            <AudioNote
              value={item.audioData}
              fileName={item.audioFileName}
              onChange={(audioData, audioFileName) =>
                onChange(index, { audioData, audioFileName })
              }
            />
          </div>
        </div>
      )}
    </div>
  );
}
