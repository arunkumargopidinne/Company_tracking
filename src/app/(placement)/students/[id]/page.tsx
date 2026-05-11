import { notFound } from "next/navigation";
import { Building2, CheckCircle2, Clock3, XCircle } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import {
  StudentApplicationsTable,
  type StudentApplicationTableRow,
} from "@/components/student-applications-table";
import { StatCard } from "@/components/stat-card";
import { getStudentPipelineFromApplications } from "@/lib/application-source";
import { getCompaniesForDashboard } from "@/lib/company-source";
import { stageLabel } from "@/lib/pipeline";

export const dynamic = "force-dynamic";

export default async function StudentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const studentId = decodeURIComponent(id);
  const [students, companies] = await Promise.all([
    getStudentPipelineFromApplications(),
    getCompaniesForDashboard(),
  ]);
  const student = students.find((item) => item.uid === studentId);

  if (!student) {
    notFound();
  }

  const companyById = new Map(companies.map((company) => [company.id, company]));
  const tableRows: StudentApplicationTableRow[] = student.applications.map((application) => {
    const company = companyById.get(application.companyId);

    return {
      applicationId: application.applicationId,
      companyId: application.companyId,
      companyName: application.companyName,
      role: company?.jdTitle ?? "-",
      applicationStatus: application.status,
      interviewRound: stageLabel(application.currentStage),
      finalStatus: finalStatus(application),
      updatedDate: formatDisplayDate(application.updatedAt),
      remarks: application.remarks,
      rejectionReason: application.rejectionReason,
      selectedDate: formatDisplayDate(application.selectedDate),
    };
  });

  return (
    <>
      <PageHeader
        title={student.studentName}
        eyebrow={student.uid}
        description={student.email || student.phoneNumber}
      />

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="Applied Companies" value={student.applications.length} hint="Total mappings" icon={Building2} />
        <StatCard label="In Progress" value={student.activeCount} hint="Active company rounds" icon={Clock3} />
        <StatCard label="Rejected" value={student.rejectedCount} hint="Rejected or dropped" icon={XCircle} />
        <StatCard label="Selected" value={student.selectedCount} hint="Offer/selection records" icon={CheckCircle2} />
      </div>

      <section className="mt-7 rounded-[8px] border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-xl font-black text-slate-950">Student Profile</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <Info label="UID" value={student.uid} />
          <Info label="Email" value={student.email || "-"} />
          <Info label="Phone" value={student.phoneNumber || "-"} />
          <Info label="Companies Applied" value={String(student.applications.length)} />
          <Info label="Selected" value={String(student.selectedCount)} />
          <Info label="Rejected" value={String(student.rejectedCount)} />
        </div>
      </section>

      <StudentApplicationsTable applications={tableRows} />
    </>
  );
}

function finalStatus(
  application: Awaited<ReturnType<typeof getStudentPipelineFromApplications>>[number]["applications"][number],
) {
  if (application.status === "Selected") return "Selected";
  if (application.status === "Dropped") return "Dropped";
  if (application.status === "Rejected") {
    return application.rejectedRound
      ? `Rejected - ${stageLabel(application.rejectedRound)}`
      : "Rejected";
  }

  return "In Progress";
}

function formatDisplayDate(value?: string) {
  if (!value) return "";

  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toLocaleDateString("en-IN");
  }

  return value;
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[8px] bg-slate-50 p-3">
      <p className="text-xs font-bold uppercase text-slate-500">{label}</p>
      <p className="mt-1 break-words font-semibold text-slate-900">{value}</p>
    </div>
  );
}
