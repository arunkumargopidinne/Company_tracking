import type { PipelineStageId } from "./pipeline";
import { stageLabel } from "./pipeline";

export type StudentApplicationRecord = {
  applicationId: string;
  rowNumber?: number;
  uid: string;
  studentCode?: string;
  candidateId?: string;
  studentName: string;
  phoneNumber: string;
  email: string;
  companyId: string;
  companyName: string;
  currentStage: PipelineStageId;
  status: "In Progress" | "Rejected" | "Selected" | "Dropped";
  rejectedRound?: PipelineStageId;
  rejectionReason?: string;
  selectedDate?: string;
  updatedAt?: string;
  remarks: string;
};

export type StudentPipelineStatus = "Hired" | "Rejected" | "In Progress";

export type StudentPipelineCardData = {
  uid: string;
  studentName: string;
  phoneNumber: string;
  email: string;
  activeCount: number;
  rejectedCount: number;
  selectedCount: number;
  status: StudentPipelineStatus;
  applications: StudentApplicationRecord[];
};

export type StudentFilters = {
  search?: string;
  companyId?: string;
  status?: "all" | StudentPipelineStatus;
};

export function groupApplicationsByUID(
  applications: StudentApplicationRecord[],
): StudentPipelineCardData[] {
  const groups = new Map<string, StudentApplicationRecord[]>();

  for (const application of applications) {
    const key = application.uid || application.email || application.phoneNumber;
    const current = groups.get(key) ?? [];
    current.push(application);
    groups.set(key, current);
  }

  return Array.from(groups.entries())
    .map(([uid, items]) => {
      const selectedCount = items.filter((item) => item.status === "Selected").length;
      const rejectedCount = items.filter(
        (item) => item.status === "Rejected" || item.status === "Dropped",
      ).length;
      const activeCount = items.filter(
        (item) => item.status !== "Selected" && item.status !== "Rejected" && item.status !== "Dropped",
      ).length;
      const first = items[0];

      return {
        uid,
        studentName: first.studentName,
        phoneNumber: first.phoneNumber,
        email: first.email,
        activeCount,
        rejectedCount,
        selectedCount,
        status: calculateStudentStatus(items),
        applications: items,
      };
    })
    .sort((a, b) => a.studentName.localeCompare(b.studentName));
}

export function calculateStudentStatus(
  applications: Pick<StudentApplicationRecord, "status">[],
): StudentPipelineStatus {
  if (applications.some((item) => item.status === "Selected")) {
    return "Hired";
  }

  if (
    applications.length > 0 &&
    applications.every((item) => item.status === "Rejected" || item.status === "Dropped")
  ) {
    return "Rejected";
  }

  return "In Progress";
}

export function filterStudents(
  students: StudentPipelineCardData[],
  filters: StudentFilters,
) {
  const search = filters.search?.trim().toLowerCase() ?? "";

  return students.filter((student) => {
    const searchMatched =
      !search ||
      [student.studentName, student.uid, student.phoneNumber, student.email]
        .join(" ")
        .toLowerCase()
        .includes(search);
    const companyMatched =
      !filters.companyId ||
      student.applications.some((application) => application.companyId === filters.companyId);
    const statusMatched =
      !filters.status || filters.status === "all" || student.status === filters.status;

    return searchMatched && companyMatched && statusMatched;
  });
}

export function studentCompanyJourneyLabel(application: StudentApplicationRecord) {
  if (application.status === "Selected") return "Selected";
  if (application.status === "Rejected") return "Rejected";
  if (application.status === "Dropped") return "Dropped";
  return stageLabel(application.currentStage);
}
