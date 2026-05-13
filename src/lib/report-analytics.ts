import "server-only";

import {
  type ApplicationSummary,
  getApplicationsFromSheets,
  getApplicationSummariesByCompany,
} from "./application-source";
import { calculateCompanyStatusFromSummary } from "./company-status";
import { getCompaniesForDashboard } from "./company-source";
import { stageLabel } from "./pipeline";
import type { RsaChartData } from "./report-chart-types";
import { getStudentScores } from "./student-scores";

export async function getRsaChartData(): Promise<RsaChartData> {
  const [companies, summariesMap, applications, studentScores] = await Promise.all([
    getCompaniesForDashboard(),
    getApplicationSummariesByCompany(),
    getApplicationsFromSheets(),
    getStudentScores(),
  ]);
  const summaries = Object.fromEntries(summariesMap) as Record<string, ApplicationSummary>;
  const statusCounts = createCounter(["In Progress", "Hiring Done", "Dropped", "Upcoming"]);
  const outcomeCounts = createCounter(["Active", "Selected", "Rejected", "Dropped"]);
  const roundRejections = new Map<string, number>();
  const studentRejections = new Map<string, number>();

  for (const company of companies) {
    const calculated = calculateCompanyStatusFromSummary(summaries[company.id]);
    const status = normalizeCompanyStatus(calculated ?? company.currentStatus);
    statusCounts.set(status, (statusCounts.get(status) ?? 0) + 1);
  }

  for (const application of applications) {
    if (application.status === "Selected") {
      outcomeCounts.set("Selected", (outcomeCounts.get("Selected") ?? 0) + 1);
    } else if (application.status === "Rejected") {
      outcomeCounts.set("Rejected", (outcomeCounts.get("Rejected") ?? 0) + 1);
      const round = stageLabel(application.rejectedRound ?? application.currentStage);
      roundRejections.set(round, (roundRejections.get(round) ?? 0) + 1);
      const student = application.studentName || application.uid || "Unknown Student";
      studentRejections.set(student, (studentRejections.get(student) ?? 0) + 1);
    } else if (application.status === "Dropped") {
      outcomeCounts.set("Dropped", (outcomeCounts.get("Dropped") ?? 0) + 1);
    } else {
      outcomeCounts.set("Active", (outcomeCounts.get("Active") ?? 0) + 1);
    }
  }

  const companySelectionRatios = companies
    .map((company) => {
      const summary = summaries[company.id] ?? emptySummary;
      return {
        company: company.name,
        ratio: summary.applied > 0 ? Math.round((summary.selected / summary.applied) * 100) : 0,
        selected: summary.selected,
        total: summary.applied,
      };
    })
    .sort((a, b) => b.ratio - a.ratio || b.total - a.total)
    .slice(0, 8);

  const companyOutcomes = companies
    .map((company) => {
      const summary = summaries[company.id] ?? emptySummary;
      return {
        company: company.name,
        selected: summary.selected,
        rejected: summary.rejected,
        active: summary.inProgress,
        dropped: summary.dropped,
      };
    })
    .filter((item) => item.selected + item.rejected + item.active + item.dropped > 0)
    .sort(
      (a, b) =>
        b.selected + b.rejected + b.active + b.dropped -
        (a.selected + a.rejected + a.active + a.dropped),
    )
    .slice(0, 8);

  return {
    companyStatus: mapCounter(statusCounts),
    applicationOutcomes: mapCounter(outcomeCounts),
    roundRejections: mapToSortedArray(roundRejections, "round"),
    studentRejections: mapToSortedArray(studentRejections, "student").slice(0, 8),
    companySelectionRatios,
    companyOutcomes,
    scoreAverages: [
      {
        metric: "Benchmarking",
        average: average(studentScores.map((student) => student.benchmarking)),
      },
      {
        metric: "Weekly Assessments",
        average: average(studentScores.map((student) => student.weeklyAssessment)),
      },
      {
        metric: "Mentor Score",
        average: average(studentScores.map((student) => student.mentorScore)),
      },
    ],
    studentPlacementStatus: mapCounter(
      studentScores.reduce((counts, student) => {
        const status = normalizeStudentPlacementStatus(student.selectedStatus);
        counts.set(status, (counts.get(status) ?? 0) + 1);
        return counts;
      }, createCounter(["Selected", "Not Selected", "Pending / Other"])),
    ),
  };
}

const emptySummary: ApplicationSummary = {
  applied: 0,
  inProgress: 0,
  selected: 0,
  rejected: 0,
  dropped: 0,
};

function createCounter(keys: string[]) {
  return new Map(keys.map((key) => [key, 0]));
}

function mapCounter(counter: Map<string, number>) {
  return Array.from(counter.entries()).map(([name, value]) => ({ name, value }));
}

function mapToSortedArray<TName extends "round" | "student">(
  counter: Map<string, number>,
  nameKey: TName,
): Array<Record<TName, string> & { count: number }> {
  return Array.from(counter.entries())
    .map(([name, count]) => ({ [nameKey]: name, count }) as Record<TName, string> & { count: number })
    .sort((a, b) => b.count - a.count || a[nameKey].localeCompare(b[nameKey]));
}

function normalizeCompanyStatus(status: string) {
  if (status === "Hiring Done" || status === "Selected") return "Hiring Done";
  if (status === "Dropped" || status === "Rejected All") return "Dropped";
  if (status === "Upcoming") return "Upcoming";
  return "In Progress";
}

function normalizeStudentPlacementStatus(value: string) {
  const normalized = value.toLowerCase().replace(/[_-]+/g, " ").trim();

  if (!normalized) return "Pending / Other";
  if (/(not|no)\s+(selected|placed|hired)/.test(normalized)) return "Not Selected";
  if (normalized.includes("selected") || normalized.includes("placed") || normalized.includes("hired")) {
    return "Selected";
  }

  return "Pending / Other";
}

function average(values: number[]) {
  if (values.length === 0) return 0;
  const total = values.reduce((sum, value) => sum + (Number.isFinite(value) ? value : 0), 0);
  return Math.round((total / values.length) * 10) / 10;
}
