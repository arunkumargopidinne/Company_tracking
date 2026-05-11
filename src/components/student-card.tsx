import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Student, studentSummary } from "@/lib/mock-data";
import { StatusBadge } from "./status-badge";

export function StudentCard({ student }: { student: Student }) {
  const summary = studentSummary(student.id);

  return (
    <article className="rounded-[8px] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-slate-500">{student.studentId}</p>
          <h2 className="mt-1 text-xl font-black text-slate-950">{student.name}</h2>
        </div>
        <StatusBadge tone={student.benchmarkStatus === "Cleared" ? "selected" : "warning"}>
          Benchmark {student.benchmarkStatus}
        </StatusBadge>
      </div>
      <div className="mt-5 grid grid-cols-4 gap-2 text-center">
        <MiniMetric label="Applied" value={summary.applied} />
        <MiniMetric label="Active" value={summary.inProgress} />
        <MiniMetric label="Rejected" value={summary.rejected} />
        <MiniMetric label="Selected" value={summary.selected} />
      </div>
      <p className="mt-4 line-clamp-2 text-sm text-slate-600">{student.remarks}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {student.primaryStack.map((skill) => (
          <span
            key={skill}
            className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600"
          >
            {skill}
          </span>
        ))}
      </div>
      <Link
        href={`/students/${student.id}`}
        className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-slate-950 hover:text-indigo-600"
      >
        View journey
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </Link>
    </article>
  );
}

function MiniMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-[8px] bg-slate-50 px-2 py-3">
      <p className="text-xl font-black text-slate-950">{value}</p>
      <p className="mt-1 text-[11px] font-bold uppercase text-slate-500">{label}</p>
    </div>
  );
}
