"use client";

import Link from "next/link";
import { Fragment, useMemo, useState } from "react";
import { ChevronDown, ChevronLeft, ChevronRight, ExternalLink, Filter, Search } from "lucide-react";
import { clsx } from "clsx";

import { StatusBadge } from "./status-badge";

export type StudentApplicationTableRow = {
  applicationId: string;
  companyId: string;
  companyName: string;
  role: string;
  applicationStatus: "In Progress" | "Rejected" | "Selected" | "Dropped";
  interviewRound: string;
  finalStatus: string;
  updatedDate: string;
  remarks: string;
  rejectionReason?: string;
  selectedDate?: string;
};

const pageSize = 8;

export function StudentApplicationsTable({
  applications,
}: {
  applications: StudentApplicationTableRow[];
}) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState("");
  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();

    return applications.filter((application) => {
      const matchesSearch =
        !query || application.companyName.toLowerCase().includes(query);
      const matchesStatus =
        status === "all" || application.applicationStatus === status;

      return matchesSearch && matchesStatus;
    });
  }, [applications, search, status]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const visible = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  function updateSearch(value: string) {
    setSearch(value);
    setPage(1);
  }

  function updateStatus(value: string) {
    setStatus(value);
    setPage(1);
  }

  return (
    <section className="mt-7 rounded-[8px] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <h2 className="text-xl font-black text-slate-950">Applications</h2>
          <p className="mt-1 text-sm font-semibold text-slate-500">
            {filtered.length} of {applications.length} records
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-[minmax(0,18rem)_12rem]">
          <label className="text-sm font-bold text-slate-700">
            Search Company
            <span className="mt-2 flex h-11 items-center gap-2 rounded-[8px] border border-slate-200 bg-slate-50 px-3">
              <Search className="h-4 w-4 text-slate-400" aria-hidden="true" />
              <input
                value={search}
                onChange={(event) => updateSearch(event.target.value)}
                className="h-full min-w-0 flex-1 bg-transparent text-sm outline-none"
                placeholder="Company name"
              />
            </span>
          </label>
          <label className="text-sm font-bold text-slate-700">
            Status
            <span className="mt-2 flex h-11 items-center gap-2 rounded-[8px] border border-slate-200 bg-slate-50 px-3">
              <Filter className="h-4 w-4 text-slate-400" aria-hidden="true" />
              <select
                value={status}
                onChange={(event) => updateStatus(event.target.value)}
                className="h-full min-w-0 flex-1 bg-transparent text-sm outline-none"
              >
                <option value="all">All</option>
                <option value="In Progress">In Progress</option>
                <option value="Selected">Selected</option>
                <option value="Rejected">Rejected</option>
                <option value="Dropped">Dropped</option>
              </select>
            </span>
          </label>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="mt-5 rounded-[8px] border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
          <p className="text-sm font-bold text-slate-700">No applications found</p>
          <p className="mt-1 text-sm text-slate-500">Try a different company or status.</p>
        </div>
      ) : (
        <>
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[980px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="w-10 px-3 py-3" />
                  <th className="px-3 py-3">Company Name</th>
                  <th className="px-3 py-3">Role</th>
                  <th className="px-3 py-3">Application Status</th>
                  <th className="px-3 py-3">Interview Round</th>
                  <th className="px-3 py-3">Final Status</th>
                  <th className="px-3 py-3">Updated Date</th>
                  <th className="px-3 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visible.map((application) => {
                  const expanded = expandedId === application.applicationId;

                  return (
                    <Fragment key={application.applicationId}>
                      <tr className="align-top">
                        <td className="px-3 py-3">
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedId(expanded ? "" : application.applicationId)
                            }
                            className="inline-flex h-8 w-8 items-center justify-center rounded-[8px] text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                            title={expanded ? "Hide details" : "Show details"}
                          >
                            <ChevronDown
                              className={clsx(
                                "h-4 w-4 transition-transform",
                                expanded && "rotate-180",
                              )}
                              aria-hidden="true"
                            />
                          </button>
                        </td>
                        <td className="px-3 py-3 font-bold text-slate-950">
                          {application.companyName}
                        </td>
                        <td className="px-3 py-3 text-slate-700">{application.role}</td>
                        <td className="px-3 py-3">
                          <StatusBadge tone={badgeTone(application.applicationStatus)}>
                            {application.applicationStatus}
                          </StatusBadge>
                        </td>
                        <td className="px-3 py-3 text-slate-700">
                          {application.interviewRound}
                        </td>
                        <td className="px-3 py-3 text-slate-700">
                          {application.finalStatus}
                        </td>
                        <td className="px-3 py-3 text-slate-600">
                          {application.updatedDate || "-"}
                        </td>
                        <td className="px-3 py-3">
                          <Link
                            href={`/companies/${application.companyId}`}
                            className="inline-flex h-9 items-center gap-2 rounded-[8px] border border-slate-200 px-3 text-sm font-bold text-slate-700 hover:border-indigo-300 hover:text-indigo-600"
                          >
                            Open
                            <ExternalLink className="h-4 w-4" aria-hidden="true" />
                          </Link>
                        </td>
                      </tr>
                      {expanded ? (
                        <tr>
                          <td className="bg-slate-50 px-3 py-3" />
                          <td colSpan={7} className="bg-slate-50 px-3 py-3">
                            <div className="grid gap-3 text-sm md:grid-cols-3">
                              <Detail label="Application ID" value={application.applicationId} />
                              <Detail label="Company ID" value={application.companyId} />
                              <Detail label="Selected Date" value={application.selectedDate || "-"} />
                              <Detail
                                label="Rejection Reason"
                                value={application.rejectionReason || "-"}
                              />
                              <div className="md:col-span-2">
                                <Detail label="Remarks" value={application.remarks || "-"} />
                              </div>
                            </div>
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-semibold text-slate-500">
              Page {currentPage} of {pageCount}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((value) => Math.max(1, value - 1))}
                disabled={currentPage === 1}
                className="inline-flex h-9 items-center gap-2 rounded-[8px] border border-slate-200 px-3 text-sm font-bold text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                Prev
              </button>
              <button
                type="button"
                onClick={() => setPage((value) => Math.min(pageCount, value + 1))}
                disabled={currentPage === pageCount}
                className="inline-flex h-9 items-center gap-2 rounded-[8px] border border-slate-200 px-3 text-sm font-bold text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        </>
      )}
    </section>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-bold uppercase text-slate-500">{label}</p>
      <p className="mt-1 break-words font-semibold text-slate-800">{value}</p>
    </div>
  );
}

function badgeTone(status: StudentApplicationTableRow["applicationStatus"]) {
  if (status === "Selected") return "selected";
  if (status === "Rejected" || status === "Dropped") return "rejected";
  return "progress";
}
