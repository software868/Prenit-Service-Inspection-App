"use client";

import { PageShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatDate } from "@/lib/utils";
import {
  Download,
  Eye,
  FileDown,
  Filter,
  Loader2,
  Search,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

interface Report {
  id: string;
  reportNumber: string;
  breadcrumb: string;
  engineerName: string;
  status: string;
  createdAt: string;
  submittedAt: string | null;
  site: { id: string; name: string };
  responses: { status: string | null }[];
}

export default function AdminPage() {
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [siteFilter, setSiteFilter] = useState("ALL");

  const loadReports = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      if (siteFilter !== "ALL") params.set("siteId", siteFilter);
      if (search) params.set("search", search);

      const res = await fetch(`/api/reports?${params}`);
      if (res.ok) setReports(await res.json());
    } catch {
      // handle offline
    } finally {
      setLoading(false);
    }
  }, [statusFilter, siteFilter, search]);

  useEffect(() => {
    if (authenticated) loadReports();
  }, [authenticated, loadReports]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === (process.env.NEXT_PUBLIC_ADMIN_PASSWORD || "admin123")) {
      setAuthenticated(true);
      setAuthError("");
    } else {
      setAuthError("Invalid password");
    }
  };

  const exportCSV = () => {
    const headers = [
      "Report Number",
      "Site",
      "Path",
      "Engineer",
      "Status",
      "Completed Items",
      "Created",
      "Submitted",
    ];
    const rows = reports.map((r) => [
      r.reportNumber,
      r.site.name,
      r.breadcrumb,
      r.engineerName,
      r.status,
      `${r.responses.filter((x) => x.status).length}/${r.responses.length}`,
      formatDate(r.createdAt),
      formatDate(r.submittedAt),
    ]);

    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `prenit-reports-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!authenticated) {
    return (
      <PageShell title="Admin Login" subtitle="Enter admin password to access dashboard">
        <form onSubmit={handleLogin} className="mx-auto max-w-sm space-y-4">
          <Input
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={authError}
            placeholder="Enter admin password"
          />
          <Button type="submit" className="w-full" size="lg">
            Login
          </Button>
          <p className="text-center text-xs text-slate-400">Default: admin123</p>
        </form>
      </PageShell>
    );
  }

  const sites = [...new Map(reports.map((r) => [r.site.id, r.site])).values()];

  return (
    <PageShell wide title="Admin Dashboard" subtitle="View, search, and export inspection reports">
      <div className="mb-6 space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            placeholder="Search reports..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-slate-300 py-3 pl-10 pr-4 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="min-h-11 rounded-xl border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="ALL">All Status</option>
            <option value="DRAFT">Draft</option>
            <option value="SUBMITTED">Submitted</option>
          </select>

          <select
            value={siteFilter}
            onChange={(e) => setSiteFilter(e.target.value)}
            className="min-h-11 rounded-xl border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="ALL">All Sites</option>
            {sites.map((site) => (
              <option key={site.id} value={site.id}>
                {site.name}
              </option>
            ))}
          </select>

          <Button variant="outline" size="sm" onClick={loadReports}>
            <Filter className="h-4 w-4" />
            Apply
          </Button>

          <Button variant="secondary" size="sm" onClick={exportCSV}>
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-3 gap-3">
        <div className="rounded-xl bg-blue-50 p-3 text-center">
          <p className="text-2xl font-bold text-blue-700">{reports.length}</p>
          <p className="text-xs text-blue-600">Total</p>
        </div>
        <div className="rounded-xl bg-emerald-50 p-3 text-center">
          <p className="text-2xl font-bold text-emerald-700">
            {reports.filter((r) => r.status === "SUBMITTED").length}
          </p>
          <p className="text-xs text-emerald-600">Submitted</p>
        </div>
        <div className="rounded-xl bg-orange-50 p-3 text-center">
          <p className="text-2xl font-bold text-orange-600">
            {reports.filter((r) => r.status === "DRAFT").length}
          </p>
          <p className="text-xs text-orange-600">Drafts</p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      ) : reports.length === 0 ? (
        <p className="py-12 text-center text-slate-500">No reports found</p>
      ) : (
        <>
        <div className="space-y-3 lg:hidden">
          {reports.map((report) => (
            <div
              key={report.id}
              className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-mono text-sm font-semibold text-blue-700">
                    {report.reportNumber}
                  </p>
                  <p className="mt-1 font-medium text-slate-900">{report.breadcrumb}</p>
                  <p className="mt-1 text-sm text-slate-500">
                    {report.engineerName} · {formatDate(report.createdAt)}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${
                    report.status === "SUBMITTED"
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-orange-100 text-orange-700"
                  }`}
                >
                  {report.status}
                </span>
              </div>

              <div className="mt-3 flex gap-2">
                <Link href={`/reports/${report.id}`}>
                  <Button variant="outline" size="sm">
                    <Eye className="h-4 w-4" />
                    View
                  </Button>
                </Link>
                <a href={`/api/reports/${report.id}/pdf`} download>
                  <Button variant="secondary" size="sm">
                    <FileDown className="h-4 w-4" />
                    PDF
                  </Button>
                </a>
              </div>
            </div>
          ))}
        </div>

        <div className="hidden overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm lg:block">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-3 font-semibold">Report</th>
                <th className="px-4 py-3 font-semibold">Site / Path</th>
                <th className="px-4 py-3 font-semibold">Engineer</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Created</th>
                <th className="px-4 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((report) => (
                <tr key={report.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-3 font-mono font-semibold text-blue-700">
                    {report.reportNumber}
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-900">{report.site.name}</p>
                    <p className="text-slate-500">{report.breadcrumb}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-700">{report.engineerName}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                        report.status === "SUBMITTED"
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-orange-100 text-orange-700"
                      }`}
                    >
                      {report.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-500">{formatDate(report.createdAt)}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <Link href={`/reports/${report.id}`}>
                        <Button variant="outline" size="sm">
                          <Eye className="h-4 w-4" />
                          View
                        </Button>
                      </Link>
                      <a href={`/api/reports/${report.id}/pdf`} download>
                        <Button variant="secondary" size="sm">
                          <FileDown className="h-4 w-4" />
                          PDF
                        </Button>
                      </a>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        </>
      )}
    </PageShell>
  );
}
