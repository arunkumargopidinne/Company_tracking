import { Company, companies, getCompany } from "./mock-data";
import {
  deleteSheetRows,
  getCompanyTrackingRange,
  readSheetRows,
  updateSheetRow,
} from "./google-sheets";
import {
  formatJobDescriptionFromFields,
  isValidCompanyName,
  parseJobDescription,
  splitSkillText,
  validateParsedJob,
} from "./jd-parser";
import { PipelineStageId } from "./pipeline";

export async function getCompaniesForDashboard() {
  const sheet = await getCompaniesFromSheet();

  return sheet.skipped ? companies : sheet.companies;
}

export async function getCompanyForDashboard(id: string) {
  const sheet = await getCompaniesFromSheet();
  const fromSheet = sheet.companies.find((company) => company.id === id);

  if (fromSheet || !sheet.skipped) {
    return fromSheet;
  }

  return getCompany(id);
}

type SheetCompanyRead = {
  skipped: boolean;
  reason?: string;
  companies: Company[];
};

async function getCompaniesFromSheet(): Promise<SheetCompanyRead> {
  const result = await readSheetRows({ range: getCompanyTrackingRange() });

  if (result.skipped || result.values.length <= 1) {
    console.log("[Company Source] Sheet read skipped or empty", {
      skipped: result.skipped,
      reason: result.reason,
      valueCount: result.values.length,
    });
    return {
      skipped: result.skipped,
      reason: result.reason,
      companies: [],
    };
  }

  console.log("[Company Source] Read rows from sheet", {
    range: getCompanyTrackingRange(),
    rows: result.values.length - 1,
  });

  const companies = result.values
    .slice(1)
    .map((row, index) => {
      const company = sheetRowToCompany(row, index + 2);
      if (!company) {
        console.log("[Company Source] Row filtered out - invalid company name:", {
          rowIndex: index + 2,
          rowData: row.slice(0, 3),
        });
      }
      return company;
    })
    .filter((company): company is Company => Boolean(company))
    .sort((a, b) => {
      // Sort by loadedDate in descending order (newest first)
      const dateA = new Date(a.loadedDate || 0).getTime();
      const dateB = new Date(b.loadedDate || 0).getTime();
      return dateB - dateA;
    });

  console.log("[Company Source] Parsed companies from sheet", {
    validCompanies: companies.length,
    invalidRows: result.values.length - 1 - companies.length,
  });

  return {
    skipped: false,
    companies,
  };
}

function sheetRowToCompany(row: string[], rowNumber: number): Company | null {
  const [
    loadedDate = "",
    name = "",
    techStack = "",
    jd = "",
    rounds = "",
    crm = "",
    location = "",
    confirmationDate = "",
    interviewScheduledStatus = "",
    status = "",
    remarks = "",
    companyIdCell = "",
    roleCell = "",
    rolloutBatches = "",
  ] = row;

  const parsed = jd && !isUrl(jd) ? parseJobDescription(jd) : null;
  const parsedValidation = parsed ? validateParsedJob(parsed) : [];
  const companyName =
    !isValidCompanyName(name)
      ? parsed?.companyName || name.trim()
      : name.trim();
  const role = roleCell.trim() || parsed?.role || firstLine(jd) || "Job Description";
  const companyId = companyIdCell.trim() || legacyCompanyId(companyName);
  const actualRemarks = parsed?.remarks || stripGeneratedSummary(remarks);
  const parsedLocation = parsed?.location || "";

  console.log("[Sheet Row To Company] Processing row", rowNumber, ":", {
    providedName: name,
    parsedName: parsed?.companyName,
    finalName: companyName,
    companyId,
    hasJd: !!jd,
    jdLength: jd?.length,
    parserErrors: parsedValidation,
  });

  if (!isValidCompanyName(companyName)) {
    console.warn("[Sheet Row To Company] Row", rowNumber, "filtered out - no valid company name");
    return null;
  }

  return {
    id: companyId,
    name: companyName,
    techStack: splitCell(techStack || parsed?.skillsRequired.join(", ") || ""),
    jdTitle: role,
    jdLink: isUrl(jd) ? jd : "",
    jdDetails: parsed?.raw || jd || actualRemarks,
    expectedSkills: splitCell(techStack || parsed?.skillsRequired.join(", ") || ""),
    jobType: parsed?.jobType || extractRemarkValue(remarks, "Job Type"),
    internshipDuration:
      parsed?.internshipDuration || extractRemarkValue(remarks, "Internship Duration"),
    ctc: parsed?.ctc || extractRemarkValue(remarks, "CTC"),
    stipend: parsed?.stipend || extractRemarkValue(remarks, "Stipend"),
    openings: parsed?.openings || extractRemarkValue(remarks, "Openings"),
    rounds: normalizeRounds(rounds),
    crm: crm || "Google Sheets",
    location: location || parsedLocation || "",
    loadedDate,
    confirmationDate: confirmationDate || loadedDate,
    interviewScheduledStatus: normalizeInterview(interviewScheduledStatus),
    currentStatus: normalizeStatus(status),
    remarks: actualRemarks,
    eligibility: parsed?.eligibility,
    interviewMode: parsed?.interviewMode,
    interviewProcess: parsed?.interviewProcess,
    workDetails: parsed?.workDetails,
    bond: parsed?.bond,
    rolloutBatches: splitCell(rolloutBatches || parsed?.rolloutBatches.join(", ") || ""),
    sheetRowNumber: rowNumber,
  };
}

export async function findCompanyByNameAndRole(input: {
  companyName: string;
  role: string;
}) {
  const sheet = await getCompaniesFromSheet();
  const source = sheet.skipped ? companies : sheet.companies;
  const targetName = normalizeComparable(input.companyName);
  const targetRole = normalizeComparable(input.role);

  return source.find(
    (company) =>
      normalizeComparable(company.name) === targetName &&
      normalizeComparable(company.jdTitle) === targetRole,
  );
}

export async function createNextCompanyId() {
  const sheet = await getCompaniesFromSheet();
  const source = sheet.skipped ? companies : sheet.companies;
  const max = source.reduce((highest, company) => {
    const match = company.id.match(/^COMP-(\d+)$/i);
    return match ? Math.max(highest, Number(match[1])) : highest;
  }, 0);

  return `COMP-${String(max + 1).padStart(3, "0")}`;
}

export async function deleteCompanyFromSheet(rowNumber: number) {
  return deleteSheetRows({
    sheetTitle: getCompanyTrackingRange().split("!")[0].replace(/^'|'$/g, ""),
    rowNumbers: [rowNumber],
  });
}

export type CompanySheetUpdateInput = {
  rowNumber: number;
  loadedDate?: string;
  companyName: string;
  role: string;
  techStack: string;
  crm: string;
  location: string;
  ctc?: string;
  jobType?: string;
  internshipDuration?: string;
  stipend?: string;
  openings?: string;
  eligibility?: string;
  skillsRequired?: string;
  interviewProcess?: string;
  workDetails?: string;
  bond?: string;
  remarks?: string;
  confirmationDate?: string;
  interviewScheduledStatus?: string;
  currentStatus: Company["currentStatus"];
};

export async function updateCompanyInSheet(input: CompanySheetUpdateInput) {
  const jdDetails = formatJobDescriptionFromFields({
    companyName: input.companyName,
    role: input.role,
    location: input.location,
    jobType: input.jobType,
    internshipDuration: input.internshipDuration,
    stipend: input.stipend,
    ctc: input.ctc,
    openings: input.openings,
    eligibility: input.eligibility,
    skillsRequired: input.skillsRequired,
    interviewProcess: input.interviewProcess,
    workDetails: input.workDetails,
    bond: input.bond,
    remarks: input.remarks,
  });
  const parsed = parseJobDescription(jdDetails);
  const techStack = splitSkillText(input.skillsRequired || input.techStack).join(", ");

  console.log("[Company Update] Updating sheet row", {
    rowNumber: input.rowNumber,
    companyName: input.companyName,
    role: input.role,
    location: input.location,
    status: input.currentStatus,
  });

  return updateSheetRow({
    sheetTitle: getCompanySheetTitle(),
    rowNumber: input.rowNumber,
    startColumn: "A",
    values: [
      input.loadedDate || formatSheetDate(new Date()),
      input.companyName,
      techStack,
      jdDetails,
      parsed.rounds.join(", "),
      input.crm || "Dashboard",
      input.location,
      input.confirmationDate || "",
      input.interviewScheduledStatus || "yet to schedule",
      input.currentStatus,
      input.remarks || "",
    ],
  });
}

export async function updateCompanyStatusInSheet(
  companyId: string,
  status: "In Progress" | "Hiring Done" | "Dropped",
) {
  const sheet = await getCompaniesFromSheet();
  const company = sheet.companies.find((item) => item.id === companyId);

  if (!company?.sheetRowNumber) {
    console.warn("[Company Status] Could not find company row for status update", {
      companyId,
      status,
    });
    return { skipped: true, reason: "Company row was not found." };
  }

  console.log("[Company Status] Updating company status", {
    companyId,
    companyName: company.name,
    rowNumber: company.sheetRowNumber,
    status,
  });

  return updateSheetRow({
    sheetTitle: getCompanySheetTitle(),
    rowNumber: company.sheetRowNumber,
    startColumn: "J",
    values: [status],
  });
}

function normalizeRounds(value: string): PipelineStageId[] {
  const lower = value.toLowerCase();
  const stages: PipelineStageId[] = ["APPLIED"];

  if (lower.includes("coding") || lower.includes("assessment")) {
    stages.push("ASSESSMENT_ROUND");
  }
  if (lower.includes("resume")) {
    stages.push("RESUME_SCREENING");
  }
  if (lower.includes("screen") || lower.includes("call")) {
    stages.push("TELEPHONIC_SCREENING");
  }
  if (lower.includes("assignment")) {
    stages.push("ASSIGNMENT_ROUND");
  }
  if (lower.includes("gd") || lower.includes("group")) {
    stages.push("GROUP_DISCUSSION");
  }
  if (lower.includes("tr1") || lower.includes("technical")) {
    stages.push("TECHNICAL_ROUND_1");
  }
  if (lower.includes("tr2")) {
    stages.push("TECHNICAL_ROUND_2");
  }
  if (lower.includes("manager") || lower.includes("mr")) {
    stages.push("MANAGER_ROUND");
  }
  if (lower.includes("hr")) {
    stages.push("HR_ROUND");
  }

  stages.push("SELECTED", "REJECTED", "DROPPED");
  return Array.from(new Set(stages));
}

function normalizeInterview(value: string): Company["interviewScheduledStatus"] {
  const lower = value.toLowerCase();
  if (lower.includes("completed")) return "Completed";
  if (lower.includes("scheduled")) return "Scheduled";
  return "Not Scheduled";
}

function normalizeStatus(value: string): Company["currentStatus"] {
  const lower = value.toLowerCase().replace(/\s+/g, "");
  if (lower.includes("hiringdone")) return "Hiring Done";
  if (lower.includes("selected")) return "Hiring Done";
  if (lower.includes("reject")) return "Rejected All";
  if (lower.includes("drop")) return "Dropped";
  if (lower.includes("upcoming")) return "Upcoming";
  return "In Progress";
}

function splitCell(value: string) {
  return value
    .split(/,|\+|\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function firstLine(value: string) {
  return value.split(/\r?\n/).find(Boolean)?.trim() ?? "";
}

function isUrl(value: string) {
  return /^https?:\/\//i.test(value.trim());
}

function extractRemarkValue(remarks: string, label: string) {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = remarks.match(new RegExp(`${escaped}:\\s*([^|]+)`, "i"));
  return match?.[1]?.trim() ?? "";
}

function stripGeneratedSummary(remarks: string) {
  if (
    /role:\s*.+job type:\s*.+ctc:/i.test(remarks) ||
    /role:\s*.+\|\s*job type:/i.test(remarks)
  ) {
    return "";
  }

  return remarks;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function legacyCompanyId(companyName: string) {
  return `sheet-${slugify(companyName)}`;
}

function normalizeComparable(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function getCompanySheetTitle() {
  return getCompanyTrackingRange().split("!")[0].replace(/^'|'$/g, "");
}

function formatSheetDate(date: Date) {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
}
