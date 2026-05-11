import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { prisma, hasDatabaseUrl } from "@/lib/db";
import { syncApplicationMoveToSheet } from "@/lib/google-sheets";
import {
  calculateCompanyStatus,
  getCompanyPipelineData,
  updateApplicantStages,
} from "@/lib/application-source";
import { updateCompanyStatusInSheet } from "@/lib/company-source";
import { PIPELINE_STAGE_IDS } from "@/lib/pipeline";
import { ApplicationStage, AuditAction, RoundOutcome } from "@/generated/prisma/enums";

export const runtime = "nodejs";

const moveSchema = z.object({
  companyId: z.string().min(1),
  applicationIds: z.array(z.string().min(1)).min(1),
  targetStage: z.enum(PIPELINE_STAGE_IDS),
  remarks: z.string().optional(),
  rejectedAtRound: z.enum(PIPELINE_STAGE_IDS).optional(),
});

export async function POST(request: Request) {
  const parsed = moveSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const payload = parsed.data;
  const outcome =
    payload.targetStage === "SELECTED"
      ? RoundOutcome.SELECTED
      : payload.targetStage === "REJECTED"
        ? RoundOutcome.REJECTED
        : RoundOutcome.PENDING;

  if (
    (payload.targetStage === "SELECTED" ||
      payload.targetStage === "REJECTED" ||
      payload.targetStage === "DROPPED") &&
    !payload.remarks?.trim()
  ) {
    return NextResponse.json(
      { error: "Selected, rejected, and dropped statuses require remarks." },
      { status: 400 },
    );
  }

  console.log("[Application Move] Moving applications", {
    companyId: payload.companyId,
    count: payload.applicationIds.length,
    targetStage: payload.targetStage,
  });

  const sheetUpdateResult = await updateApplicantStages(payload);
  const sheetAuditResult = await syncApplicationMoveToSheet(payload);
  const latestPipeline = await getCompanyPipelineData(payload.companyId);
  const calculatedCompanyStatus = calculateCompanyStatus(latestPipeline.applications);
  const companyStatusSheetResult = await updateCompanyStatusInSheet(
    payload.companyId,
    calculatedCompanyStatus,
  );

  console.log("[Application Move] Sheet sync result", {
    applicationSkipped: sheetUpdateResult.skipped,
    auditSkipped: sheetAuditResult.skipped,
    calculatedCompanyStatus,
    companyStatusSkipped: companyStatusSheetResult.skipped,
  });

  if (hasDatabaseUrl()) {
    const selectedAt = payload.targetStage === "SELECTED" ? new Date() : undefined;

    await prisma.application.updateMany({
      where: {
        id: { in: payload.applicationIds },
        companyId: payload.companyId,
      },
      data: {
        currentStage: payload.targetStage as ApplicationStage,
        currentOutcome: outcome,
        remarks: payload.remarks,
        rejectedAtRound:
          payload.targetStage === "REJECTED"
            ? (payload.rejectedAtRound as ApplicationStage)
            : null,
        rejectionReason: payload.targetStage === "REJECTED" ? payload.remarks : null,
        selectedRound:
          payload.targetStage === "SELECTED"
            ? (payload.rejectedAtRound as ApplicationStage | undefined)
            : undefined,
        selectedAt,
        droppedStage:
          payload.targetStage === "DROPPED"
            ? (payload.rejectedAtRound as ApplicationStage)
            : null,
        droppedReason: payload.targetStage === "DROPPED" ? payload.remarks : null,
      },
    });

    await prisma.auditLog.create({
      data: {
        entityType: "Application",
        entityId: payload.applicationIds.join(","),
        action:
          payload.targetStage === "SELECTED"
            ? AuditAction.SELECT
            : payload.targetStage === "REJECTED"
              ? AuditAction.REJECT
              : payload.targetStage === "DROPPED"
                ? AuditAction.DROP
                : AuditAction.MOVE,
        message: `Moved ${payload.applicationIds.length} application(s) to ${payload.targetStage}.`,
        after: payload,
      },
    });
  }

  revalidateApplicationViews(payload.companyId);

  return NextResponse.json({
    ok: true,
    syncedToSheets: !sheetUpdateResult.skipped,
    sheetResult: sheetUpdateResult,
    auditSheetResult: sheetAuditResult,
    calculatedCompanyStatus,
    companyStatusSheetResult,
  });
}

function revalidateApplicationViews(companyId: string) {
  revalidatePath("/dashboard");
  revalidatePath("/students");
  revalidatePath("/students/[id]", "page");
  revalidatePath(`/companies/${companyId}`);
  revalidatePath(`/rsa/${companyId}`);
}
