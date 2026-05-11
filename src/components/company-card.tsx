import Link from "next/link";
import { ArrowRight, BriefcaseBusiness, IndianRupee, MapPin } from "lucide-react";

import type { ApplicationSummary } from "@/lib/application-source";
import { calculateCompanyStatusFromSummary } from "@/lib/company-status";
import { Company, companySummary } from "@/lib/mock-data";
import { DeleteCompanyButton } from "./forms/delete-company-button";
import { EditCompanyForm } from "./forms/edit-company-form";
import { JDViewButton } from "./jd-view-button";
import { StatusBadge } from "./status-badge";

function statusTone(status: Company["currentStatus"]) {
  if (status === "Selected" || status === "Hiring Done") return "selected";
  if (status === "Rejected All") return "rejected";
  if (status === "Upcoming") return "upcoming";
  if (status === "Dropped") return "warning";
  return "progress";
}

export function CompanyCard({
  company,
  summary,
}: {
  company: Company;
  summary?: ApplicationSummary;
}) {
  const counts = summary ?? companySummary(company.id);
  const visibleStatus = calculateCompanyStatusFromSummary(counts) ?? company.currentStatus;

  return (
    <article className="rounded-[8px] border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase text-slate-500">{company.name}</p>
          <h2 className="mt-2 text-xl font-black text-slate-950">{company.jdTitle}</h2>
        </div>
        <StatusBadge tone={statusTone(visibleStatus)}>
          {visibleStatus}
        </StatusBadge>
      </div>

      <div className="mt-5 grid gap-3 text-sm text-slate-600 sm:grid-cols-2">
        <span className="inline-flex items-center gap-1.5">
          <MapPin className="h-4 w-4" aria-hidden="true" />
          {company.location || "Location pending"}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <IndianRupee className="h-4 w-4" aria-hidden="true" />
          {company.ctc || company.stipend || "CTC pending"}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <BriefcaseBusiness className="h-4 w-4" aria-hidden="true" />
          {company.jobType || company.internshipDuration || "Job type pending"}
        </span>
        <span className="font-semibold text-slate-500">
          {company.openings ? `${company.openings} openings` : company.crm}
        </span>
      </div>

      <div className="mt-5 grid grid-cols-4 gap-2">
        <Metric label="Applied" value={counts.applied} tone="bg-slate-100 text-slate-700" />
        <Metric label="Progress" value={counts.inProgress} tone="bg-indigo-50 text-indigo-700" />
        <Metric label="Selected" value={counts.selected} tone="bg-emerald-50 text-emerald-700" />
        <Metric label="Rejected" value={counts.rejected} tone="bg-rose-50 text-rose-700" />
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {company.techStack.slice(0, 5).map((skill) => (
          <span
            key={skill}
            className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600"
          >
            {skill}
          </span>
        ))}
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <Link
          href={`/companies/${company.id}`}
          className="inline-flex h-10 items-center gap-2 rounded-[8px] text-sm font-bold text-slate-950 hover:text-indigo-600"
        >
          Open pipeline
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
        <div className="flex flex-wrap gap-2">
          <JDViewButton
            companyName={company.name}
            role={company.jdTitle}
            jdContent={company.jdDetails}
            jdLink={company.jdLink}
            compact
          />
          <EditCompanyForm company={company} compact />
          <DeleteCompanyButton
            rowNumber={company.sheetRowNumber}
            companyName={company.name}
          />
        </div>
      </div>
    </article>
  );
}

function Metric({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: string;
}) {
  return (
    <div className={`rounded-[8px] px-3 py-3 text-center ${tone}`}>
      <p className="text-2xl font-black leading-6">{value}</p>
      <p className="mt-1 text-[11px] font-bold uppercase">{label}</p>
    </div>
  );
}
