import { NextResponse } from "next/server";
import { z } from "zod";

import { createCompanyUpdate } from "@/lib/company-updates-source";
import { getCompanyForDashboard } from "@/lib/company-source";
import { requireApiPermission } from "@/lib/rbac";

export const runtime = "nodejs";

const updateSchema = z.object({
  content: z.string().min(5),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ companyId: string }> },
) {
  const auth = await requireApiPermission("company_updates");
  if (auth.response) return auth.response;

  const { companyId } = await params;
  const parsed = updateSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: parsed.error.flatten() }, { status: 400 });
  }

  const company = await getCompanyForDashboard(decodeURIComponent(companyId));

  if (!company) {
    return NextResponse.json({ ok: false, error: "Company not found." }, { status: 404 });
  }

  try {
    const result = await createCompanyUpdate({
      companyId: company.id,
      companyName: company.name,
      content: parsed.data.content,
      authorId: auth.user?.id,
      authorName: auth.user?.name || auth.user?.email || "Superadmin",
    });

    if (result.sheetResult.skipped) {
      return NextResponse.json(
        {
          ok: false,
          error: result.sheetResult.reason || "Update saved in database but Google Sheets sync failed.",
          update: result.update,
          sheetResult: result.sheetResult,
        },
        { status: 400 },
      );
    }

    return NextResponse.json({
      ok: true,
      ...result,
    });
  } catch (error) {
    console.error("[Company Updates] Save failed", error);
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Update could not be saved. Please check database and Sheets configuration.",
      },
      { status: 500 },
    );
  }
}
