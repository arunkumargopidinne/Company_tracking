import { NextResponse } from "next/server";
import { z } from "zod";

import { deleteApplicantsFromSheet } from "@/lib/application-source";
import { requireApiPermission } from "@/lib/rbac";

export const runtime = "nodejs";

const deleteSchema = z.object({
  applicationIds: z.array(z.string().min(1)).min(1),
});

export async function POST(request: Request) {
  const auth = await requireApiPermission("write");
  if (auth.response) return auth.response;

  const parsed = deleteSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const sheetResult = await deleteApplicantsFromSheet(parsed.data.applicationIds);

  if (sheetResult.skipped) {
    return NextResponse.json(
      { ok: false, sheetResult },
      { status: 400 },
    );
  }

  return NextResponse.json({
    ok: true,
    deleted: parsed.data.applicationIds.length,
    sheetResult,
  });
}
