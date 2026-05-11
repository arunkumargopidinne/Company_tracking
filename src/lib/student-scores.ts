import { readSheetRows } from "./google-sheets";

export interface StudentScore {
  userId: string;
  fullName: string;
  mobileNumber: string;
  email: string;
  benchmarking: number;
  weeklyAssessment: number;
  mentorScore: number;
  selectedStatus: string;
  batchDetails: string;
  activeStatus: string;
  preferredJobTrack: string;
  enrolledOn: string;
  productCode: string;
  gender: string;
  state: string;
  formFills: string;
  placedThrough: string;
  placementType: string;
  placementDate: string;
  placedOrganisation: string;
  studentId: string;
}

const DEFAULT_STUDENT_SCORES_SHEET_ID = "17K_QEIABJ2uq04TYf0ilsezllaZPLHOc4OatrBI4etI";
const DEFAULT_STUDENT_SCORES_RANGE = "TOP_30!A:U";

export async function getStudentScores(): Promise<StudentScore[]> {
  const spreadsheetId =
    process.env.STUDENT_SCORES_SPREADSHEET_ID ||
    process.env.GOOGLE_STUDENT_SCORES_SPREADSHEET_ID ||
    DEFAULT_STUDENT_SCORES_SHEET_ID;
  const range =
    process.env.STUDENT_SCORES_RANGE ||
    process.env.GOOGLE_STUDENT_SCORES_RANGE ||
    DEFAULT_STUDENT_SCORES_RANGE;

  try {
    const result = await readSheetRows({ spreadsheetId, range });

    if (result.skipped || result.values.length <= 1) {
      console.log("[Student Scores] Sheet read skipped or empty", {
        spreadsheetId,
        range,
        skipped: result.skipped,
        reason: result.reason,
        valueCount: result.values.length,
      });
      return [];
    }

    const headers = result.values[0] ?? [];

    console.log("[Student Scores] Read rows from sheet", {
      spreadsheetId,
      range,
      rows: result.values.length - 1,
      headers,
    });

    const students = result.values
      .slice(1)
      .map((row, index) => rowToStudentScore(row, headers, index + 2))
      .filter((student): student is StudentScore => Boolean(student));

    console.log("[Student Scores] Parsed students from sheet", {
      validStudents: students.length,
      invalidRows: result.values.length - 1 - students.length,
    });

    return students;
  } catch (error) {
    console.error("[Student Scores] Failed to fetch student scores:", error);
    return [];
  }
}

export function filterStudents(
  students: StudentScore[],
  filters: {
    benchmarkingMin?: number;
    assessmentMin?: number;
    mentorMin?: number;
    batch?: string;
    status?: string;
    searchText?: string;
  },
): StudentScore[] {
  return students.filter((student) => {
    if (filters.benchmarkingMin && student.benchmarking < filters.benchmarkingMin) {
      return false;
    }
    if (filters.assessmentMin && student.weeklyAssessment < filters.assessmentMin) {
      return false;
    }
    if (filters.mentorMin && student.mentorScore < filters.mentorMin) {
      return false;
    }
    if (filters.batch && student.batchDetails !== filters.batch) {
      return false;
    }
    if (
      filters.status &&
      normalizeValue(student.selectedStatus) !== normalizeValue(filters.status)
    ) {
      return false;
    }
    if (filters.searchText) {
      const searchLower = filters.searchText.toLowerCase();
      const matches = [
        student.userId,
        student.studentId,
        student.fullName,
        student.email,
        student.mobileNumber,
      ]
        .join(" ")
        .toLowerCase()
        .includes(searchLower);
      if (!matches) return false;
    }
    return true;
  });
}

export function studentsToCSV(students: StudentScore[]): string {
  const headers = [
    "User ID",
    "Full Name",
    "Mobile Number",
    "Email",
    "Benchmarking",
    "Weekly Assessment",
    "Mentor Score",
    "Selected Status",
    "Batch Details",
    "Active Status",
    "Preferred Job Track",
    "Enrolled On",
    "Product Code",
    "Gender",
    "State",
    "Form Fills",
    "Placed Through",
    "Placement Type",
    "Placement Date",
    "Placed Organisation",
    "Student ID",
  ];

  const rows = students.map((student) => [
    student.userId,
    student.fullName,
    student.mobileNumber,
    student.email,
    student.benchmarking,
    student.weeklyAssessment,
    student.mentorScore,
    student.selectedStatus,
    student.batchDetails,
    student.activeStatus,
    student.preferredJobTrack,
    student.enrolledOn,
    student.productCode,
    student.gender,
    student.state,
    student.formFills,
    student.placedThrough,
    student.placementType,
    student.placementDate,
    student.placedOrganisation,
    student.studentId,
  ]);

  const csvContent = [
    headers.map((h) => `"${h}"`).join(","),
    ...rows.map((row) =>
      row
        .map((cell) => {
          const cellStr = String(cell || "");
          return `"${cellStr.replace(/"/g, '""')}"`;
        })
        .join(","),
    ),
  ].join("\n");

  return csvContent;
}

export function getUniqueBatches(students: StudentScore[]): string[] {
  return Array.from(
    new Set(students.map((student) => student.batchDetails).filter(Boolean)),
  ).sort();
}

export function getUniqueStatuses(students: StudentScore[]): string[] {
  return Array.from(
    new Set(students.map((student) => student.selectedStatus).filter(Boolean)),
  ).sort();
}

function rowToStudentScore(
  row: string[],
  headers: string[],
  rowNumber: number,
): StudentScore | null {
  const cell = (names: string[], fallbackIndex: number) => {
    const index = findHeaderIndex(headers, names);
    return String(row[index >= 0 ? index : fallbackIndex] ?? "").trim();
  };
  const student: StudentScore = {
    userId: cell(["Candidate ID", "User ID", "UID"], 0),
    fullName: cell(["Full Name", "Name"], 1),
    mobileNumber: cell(["Mobile Number", "Phone Number", "Phone", "Mobile"], 2),
    email: cell(["Email", "Email ID"], 3),
    benchmarking: parseScore(cell(["Benchmarking", "Benchmarking Score"], 4)),
    weeklyAssessment: parseScore(
      cell(["Weekly_Assessments", "Weekly Assessments", "Weekly Assessment"], 5),
    ),
    mentorScore: parseScore(cell(["Mentor_Score", "Mentor Score"], 6)),
    selectedStatus: cell(["Selected status", "Selected Status"], 7),
    batchDetails: cell(["Batch Details", "Batch"], 8),
    activeStatus: cell(["Active Status"], 9),
    preferredJobTrack: cell(["Preferred Job Track"], 10),
    enrolledOn: cell(["Enrolled on", "Enrolled On"], 11),
    productCode: cell(["Product Code"], 12),
    gender: cell(["Gender"], 13),
    state: cell(["State"], 14),
    formFills: cell(["Form Fills"], 15),
    placedThrough: cell(["Placed Through"], 16),
    placementType: cell(["Placement Type"], 17),
    placementDate: cell(["Placement date", "Placement Date"], 18),
    placedOrganisation: cell(["Placed Organisation", "Placed Organization"], 19),
    studentId: cell(["Student ID"], 20),
  };

  if (!student.userId && student.studentId) {
    student.userId = student.studentId;
  }

  if (!student.userId || !student.fullName) {
    console.warn("[Student Scores] Skipping row without user/name", {
      rowNumber,
      userId: student.userId,
      fullName: student.fullName,
    });
    return null;
  }

  return student;
}

function parseScore(value: string) {
  const clean = value.replace(/,/g, "").match(/-?\d+(\.\d+)?/)?.[0];
  return clean ? Number(clean) : 0;
}

function normalizeHeader(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function findHeaderIndex(headers: string[], names: string[]) {
  for (const name of names) {
    const index = headers.findIndex(
      (header) => normalizeHeader(header) === normalizeHeader(name),
    );

    if (index >= 0) {
      return index;
    }
  }

  return -1;
}

function normalizeValue(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}
