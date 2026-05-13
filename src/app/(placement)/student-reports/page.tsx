import { StudentScoresView } from "@/components/student-scores-view";
import { PageHeader } from "@/components/page-header";

export const dynamic = "force-dynamic";

export default function StudentScoresPage() {
  return (
    <>
      <PageHeader
        title="Student Reports & Scores"
        description="Track student performance across benchmarking, assessments, and mentor evaluations. Filter by batch, YOG, and selection status."
      />
      <StudentScoresView />
    </>
  );
}
