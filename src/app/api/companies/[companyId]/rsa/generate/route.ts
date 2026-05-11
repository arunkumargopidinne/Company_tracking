import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";

import { generateAndSaveCompanyRsa } from "@/lib/rsa-source";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const adminInputsSchema = z.object({
  candidateSharingStrategy: z.string().optional().default(""),
  interviewFocus: z.string().optional().default(""),
  companyExpectations: z.string().optional().default(""),
  trainingGap: z.string().optional().default(""),
  additionalAdminNotes: z.string().optional().default(""),
  tags: z.array(z.string()).optional().default([]),
});

export async function POST(
  request: Request,
  context: { params: Promise<{ companyId: string }> },
) {
  const { companyId } = await context.params;
  const parsed = adminInputsSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const result = await generateAndSaveCompanyRsa({
      companyId: decodeURIComponent(companyId),
      adminInputs: parsed.data,
    });

    revalidateRsaPaths(result.company.id);

    return NextResponse.json({
      ok: true,
      company: result.company,
      stats: result.stats,
      applicationsSummary: result.applicationsSummary,
      generatedRsa: result.generatedRsa,
      report: result.report,
    });
  } catch (error) {
    return rsaGenerationErrorResponse(error);
  }
}

function revalidateRsaPaths(companyId: string) {
  revalidatePath(`/companies/${companyId}`);
  revalidatePath(`/companies/${companyId}/rsa`);
  revalidatePath("/rsa");
}

function rsaGenerationErrorResponse(error: unknown) {
  const details = getErrorDetails(error);

  if (details.status === 401 || /incorrect api key|invalid api key/i.test(details.message)) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "OpenAI API key is invalid. Replace OPENAI_API_KEY in .env.local or .env, then restart the dev server and retry.",
      },
      { status: 401 },
    );
  }

  if (/OPENAI_API_KEY is not configured/i.test(details.message)) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "OPENAI_API_KEY is not configured. Add it to .env.local or .env, restart the dev server, and retry.",
      },
      { status: 400 },
    );
  }

  return NextResponse.json(
    {
      ok: false,
      error: "Unable to generate RSA from OpenAI right now. Please retry.",
    },
    { status: details.status && details.status >= 400 ? details.status : 500 },
  );
}

function getErrorDetails(error: unknown) {
  if (error && typeof error === "object") {
    const withDetails = error as { status?: unknown; message?: unknown };

    return {
      status:
        typeof withDetails.status === "number" ? withDetails.status : undefined,
      message:
        typeof withDetails.message === "string" ? withDetails.message : "",
    };
  }

  return {
    status: undefined,
    message: error instanceof Error ? error.message : "",
  };
}
