import "server-only";

import OpenAI from "openai";

import { getCompanyPipelineData } from "./application-source";
import { getCompanyForDashboard } from "./company-source";
import { stageLabel } from "./pipeline";
import type {
  RsaAdminInputs,
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
    throw new Error("OPENAI_API_KEY is not configured.");
  }

  const client = new OpenAI({ apiKey });
  const response = await client.chat.completions.create({
    model: process.env.OPENAI_MODEL || "gpt-4o-mini",
    temperature: 0.2,
    max_completion_tokens: 4096,
    messages: [
      {
        role: "system",
        content: "You are an expert placement analytics assistant.",
      },
      {
        role: "user",
        content: buildCompanyRsaPrompt(input),
      },
    ],
  });
  const content = response.choices[0]?.message?.content?.trim();

  if (!content) {
    throw new Error("OpenAI returned an empty RSA response.");
  }

  return content;
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

  return `You are an expert placement analytics assistant.

Generate a professional RSA report, where RSA means Rejection Selection Analysis.

This report is for stakeholders to understand why candidates were rejected, why candidates were selected, what patterns were observed, and what improvements are needed.

Use only the given data.
Do not assume facts that are not available.
If information is missing, mention "Information not available".

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

1. Company Overview
Briefly explain the company, role, location, required skills, and hiring process if available.

2. Candidate Sharing Strategy
Explain what kind of students were shared for this drive.
Use admin input and available data.
Mention if students were shared based on applications, benchmarking, weekly assessments, resume screening, or other criteria.

3. Interview / Assessment Focus
Explain what the company mainly evaluated based on remarks, rejected rounds, selected remarks, and admin inputs.

4. Selection Analysis
Explain why selected students were preferred.
Mention common strengths from available data.
If no selected students are available, clearly say:
"As per the current data, no students have been marked as selected for this company."

5. Rejection Analysis
Explain why students were rejected.
Group rejection reasons into categories.
Mention repeated reasons and rejected rounds.
Use available rejection remarks.

6. Key Patterns Observed
Summarize repeated patterns from applications, selected students, rejected students, in-progress students, and admin inputs.

7. Training Gap Analysis
Compare company expectations with student preparation/training.
Mention gaps like React vs Django, frontend vs backend, Java gap, AWS/Docker gap, deployment gap, communication gap, logic-building gap, etc., only if present in admin input or data.

8. Improvement Points
Give practical improvement points for students and training/internal teams.

9. Final Stakeholder Summary
Write a clear final summary in 1-2 professional paragraphs.

Tone:
Professional, neutral, stakeholder-friendly.
Do not blame students directly.
Avoid harsh language.
Use constructive language.
Use neutral phrases such as:
"The key challenge observed was..."
"Students may require additional preparation in..."
"The company expectation was beyond the current training scope..."
"Candidates who demonstrated stronger communication and project explanation performed better..."
"The rejection pattern indicates..."
"The selection pattern indicates..."

Output:
Return only the RSA report content.
Do not return JSON unless the API specifically needs JSON.`;
}
