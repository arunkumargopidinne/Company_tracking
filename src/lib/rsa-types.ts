export const RSA_TAG_OPTIONS = [
  "Communication Issue",
  "Resume Explanation Issue",
  "Project Explanation Issue",
  "Backend Gap",
  "Django Gap",
  "Java Gap",
  "Python Gap",
  "SQL Gap",
  "AWS Gap",
  "Docker Gap",
  "AI/ML Gap",
  "Deployment Gap",
  "Logic Building Gap",
  "Assessment Attendance Issue",
  "Benchmarking Mismatch",
  "Company Expectation Not Communicated Earlier",
  "Advanced Questions",
  "Students Not Trained On Expected Skill",
  "Strong Weekly Assessment Students Performed Better",
  "Benchmarking-Cleared Students Performed Better",
  "Prior Knowledge Candidates Preferred",
] as const;

export type RsaStatus = "Draft" | "Generated" | "Confirmed";

export type RsaAdminInputs = {
  candidateSharingStrategy: string;
  interviewFocus: string;
  companyExpectations: string;
  trainingGap: string;
  additionalAdminNotes: string;
  tags: string[];
};

export type RsaStats = {
  totalApplications: number;
  selectedCount: number;
  rejectedCount: number;
  inProgressCount: number;
  droppedCount: number;
};

export type RsaCompanyDetails = {
  id: string;
  name: string;
  role: string;
  jdDetails: string;
  jdLink: string;
  expectedSkills: string[];
  location: string;
  crm: string;
  currentStatus: string;
  remarks: string;
};

export type RsaApplicationStudent = {
  date: string;
  companyId: string;
  companyName: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  resume: string;
  currentStage: string;
  status: "Selected" | "Rejected" | "In Progress" | "Dropped";
  rejectedRound: string;
  rejectionReason: string;
  selectedDate: string;
  selectionReason: string;
  remarks: string;
  updatedAt: string;
  source: string;
  candidateId: string;
  studentId: string;
  degree: string;
  branch: string;
  passoutYear: string;
  percentage: string;
  applicationId: string;
};

export type RsaApplicationsSummary = {
  selectedStudents: RsaApplicationStudent[];
  rejectedStudents: RsaApplicationStudent[];
  inProgressStudents: RsaApplicationStudent[];
  droppedStudents: RsaApplicationStudent[];
};

export type RsaReportRecord = {
  rowNumber?: number;
  rsaId: string;
  companyId: string;
  companyName: string;
  generatedDate: string;
  generatedBy: string;
  adminInputs: RsaAdminInputs;
  stats: RsaStats;
  aiGeneratedRsa: string;
  finalEditedRsa: string;
  status: RsaStatus;
  confirmedAt: string;
  updatedAt: string;
};

