import Link from "next/link";
import { notFound } from "next/navigation";
import {
  BriefcaseBusiness,
  CheckCircle2,
  FileText,
  MessageSquareText,
  XCircle,
} from "lucide-react";

import { AddApplicantForm } from "@/components/forms/add-applicant-form";
import { DeleteApplicantButton } from "@/components/forms/delete-applicant-button";
import { EditCompanyForm } from "@/components/forms/edit-company-form";
import { CompanyUpdatesPanel } from "@/components/company-updates-panel";
import { JDViewButton } from "@/components/jd-view-button";
import { PipelineBoard } from "@/components/pipeline/pipeline-board";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { StatusBadge } from "@/components/status-badge";
import { getCompanyPipelineData } from "@/lib/application-source";
import { getCompanyUpdates } from "@/lib/company-updates-source";
import { getCompanyForDashboard } from "@/lib/company-source";
import { stageLabel } from "@/lib/pipeline";
import { can, getCurrentSessionUser, isReadOnlyRole } from "@/lib/rbac";
import { getLatestRsaForCompany } from "@/lib/rsa-source";

export const dynamic = "force-dynamic";

export default async function CompanyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const company = await getCompanyForDashboard(id);

  if (!company) {
    notFound();
  }

  const [pipelineData, latestRsa, updates, sessionUser] = await Promise.all([
    getCompanyPipelineData(company.id),
    getLatestRsaForCompany(company.id),
    getCompanyUpdates(company.id),
    getCurrentSessionUser(),
  ]);
  const {
    applications: companyApplications,
    students,
    summary,
  } = pipelineData;
  const readOnly = isReadOnlyRole(sessionUser?.role);
  const canCreateDailyUpdates = can(sessionUser?.role, "company_updates");
  const rsaButtonLabel =
    latestRsa?.status === "Confirmed"
      ? "View RSA"
      : latestRsa
        ? "Continue RSA"
        : "Open RSA";

  return (
    <>
      <PageHeader
        title={company.name}
        eyebrow={company.jdTitle}
        action={
          <div className="flex flex-wrap gap-2">
            <JDViewButton
              companyName={company.name}
              role={company.jdTitle}
              jdContent={company.jdDetails}
              jdLink={company.jdLink}
            />
            {!readOnly ? <EditCompanyForm company={company} /> : null}
            {!readOnly ? (
              <AddApplicantForm companyId={company.id} companyName={company.name} />
            ) : null}
            <Link
              href={`/companies/${company.id}/rsa`}
              className="inline-flex h-12 items-center gap-2 rounded-[8px] border border-slate-200 bg-white px-5 text-sm font-bold text-slate-700 shadow-sm hover:border-indigo-300 hover:text-indigo-600"
            >
              <MessageSquareText className="h-4 w-4" aria-hidden="true" />
              {rsaButtonLabel}
            </Link>
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Assigned" value={summary.applied} hint="Students mapped" icon={BriefcaseBusiness} />
        <StatCard label="In Progress" value={summary.inProgress} hint="Active round cards" icon={FileText} />
        <StatCard label="Selected" value={summary.selected} hint="Offer/selection done" icon={CheckCircle2} />
        <StatCard label="Rejected" value={summary.rejected} hint="Remarks required" icon={XCircle} />
      </div>

      <section className="mt-7 rounded-[8px] border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-xl font-black text-slate-950">JD Details</h2>
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2 xl:grid-cols-3">
          <Info label="Tech Stack" value={company.techStack.join(", ")} />
          <Info label="CRM" value={company.crm} />
          <Info label="Location" value={company.location || "-"} />
          <Info label="CTC" value={company.ctc || company.stipend || "-"} />
          <Info label="Job Type" value={company.jobType || company.internshipDuration || "-"} />
          <Info label="Bond" value={formatBond(company.bond)} />
          <Info label="Date of Confirmation" value={company.confirmationDate || "-"} />
          <Info
            label="Rollout Batches"
            value={company.rolloutBatches?.length ? company.rolloutBatches.join(", ") : "-"}
          />
        </dl>
      </section>

      <CompanyUpdatesPanel
        companyId={company.id}
        updates={updates}
        canCreate={canCreateDailyUpdates}
      />

      <div className="mt-7">
        <PipelineBoard
          key={companyApplications
            .map((application) => `${application.id}:${application.currentStage}`)
            .join("|")}
          companyId={company.id}
          applications={companyApplications}
          students={students}
          readOnly={readOnly}
        />
      </div>

      <section className="mt-7 rounded-[8px] border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-black text-slate-950">Applications</h2>
          <p className="text-sm font-semibold text-slate-500">
            Added candidates are stored in the Applications sheet.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[850px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-3 py-3">Full Name</th>
                <th className="px-3 py-3">Email</th>
                <th className="px-3 py-3">Phone Number</th>
                <th className="px-3 py-3">Resume</th>
                <th className="px-3 py-3">Current Round</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-3 py-3">Remarks</th>
                <th className="px-3 py-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {companyApplications.map((application) => {
                const student = students.find((item) => item.id === application.studentId);
                return (
                  <tr key={application.id}>
                    <td className="px-3 py-3 font-bold text-slate-950">{student?.name}</td>
                    <td className="px-3 py-3 text-slate-600">{student?.email}</td>
                    <td className="px-3 py-3 text-slate-600">{student?.phone}</td>
                    <td className="px-3 py-3">
                      {student?.resumeUrl ? (
                        <a
                          href={student.resumeUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="font-bold text-indigo-600"
                        >
                          Resume
                        </a>
                      ) : (
                        <span className="text-slate-400">Pending</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-slate-600">
                      {stageLabel(application.currentStage)}
                    </td>
                    <td className="px-3 py-3">
                      <StatusBadge
                        tone={
                          application.currentStage === "SELECTED"
                            ? "selected"
                            : application.currentStage === "REJECTED"
                              ? "rejected"
                              : "progress"
                        }
                      >
                        {student?.pipelineStatus ?? "In Progress"}
                      </StatusBadge>
                    </td>
                    <td className="px-3 py-3 text-slate-600">{application.remarks}</td>
                    <td className="px-3 py-3">
                      {!readOnly ? (
                        <DeleteApplicantButton applicationId={application.id} />
                      ) : (
                        <span className="text-xs font-semibold text-slate-400">Read only</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-7 grid gap-5 lg:grid-cols-2">
        <div className="rounded-[8px] border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-black text-slate-950">Selected Students</h2>
          <div className="mt-4 space-y-3">
            {companyApplications
              .filter((application) => application.currentStage === "SELECTED")
              .map((application) => (
                <div key={application.id} className="rounded-[8px] bg-emerald-50 p-3">
                  <p className="font-bold text-emerald-950">
                    {students.find((student) => student.id === application.studentId)?.name ??
                      application.studentId}
                  </p>
                  <p className="text-sm text-emerald-700">
                    Selected in {stageLabel(application.selectedRound ?? "SELECTED")} on{" "}
                    {application.selectedAt}
                  </p>
                </div>
              ))}
          </div>
        </div>

        <div className="rounded-[8px] border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-black text-slate-950">Rejected Students</h2>
          <div className="mt-4 space-y-3">
            {companyApplications
              .filter((application) => application.currentStage === "REJECTED")
              .map((application) => (
                <div key={application.id} className="rounded-[8px] bg-rose-50 p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-bold text-rose-950">
                      {students.find((student) => student.id === application.studentId)?.name ??
                        application.studentId}
                    </p>
                    <StatusBadge tone="rejected">
                      {stageLabel(application.rejectedAtRound ?? "REJECTED")}
                    </StatusBadge>
                  </div>
                  <p className="mt-1 text-sm text-rose-700">
                    Reason: {application.rejectionReason}
                  </p>
                </div>
              ))}
          </div>
        </div>
      </section>
    </>
  );
}

function formatBond(value?: string) {
  const bond = value?.trim();

  if (!bond) {
    return "Not specified";
  }

  if (/\b(no|none|nil|n\/a|not applicable)\b/i.test(bond)) {
    return "No bond";
  }

  return `Yes - ${bond}`;
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[8px] bg-slate-50 p-3">
      <dt className="text-xs font-bold uppercase text-slate-500">{label}</dt>
      <dd className="mt-1 font-semibold text-slate-900">{value}</dd>
    </div>
  );
}
