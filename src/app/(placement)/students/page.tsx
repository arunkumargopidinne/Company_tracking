import { CheckCircle2, GraduationCap, ListChecks, XCircle } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { StudentPipelineView } from "@/components/student-pipeline-view";
import { getStudentPipelineFromApplications } from "@/lib/application-source";

export const dynamic = "force-dynamic";

export default async function StudentsPage() {
  const students = await getStudentPipelineFromApplications();
  const hired = students.filter((student) => student.status === "Hired").length;
  const rejected = students.filter((student) => student.status === "Rejected").length;
  const inProgress = students.filter((student) => student.status === "In Progress").length;

  return (
    <>
      <PageHeader
        title="Student Pipeline"
        description="Unique students are grouped from the Applications sheet by UID, with company-wise stages and outcomes."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Unique Students" value={students.length} hint="Grouped by UID" icon={GraduationCap} />
        <StatCard label="Hired" value={hired} hint="At least one selected company" icon={CheckCircle2} />
        <StatCard label="Rejected" value={rejected} hint="All applications rejected" icon={XCircle} />
        <StatCard label="In Progress" value={inProgress} hint="At least one active application" icon={ListChecks} />
      </div>

      <div className="mt-7">
        <StudentPipelineView students={students} />
      </div>
    </>
  );
}
