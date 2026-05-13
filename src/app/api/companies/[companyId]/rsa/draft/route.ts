import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";

import { saveRsaDraft } from "@/lib/rsa-source";
import { requireApiPermission } from "@/lib/rbac";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const draftSchema = z.object({
  rsaId: z.string().optional(),
  adminInputs: z.object({
    candidateSharingStrategy: z.string().optional().default(""),
    interviewFocus: z.string().optional().default(""),
    companyExpectations: z.string().optional().default(""),
    trainingGap: z.string().optional().default(""),
    additionalAdminNotes: z.string().optional().default(""),
    tags: z.array(z.string()).optional().default([]),
  }),
  aiGeneratedRsa: z.string().optional().default(""),
  finalEditedRsa: z.string().min(1),
});

export async function PUT(
  request: Request,
  context: { params: Promise<{ companyId: string }> },
) {
  const auth = await requireApiPermission("write");
  if (auth.response) return auth.response;

  const { companyId } = await context.params;
  const parsed = draftSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const report = await saveRsaDraft({
      companyId: decodeURIComponent(companyId),
      rsaId: parsed.data.rsaId,
      adminInputs: parsed.data.adminInputs,
      aiGeneratedRsa: parsed.data.aiGeneratedRsa,
      finalEditedRsa: parsed.data.finalEditedRsa,
    });

    revalidateRsaPaths(report.companyId);

    return NextResponse.json({ ok: true, report });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error ? error.message : "Unable to save RSA draft.",
      },
      { status: 500 },
    );
  }
}

function revalidateRsaPaths(companyId: string) {
  revalidatePath(`/companies/${companyId}`);
  revalidatePath(`/companies/${companyId}/rsa`);
  revalidatePath("/rsa");
}
