import Link from "next/link";
import {
  BarChart3,
  Building2,
  CalendarClock,
  CheckCircle2,
  GraduationCap,
  ListChecks,
  Sparkles,
  Users,
  type LucideIcon,
} from "lucide-react";

import { RsaCharts } from "@/components/charts/rsa-charts";
import { CompanyCard } from "@/components/company-card";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import {
  type ApplicationSummary,
  getApplicationsFromSheets,
  getApplicationSummariesByCompany,
  getStudentPipelineFromApplications,
} from "@/lib/application-source";
import { calculateCompanyStatusFromSummary } from "@/lib/company-status";
import { getCompaniesForDashboard } from "@/lib/company-source";
import { getRecentCompanyUpdates } from "@/lib/company-updates-source";
import { UserStatus } from "@/generated/prisma/enums";
import { hasDatabaseUrl, prisma } from "@/lib/db";
import { auditLogs } from "@/lib/mock-data";
import { getRsaChartData } from "@/lib/report-analytics";
import { getCurrentSessionUser, isReadOnlyRole } from "@/lib/rbac";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const allCompanies = await getCompaniesForDashboard();
  const summaries = Object.fromEntries(
    await getApplicationSummariesByCompany(),
  ) as Record<string, ApplicationSummary>;
  const studentPipeline = await getStudentPipelineFromApplications();
  const applicationRecords = await getApplicationsFromSheets();
  const chartData = await getRsaChartData();
  const sessionUser = await getCurrentSessionUser();
  const readOnly = isReadOnlyRole(sessionUser?.role);
  const recentCompanyUpdates = await getRecentCompanyUpdates(5);
  const pendingApprovalCount =
    sessionUser?.role === "SUPERADMIN" && hasDatabaseUrl()
      ? await prisma.user.count({ where: { status: UserStatus.PENDING } })
      : 0;
  const companyStatuses = allCompanies.map(
    (company) =>
      calculateCompanyStatusFromSummary(summaries[company.id]) ?? company.currentStatus,
  );
  const stats = {
    companies: allCompanies.length,
    hiringDone: companyStatuses.filter((status) => status === "Hiring Done").length,
    dropped: companyStatuses.filter(
      (status) => status === "Dropped" || status === "Rejected All",
    ).length,
    inProgress: companyStatuses.filter((status) => status === "In Progress").length,
    students: studentPipeline.length,
    hiredStudents: studentPipeline.filter((student) => student.status === "Hired").length,
    rejectedStudents: studentPipeline.filter((student) => student.status === "Rejected").length,
    inProgressStudents: studentPipeline.filter((student) => student.status === "In Progress").length,
    selectedApplications: applicationRecords.filter((item) => item.status === "Selected").length,
    rejectedApplications: applicationRecords.filter((item) => item.status === "Rejected").length,
    activeApplications: applicationRecords.filter(
      (item) => item.status !== "Selected" && item.status !== "Rejected" && item.status !== "Dropped",
    ).length,
    loadedThisWeek: allCompanies.filter((company) => isWithinLastDays(company.loadedDate || company.confirmationDate, 7)).length,
  };

  return (
    <>
      <PageHeader
        title="Placement Command Center"
        description="Track company progress, student progress, Sheets sync, and RSA reporting from one workspace."
        action={
          <Link
            href="/companies"
            className="inline-flex h-12 items-center gap-2 rounded-[8px] bg-indigo-600 px-5 text-sm font-bold text-white shadow-sm hover:bg-indigo-700"
          >
            <Building2 className="h-4 w-4" aria-hidden="true" />
            Open Companies
          </Link>
        }
      />

      {pendingApprovalCount > 0 ? (
        <Link
          href="/admin/users"
          className="mb-5 block rounded-[8px] border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-950 transition hover:border-amber-300"
        >
          {pendingApprovalCount} user approval request
          {pendingApprovalCount === 1 ? "" : "s"} pending. Open User Approvals to approve or reject access.
        </Link>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Companies"
          value={stats.companies}
          hint={`${stats.hiringDone} hiring done, ${stats.inProgress} in progress`}
          icon={Building2}
        />
        <StatCard
          label="Unique Students"
          value={stats.students}
          hint={`${stats.hiredStudents} hired, ${stats.inProgressStudents} in progress`}
          icon={GraduationCap}
        />
        <StatCard
          label="Application Outcomes"
          value={stats.selectedApplications}
          hint={`${stats.rejectedApplications} rejected, ${stats.activeApplications} active`}
          icon={CheckCircle2}
        />
        <StatCard
          label="Dropped Companies"
          value={stats.dropped}
          hint={`${stats.loadedThisWeek} companies loaded in last 7 days`}
          icon={Sparkles}
        />
      </div>

      <div className="mt-7 grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-black text-slate-950">Active Company Pipelines</h2>
            <Link href="/companies" className="text-sm font-bold text-indigo-600">
              View companies
            </Link>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            {allCompanies.slice(0, 2).map((company) => (
              <CompanyCard
                key={company.id}
                company={company}
                summary={summaries[company.id]}
                readOnly={readOnly}
              />
            ))}
          </div>
        </section>

        <section className="rounded-[8px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <ListChecks className="h-5 w-5 text-indigo-600" aria-hidden="true" />
            <h2 className="text-xl font-black text-slate-950">Automation Rules</h2>
          </div>
          <div className="space-y-3 text-sm text-slate-600">
            <Rule icon={CalendarClock} text="Every status move writes to audit log, database, Sheets, and student pipeline." />
            <Rule icon={Users} text="Rejected students require round and remarks before saving." />
            <Rule icon={BarChart3} text="RSA charts refresh from round status, benchmarking, and assessment data." />
          </div>
        </section>
      </div>

      <section className="mt-7 rounded-[8px] border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-black text-slate-950">Daily Company Updates</h2>
          <Link href="/companies" className="text-sm font-bold text-indigo-600">
            Open companies
          </Link>
        </div>
        <div className="space-y-3">
          {recentCompanyUpdates.map((update) => (
            <Link
              key={update.id}
              href={`/companies/${update.companyId}`}
              className="block rounded-[8px] border border-slate-200 bg-slate-50 p-4 transition hover:border-indigo-300"
            >
              <div className="flex flex-wrap justify-between gap-2">
                <p className="font-black text-slate-950">{update.companyName}</p>
                <p className="text-xs font-bold uppercase text-slate-500">
                  {formatUpdateDate(update.updateDate)}
                </p>
              </div>
              <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600">
                {update.content}
              </p>
            </Link>
          ))}
          {recentCompanyUpdates.length === 0 ? (
            <div className="rounded-[8px] border border-dashed border-slate-300 p-6 text-center text-sm font-semibold text-slate-500">
              No daily company updates yet.
            </div>
          ) : null}
        </div>
      </section>

      <section className="mt-7">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-black text-slate-950">RSA Dashboard Graphs</h2>
          <Link href="/rsa" className="text-sm font-bold text-indigo-600">
            Full RSA
          </Link>
        </div>
        <RsaCharts data={chartData} />
      </section>

      <section className="mt-7 rounded-[8px] border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-xl font-black text-slate-950">Recent Audit Log</h2>
        <div className="mt-4 divide-y divide-slate-100">
          {auditLogs.map((log) => (
            <div key={log.id} className="grid gap-2 py-3 text-sm md:grid-cols-[150px_120px_1fr]">
              <span className="font-semibold text-slate-500">{log.at}</span>
              <span className="font-black text-slate-800">{log.action}</span>
              <span className="text-slate-600">{log.message}</span>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

function isWithinLastDays(value: string | undefined, days: number) {
  const date = parseCompanyDate(value);
  if (!date) return false;

  const start = new Date();
  start.setDate(start.getDate() - days);
  start.setHours(0, 0, 0, 0);

  return date >= start;
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

function formatUpdateDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("en-IN");
}

function Rule({
  icon: Icon,
  text,
}: {
  icon: LucideIcon;
  text: string;
}) {
  return (
    <div className="flex gap-3 rounded-[8px] bg-slate-50 p-3">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-indigo-600" aria-hidden={true} />
      <p>{text}</p>
    </div>
  );
}
