import Link from "next/link";
import { Sparkles } from "lucide-react";

import { RsaCharts } from "@/components/charts/rsa-charts";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { getCompaniesForDashboard } from "@/lib/company-source";
import { getAllRsaReports } from "@/lib/rsa-source";

export const dynamic = "force-dynamic";

export default async function RsaPage() {
  const companies = await getCompaniesForDashboard();
  const reports = await getAllRsaReports();
  const latestByCompany = new Map<string, (typeof reports)[number]>();
  reports.forEach((report) => {
    if (!latestByCompany.has(report.companyId)) {
      latestByCompany.set(report.companyId, report);
    }
  });

  return (
    <>
      <PageHeader
        title="Review & Selection Analysis"
        description="Graph company outcomes, rejection reasons, benchmarking, assessments, and AI summaries."
      />

      <RsaCharts />

      <section className="mt-7 rounded-[8px] border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-xl font-black text-slate-950">Stakeholder Overviews</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {companies.map((company) => {
            const report = latestByCompany.get(company.id);
            return (
              <Link
                key={company.id}
                href={`/companies/${company.id}/rsa`}
                className="rounded-[8px] border border-slate-200 p-4 transition hover:border-indigo-300 hover:shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-lg font-black text-slate-950">{company.name}</p>
                    <p className="mt-1 text-sm text-slate-500">{company.jdTitle}</p>
                  </div>
                  <StatusBadge tone={report ? "selected" : "warning"}>
                    {report?.status ?? "Needs RSA"}
                  </StatusBadge>
                </div>
                <p className="mt-4 line-clamp-2 text-sm text-slate-600">
                  {report?.finalEditedRsa ||
                    report?.aiGeneratedRsa ||
                    "Add admin inputs to generate a company-wise RSA."}
                </p>
                <span className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-indigo-600">
                  <Sparkles className="h-4 w-4" aria-hidden="true" />
                  Open RSA
                </span>
              </Link>
            );
          })}
        </div>
      </section>
    </>
  );
}
