import { BriefcaseBusiness, CheckCircle2, Clock3, XCircle } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { StudentPipelineView } from "@/components/student-pipeline-view";
import { getStudentPipelineFromApplications } from "@/lib/application-source";

export const dynamic = "force-dynamic";

export default async function ApplicationsPage() {
  const students = await getStudentPipelineFromApplications();
  const applications = students.flatMap((student) => student.applications);
  const selected = applications.filter((application) => application.status === "Selected").length;
  const rejected = applications.filter((application) => application.status === "Rejected").length;
  const inProgress = applications.filter(
    (application) => application.status === "In Progress",
  ).length;

  return (
    <>
      <PageHeader
        title="Applications"
        description="Track company-wise student applications by company ID and student ID."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Applications" value={applications.length} hint="Unique sheet rows" icon={BriefcaseBusiness} />
        <StatCard label="In Progress" value={inProgress} hint="Active rounds" icon={Clock3} />
        <StatCard label="Selected" value={selected} hint="Final selected" icon={CheckCircle2} />
        <StatCard label="Rejected" value={rejected} hint="Rejected records" icon={XCircle} />
      </div>

      <div className="mt-7">
        <StudentPipelineView students={students} />
      </div>
    </>
  );
}
