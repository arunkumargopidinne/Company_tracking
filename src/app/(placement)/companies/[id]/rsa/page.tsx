import { notFound } from "next/navigation";
import {
  BriefcaseBusiness,
  CheckCircle2,
  Clock3,
  FileText,
  XCircle,
} from "lucide-react";

import { CompanyRsaWorkspace } from "@/components/company-rsa-workspace";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { StatusBadge } from "@/components/status-badge";
import { getCurrentSessionUser, isReadOnlyRole } from "@/lib/rbac";
import { getRsaOverview } from "@/lib/rsa-source";

export const dynamic = "force-dynamic";

export default async function CompanyRsaPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ from?: string; mode?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const overview = await getRsaOverview(decodeURIComponent(id));
  const sessionUser = await getCurrentSessionUser();

  if (!overview) {
    notFound();
  }

  const confirmed = overview.existingRsa?.status === "Confirmed";
  const readOnly =
    isReadOnlyRole(sessionUser?.role) ||
    (Boolean(overview.existingRsa) && (query.from === "reports" || query.mode === "view"));

  return (
    <>
      <PageHeader
        title={`${overview.company.name} RSA`}
        eyebrow={overview.company.id}
        description={overview.company.role}
        action={
          overview.existingRsa ? (
            <StatusBadge tone={confirmed ? "selected" : "warning"}>
              {overview.existingRsa.status}
            </StatusBadge>
          ) : (
            <StatusBadge tone="muted">Not generated</StatusBadge>
          )
        }
      />

      <section className="mb-7 rounded-[8px] border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid gap-3 text-sm md:grid-cols-2 xl:grid-cols-4">
          <Info label="Company ID" value={overview.company.id} />
          <Info label="Role" value={overview.company.role || "-"} />
          <Info label="Location" value={overview.company.location || "-"} />
          <Info
            label="JD Summary"
            value={
              overview.company.expectedSkills.length
                ? overview.company.expectedSkills.join(", ")
                : overview.company.jdDetails || "-"
            }
          />
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <StatCard
          label="Total Applications"
          value={overview.stats.totalApplications}
          hint="Company ID matched"
          icon={BriefcaseBusiness}
        />
        <StatCard
          label="Selected"
          value={overview.stats.selectedCount}
          hint="Status or stage selected"
          icon={CheckCircle2}
        />
        <StatCard
          label="Rejected"
          value={overview.stats.rejectedCount}
          hint="Status or stage rejected"
          icon={XCircle}
        />
        <StatCard
          label="In Progress"
          value={overview.stats.inProgressCount}
          hint="Active applications"
          icon={Clock3}
        />
        <StatCard
          label="Dropped"
          value={overview.stats.droppedCount}
          hint="Dropped records"
          icon={FileText}
        />
      </div>

      <div className="mt-7">
        <CompanyRsaWorkspace
          companyId={overview.company.id}
          companyName={overview.company.name}
          role={overview.company.role}
          existingRsa={overview.existingRsa}
          history={overview.history}
          readOnly={readOnly}
        />
      </div>
    </>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[8px] bg-slate-50 p-3">
      <p className="text-xs font-bold uppercase text-slate-500">{label}</p>
      <p className="mt-1 line-clamp-3 font-semibold leading-6 text-slate-900">
        {value}
      </p>
    </div>
  );
}
