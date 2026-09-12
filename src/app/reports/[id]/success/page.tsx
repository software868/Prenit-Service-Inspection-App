"use client";

import { PageShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { CheckCircle2, FileDown, Home } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";

export default function SuccessPage() {
  const params = useParams();
  const id = params.id as string;

  return (
    <PageShell>
      <div className="flex flex-col items-center py-16 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100">
          <CheckCircle2 className="h-10 w-10 text-emerald-600" />
        </div>
        <h1 className="mt-6 text-2xl font-bold text-slate-900">Report Submitted!</h1>
        <p className="mt-2 max-w-sm text-slate-600">
          Your inspection report has been submitted successfully and is now available in the
          admin dashboard.
        </p>

        <div className="mt-8 flex w-full max-w-sm flex-col gap-3">
          <a href={`/api/reports/${id}/pdf`} download>
            <Button variant="secondary" size="lg" className="w-full">
              <FileDown className="h-5 w-5" />
              Download PDF
            </Button>
          </a>
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
