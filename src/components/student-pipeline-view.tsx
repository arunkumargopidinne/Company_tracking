"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Filter, Search } from "lucide-react";

import { StatusBadge } from "./status-badge";
import {
  filterStudents,
  studentCompanyJourneyLabel,
  type StudentPipelineCardData,
  type StudentPipelineStatus,
} from "@/lib/student-pipeline";

export function StudentPipelineView({
  students,
}: {
  students: StudentPipelineCardData[];
}) {
  const [search, setSearch] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [status, setStatus] = useState<"all" | StudentPipelineStatus>("all");
  const companies = useMemo(() => {
    const items = new Map<string, string>();

    for (const student of students) {
      for (const application of student.applications) {
        items.set(application.companyId, application.companyName);
      }
    }

    return Array.from(items.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [students]);
  const filteredStudents = useMemo(
    () => filterStudents(students, { search, companyId, status }),
    [companyId, search, status, students],
  );

  return (
    <>
      <section className="rounded-[8px] border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center gap-2 text-sm font-black text-slate-800">
          <Filter className="h-4 w-4 text-indigo-600" aria-hidden="true" />
          Student Filters
        </div>
        <div className="grid gap-3 md:grid-cols-[1.4fr_1fr_1fr]">
          <label className="text-sm font-bold text-slate-700">
            Search Student
            <span className="mt-2 flex h-11 items-center gap-2 rounded-[8px] border border-slate-200 bg-slate-50 px-3">
              <Search className="h-4 w-4 text-slate-400" aria-hidden="true" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="h-full min-w-0 flex-1 bg-transparent text-sm outline-none"
                placeholder="Name, UID, phone, email"
              />
            </span>
          </label>
          <label className="text-sm font-bold text-slate-700">
            Company
            <select
              value={companyId}
              onChange={(event) => setCompanyId(event.target.value)}
              className="mt-2 h-11 w-full rounded-[8px] border border-slate-200 bg-slate-50 px-3 text-sm"
            >
              <option value="">All companies</option>
              {companies.map(([id, name]) => (
                <option key={id} value={id}>
                  {name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-bold text-slate-700">
            Student Status
            <select
              value={status}
              onChange={(event) =>
                setStatus(event.target.value as "all" | StudentPipelineStatus)
              }
              className="mt-2 h-11 w-full rounded-[8px] border border-slate-200 bg-slate-50 px-3 text-sm"
            >
              <option value="all">All students</option>
              <option value="Hired">Hired</option>
              <option value="Rejected">Rejected</option>
              <option value="In Progress">In Progress</option>
            </select>
          </label>
        </div>
        <p className="mt-3 text-xs font-semibold text-slate-500">
          Showing {filteredStudents.length} of {students.length} unique students.
        </p>
      </section>

      <div className="mt-7 grid gap-5 lg:grid-cols-2">
        {filteredStudents.map((student) => (
          <StudentPipelineCard key={student.uid} student={student} />
        ))}
      </div>
    </>
  );
}

function StudentPipelineCard({ student }: { student: StudentPipelineCardData }) {
  return (
    <section className="rounded-[8px] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-slate-500">UID: {student.uid}</p>
          <h2 className="mt-1 text-xl font-black text-slate-950">{student.studentName}</h2>
          <p className="mt-2 text-sm text-slate-600">{student.email || "Email pending"}</p>
          <p className="text-sm text-slate-600">{student.phoneNumber || "Phone pending"}</p>
        </div>
        <StatusBadge tone={student.status === "Hired" ? "selected" : student.status === "Rejected" ? "rejected" : "progress"}>
          {student.status}
        </StatusBadge>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-2 text-center">
        <MiniMetric label="Active" value={student.activeCount} tone="bg-indigo-50 text-indigo-700" />
        <MiniMetric label="Rejected" value={student.rejectedCount} tone="bg-rose-50 text-rose-700" />
        <MiniMetric label="Selected" value={student.selectedCount} tone="bg-emerald-50 text-emerald-700" />
      </div>

      <div className="mt-5 space-y-3">
        {student.applications.map((application) => (
          <div key={application.applicationId} className="rounded-[8px] bg-slate-50 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-bold text-slate-950">{application.companyName}</p>
              <StatusBadge
                tone={
                  application.status === "Selected"
                    ? "selected"
                    : application.status === "Rejected" || application.status === "Dropped"
                      ? "rejected"
                      : "progress"
                }
              >
                {studentCompanyJourneyLabel(application)}
              </StatusBadge>
            </div>
            {application.remarks ? (
              <p className="mt-2 text-sm text-slate-600">{application.remarks}</p>
            ) : null}
          </div>
        ))}
      </div>

      <Link
        href={`/students/${encodeURIComponent(student.uid)}`}
        className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-slate-950 hover:text-indigo-600"
      >
        View details
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </Link>
    </section>
  );
}

function MiniMetric({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: string;
}) {
  return (
    <div className={`rounded-[8px] px-3 py-3 ${tone}`}>
      <p className="text-2xl font-black leading-6">{value}</p>
      <p className="mt-1 text-[11px] font-bold uppercase">{label}</p>
    </div>
  );
}
