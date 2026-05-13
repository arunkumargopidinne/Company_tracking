import "server-only";

import OpenAI from "openai";

import { getCompanyPipelineData } from "./application-source";
import { getCompanyForDashboard } from "./company-source";
import { stageLabel } from "./pipeline";
import type {
  RsaAdminInputs,
  RsaApplicationStudent,
  RsaApplicationsSummary,
  RsaCompanyDetails,
  RsaStats,
} from "./rsa-types";

export type GeneratedRSA = {
  hiringSummary: string;
  studentPerformanceSummary: string;
  roundWiseRejectionAnalysis: string;
  selectionAnalysis: string;
  skillGapAnalysis: string;
  benchmarkingAnalysis: string;
  assessmentAnalysis: string;
  improvementSuggestions: string;
  finalSummary: string;
};

export async function generateCompanyRsaReport(input: {
  company: RsaCompanyDetails;
  stats: RsaStats;
  applicationsSummary: RsaApplicationsSummary;
  adminInputs: RsaAdminInputs;
}) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return buildConciseCompanyRsa(input);
  }

  const client = new OpenAI({ apiKey });
  try {
    const response = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      temperature: 0.2,
      max_completion_tokens: 1200,
      messages: [
        {
          role: "system",
          content:
            "You write short, practical placement RSA reports for stakeholders and training teams.",
        },
        {
          role: "user",
          content: buildCompanyRsaPrompt(input),
        },
      ],
    });
    const content = response.choices[0]?.message?.content?.trim();

    if (!content) {
      return buildConciseCompanyRsa(input);
    }

    return compactRsaText(content);
  } catch (error) {
    console.error("[RSA AI] OpenAI generation failed; using fallback RSA.", error);
    return buildConciseCompanyRsa(input);
  }
}

export async function generateRSA(input: {
  companyId: string;
  adminRemarks: string;
}): Promise<GeneratedRSA> {
  const fallback = await buildFallbackRSA(input.companyId, input.adminRemarks);

  if (!process.env.OPENAI_API_KEY) {
    return fallback;
  }

  const company = await getCompanyForDashboard(input.companyId);
  const { applications, students } = await getCompanyPipelineData(input.companyId);
  const studentById = new Map(students.map((student) => [student.id, student]));
  const prompt = [
    "Generate a concise Review & Selection Analysis report for an EdTech placement team.",
    "Return short sections for hiring summary, student performance, round-wise rejection analysis, selection analysis, skill gap analysis, benchmarking analysis, assessment analysis, improvement suggestions, and final summary.",
    `Company: ${company?.name ?? input.companyId}`,
    `JD: ${company?.jdDetails ?? "Not available"}`,
    `Expected skills: ${company?.expectedSkills.join(", ") ?? "Not available"}`,
    `Admin remarks: ${input.adminRemarks}`,
    "Applications:",
    applications
      .filter(
        (application) =>
          (application.currentStage === "SELECTED" || application.currentStage === "REJECTED") &&
          application.remarks?.trim(),
      )
      .map(
        (application) =>
          `${studentById.get(application.studentId)?.name ?? application.studentId} - ${stageLabel(
            application.currentStage,
          )} - ${application.remarks}`,
      )
      .join("\n"),
  ].join("\n");

  try {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const response = await client.responses.create({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      input: prompt,
    });

    const text = response.output_text?.trim();

    if (!text) {
      return fallback;
    }

    return {
      ...fallback,
      finalSummary: text,
    };
  } catch {
    return fallback;
  }
}

async function buildFallbackRSA(companyId: string, adminRemarks: string): Promise<GeneratedRSA> {
  const company = await getCompanyForDashboard(companyId);
  const { applications, students } = await getCompanyPipelineData(companyId);
  const studentById = new Map(students.map((student) => [student.id, student]));
  const selected = applications.filter((item) => item.currentStage === "SELECTED");
  const rejected = applications.filter((item) => item.currentStage === "REJECTED");
  const rejectionReasons = rejected
    .filter((item) => item.rejectionReason || item.remarks)
    .map(
      (item) =>
        `${studentById.get(item.studentId)?.name ?? item.studentId} in ${stageLabel(
          item.rejectedAtRound ?? "REJECTED",
        )}: ${item.rejectionReason || item.remarks}`,
    )
    .join("; ");
  const selectionRemarks = selected
    .filter((item) => item.remarks)
    .map((item) => `${studentById.get(item.studentId)?.name ?? item.studentId}: ${item.remarks}`)
    .join("; ");

  return {
    hiringSummary: `${company?.name ?? "This company"} is screening for ${
      company?.expectedSkills.join(", ") ?? "role-specific skills"
    }.`,
    studentPerformanceSummary: `${selected.length} student(s) are selected and ${rejected.length} student(s) are rejected in the current pipeline.`,
    roundWiseRejectionAnalysis:
      rejectionReasons || "No rejection-heavy round is visible yet from the available data.",
    selectionAnalysis:
      selectionRemarks ||
      (selected.length > 0
        ? "Selected students combined stronger assessment performance with clearer interview explanations."
        : "No selections have been recorded yet."),
    skillGapAnalysis:
      rejected.length > 0
        ? "The main gaps are visible in the rejection remarks and should be converted into targeted preparation modules."
        : "Skill gaps will become clearer after technical rounds complete.",
    benchmarkingAnalysis:
      "Benchmark-cleared students should be prioritized for interview slots, then validated against company-specific expectations.",
    assessmentAnalysis:
      "Assessment results should be reviewed before each drive because they correlate with technical round readiness.",
    improvementSuggestions:
      adminRemarks ||
      "Run a focused revision session on the company skill stack before similar drives.",
    finalSummary: `For ${
      company?.name ?? "this company"
    }, the current RSA indicates that preparation should focus on the exact JD skills, assessment practice, and interview explanation quality.`,
  };
}

function buildCompanyRsaPrompt(input: {
  company: RsaCompanyDetails;
  stats: RsaStats;
  applicationsSummary: RsaApplicationsSummary;
  adminInputs: RsaAdminInputs;
}) {
  const companyDetails = {
    companyId: input.company.id,
    companyName: input.company.name,
    role: input.company.role,
    location: input.company.location || "Information not available",
    crm: input.company.crm || "Information not available",
    currentStatus: input.company.currentStatus || "Information not available",
    expectedSkills: input.company.expectedSkills,
    remarks: input.company.remarks || "Information not available",
  };
  const jdDetails = {
    jdLink: input.company.jdLink || "Information not available",
    jdDetails: input.company.jdDetails || "Information not available",
  };

  return `Generate a concise RSA report, where RSA means Rejection Selection Analysis.

Goal:
- Stakeholders should understand the hiring outcome quickly.
- Placement trainers should know exactly what to prepare before the next similar drive.

Strict writing rules:
- Keep the full report under 450 words.
- Use simple language and short bullets.
- Do not write long paragraphs.
- Use only the given data.
- Do not blame students.
- Do not invent skills, remarks, or reasons.
- If data is missing, say "Not enough data available".

Company Details:
${JSON.stringify(companyDetails, null, 2)}

JD Details:
${JSON.stringify(jdDetails, null, 2)}

Application Statistics:
${JSON.stringify(input.stats, null, 2)}

Selected Students:
${JSON.stringify(input.applicationsSummary.selectedStudents, null, 2)}

Rejected Students:
${JSON.stringify(input.applicationsSummary.rejectedStudents, null, 2)}

In-Progress Students:
${JSON.stringify(input.applicationsSummary.inProgressStudents, null, 2)}

Dropped Students:
${JSON.stringify(input.applicationsSummary.droppedStudents, null, 2)}

Admin Inputs:
Candidate Sharing Strategy:
${input.adminInputs.candidateSharingStrategy || "Information not available"}

Interview Focus:
${input.adminInputs.interviewFocus || "Information not available"}

Company Expectations:
${input.adminInputs.companyExpectations || "Information not available"}

Training Gap:
${input.adminInputs.trainingGap || "Information not available"}

Additional Admin Notes:
${input.adminInputs.additionalAdminNotes || "Information not available"}

Tags:
${input.adminInputs.tags.length ? input.adminInputs.tags.join(", ") : "Information not available"}

Generate the RSA in this exact structure:

1. Snapshot
- Company, role, applications, selected, rejected, active.
- Overall outcome in one line.

2. What The Company Expected
- 2 to 3 bullets from JD, admin input, and remarks.

3. Selection Signals
- 2 to 3 bullets from selected student remarks.
- If no selected remarks exist, say "No clear selection remarks are available."

4. Rejection Signals
- 2 to 4 bullets from rejection remarks and rejected rounds.
- If no rejection remarks exist, say "No clear rejection remarks are available."

5. Training Actions
- 4 to 5 direct actions the placement team can run before similar drives.

6. Stakeholder Summary
- 2 short sentences.

Output:
Return only the RSA report content. Do not return JSON.`;
}

function buildConciseCompanyRsa(input: {
  company: RsaCompanyDetails;
  stats: RsaStats;
  applicationsSummary: RsaApplicationsSummary;
  adminInputs: RsaAdminInputs;
}) {
  const selectedSignals = summarizeReasons(
    input.applicationsSummary.selectedStudents,
    (student) => student.selectionReason || student.remarks,
  );
  const rejectionSignals = summarizeReasons(
    input.applicationsSummary.rejectedStudents,
    (student) =>
      [
        student.rejectedRound ? `${student.rejectedRound}:` : "",
        student.rejectionReason || student.remarks,
      ]
        .filter(Boolean)
        .join(" "),
  );
  const expectations = [
    input.adminInputs.companyExpectations,
    input.adminInputs.interviewFocus,
    input.company.expectedSkills.length
      ? `Expected skills: ${input.company.expectedSkills.slice(0, 6).join(", ")}`
      : "",
  ].filter(Boolean);
  const trainingActions = [
    input.adminInputs.trainingGap,
    "Run a JD-specific revision session before sharing profiles.",
    "Practice interview explanations using selected and rejected remarks.",
    "Use benchmarking and weekly assessment scores to prioritize readiness.",
    "Collect clear remarks for every selected and rejected candidate.",
  ]
    .filter(Boolean)
    .slice(0, 5);

  return compactRsaText(
    [
      "1. Snapshot",
      `- Company: ${input.company.name}`,
      `- Role: ${input.company.role || "Not enough data available"}`,
      `- Applications: ${input.stats.totalApplications}; Selected: ${input.stats.selectedCount}; Rejected: ${input.stats.rejectedCount}; Active: ${input.stats.inProgressCount}`,
      `- Outcome: ${outcomeLine(input.stats)}`,
      "",
      "2. What The Company Expected",
      ...bulletList(expectations, "Not enough data available."),
      "",
      "3. Selection Signals",
      ...bulletList(selectedSignals, "No clear selection remarks are available."),
      "",
      "4. Rejection Signals",
      ...bulletList(rejectionSignals, "No clear rejection remarks are available."),
      "",
      "5. Training Actions",
      ...bulletList(trainingActions, "Prepare students against the exact JD before similar drives."),
      "",
      "6. Stakeholder Summary",
      `${input.company.name} RSA shows the current hiring outcome and the main readiness signals available in the sheet data.`,
      "The placement team should use the remarks to plan focused preparation before the next similar company drive.",
    ].join("\n"),
  );
}

function summarizeReasons(
  students: RsaApplicationStudent[],
  selector: (student: RsaApplicationStudent) => string | undefined,
) {
  return Array.from(
    new Set(
      students
        .map((student) => sanitizeReason(selector(student)))
        .filter(Boolean),
    ),
  ).slice(0, 4);
}

function sanitizeReason(value?: string) {
  const cleaned = (value ?? "").replace(/reason not available/gi, "").trim();
  return cleaned || "";
}

function bulletList(items: string[], fallback: string) {
  const source = items.length ? items : [fallback];
  return source.map((item) => `- ${item}`);
}

function outcomeLine(stats: RsaStats) {
  if (stats.inProgressCount > 0) {
    return "Drive is still in progress because active applications remain.";
  }
  if (stats.selectedCount > 0) {
    return "Hiring is done because selected candidates are recorded and no active applications remain.";
  }
  if (stats.totalApplications > 0 && stats.rejectedCount + stats.droppedCount === stats.totalApplications) {
    return "Drive is dropped because all recorded applications are rejected or dropped.";
  }
  return "Outcome is not closed yet.";
}

function compactRsaText(value: string) {
  const normalized = value
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  if (normalized.length <= 3200) {
    return normalized;
  }

  return `${normalized.slice(0, 3150).replace(/\s+\S*$/, "")}\n\n[Shortened for stakeholder readability.]`;
}
