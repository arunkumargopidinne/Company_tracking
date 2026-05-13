import { NextResponse } from "next/server";
import { z } from "zod";

import { updateCompanyInSheet } from "@/lib/company-source";
import { isValidCompanyName } from "@/lib/jd-parser";
import { requireApiPermission } from "@/lib/rbac";

export const runtime = "nodejs";

const companyStatusSchema = z.enum([
  "In Progress",
  "Hiring Done",
  "Dropped",
  "Upcoming",
  "Selected",
  "Rejected All",
]);

const updateCompanySchema = z.object({
  rowNumber: z.number().int().min(2),
  loadedDate: z.string().optional(),
  companyName: z.string().min(1),
  role: z.string().min(1),
  techStack: z.string().optional().default(""),
  crm: z.string().optional().default("Dashboard"),
  location: z.string().optional().default(""),
  ctc: z.string().optional(),
  jobType: z.string().optional(),
  internshipDuration: z.string().optional(),
  stipend: z.string().optional(),
  openings: z.string().optional(),
  eligibility: z.string().optional(),
  skillsRequired: z.string().optional(),
  interviewProcess: z.string().optional(),
  workDetails: z.string().optional(),
  bond: z.string().optional(),
  remarks: z.string().optional(),
  confirmationDate: z.string().optional(),
  interviewScheduledStatus: z.string().optional(),
  currentStatus: companyStatusSchema.default("In Progress"),
});

export async function POST(request: Request) {
  const auth = await requireApiPermission("write");
  if (auth.response) return auth.response;

  const parsed = updateCompanySchema.safeParse(await request.json());

  if (!parsed.success) {
    console.error("[Company Update] Request validation failed", parsed.error.flatten());
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const payload = parsed.data;
  const validationErrors: string[] = [];

  if (!isValidCompanyName(payload.companyName)) {
    validationErrors.push("Company name is required.");
  }

  if (!payload.role.trim()) {
    validationErrors.push("Role is required.");
  }

  if (validationErrors.length > 0) {
    console.warn("[Company Update] Field validation failed", {
      rowNumber: payload.rowNumber,
      validationErrors,
    });
    return NextResponse.json(
      { ok: false, error: "Validation failed", details: validationErrors },
      { status: 400 },
    );
  }

  const sheetResult = await updateCompanyInSheet(payload);

  if (sheetResult.skipped) {
    console.error("[Company Update] Sheet update failed", sheetResult);
    return NextResponse.json({ ok: false, sheetResult }, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    sheetResult,
  });
}
