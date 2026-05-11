import { NextResponse } from "next/server";
import { z } from "zod";

import { deleteCompanyFromSheet } from "@/lib/company-source";

export const runtime = "nodejs";

const deleteCompanySchema = z.object({
  rowNumber: z.number().int().min(2),
});

export async function POST(request: Request) {
  const parsed = deleteCompanySchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const sheetResult = await deleteCompanyFromSheet(parsed.data.rowNumber);

  if (sheetResult.skipped) {
    return NextResponse.json(
      { ok: false, sheetResult },
      { status: 400 },
    );
  }

  return NextResponse.json({
    ok: true,
    sheetResult,
  });
}
