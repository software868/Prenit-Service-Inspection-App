"use client";

import { PageShell } from "@/components/layout/app-shell";
import { PdfDownloadButton } from "@/components/reports/pdf-download-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/use-auth";
import { formatDate } from "@/lib/utils";
import {
  Download,
  Eye,
  Filter,
  Loader2,
  Search,
  UserPlus,
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
  const { user, loading: authLoading } = useAuth();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [siteFilter, setSiteFilter] = useState("ALL");
  const [users, setUsers] = useState<
    { id: string; name: string; email: string; role: string }[]
  >([]);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState("ENGINEER");
  const [userMessage, setUserMessage] = useState("");
  const [creatingUser, setCreatingUser] = useState(false);

  const loadReports = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      if (siteFilter !== "ALL") params.set("siteId", siteFilter);
      if (debouncedSearch) params.set("search", debouncedSearch);

      const res = await fetch(`/api/reports?${params}`);
      if (res.ok) setReports(await res.json());
    } catch {
      // handle offline
    } finally {
      setLoading(false);
    }
  }, [statusFilter, siteFilter, debouncedSearch]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    if (user?.role === "ADMIN") loadReports();
  }, [user, loadReports]);

  const loadUsers = useCallback(async () => {
    const res = await fetch("/api/users");
    if (res.ok) setUsers(await res.json());
  }, []);

  useEffect(() => {
    if (user?.role === "ADMIN") void loadUsers();
  }, [user, loadUsers]);

  const createUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingUser(true);
    setUserMessage("");
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: newName,
        email: newEmail,
        password: newPassword,
        role: newRole,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setCreatingUser(false);
    if (!res.ok) {
      setUserMessage(data.error || "Could not create user");
      return;
    }
    setNewName("");
    setNewEmail("");
    setNewPassword("");
    setUserMessage(`Login created for ${data.name}`);
    void loadUsers();
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

  if (authLoading) {
    return (
      <PageShell title="Admin">
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      </PageShell>
    );
  }

  if (!user || user.role !== "ADMIN") {
    return (
      <PageShell title="Admin only">
        <p className="text-slate-600">This page is only for admin accounts.</p>
      </PageShell>
    );
  }

  const sites = [...new Map(reports.map((r) => [r.site.id, r.site])).values()];

  return (
    <PageShell wide title="Admin Dashboard" subtitle="Reports show who submitted each inspection">
      <form
        onSubmit={createUser}
        className="mb-6 space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
      >
        <div className="flex items-center gap-2">
          <UserPlus className="h-5 w-5 text-blue-600" />
          <h2 className="text-base font-semibold text-slate-900">Create user login</h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Input
            label="Name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Engineer name"
            required
          />
          <Input
            label="Email"
            type="email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            placeholder="name@prenit.com"
            required
          />
          <Input
            label="Password"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Password"
            required
          />
          <label className="block text-sm font-medium text-slate-700">
            Role
            <select
              value={newRole}
              onChange={(e) => setNewRole(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-base"
            >
              <option value="ENGINEER">Engineer</option>
              <option value="ADMIN">Admin</option>
            </select>
          </label>
        </div>
        <Button type="submit" loading={creatingUser}>
          Create login
        </Button>
        {userMessage && <p className="text-sm font-medium text-blue-700">{userMessage}</p>}
        {users.length > 0 && (
          <ul className="divide-y divide-slate-100 text-sm">
            {users.map((account) => (
              <li key={account.id} className="flex items-center justify-between py-2">
                <span className="font-medium text-slate-800">
                  {account.name}{" "}
                  <span className="font-normal text-slate-500">({account.email})</span>
                </span>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
                  {account.role}
                </span>
              </li>
            ))}
          </ul>
        )}
      </form>

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
                <PdfDownloadButton reportId={report.id} reportNumber={report.reportNumber} />
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
                      <PdfDownloadButton
                        reportId={report.id}
                        reportNumber={report.reportNumber}
                      />
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
