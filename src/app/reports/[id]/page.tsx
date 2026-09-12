"use client";

import { PageShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";
import { STATUS_OPTIONS } from "@/lib/types";
import { FileDown, Loader2 } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

interface ReportDetail {
  id: string;
  reportNumber: string;
  breadcrumb: string;
  engineerName: string;
  status: string;
  createdAt: string;
  submittedAt: string | null;
  site: { name: string };
  responses: {
    status: string | null;
    remarks: string | null;
    itemName: string;
    checklistItem: { name: string; order: number } | null;
  }[];
}

export default function ReportDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [report, setReport] = useState<ReportDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/reports/${id}`)
      .then((res) => res.json())
      .then(setReport)
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <PageShell>
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      </PageShell>
    );
  }

  if (!report) {
    return (
      <PageShell title="Report Not Found">
        <Link href="/admin">
          <Button>Back to Admin</Button>
        </Link>
      </PageShell>
    );
  }

  return (
    <PageShell title={report.reportNumber} subtitle={report.breadcrumb}>
      <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-2 text-sm">
          <p>
            <span className="font-semibold text-slate-700">Engineer:</span>{" "}
            {report.engineerName}
          </p>
          <p>
            <span className="font-semibold text-slate-700">Site:</span> {report.site.name}
          </p>
          <p>
            <span className="font-semibold text-slate-700">Status:</span>{" "}
            <span
              className={
                report.status === "SUBMITTED" ? "text-emerald-600" : "text-orange-600"
              }
            >
              {report.status}
            </span>
          </p>
          <p>
            <span className="font-semibold text-slate-700">Created:</span>{" "}
            {formatDate(report.createdAt)}
          </p>
          {report.submittedAt && (
            <p>
              <span className="font-semibold text-slate-700">Submitted:</span>{" "}
              {formatDate(report.submittedAt)}
            </p>
          )}
        </div>

        <a href={`/api/reports/${report.id}/pdf`} download className="mt-4 inline-block">
          <Button variant="secondary">
            <FileDown className="h-4 w-4" />
            Download PDF
          </Button>
        </a>
      </div>

      <div className="space-y-3">
        {report.responses
          .sort(
            (a, b) => (a.checklistItem?.order ?? 0) - (b.checklistItem?.order ?? 0)
          )
          .map((response, index) => (
            <div
              key={index}
              className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs text-blue-600">Item {index + 1}</p>
                  <p className="font-semibold text-slate-900">
                    {response.itemName || response.checklistItem?.name}
                  </p>
                </div>
                {response.status && (
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-bold text-white ${
                      STATUS_OPTIONS.find((s) => s.value === response.status)?.color
                    }`}
                  >
                    {STATUS_OPTIONS.find((s) => s.value === response.status)?.label}
                  </span>
                )}
              </div>
              {response.remarks && (
                <p className="mt-2 text-sm text-slate-600">{response.remarks}</p>
              )}
            </div>
          ))}
      </div>
    </PageShell>
  );
}
