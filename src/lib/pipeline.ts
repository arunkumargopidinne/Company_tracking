export const PIPELINE_STAGES = [
  { id: "APPLIED", label: "Applied" },
  { id: "RESUME_SCREENING", label: "Resume Screening" },
  { id: "TELEPHONIC_SCREENING", label: "Screening Call" },
  { id: "GROUP_DISCUSSION", label: "Group Discussion" },
  { id: "ASSIGNMENT_ROUND", label: "Assignment Round" },
  { id: "ASSESSMENT_ROUND", label: "Assessment Round" },
  { id: "TECHNICAL_ROUND_1", label: "Technical Round 1" },
  { id: "TECHNICAL_ROUND_2", label: "Technical Round 2" },
  { id: "MANAGER_ROUND", label: "Managerial / HR" },
  { id: "HR_ROUND", label: "HR Round" },
  { id: "SELECTED", label: "Selected" },
  { id: "REJECTED", label: "Rejected" },
  { id: "DROPPED", label: "Dropped" },
] as const;

export type PipelineStageId = (typeof PIPELINE_STAGES)[number]["id"];

export const PIPELINE_STAGE_IDS = PIPELINE_STAGES.map((stage) => stage.id) as [
  PipelineStageId,
  ...PipelineStageId[],
];

export const ROUND_OUTCOMES = [
  "SELECTED",
  "REJECTED",
  "NOT_APPLICABLE",
  "PENDING",
] as const;

export type RoundOutcome = (typeof ROUND_OUTCOMES)[number];

export const COMPANY_STATUSES = [
  "UPCOMING",
  "IN_PROGRESS",
  "INTERVIEW_SCHEDULED",
  "SELECTED",
  "REJECTED_ALL",
  "DROPPED",
  "CLOSED",
] as const;

export type CompanyStatus = (typeof COMPANY_STATUSES)[number];

export const stageLabel = (stage: PipelineStageId) =>
  PIPELINE_STAGES.find((item) => item.id === stage)?.label ?? stage;

export const compactStageLabel = (stage: PipelineStageId) =>
  stageLabel(stage)
    .replace("Technical Round", "TR")
    .replace("Assessment Round", "Assessment")
    .replace("Assignment Round", "Assignment")
    .replace("Resume Screening", "Resume");

export const activeHiringStages = PIPELINE_STAGES.filter(
  (stage) => !["SELECTED", "REJECTED", "DROPPED"].includes(stage.id),
);

export const terminalStages: PipelineStageId[] = [
  "SELECTED",
  "REJECTED",
  "DROPPED",
];

export const stageTone = (stage: PipelineStageId) => {
  if (stage === "SELECTED") return "selected";
  if (stage === "REJECTED") return "rejected";
  if (stage === "DROPPED") return "dropped";
  if (stage.includes("TECHNICAL")) return "technical";
  if (stage.includes("ASSESSMENT") || stage.includes("ASSIGNMENT")) {
    return "assessment";
  }
  return "progress";
};
