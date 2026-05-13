import { NextResponse } from "next/server";
import { z } from "zod";

import {
  addApplicantToSheet,
  addApplicantsToSheet,
  parseBulkApplicants,
} from "@/lib/application-source";
import { requireApiPermission } from "@/lib/rbac";

export const runtime = "nodejs";

const applicantSchema = z.object({
  companyId: z.string().min(1),
  companyName: z.string().min(1),
  fullName: z.string().min(1).optional(),
  email: z.string().email().optional(),
  phoneNumber: z.string().min(5).optional(),
  resumeUrl: z.string().url().or(z.literal("")).optional(),
  bulkRaw: z.string().optional(),
  remarks: z.string().optional(),
});

export async function POST(request: Request) {
  const auth = await requireApiPermission("write");
  if (auth.response) return auth.response;

  const parsed = applicantSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const applicants = parsed.data.bulkRaw?.trim()
    ? parseBulkApplicants({
        raw: parsed.data.bulkRaw,
        companyId: parsed.data.companyId,
        companyName: parsed.data.companyName,
      })
    : [];

  if (parsed.data.bulkRaw?.trim()) {
    if (applicants.length === 0) {
      return NextResponse.json(
        { ok: false, error: "No valid bulk applicant rows found." },
        { status: 400 },
      );
    }

    const sheetResult = await addApplicantsToSheet(applicants);

    if (sheetResult.skipped) {
      return NextResponse.json(
        { ok: false, sheetResult },
        { status: 400 },
      );
    }

    return NextResponse.json({
      ok: true,
      count: "appended" in sheetResult ? sheetResult.appended : applicants.length,
      duplicateCount: "duplicateCount" in sheetResult ? sheetResult.duplicateCount : 0,
      sheetResult,
    });
  }

  if (!parsed.data.fullName || !parsed.data.email || !parsed.data.phoneNumber) {
    return NextResponse.json(
      { ok: false, error: "Full name, email, and phone number are required." },
      { status: 400 },
    );
  }

  const sheetResult = await addApplicantToSheet({
    companyId: parsed.data.companyId,
    companyName: parsed.data.companyName,
    fullName: parsed.data.fullName,
    email: parsed.data.email,
    phoneNumber: parsed.data.phoneNumber,
    resumeUrl: parsed.data.resumeUrl ?? "",
    remarks: parsed.data.remarks,
  });

  if (sheetResult.skipped) {
    return NextResponse.json(
      { ok: false, sheetResult },
      { status: 400 },
    );
  }

  return NextResponse.json({
    ok: true,
    count: "appended" in sheetResult ? sheetResult.appended : 1,
    duplicateCount: "duplicateCount" in sheetResult ? sheetResult.duplicateCount : 0,
    sheetResult,
  });
}
