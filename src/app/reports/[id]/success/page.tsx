"use client";

import { PageShell } from "@/components/layout/app-shell";
import { InspectionLocationCard } from "@/components/reports/inspection-location-card";
import { PdfDownloadButton } from "@/components/reports/pdf-download-button";
import { Button } from "@/components/ui/button";
import { captureSubmitLocation } from "@/lib/capture-submit-location";
import { CheckCircle2, Home } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

type SuccessReport = {
  id: string;
  reportNumber?: string;
  submitLatitude?: number | null;
  submitLongitude?: number | null;
  submitAccuracy?: number | null;
  submitAddress?: string | null;
  submitMapUrl?: string | null;
  submitLocationAt?: string | null;
  submittedAt?: string | null;
};

function hasLocation(report?: SuccessReport | null) {
  return report?.submitLatitude != null && report?.submitLongitude != null;
}

export default function SuccessPage() {
  const params = useParams();
  const id = params.id as string;
  const [report, setReport] = useState<SuccessReport | null>(null);
  const [locating, setLocating] = useState(true);

  const attachLocation = useCallback(async () => {
    setLocating(true);
    try {
      const loaded = await fetch(`/api/reports/${id}`);
      let data: SuccessReport | null = loaded.ok ? await loaded.json() : { id };

      if (!hasLocation(data)) {
        const submitLocation = await captureSubmitLocation();
        if (submitLocation) {
          const patched = await fetch(`/api/reports/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ submitLocation }),
          });
          if (patched.ok) data = await patched.json();
        }
      }

      setReport(data);
    } catch {
      setReport({ id });
    } finally {
      setLocating(false);
    }
  }, [id]);

  useEffect(() => {
    void attachLocation();
  }, [attachLocation]);

  return (
    <PageShell>
      <div className="flex flex-col items-center py-10 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100">
          <CheckCircle2 className="h-10 w-10 text-emerald-600" />
        </div>
        <h1 className="mt-6 text-2xl font-bold text-slate-900">Report Submitted!</h1>
        <p className="mt-2 max-w-sm text-slate-600">
          Your inspection report has been submitted successfully and is now available in the
          admin dashboard.
        </p>

        <div className="mt-6 w-full max-w-sm">
          <InspectionLocationCard
            latitude={report?.submitLatitude}
            longitude={report?.submitLongitude}
            address={report?.submitAddress}
            accuracy={report?.submitAccuracy}
            capturedAt={report?.submitLocationAt || report?.submittedAt}
            mapUrl={report?.submitMapUrl}
            loading={locating}
            onRetry={() => void attachLocation()}
          />
        </div>

        <div className="mt-6 flex w-full max-w-sm flex-col gap-3">
          <PdfDownloadButton
            reportId={id}
            reportNumber={report?.reportNumber}
            size="lg"
            disabled={locating}
            className="w-full [&_button]:w-full"
          />
          <Link href="/">
            <Button variant="outline" size="lg" className="w-full">
              <Home className="h-5 w-5" />
              New Inspection
            </Button>
          </Link>
        </div>
      </div>
    </PageShell>
  );
}
