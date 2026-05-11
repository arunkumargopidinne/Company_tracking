import type { Application } from "./mock-data";

export type CalculatedCompanyStatus = "In Progress" | "Hiring Done" | "Dropped";

type ApplicationSummaryLike = {
  applied: number;
  inProgress: number;
  selected: number;
  rejected: number;
  dropped: number;
};

export function calculateCompanyStatus(
  applications: Pick<Application, "currentStage">[],
): CalculatedCompanyStatus {
  if (applications.length === 0) {
    return "In Progress";
  }

  const active = applications.some(
    (item) => !["SELECTED", "REJECTED", "DROPPED"].includes(item.currentStage),
  );

  if (active) {
    return "In Progress";
  }

  const selected = applications.some((item) => item.currentStage === "SELECTED");
  const allRejectedOrDropped = applications.every((item) =>
    ["REJECTED", "DROPPED"].includes(item.currentStage),
  );

  if (selected) {
    return "Hiring Done";
  }

  if (allRejectedOrDropped) {
    return "Dropped";
  }

  return "In Progress";
}

export function calculateCompanyStatusFromSummary(
  summary?: ApplicationSummaryLike,
): CalculatedCompanyStatus | null {
  if (!summary || summary.applied === 0) {
    return null;
  }

  if (summary.inProgress > 0) {
    return "In Progress";
  }

  if (summary.selected > 0) {
    return "Hiring Done";
  }

  if (summary.rejected + summary.dropped === summary.applied) {
    return "Dropped";
  }

  return "In Progress";
}
