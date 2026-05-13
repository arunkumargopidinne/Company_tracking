"use client";

import { useDeferredValue, useMemo, useState } from "react";
import Link from "next/link";
import { Filter, Grid2X2, List, Search } from "lucide-react";
import { clsx } from "clsx";

import type { ApplicationSummary } from "@/lib/application-source";
import { calculateCompanyStatusFromSummary } from "@/lib/company-status";
import type { Company } from "@/lib/mock-data";
import { CompanyCard } from "./company-card";
import { DeleteCompanyButton } from "./forms/delete-company-button";
import { EditCompanyForm } from "./forms/edit-company-form";
import { JDViewButton } from "./jd-view-button";
import { StatusBadge } from "./status-badge";

export function CompaniesView({
  companies,
  summaries,
  readOnly = false,
}: {
  companies: Company[];
  summaries: Record<string, ApplicationSummary>;
  readOnly?: boolean;
}) {
  const [mode, setMode] = useState<"grid" | "table">("grid");
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [status, setStatus] = useState<"all" | "Hiring Done" | "Dropped" | "In Progress">("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const filteredCompanies = useMemo(
    () =>
      companies.filter((company) => {
        const summary = summaries[company.id];
        const visibleStatus =
          calculateCompanyStatusFromSummary(summary) ?? company.currentStatus;
        const companyDate = parseCompanyDate(company.loadedDate || company.confirmationDate);
        const from = fromDate ? new Date(`${fromDate}T00:00:00`) : null;
        const to = toDate ? new Date(`${toDate}T23:59:59`) : null;
        const matchesSearch =
          !deferredSearch.trim() ||
          company.name.toLowerCase().includes(deferredSearch.trim().toLowerCase());
        const matchesStatus =
          status === "all" ||
          visibleStatus === status ||
          (status === "Dropped" && visibleStatus === "Rejected All");
        const matchesFrom = !from || (companyDate ? companyDate >= from : false);
        const matchesTo = !to || (companyDate ? companyDate <= to : false);

        return matchesSearch && matchesStatus && matchesFrom && matchesTo;
      }),
    [companies, deferredSearch, fromDate, status, summaries, toDate],
  );

  return (
    <section>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-black text-slate-950">Company List</h2>
        <div className="inline-flex rounded-[8px] border border-slate-200 bg-white p-1 shadow-sm">
          <button
            type="button"
            onClick={() => setMode("grid")}
            className={viewButtonClass(mode === "grid")}
          >
            <Grid2X2 className="h-4 w-4" aria-hidden="true" />
            Grid
          </button>
          <button
            type="button"
            onClick={() => setMode("table")}
            className={viewButtonClass(mode === "table")}
          >
            <List className="h-4 w-4" aria-hidden="true" />
            Table
          </button>
        </div>
      </div>

      <div className="mb-5 rounded-[8px] border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center gap-2 text-sm font-black text-slate-800">
          <Filter className="h-4 w-4 text-indigo-600" aria-hidden="true" />
          Filters
        </div>
        <div className="grid gap-3 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <label className="text-sm font-bold text-slate-700">
            Search Company
            <span className="mt-2 flex h-11 items-center gap-2 rounded-[8px] border border-slate-200 bg-slate-50 px-3">
              <Search className="h-4 w-4 text-slate-400" aria-hidden="true" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="h-full min-w-0 flex-1 bg-transparent text-sm outline-none"
                placeholder="Corpus, EWall..."
              />
            </span>
          </label>
          <label className="text-sm font-bold text-slate-700">
            Status
            <select
              value={status}
              onChange={(event) =>
                setStatus(event.target.value as typeof status)
              }
              className="mt-2 h-11 w-full rounded-[8px] border border-slate-200 bg-slate-50 px-3 text-sm"
            >
              <option value="all">All statuses</option>
              <option value="In Progress">In Progress</option>
              <option value="Hiring Done">Hiring Done</option>
              <option value="Dropped">Dropped / Rejected</option>
            </select>
          </label>
          <DateField label="From Date" value={fromDate} onChange={setFromDate} />
          <DateField label="To Date" value={toDate} onChange={setToDate} />
        </div>
        <p className="mt-3 text-xs font-semibold text-slate-500">
          Showing {filteredCompanies.length} of {companies.length} companies.
        </p>
      </div>

      {mode === "grid" ? (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {filteredCompanies.map((company) => (
            <CompanyCard
              key={company.id}
              company={company}
              summary={summaries[company.id]}
              readOnly={readOnly}
            />
          ))}
        </div>
      ) : (
        <CompanyTable
          companies={filteredCompanies}
          summaries={summaries}
          readOnly={readOnly}
        />
      )}
    </section>
  );
}

function DateField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="text-sm font-bold text-slate-700">
      {label}
      <input
        type="date"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 h-11 w-full rounded-[8px] border border-slate-200 bg-slate-50 px-3 text-sm"
      />
    </label>
  );
}

function parseCompanyDate(value?: string) {
  if (!value) return null;

  const trimmed = value.trim();
  const ddmmyyyy = trimmed.match(/^(\d{2})-(\d{2})-(\d{4})$/);

  if (ddmmyyyy) {
    return new Date(`${ddmmyyyy[3]}-${ddmmyyyy[2]}-${ddmmyyyy[1]}T00:00:00`);
  }

  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function CompanyTable({
  companies,
  summaries,
  readOnly,
}: {
  companies: Company[];
  summaries: Record<string, ApplicationSummary>;
  readOnly: boolean;
}) {
  return (
    <section className="rounded-[8px] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1100px] text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-3 py-3">Company</th>
              <th className="px-3 py-3">Role</th>
              <th className="px-3 py-3">Location</th>
              <th className="px-3 py-3">CTC</th>
              <th className="px-3 py-3">Type</th>
              <th className="px-3 py-3">Tech Stack</th>
              <th className="px-3 py-3">JD</th>
              <th className="px-3 py-3">Applied</th>
              <th className="px-3 py-3">Progress</th>
              <th className="px-3 py-3">Selected</th>
              <th className="px-3 py-3">Rejected</th>
              <th className="px-3 py-3">Status</th>
              <th className="px-3 py-3">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {companies.map((company) => {
              const summary = summaries[company.id] ?? {
                applied: 0,
                inProgress: 0,
                selected: 0,
                rejected: 0,
                dropped: 0,
              };
              const visibleStatus =
                calculateCompanyStatusFromSummary(summary) ?? company.currentStatus;

              return (
                <tr key={company.id} className="align-top">
                  <td className="px-3 py-3 font-bold text-slate-950">
                    <Link href={`/companies/${company.id}`} className="hover:text-indigo-600">
                      {company.name}
                    </Link>
                  </td>
                  <td className="px-3 py-3 text-slate-700">{company.jdTitle}</td>
                  <td className="px-3 py-3 text-slate-600">{company.location}</td>
                  <td className="px-3 py-3 text-slate-600">
                    {company.ctc || company.stipend || "-"}
                  </td>
                  <td className="px-3 py-3 text-slate-600">
                    {company.jobType || company.internshipDuration || "-"}
                  </td>
                  <td className="px-3 py-3 text-slate-600">{company.techStack.join(", ")}</td>
                  <td className="px-3 py-3">
                    <JDViewButton
                      companyName={company.name}
                      role={company.jdTitle}
                      jdContent={company.jdDetails}
                      jdLink={company.jdLink}
                      compact
                    />
                  </td>
                  <td className="px-3 py-3 font-bold text-slate-950">{summary.applied}</td>
                  <td className="px-3 py-3 font-bold text-indigo-700">{summary.inProgress}</td>
                  <td className="px-3 py-3 font-bold text-emerald-700">{summary.selected}</td>
                  <td className="px-3 py-3 font-bold text-rose-700">{summary.rejected}</td>
                  <td className="px-3 py-3">
                    <StatusBadge>{visibleStatus}</StatusBadge>
                  </td>
                  <td className="px-3 py-3">
                    {readOnly ? (
                      <span className="text-xs font-semibold text-slate-400">Read only</span>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        <EditCompanyForm company={company} compact />
                        <DeleteCompanyButton
                          rowNumber={company.sheetRowNumber}
                          companyName={company.name}
                        />
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function viewButtonClass(active: boolean) {
  return clsx(
    "inline-flex h-9 items-center gap-2 rounded-[8px] px-3 text-sm font-bold transition",
    active ? "bg-indigo-600 text-white" : "text-slate-600 hover:bg-slate-50",
  );
}
