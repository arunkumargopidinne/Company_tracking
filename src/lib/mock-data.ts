import {
  PIPELINE_STAGES,
  PipelineStageId,
  RoundOutcome,
  stageLabel,
} from "./pipeline";

export type Company = {
  id: string;
  name: string;
  techStack: string[];
  jdTitle: string;
  jdLink: string;
  jdDetails: string;
  expectedSkills: string[];
  jobType?: string;
  internshipDuration?: string;
  ctc?: string;
  stipend?: string;
  openings?: string;
  rounds: PipelineStageId[];
  crm: string;
  location: string;
  confirmationDate: string;
  interviewScheduledStatus: "Scheduled" | "Not Scheduled" | "Completed";
  currentStatus:
    | "Upcoming"
    | "In Progress"
    | "Hiring Done"
    | "Selected"
    | "Rejected All"
    | "Dropped";
  remarks: string;
  loadedDate?: string;
  eligibility?: string;
  interviewMode?: string;
  interviewProcess?: string;
  workDetails?: string;
  bond?: string;
  rolloutBatches?: string[];
  sheetRowNumber?: number;
};

export type Student = {
  id: string;
  studentId: string;
  name: string;
  email: string;
  phone: string;
  resumeUrl?: string;
  pipelineStatus?: "In Progress" | "Rejected" | "Selected" | "Dropped";
  primaryStack: string[];
  benchmarkStatus: "Cleared" | "Not Cleared" | "Not Taken";
  assessmentStatus: "Cleared" | "Not Cleared" | "Not Taken";
  remarks: string;
};

export type RoundEntry = {
  stage: PipelineStageId;
  outcome: RoundOutcome;
  remarks?: string;
  changedAt: string;
};

export type Application = {
  id: string;
  companyId: string;
  studentId: string;
  currentStage: PipelineStageId;
  currentOutcome: RoundOutcome;
  remarks: string;
  rejectedAtRound?: PipelineStageId;
  rejectionReason?: string;
  selectedRound?: PipelineStageId;
  selectedAt?: string;
  droppedStage?: PipelineStageId;
  droppedReason?: string;
  roundStatuses: RoundEntry[];
};

export type RSAReport = {
  companyId: string;
  adminRemarks: string;
  aiSummary: string;
  hiringSummary: string;
  studentPerformanceSummary: string;
  roundWiseRejectionAnalysis: string;
  selectionAnalysis: string;
  skillGapAnalysis: string;
  benchmarkingAnalysis: string;
  assessmentAnalysis: string;
  improvementSuggestions: string;
};

export type AuditLog = {
  id: string;
  at: string;
  actor: string;
  action: string;
  entity: string;
  message: string;
};

export const companies: Company[] = [
  {
    id: "freedom-ai",
    name: "Freedom with AI",
    techStack: ["Python", "Django", "PostgreSQL", "React", "AI Tools"],
    jdTitle: "Backend AI Product Engineer",
    jdLink: "https://example.com/jd/freedom-ai",
    jdDetails:
      "Build backend services for AI-assisted workflows, integrate APIs, and ship dashboards for enterprise clients.",
    expectedSkills: ["Django basics", "REST APIs", "SQL", "React dashboards", "prompting"],
    rounds: [
      "APPLIED",
      "RESUME_SCREENING",
      "ASSESSMENT_ROUND",
      "TECHNICAL_ROUND_1",
      "TECHNICAL_ROUND_2",
      "HR_ROUND",
      "SELECTED",
      "REJECTED",
    ],
    crm: "Google Sheets",
    location: "Hyderabad",
    confirmationDate: "2026-05-03",
    interviewScheduledStatus: "Scheduled",
    currentStatus: "In Progress",
    remarks: "Backend fundamentals are the primary screening signal.",
  },
  {
    id: "tata-frontend",
    name: "TATA",
    techStack: ["HTML", "CSS", "JavaScript", "React", "Tailwind"],
    jdTitle: "Frontend Developer",
    jdLink: "https://example.com/jd/tata-frontend",
    jdDetails:
      "Develop responsive UI components, consume APIs, and maintain production dashboards.",
    expectedSkills: ["React components", "CSS layout", "API integration", "Git"],
    rounds: [
      "APPLIED",
      "RESUME_SCREENING",
      "ASSIGNMENT_ROUND",
      "TECHNICAL_ROUND_1",
      "HR_ROUND",
      "SELECTED",
      "REJECTED",
    ],
    crm: "Manual",
    location: "Hydra",
    confirmationDate: "2026-04-29",
    interviewScheduledStatus: "Completed",
    currentStatus: "Selected",
    remarks: "One offer released; one student rejected for layout fundamentals.",
  },
  {
    id: "cloudnova",
    name: "CloudNova Labs",
    techStack: ["Java", "Spring Boot", "AWS", "Docker", "SQL"],
    jdTitle: "Cloud Trainee Engineer",
    jdLink: "https://example.com/jd/cloudnova",
    jdDetails:
      "Support cloud migrations, write Spring Boot services, and troubleshoot deployments.",
    expectedSkills: ["Java OOP", "Spring Boot", "Linux basics", "AWS fundamentals"],
    rounds: [
      "APPLIED",
      "TELEPHONIC_SCREENING",
      "ASSESSMENT_ROUND",
      "MANAGER_ROUND",
      "HR_ROUND",
      "SELECTED",
      "REJECTED",
    ],
    crm: "HubSpot",
    location: "Bengaluru",
    confirmationDate: "2026-05-08",
    interviewScheduledStatus: "Not Scheduled",
    currentStatus: "Upcoming",
    remarks: "Awaiting assessment slot confirmation.",
  },
  {
    id: "finedge",
    name: "FinEdge Analytics",
    techStack: ["Python", "Pandas", "SQL", "Power BI", "Excel"],
    jdTitle: "Data Analyst Trainee",
    jdLink: "https://example.com/jd/finedge",
    jdDetails:
      "Analyze customer data, prepare dashboards, and explain insights to business stakeholders.",
    expectedSkills: ["SQL joins", "Pandas", "data cleaning", "visual storytelling"],
    rounds: [
      "APPLIED",
      "GROUP_DISCUSSION",
      "ASSESSMENT_ROUND",
      "TECHNICAL_ROUND_1",
      "HR_ROUND",
      "SELECTED",
      "REJECTED",
    ],
    crm: "Google Sheets",
    location: "Remote",
    confirmationDate: "2026-04-24",
    interviewScheduledStatus: "Completed",
    currentStatus: "Rejected All",
    remarks: "All students struggled with SQL window functions.",
  },
];

export const students: Student[] = [
  {
    id: "navya",
    studentId: "STU-1001",
    name: "Navya",
    email: "navya@example.edu",
    phone: "+91 90000 10001",
    primaryStack: ["Python", "Django", "React"],
    benchmarkStatus: "Cleared",
    assessmentStatus: "Cleared",
    remarks: "Strong debugging and API design.",
  },
  {
    id: "arjun",
    studentId: "STU-1002",
    name: "Arjun",
    email: "arjun@example.edu",
    phone: "+91 90000 10002",
    primaryStack: ["React", "JavaScript", "Tailwind"],
    benchmarkStatus: "Cleared",
    assessmentStatus: "Cleared",
    remarks: "Best frontend score in the current cohort.",
  },
  {
    id: "meera",
    studentId: "STU-1003",
    name: "Meera",
    email: "meera@example.edu",
    phone: "+91 90000 10003",
    primaryStack: ["Python", "SQL", "Power BI"],
    benchmarkStatus: "Not Cleared",
    assessmentStatus: "Not Cleared",
    remarks: "Needs practice on joins and scenario questions.",
  },
  {
    id: "kiran",
    studentId: "STU-1004",
    name: "Kiran",
    email: "kiran@example.edu",
    phone: "+91 90000 10004",
    primaryStack: ["Java", "Spring Boot", "AWS"],
    benchmarkStatus: "Cleared",
    assessmentStatus: "Not Taken",
    remarks: "Good Java fundamentals; cloud interview pending.",
  },
  {
    id: "priya",
    studentId: "STU-1005",
    name: "Priya",
    email: "priya@example.edu",
    phone: "+91 90000 10005",
    primaryStack: ["Python", "Django", "PostgreSQL"],
    benchmarkStatus: "Cleared",
    assessmentStatus: "Cleared",
    remarks: "Calm in interviews; good schema design.",
  },
  {
    id: "rahul",
    studentId: "STU-1006",
    name: "Rahul",
    email: "rahul@example.edu",
    phone: "+91 90000 10006",
    primaryStack: ["React", "Node.js", "MongoDB"],
    benchmarkStatus: "Not Cleared",
    assessmentStatus: "Cleared",
    remarks: "Strong projects, inconsistent verbal answers.",
  },
  {
    id: "sana",
    studentId: "STU-1007",
    name: "Sana",
    email: "sana@example.edu",
    phone: "+91 90000 10007",
    primaryStack: ["SQL", "Excel", "Power BI"],
    benchmarkStatus: "Cleared",
    assessmentStatus: "Cleared",
    remarks: "Good business explanations.",
  },
  {
    id: "vivek",
    studentId: "STU-1008",
    name: "Vivek",
    email: "vivek@example.edu",
    phone: "+91 90000 10008",
    primaryStack: ["Java", "Docker", "Linux"],
    benchmarkStatus: "Not Taken",
    assessmentStatus: "Not Taken",
    remarks: "Recently added from Google Sheets import.",
  },
];

export const applications: Application[] = [
  {
    id: "app-navya-freedom",
    companyId: "freedom-ai",
    studentId: "navya",
    currentStage: "TECHNICAL_ROUND_2",
    currentOutcome: "PENDING",
    remarks: "Cleared TR1 with strong REST API answers.",
    roundStatuses: [
      entry("APPLIED", "SELECTED", "Profile mapped from sheet."),
      entry("RESUME_SCREENING", "SELECTED", "Projects matched JD."),
      entry("ASSESSMENT_ROUND", "SELECTED", "Scored 82%."),
      entry("TECHNICAL_ROUND_1", "SELECTED", "Good API reasoning."),
      entry("TECHNICAL_ROUND_2", "PENDING", "Panel feedback pending."),
    ],
  },
  {
    id: "app-priya-freedom",
    companyId: "freedom-ai",
    studentId: "priya",
    currentStage: "SELECTED",
    currentOutcome: "SELECTED",
    remarks: "Selected after HR; joining date expected next week.",
    selectedRound: "HR_ROUND",
    selectedAt: "2026-05-04",
    roundStatuses: [
      entry("APPLIED", "SELECTED"),
      entry("RESUME_SCREENING", "SELECTED"),
      entry("ASSESSMENT_ROUND", "SELECTED", "Scored 88%."),
      entry("TECHNICAL_ROUND_1", "SELECTED", "Strong Django basics."),
      entry("TECHNICAL_ROUND_2", "SELECTED", "Handled database questions."),
      entry("HR_ROUND", "SELECTED", "Offer recommended."),
    ],
  },
  {
    id: "app-rahul-freedom",
    companyId: "freedom-ai",
    studentId: "rahul",
    currentStage: "REJECTED",
    currentOutcome: "REJECTED",
    remarks: "Rejected in TR1. Reason: Weak in backend Django basics.",
    rejectedAtRound: "TECHNICAL_ROUND_1",
    rejectionReason: "Weak in backend Django basics.",
    roundStatuses: [
      entry("APPLIED", "SELECTED"),
      entry("RESUME_SCREENING", "SELECTED"),
      entry("ASSESSMENT_ROUND", "SELECTED", "Frontend tasks were good."),
      entry("TECHNICAL_ROUND_1", "REJECTED", "Weak in backend Django basics."),
    ],
  },
  {
    id: "app-meera-freedom",
    companyId: "freedom-ai",
    studentId: "meera",
    currentStage: "ASSESSMENT_ROUND",
    currentOutcome: "PENDING",
    remarks: "Assessment retake approved by placement admin.",
    roundStatuses: [
      entry("APPLIED", "SELECTED"),
      entry("RESUME_SCREENING", "SELECTED"),
      entry("ASSESSMENT_ROUND", "PENDING", "Retake pending."),
    ],
  },
  {
    id: "app-arjun-tata",
    companyId: "tata-frontend",
    studentId: "arjun",
    currentStage: "SELECTED",
    currentOutcome: "SELECTED",
    remarks: "Selected for frontend developer.",
    selectedRound: "HR_ROUND",
    selectedAt: "2026-04-30",
    roundStatuses: [
      entry("APPLIED", "SELECTED"),
      entry("RESUME_SCREENING", "SELECTED"),
      entry("ASSIGNMENT_ROUND", "SELECTED", "Built responsive dashboard."),
      entry("TECHNICAL_ROUND_1", "SELECTED", "Good React answer."),
      entry("HR_ROUND", "SELECTED", "Offer released."),
    ],
  },
  {
    id: "app-rahul-tata",
    companyId: "tata-frontend",
    studentId: "rahul",
    currentStage: "REJECTED",
    currentOutcome: "REJECTED",
    remarks: "Rejected in assignment. Reason: CSS layout broke on mobile.",
    rejectedAtRound: "ASSIGNMENT_ROUND",
    rejectionReason: "CSS layout broke on mobile.",
    roundStatuses: [
      entry("APPLIED", "SELECTED"),
      entry("RESUME_SCREENING", "SELECTED"),
      entry("ASSIGNMENT_ROUND", "REJECTED", "CSS layout broke on mobile."),
    ],
  },
  {
    id: "app-kiran-cloudnova",
    companyId: "cloudnova",
    studentId: "kiran",
    currentStage: "APPLIED",
    currentOutcome: "PENDING",
    remarks: "Waiting for telephonic screening slot.",
    roundStatuses: [entry("APPLIED", "PENDING")],
  },
  {
    id: "app-vivek-cloudnova",
    companyId: "cloudnova",
    studentId: "vivek",
    currentStage: "APPLIED",
    currentOutcome: "PENDING",
    remarks: "Imported from sheet on latest sync.",
    roundStatuses: [entry("APPLIED", "PENDING")],
  },
  {
    id: "app-meera-finedge",
    companyId: "finedge",
    studentId: "meera",
    currentStage: "REJECTED",
    currentOutcome: "REJECTED",
    remarks: "Rejected in assessment. Reason: SQL window functions.",
    rejectedAtRound: "ASSESSMENT_ROUND",
    rejectionReason: "SQL window functions and time management.",
    roundStatuses: [
      entry("APPLIED", "SELECTED"),
      entry("GROUP_DISCUSSION", "SELECTED", "Good communication."),
      entry("ASSESSMENT_ROUND", "REJECTED", "SQL window functions and time management."),
    ],
  },
  {
    id: "app-sana-finedge",
    companyId: "finedge",
    studentId: "sana",
    currentStage: "REJECTED",
    currentOutcome: "REJECTED",
    remarks: "Rejected in TR1. Reason: Could not explain data cleaning choices.",
    rejectedAtRound: "TECHNICAL_ROUND_1",
    rejectionReason: "Could not explain data cleaning choices.",
    roundStatuses: [
      entry("APPLIED", "SELECTED"),
      entry("GROUP_DISCUSSION", "SELECTED", "Strong discussion."),
      entry("ASSESSMENT_ROUND", "SELECTED", "Scored 76%."),
      entry("TECHNICAL_ROUND_1", "REJECTED", "Could not explain data cleaning choices."),
    ],
  },
];

export const rsaReports: RSAReport[] = [
  {
    companyId: "freedom-ai",
    adminRemarks:
      "Panel repeatedly tested Django fundamentals, REST API design, and SQL query confidence.",
    aiSummary:
      "Most students handled early screening well, but backend concepts separated selected candidates from rejected candidates.",
    hiringSummary:
      "Freedom with AI prioritized practical backend readiness over project volume.",
    studentPerformanceSummary:
      "Priya and Navya showed strong Django and API reasoning. Rahul struggled when the discussion moved from frontend to backend.",
    roundWiseRejectionAnalysis:
      "The main rejection point was Technical Round 1, especially around Django basics and API design.",
    selectionAnalysis:
      "Selected students had cleared assessments, gave structured answers, and connected projects to the JD.",
    skillGapAnalysis:
      "The cohort needs a focused refresh on Django views, serializers, ORM queries, and deployment basics.",
    benchmarkingAnalysis:
      "Benchmark-cleared students performed better in technical conversations and progressed further.",
    assessmentAnalysis:
      "Students scoring above 80% in assessment showed stronger interview confidence.",
    improvementSuggestions:
      "Run a Django-focused preparation sprint before similar drives and add backend mock interviews.",
  },
  {
    companyId: "finedge",
    adminRemarks:
      "Company expected applied SQL and business explanation, not just dashboard tool familiarity.",
    aiSummary:
      "Students communicated well but lacked depth in SQL window functions and data cleaning decisions.",
    hiringSummary:
      "FinEdge Analytics rejected all students after technical validation.",
    studentPerformanceSummary:
      "Sana had strong communication. Meera needs more timed SQL practice.",
    roundWiseRejectionAnalysis:
      "Assessment and TR1 were the rejection-heavy rounds.",
    selectionAnalysis: "No final selections were made for this drive.",
    skillGapAnalysis:
      "SQL analytics, window functions, and explaining data trade-offs were the biggest gaps.",
    benchmarkingAnalysis:
      "Benchmarking did not fully predict applied SQL interview performance for this company.",
    assessmentAnalysis:
      "Assessment failures correlated with final rejection, especially on timed SQL.",
    improvementSuggestions:
      "Add daily SQL drills, case-study reviews, and mock explanations for data cleaning workflows.",
  },
];

export const auditLogs: AuditLog[] = [
  {
    id: "audit-1",
    at: "2026-05-05 18:20",
    actor: "Admin",
    action: "MOVE",
    entity: "Freedom with AI",
    message: "Navya moved from TR1 to TR2; Google Sheets sync queued.",
  },
  {
    id: "audit-2",
    at: "2026-05-05 17:42",
    actor: "Admin",
    action: "REJECT",
    entity: "TATA",
    message: "Rahul rejected in Assignment Round with mobile CSS remarks.",
  },
  {
    id: "audit-3",
    at: "2026-05-05 16:10",
    actor: "System",
    action: "SYNC",
    entity: "CloudNova Labs",
    message: "Vivek added from Google Sheets import.",
  },
  {
    id: "audit-4",
    at: "2026-05-05 15:35",
    actor: "Admin",
    action: "RSA_GENERATE",
    entity: "Freedom with AI",
    message: "RSA report regenerated with latest admin remarks.",
  },
];

function entry(
  stage: PipelineStageId,
  outcome: RoundOutcome,
  remarks = "",
): RoundEntry {
  return {
    stage,
    outcome,
    remarks,
    changedAt: "2026-05-05",
  };
}

export function getCompany(id: string) {
  return companies.find((company) => company.id === id);
}

export function getStudent(id: string) {
  return students.find((student) => student.id === id);
}

export function getStudentName(studentId: string) {
  return getStudent(studentId)?.name ?? "Unknown student";
}

export function getCompanyName(companyId: string) {
  return getCompany(companyId)?.name ?? "Unknown company";
}

export function getCompanyApplications(companyId: string) {
  return applications.filter((application) => application.companyId === companyId);
}

export function getStudentApplications(studentId: string) {
  return applications.filter((application) => application.studentId === studentId);
}

export function getRsaReport(companyId: string) {
  return rsaReports.find((report) => report.companyId === companyId);
}

export function companySummary(companyId: string) {
  const items = getCompanyApplications(companyId);
  return {
    applied: items.length,
    inProgress: items.filter(
      (item) => !["SELECTED", "REJECTED", "DROPPED"].includes(item.currentStage),
    ).length,
    selected: items.filter((item) => item.currentStage === "SELECTED").length,
    rejected: items.filter((item) => item.currentStage === "REJECTED").length,
    dropped: items.filter((item) => item.currentStage === "DROPPED").length,
  };
}

export function studentSummary(studentId: string) {
  const items = getStudentApplications(studentId);
  return {
    applied: items.length,
    inProgress: items.filter(
      (item) => !["SELECTED", "REJECTED", "DROPPED"].includes(item.currentStage),
    ).length,
    rejected: items.filter((item) => item.currentStage === "REJECTED").length,
    selected: items.filter((item) => item.currentStage === "SELECTED").length,
  };
}

export function roundRejectionCounts(companyId?: string) {
  const source = companyId
    ? applications.filter((application) => application.companyId === companyId)
    : applications;

  return PIPELINE_STAGES.map((stage) => ({
    round: stage.label,
    count: source.filter((application) => application.rejectedAtRound === stage.id)
      .length,
  })).filter((item) => item.count > 0);
}

export function studentRejectionCounts() {
  return students.map((student) => ({
    student: student.name,
    count: applications.filter(
      (application) =>
        application.studentId === student.id &&
        application.currentStage === "REJECTED",
    ).length,
  }));
}

export function companySelectionRatios() {
  return companies.map((company) => {
    const summary = companySummary(company.id);
    return {
      company: company.name,
      ratio: summary.applied ? Math.round((summary.selected / summary.applied) * 100) : 0,
    };
  });
}

export function dashboardStats() {
  return {
    companies: companies.length,
    upcoming: companies.filter((company) => company.currentStatus === "Upcoming").length,
    inProgress: companies.filter((company) => company.currentStatus === "In Progress").length,
    selectedCompanies: companies.filter(
      (company) =>
        company.currentStatus === "Selected" || company.currentStatus === "Hiring Done",
    ).length,
    rejectedAll: companies.filter((company) => company.currentStatus === "Rejected All").length,
    students: students.length,
    activeApplications: applications.filter(
      (application) =>
        !["SELECTED", "REJECTED", "DROPPED"].includes(application.currentStage),
    ).length,
    selectedStudents: new Set(
      applications
        .filter((application) => application.currentStage === "SELECTED")
        .map((application) => application.studentId),
    ).size,
  };
}

export function stakeholderOverview(companyId: string) {
  const company = getCompany(companyId);
  const apps = getCompanyApplications(companyId);
  const involvedStudents = apps
    .map((application) => getStudent(application.studentId))
    .filter(Boolean) as Student[];

  return {
    asked: company?.expectedSkills.join(", ") ?? "",
    expected: company?.jdDetails ?? "",
    knew: involvedStudents
      .filter((student) => student.benchmarkStatus === "Cleared")
      .flatMap((student) => student.primaryStack)
      .slice(0, 8)
      .join(", "),
    didNotKnow: apps
      .map((application) => application.rejectionReason)
      .filter(Boolean)
      .join("; "),
    benchmarkCleared: involvedStudents.filter(
      (student) => student.benchmarkStatus === "Cleared",
    ).length,
    benchmarkNotCleared: involvedStudents.filter(
      (student) => student.benchmarkStatus !== "Cleared",
    ).length,
    assessmentCleared: involvedStudents.filter(
      (student) => student.assessmentStatus === "Cleared",
    ).length,
    assessmentFailed: involvedStudents.filter(
      (student) => student.assessmentStatus === "Not Cleared",
    ).length,
    rejectedBecause: apps
      .filter((application) => application.currentStage === "REJECTED")
      .map(
        (application) =>
          `${getStudentName(application.studentId)}: ${stageLabel(
            application.rejectedAtRound ?? "REJECTED",
          )} - ${application.rejectionReason}`,
      ),
    selectedBecause: apps
      .filter((application) => application.currentStage === "SELECTED")
      .map(
        (application) =>
          `${getStudentName(application.studentId)}: cleared ${stageLabel(
            application.selectedRound ?? "SELECTED",
          )}`,
      ),
  };
}
