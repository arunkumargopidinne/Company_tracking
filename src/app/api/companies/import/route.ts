import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma, hasDatabaseUrl } from "@/lib/db";
import { appendSheetRows, getCompanyTrackingRange } from "@/lib/google-sheets";
import {
  createNextCompanyId,
  findCompanyByNameAndRole,
} from "@/lib/company-source";
import {
  parsedJobToCompanySheetRow,
  parseJobDescription,
  validateParsedJob,
} from "@/lib/jd-parser";
import { parseJobDescriptionWithOpenAI } from "@/lib/openai-jd-parser";
import { ApplicationStage, AuditAction, CRM } from "@/generated/prisma/enums";

export const runtime = "nodejs";

const importSchema = z.object({
  raw: z.string().min(3),
});

export async function POST(request: Request) {
  const parsed = importSchema.safeParse(await request.json());

  if (!parsed.success) {
    console.error("[JD Import] Schema validation failed:", parsed.error.flatten());
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  console.log("[JD Import] Starting job description parsing");
  let job = parseJobDescription(parsed.data.raw);
  let aiFallbackReason = "";
  let usedAIEnhancement = false;

  console.log("[JD Import] Parsed job fields:", {
    companyName: job.companyName,
    role: job.role,
    location: job.location,
    jobType: job.jobType,
    internshipDuration: job.internshipDuration,
    stipend: job.stipend,
    ctc: job.ctc,
    openings: job.openings,
    rounds: job.rounds,
    remarksLength: job.remarks.length,
    rolloutBatches: job.rolloutBatches,
  });

  let validationErrors = validateParsedJob(job);

  if (validationErrors.length > 0) {
    console.warn("[JD Import] Rule-based parsing was incomplete; trying OpenAI enhancement", {
      validationErrors,
      missingFields: validationErrors.map((e) => e.split(" ")[0]).join(", "),
    });

    const aiResult = await parseJobDescriptionWithOpenAI({
      raw: parsed.data.raw,
      base: job,
    });
    
    if (!aiResult.skipped) {
      job = aiResult.job;
      usedAIEnhancement = true;
      validationErrors = validateParsedJob(job);

      console.log("[JD Import] OpenAI enhancement successful", {
        previousErrors: aiResult.reason ? 1 : 0,
        remainingValidationErrors: validationErrors.length,
        extractedFields: {
          companyName: job.companyName,
          role: job.role,
          location: job.location,
          skillsCount: job.skillsRequired.length,
          roundsCount: job.rounds.length,
        },
      });
    } else {
      aiFallbackReason = aiResult.reason ?? "OpenAI parsing was skipped";
      console.warn("[JD Import] OpenAI enhancement was skipped", {
        reason: aiResult.reason,
        remainingValidationErrors: validationErrors,
      });
    }
  }

  if (validationErrors.length > 0) {
    console.error("[JD Import] JD parsing validation failed after all attempts", {
      validationErrors,
      usedAIEnhancement,
      parsed: {
        companyName: job.companyName,
        role: job.role,
        location: job.location,
        skillsCount: job.skillsRequired.length,
        roundsCount: job.rounds.length,
      },
    });
    return NextResponse.json(
      {
        ok: false,
        stage: "JD parsing",
        error: usedAIEnhancement
          ? "JD extraction with AI enhancement could not complete. Please verify the JD format and content."
          : "JD details could not be extracted. Please review the JD text format and try again.",
        details: validationErrors,
        aiEnhancementAttempted: usedAIEnhancement,
        aiFallbackReason,
        parsed: {
          companyName: job.companyName,
          role: job.role,
          location: job.location,
          skillsRequired: job.skillsRequired,
          rounds: job.rounds,
        },
      },
      { status: 400 }
    );
  }

  console.log("[JD Import] Parsed job successfully", {
    companyName: job.companyName,
    role: job.role,
    location: job.location,
    jobType: job.jobType,
  });

  const existingCompany = await findCompanyByNameAndRole({
    companyName: job.companyName,
    role: job.role,
  });

  if (existingCompany) {
    console.log("[JD Import] Duplicate company and role detected; skipping append", {
      companyId: existingCompany.id,
      companyName: existingCompany.name,
      role: existingCompany.jdTitle,
    });

    return NextResponse.json({
      ok: true,
      imported: 0,
      duplicate: true,
      companyId: existingCompany.id,
      parsed: job,
      range: getCompanyTrackingRange(),
      syncedToSheets: true,
      aiEnhancementUsed: usedAIEnhancement,
      message: `${job.companyName} - ${job.role} already exists.`,
    });
  }

  const companyId = await createNextCompanyId();
  const sheetRow = parsedJobToCompanySheetRow(job, companyId);

  console.log("[JD Import] Appending to Google Sheets", {
    range: getCompanyTrackingRange(),
    companyId,
    rowLength: sheetRow.length,
  });

  const sheetResult = await appendSheetRows({
    range: getCompanyTrackingRange(),
    values: [sheetRow],
  });

  if (sheetResult.skipped) {
    console.error("[JD Import] Failed to sync to Google Sheets", sheetResult);
  } else {
    console.log("[JD Import] Successfully synced to Google Sheets");
  }

  if (hasDatabaseUrl()) {
    console.log("[JD Import] Saving to database...");
    try {
      const companyData = {
        name: job.companyName,
        techStack: job.skillsRequired,
        rounds: [
          ApplicationStage.APPLIED,
          ...(job.rounds.some((round) => /coding|assessment/i.test(round))
            ? [ApplicationStage.ASSESSMENT_ROUND]
            : []),
          ...(job.rounds.some((round) => /technical|tr/i.test(round))
            ? [ApplicationStage.TECHNICAL_ROUND_1]
            : []),
          ...(job.rounds.some((round) => /manager|managerial|mr/i.test(round))
            ? [ApplicationStage.MANAGER_ROUND]
            : []),
          ...(job.rounds.some((round) => /hr/i.test(round))
            ? [ApplicationStage.HR_ROUND]
            : []),
          ApplicationStage.SELECTED,
          ApplicationStage.REJECTED,
        ],
        jdLink: null,
        crm: CRM.MANUAL,
        location: job.location,
        remarks: job.remarks,
      };

      await prisma.company.upsert({
        where: {
          id: companyId,
        },
        update: {
          name: job.companyName,
          techStack: job.skillsRequired,
          location: job.location,
          remarks: job.remarks,
        },
        create: {
          id: companyId,
          ...companyData,
        },
      });

      await prisma.jobDescription.create({
        data: {
          companyId,
          title: job.role,
          details: job.raw,
          expectedSkills: job.skillsRequired,
        },
      });

      await prisma.auditLog.create({
        data: {
          entityType: "Company",
          entityId: companyId,
          action: AuditAction.CREATE,
          message: `Imported JD for ${job.companyName} (${companyId}) from manual paste.`,
        },
      });

      console.log("[JD Import] Successfully saved to database");
    } catch (dbError) {
      console.error("[JD Import] Database save failed:", dbError);
      // Don't fail the request if database is unavailable, Sheets sync is the primary
    }
  }

  return NextResponse.json({
    ok: true,
    imported: 1,
    companyId,
    parsed: job,
    range: getCompanyTrackingRange(),
    syncedToSheets: !sheetResult.skipped,
    aiEnhancementUsed: usedAIEnhancement,
    sheetResult,
    message: usedAIEnhancement 
      ? `JD enhanced with AI and stored for ${job.companyName}. Check details.`
      : `JD parsed and stored for ${job.companyName}.`,
  });
}
