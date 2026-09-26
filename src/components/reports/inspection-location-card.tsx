"use client";

import {
  formatAccuracy,
  formatCoordinates,
  googleMapsUrl,
  osmEmbedUrl,
} from "@/lib/geo";
import { formatDateOnly, formatTimeOnly } from "@/lib/utils";
import { Clock, MapPin, Navigation } from "lucide-react";

export type InspectionLocationCardProps = {
  latitude?: number | null;
  longitude?: number | null;
  address?: string | null;
  accuracy?: number | null;
  capturedAt?: string | Date | null;
  mapUrl?: string | null;
  loading?: boolean;
  onRetry?: () => void;
};

export function InspectionLocationCard({
  latitude,
  longitude,
  address,
  accuracy,
  capturedAt,
  mapUrl,
  loading,
  onRetry,
}: InspectionLocationCardProps) {
  const stamp = capturedAt || new Date();

  if (loading) {
    return (
      <div className="w-full overflow-hidden rounded-2xl border border-slate-200 bg-white text-left shadow-sm">
        <div className="h-40 animate-pulse bg-slate-100" />
        <div className="space-y-2 p-4">
          <div className="h-3 w-32 animate-pulse rounded bg-slate-100" />
          <div className="h-4 w-full animate-pulse rounded bg-slate-100" />
          <p className="text-sm text-slate-500">Fetching inspection location…</p>
        </div>
      </div>
    );
  }

  if (latitude == null || longitude == null) {
    return (
      <div className="w-full rounded-2xl border border-dashed border-slate-300 bg-white p-4 text-left">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100">
            <MapPin className="h-5 w-5 text-slate-500" />
          </div>
          <div>
            <p className="font-semibold text-slate-900">Location unavailable</p>
            <p className="mt-1 text-sm text-slate-600">
              Allow location access so the PDF can show where this inspection was submitted.
            </p>
            {onRetry ? (
              <button
                type="button"
                onClick={onRetry}
                className="mt-2 text-sm font-semibold text-blue-700 hover:underline"
              >
                Try again
              </button>
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  const mapsHref = mapUrl || googleMapsUrl(latitude, longitude);
  const accuracyLabel = formatAccuracy(accuracy);

  return (
    <div className="w-full overflow-hidden rounded-2xl border border-slate-200 bg-white text-left shadow-sm">
      <div className="relative h-44 bg-slate-100">
        <iframe
          title="Inspection location map"
          className="h-full w-full border-0"
          src={osmEmbedUrl(latitude, longitude)}
        />
        <div className="pointer-events-none absolute left-2 top-2 rounded-xl bg-white/95 px-3 py-2 shadow-md">
          <p className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-slate-500">
            <Clock className="h-3 w-3" />
            Submitted
          </p>
          <p className="text-base font-bold leading-tight text-slate-900">
            {formatTimeOnly(stamp)}
          </p>
          <p className="text-xs font-medium text-slate-600">{formatDateOnly(stamp)}</p>
        </div>
      </div>
      <div className="p-4">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
          Submitted from
        </p>
        <div className="mt-2 flex items-start gap-2">
          <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
          <div className="min-w-0">
            <p className="font-semibold text-slate-900">{address || "Pinned location"}</p>
            <p className="mt-1 font-mono text-xs text-slate-500">
              {formatCoordinates(latitude, longitude)}
              {accuracyLabel ? ` · ${accuracyLabel}` : ""}
            </p>
            <p className="mt-1 text-sm font-semibold text-slate-800">
              {formatTimeOnly(stamp)} · {formatDateOnly(stamp)}
            </p>
          </div>
        </div>
        <a
          href={mapsHref}
          target="_blank"
          rel="noreferrer"
          className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-blue-700 hover:underline"
        >
          <Navigation className="h-4 w-4" />
          Open in Maps
        </a>
      </div>
    </div>
  );
}
