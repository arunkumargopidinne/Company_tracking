import { NextResponse } from "next/server";

import { appendSheetRows } from "@/lib/google-sheets";
import { requireApiPermission } from "@/lib/rbac";

export const runtime = "nodejs";

export async function POST() {
  const auth = await requireApiPermission("write");
  if (auth.response) return auth.response;

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
