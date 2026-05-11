import { NextResponse } from "next/server";

import { getRsaOverview } from "@/lib/rsa-source";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ companyId: string }> },
) {
  const { companyId } = await context.params;

  try {
    const overview = await getRsaOverview(decodeURIComponent(companyId));

    if (!overview) {
      return NextResponse.json(
        { ok: false, error: "Company not found." },
        { status: 404 },
      );
    }

    return NextResponse.json({
      ok: true,
      company: overview.company,
      stats: overview.stats,
      existingRsa: overview.existingRsa,
      history: overview.history,
      applicationsSummary: overview.applicationsSummary,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unable to fetch RSA data.",
      },
      { status: 500 },
    );
  }
}

