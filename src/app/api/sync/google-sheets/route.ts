import { NextResponse } from "next/server";

import { appendSheetRows } from "@/lib/google-sheets";

export const runtime = "nodejs";

export async function POST() {
  const result = await appendSheetRows({
    range: "AuditLog!A:F",
    values: [
      [
        new Date().toISOString(),
        "SYSTEM",
        "sync-health-check",
        "settings",
        "SYNC",
        "Google Sheets sync endpoint checked from dashboard.",
      ],
    ],
  });

  return NextResponse.json({
    ok: true,
    configured: !result.skipped,
    result,
  });
}
