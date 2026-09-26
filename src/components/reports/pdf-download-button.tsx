"use client";

import { Button } from "@/components/ui/button";
import { FileDown } from "lucide-react";
import { useState } from "react";

interface PdfDownloadButtonProps {
  reportId: string;
  reportNumber?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
  disabled?: boolean;
}

export function PdfDownloadButton({
  reportId,
  reportNumber,
  size = "sm",
  className,
  disabled,
}: PdfDownloadButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const download = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/reports/${reportId}/pdf`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Could not create PDF");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${reportNumber || "inspection-report"}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "PDF download failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={className}>
      <Button
        type="button"
        variant="secondary"
        size={size}
        onClick={download}
        loading={loading}
        disabled={disabled || loading}
      >
        <FileDown className="h-4 w-4" />
        {disabled && !loading ? "Getting location…" : "PDF"}
      </Button>
      {error ? <p className="mt-1 text-xs text-orange-600">{error}</p> : null}
    </div>
  );
}
