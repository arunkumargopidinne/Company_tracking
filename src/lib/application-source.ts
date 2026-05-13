import {
  Application,
  Student,
  applications as mockApplications,
  companies as mockCompanies,
  students as mockStudents,
} from "./mock-data";
import {
  appendSheetRows,
  deleteSheetRows,
  ensureSheetWithHeaders,
  getApplicationTrackingRange,
  readSheetRows,
  updateSheetRow,
} from "./google-sheets";
import { PipelineStageId, stageLabel } from "./pipeline";
import {
  groupApplicationsByUID,
  type StudentApplicationRecord,
} from "./student-pipeline";
export {
  calculateCompanyStatus,
  calculateCompanyStatusFromSummary,
  type CalculatedCompanyStatus,
} from "./company-status";

export type ApplicationSummary = {
  applied: number;
  inProgress: number;
  selected: number;
  rejected: number;
  dropped: number;
};

export type ApplicantInput = {
  companyId: string;
  companyName: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  resumeUrl: string;
  candidateId?: string;
  studentCode?: string;
  degree?: string;
  branch?: string;
  passoutYear?: string;
  percentage?: string;
  remarks?: string;
};

export type CompanyPipelineData = {
  applications: Application[];
  students: Student[];
  summary: ApplicationSummary;
};

const APPLICATION_CACHE_TTL_MS = 30_000;
let applicationRowsCache: { value: ApplicationRow[]; expiresAt: number } | null = null;

export function invalidateApplicationCache() {
  applicationRowsCache = null;
}

const APPLICATION_HEADERS = [
  "DATE",
  "Company ID",
  "Company Name",
  "Full Name",
  "Email",
  "Phone Number",
  "Resume",
  "Current Stage",
  "Status",
  "Rejected Round",
  "Rejection Reason",
  "Selected Date",
  "Remarks",
  "Updated At",
  "Source",
  "Candidate ID",
  "Student ID",
  "Degree",
  "Branch",
  "Passout Year",
  "Percentage",
  "Application ID",
];

export async function getCompanyPipelineData(
  companyId: string,
): Promise<CompanyPipelineData> {
  const sheetRows = await readApplicationRows();

  if (sheetRows.length > 0) {
    const rows = sheetRows.filter((row) => row.companyId === companyId);
    const students = rows.map(rowToStudent);
    const applications = rows.map(rowToApplication);

    return {
      applications,
      students,
      summary: summarizeApplications(applications),
    };
  }

  const applications = mockApplications.filter(
    (application) => application.companyId === companyId,
  );

  return {
    applications,
    students: mockStudents,
    summary: summarizeApplications(applications),
  };
}

export async function getApplicationSummariesByCompany() {
  const sheetRows = await readApplicationRows();
  const summaries = new Map<string, ApplicationSummary>();

  if (sheetRows.length === 0) {
    for (const application of mockApplications) {
      summaries.set(
        application.companyId,
        summarizeApplications([
          ...(mockApplications.filter(
            (item) => item.companyId === application.companyId,
          )),
        ]),
      );
    }

    return summaries;
  }

  const grouped = new Map<string, Application[]>();

  for (const row of sheetRows) {
    const applications = grouped.get(row.companyId) ?? [];
    applications.push(rowToApplication(row));
    grouped.set(row.companyId, applications);
  }

  for (const [companyId, applications] of grouped.entries()) {
    summaries.set(companyId, summarizeApplications(applications));
  }

  return summaries;
}

export async function addApplicantToSheet(input: ApplicantInput) {
  return addApplicantsToSheet([input]);
}

export async function addApplicantsToSheet(inputs: ApplicantInput[]) {
  const setup = await ensureSheetWithHeaders(
    getApplicationTrackingRange(),
    APPLICATION_HEADERS,
  );

  if (setup.skipped) {
    return setup;
  }

  const existingRows = await readApplicationRows();
  const existingKeys = new Set(
    existingRows.map((row) =>
      applicationDuplicateKey(row.companyId, studentIdentityFromRow(row)),
    ),
  );
  const uniqueInputs: Array<ApplicantInput & { applicationId: string }> = [];
  let duplicateCount = 0;
  let nextApplicationNumber = getNextApplicationNumber(existingRows);

  for (const input of inputs) {
    const key = applicationDuplicateKey(
      input.companyId,
      studentIdentityFromApplicant(input),
    );

    if (existingKeys.has(key)) {
      duplicateCount += 1;
      continue;
    }

    existingKeys.add(key);
    uniqueInputs.push({
      ...input,
      applicationId: `APP-${String(nextApplicationNumber).padStart(3, "0")}`,
    });
    nextApplicationNumber += 1;
  }

  if (uniqueInputs.length === 0) {
    return {
      skipped: false,
      appended: 0,
      duplicateCount,
    };
  }

  const result = await appendSheetRows({
    range: getApplicationTrackingRange(),
    values: uniqueInputs.map((input) => [
        formatSheetDate(new Date()),
        input.companyId,
        input.companyName,
        input.fullName,
        input.email,
        input.phoneNumber,
        input.resumeUrl,
        stageLabel("APPLIED"),
        "In Progress",
        "",
        "",
        "",
        input.remarks ?? "",
        new Date().toISOString(),
        "Dashboard",
        input.candidateId ?? "",
        input.studentCode ?? "",
        input.degree ?? "",
        input.branch ?? "",
        input.passoutYear ?? "",
        input.percentage ?? "",
        input.applicationId,
      ]),
  });
  invalidateApplicationCache();

  return {
    ...result,
    appended: result.skipped ? 0 : uniqueInputs.length,
    duplicateCount,
  };
}

export function parseBulkApplicants(input: {
  raw: string;
  companyId: string;
  companyName: string;
}) {
  return input.raw
    .replace(/^\s*{\s*/, "")
    .replace(/\s*}\s*$/, "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => parseBulkApplicantLine(line, input.companyId, input.companyName))
    .filter((applicant): applicant is ApplicantInput => Boolean(applicant));
}

export async function getApplicationsFromSheets(): Promise<StudentApplicationRecord[]> {
  const sheetRows = await readApplicationRows();

  if (sheetRows.length > 0) {
    return sheetRows.map(rowToStudentApplicationRecord);
  }

  return mockApplications.map((application) => {
    const student = mockStudents.find((item) => item.id === application.studentId);
    const company = mockCompanies.find((item) => item.id === application.companyId);

    return {
      applicationId: application.id,
      uid: student?.studentId || student?.email || application.studentId,
      studentCode: student?.studentId,
      studentName: student?.name ?? application.studentId,
      phoneNumber: student?.phone ?? "",
      email: student?.email ?? "",
      companyId: application.companyId,
      companyName: company?.name ?? application.companyId,
      currentStage: application.currentStage,
      status: statusForStage(application.currentStage),
      remarks: application.remarks,
    };
  });
}

export async function getStudentPipelineFromApplications() {
  return groupApplicationsByUID(await getApplicationsFromSheets());
}

export async function updateApplicantStages(input: {
  companyId?: string;
  applicationIds: string[];
  targetStage: PipelineStageId;
  remarks?: string;
  rejectedAtRound?: PipelineStageId;
}) {
  const status = statusForStage(input.targetStage);
  const updatedAt = new Date().toISOString();
  const selectedDate =
    input.targetStage === "SELECTED" ? formatSheetDate(new Date()) : "";
  const isRejected = input.targetStage === "REJECTED";
  const isDropped = input.targetStage === "DROPPED";
  const shouldSaveRemarks = input.targetStage === "SELECTED" || isRejected || isDropped;
  const cleanRemarks = shouldSaveRemarks
    ? sanitizeApplicationRemarks(input.remarks ?? "")
    : "";
  const rows = await readApplicationRows();
  const updatedRows = rows.map((row) => {
    const rowId = row.applicationId || `sheet-app-${row.rowNumber}`;

    if (!input.applicationIds.includes(rowId)) {
      return row;
    }

    return {
      ...row,
      currentStage: input.targetStage,
      status,
      rejectedRound:
        (isRejected || isDropped) && input.rejectedAtRound
          ? input.rejectedAtRound
          : undefined,
      rejectionReason: isRejected || isDropped ? cleanRemarks : "",
      selectedDate,
      remarks: cleanRemarks || row.remarks,
      updatedAt,
    } satisfies ApplicationRow;
  });

  const results = [];

  for (const applicationId of input.applicationIds) {
    const rowNumber = getSheetRowNumber(applicationId, rows);

    if (!rowNumber) {
      continue;
    }

    results.push(
      await updateSheetRow({
        sheetTitle: getApplicationSheetTitle(),
        rowNumber,
        startColumn: "H",
        values: [
          stageLabel(input.targetStage),
          status,
          (isRejected || isDropped) && input.rejectedAtRound
            ? stageLabel(input.rejectedAtRound)
            : "",
          isRejected || isDropped ? cleanRemarks : "",
          selectedDate,
          cleanRemarks,
          updatedAt,
        ],
      }),
    );
  }

  invalidateApplicationCache();

  return {
    skipped: results.some((result) => result.skipped),
    results,
    updatedApplications: input.companyId
      ? updatedRows
          .filter((row) => row.companyId === input.companyId)
          .map(rowToApplication)
      : [],
  };
}

export async function deleteApplicantsFromSheet(applicationIds: string[]) {
  const rows = await readApplicationRows();
  const rowNumbers = applicationIds
    .map((applicationId) => getSheetRowNumber(applicationId, rows))
    .filter((rowNumber): rowNumber is number => Boolean(rowNumber));

  const result = await deleteSheetRows({
    sheetTitle: getApplicationSheetTitle(),
    rowNumbers,
  });
  invalidateApplicationCache();
  return result;
}

function summarizeApplications(items: Application[]): ApplicationSummary {
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

type ApplicationRow = {
  rowNumber: number;
  date: string;
  companyId: string;
  companyName: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  resumeUrl: string;
  currentStage: PipelineStageId;
  status: "In Progress" | "Rejected" | "Selected" | "Dropped";
  rejectedRound?: PipelineStageId;
  rejectionReason?: string;
  selectedDate?: string;
  updatedAt?: string;
  remarks?: string;
  candidateId?: string;
  studentCode?: string;
  degree?: string;
  branch?: string;
  passoutYear?: string;
  percentage?: string;
  applicationId?: string;
};

async function readApplicationRows(): Promise<ApplicationRow[]> {
  if (applicationRowsCache && applicationRowsCache.expiresAt > Date.now()) {
    return applicationRowsCache.value;
  }

  const result = await readSheetRows({ range: getApplicationTrackingRange() });

  if (result.skipped || result.values.length <= 1) {
    console.log("[Application Source] Sheet read skipped or empty", {
      skipped: result.skipped,
      reason: result.reason,
      valueCount: result.values.length,
    });
    applicationRowsCache = { value: [], expiresAt: Date.now() + APPLICATION_CACHE_TTL_MS };
    return [];
  }

  const headers = result.values[0] ?? [];
  console.log("[Application Source] Read rows from sheet", {
    range: getApplicationTrackingRange(),
    rows: result.values.length - 1,
  });

  const rows = result.values
    .slice(1)
    .map((row, index) => rowToApplicationRow(row, index + 2, headers))
    .filter((row): row is ApplicationRow => Boolean(row));
  applicationRowsCache = { value: rows, expiresAt: Date.now() + APPLICATION_CACHE_TTL_MS };
  return rows;
}

function rowToApplicationRow(
  row: string[],
  rowNumber: number,
  headers: string[],
): ApplicationRow | null {
  const cell = (name: string, fallbackIndex: number) => {
    const index = headers.findIndex(
      (header) => normalizeHeader(header) === normalizeHeader(name),
    );
    return row[index >= 0 ? index : fallbackIndex] ?? "";
  };

  const date = cell("DATE", 0);
  const companyId = cell("Company ID", 1);
  const companyName = cell("Company Name", 2);
  const fullName = cell("Full Name", 3);
  const email = cell("Email", 4);
  const phoneNumber = cell("Phone Number", 5);
  const resumeUrl = cell("Resume", 6);
  const stage = cell("Current Stage", 7);
  const status = cell("Status", 8);
  const rejectedRound = cell("Rejected Round", 9);
  const rejectionReason = cell("Rejection Reason", 10);
  const selectedDate = cell("Selected Date", 11);
  const remarks = cell("Remarks", 12);
  const updatedAt = cell("Updated At", 13);
  const candidateId = cell("Candidate ID", 15);
  const studentCode = cell("Student ID", 16);
  const degree = cell("Degree", 17);
  const branch = cell("Branch", 18);
  const passoutYear = cell("Passout Year", 19);
  const percentage = cell("Percentage", 20);
  const applicationId = cell("Application ID", 21);

  if (!companyId || !fullName) {
    return null;
  }

  const currentStage = normalizeStage(stage, status);
  const normalizedStatus = statusForStage(currentStage);

  return {
    rowNumber,
    date,
    companyId,
    companyName,
    fullName,
    email,
    phoneNumber,
    resumeUrl,
    currentStage,
    status: normalizeStatus(status) ?? normalizedStatus,
    rejectedRound: rejectedRound ? normalizeStage(rejectedRound) : undefined,
    rejectionReason,
    selectedDate,
    updatedAt,
    remarks,
    candidateId,
    studentCode,
    degree,
    branch,
    passoutYear,
    percentage,
    applicationId,
  };
}

function rowToStudent(row: ApplicationRow): Student {
  return {
    id: rowStudentId(row),
    studentId: studentIdentityFromRow(row),
    name: row.fullName,
    email: row.email,
    phone: row.phoneNumber,
    resumeUrl: row.resumeUrl,
    pipelineStatus: row.status,
    primaryStack: [row.degree, row.branch, row.passoutYear].filter(Boolean) as string[],
    benchmarkStatus: "Not Taken",
    assessmentStatus: "Not Taken",
    remarks:
      row.remarks ||
      [row.candidateId, row.percentage ? `${row.percentage}%` : ""]
        .filter(Boolean)
        .join(" | "),
  };
}

function rowToStudentApplicationRecord(row: ApplicationRow): StudentApplicationRecord {
  return {
    applicationId: row.applicationId || `sheet-app-${row.rowNumber}`,
    rowNumber: row.rowNumber,
    uid: studentIdentityFromRow(row),
    candidateId: row.candidateId,
    studentCode: row.studentCode,
    studentName: row.fullName,
    phoneNumber: row.phoneNumber,
    email: row.email,
    companyId: row.companyId,
    companyName: row.companyName || row.companyId,
    currentStage: row.currentStage,
    status: row.status,
    rejectedRound: row.rejectedRound,
    rejectionReason: row.rejectionReason,
    selectedDate: row.selectedDate,
    updatedAt: row.updatedAt || row.date,
    remarks: row.remarks ?? "",
  };
}

function rowToApplication(row: ApplicationRow): Application {
  return {
    id: row.applicationId || `sheet-app-${row.rowNumber}`,
    companyId: row.companyId,
    studentId: rowStudentId(row),
    currentStage: row.currentStage,
    currentOutcome:
      row.currentStage === "SELECTED"
        ? "SELECTED"
        : row.currentStage === "REJECTED"
          ? "REJECTED"
          : "PENDING",
    remarks: row.remarks ?? "",
    rejectedAtRound: row.rejectedRound,
    rejectionReason: row.rejectionReason,
    selectedAt: row.selectedDate,
    roundStatuses: [
      {
        stage: row.currentStage,
        outcome:
          row.currentStage === "SELECTED"
            ? "SELECTED"
            : row.currentStage === "REJECTED"
              ? "REJECTED"
              : "PENDING",
        remarks: row.remarks,
        changedAt: row.date,
      },
    ],
  };
}

function normalizeStage(value = "", fallback = ""): PipelineStageId {
  const compact = `${value || fallback}`.toLowerCase().replace(/[^a-z0-9]/g, "");

  if (compact.includes("resume")) return "RESUME_SCREENING";
  if (compact.includes("screening") || compact.includes("call")) return "TELEPHONIC_SCREENING";
  if (compact.includes("group") || compact.includes("gd")) return "GROUP_DISCUSSION";
  if (compact.includes("assignment")) return "ASSIGNMENT_ROUND";
  if (compact.includes("assessment") || compact.includes("coding")) return "ASSESSMENT_ROUND";
  if (compact.includes("technicalround2") || compact.includes("tr2")) return "TECHNICAL_ROUND_2";
  if (compact.includes("technical") || compact.includes("tr1")) return "TECHNICAL_ROUND_1";
  if (compact.includes("manager")) return "MANAGER_ROUND";
  if (compact.includes("hr")) return "HR_ROUND";
  if (compact.includes("selected")) return "SELECTED";
  if (compact.includes("rejected")) return "REJECTED";
  if (compact.includes("dropped")) return "DROPPED";
  return "APPLIED";
}

function normalizeStatus(value: string): ApplicationRow["status"] | undefined {
  const compact = value.toLowerCase().replace(/\s+/g, "");
  if (compact.includes("selected")) return "Selected";
  if (compact.includes("rejected")) return "Rejected";
  if (compact.includes("drop")) return "Dropped";
  if (compact.includes("progress")) return "In Progress";
  return undefined;
}

function statusForStage(stage: PipelineStageId): ApplicationRow["status"] {
  if (stage === "SELECTED") return "Selected";
  if (stage === "REJECTED") return "Rejected";
  if (stage === "DROPPED") return "Dropped";
  return "In Progress";
}

function getSheetRowNumber(applicationId: string, rows: ApplicationRow[]) {
  const match = applicationId.match(/^sheet-app-(\d+)$/);
  if (match) return Number(match[1]);

  return rows.find((row) => row.applicationId === applicationId)?.rowNumber ?? null;
}

function getApplicationSheetTitle() {
  return getApplicationTrackingRange().split("!")[0].replace(/^'|'$/g, "");
}

function parseBulkApplicantLine(
  line: string,
  companyId: string,
  companyName: string,
): ApplicantInput | null {
  const columns = line
    .split(/\t/)
    .map((item) => item.trim());

  if (columns.length < 10) {
    return null;
  }

  const [
    candidateId,
    fullName,
    phoneNumber,
    studentCode,
    email,
    degree,
    branch,
    passoutYear,
    percentage,
    resumeUrl,
  ] = columns;

  return {
    companyId,
    companyName,
    candidateId,
    studentCode,
    fullName,
    phoneNumber,
    email,
    degree,
    branch,
    passoutYear,
    percentage: percentage.replace(/%$/, ""),
    resumeUrl,
  };
}

function normalizeHeader(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function studentIdentityFromApplicant(input: ApplicantInput) {
  return (
    input.candidateId ||
    input.studentCode ||
    input.email ||
    input.phoneNumber ||
    input.fullName
  ).trim();
}

function studentIdentityFromRow(row: ApplicationRow) {
  return (
    row.candidateId ||
    row.studentCode ||
    row.email ||
    row.phoneNumber ||
    `APP-${row.rowNumber}`
  ).trim();
}

function rowStudentId(row: ApplicationRow) {
  return `sheet-student-${slugify(studentIdentityFromRow(row))}`;
}

function applicationDuplicateKey(companyId: string, studentIdentity: string) {
  return `${companyId.trim().toLowerCase()}::${studentIdentity.trim().toLowerCase()}`;
}

function getNextApplicationNumber(rows: ApplicationRow[]) {
  return (
    rows.reduce((highest, row) => {
      const match = row.applicationId?.match(/^APP-(\d+)$/i);
      return match ? Math.max(highest, Number(match[1])) : highest;
    }, 0) + 1
  );
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function formatSheetDate(date: Date) {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
}

function sanitizeApplicationRemarks(value: string) {
  return value
    .replace(
      /\b(?:can\s+you\s+|please\s+)?roll\s+out\s+(?:the\s+)?form\b.*$/i,
      "",
    )
    .replace(/role:\s*.+\|\s*job type:.+$/i, "")
    .trim();
}
