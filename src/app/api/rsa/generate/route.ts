import { NextResponse } from "next/server";
import { z } from "zod";

import { generateAndSaveCompanyRsa } from "@/lib/rsa-source";

export const runtime = "nodejs";

const rsaSchema = z.object({
  companyId: z.string().min(1),
  adminRemarks: z.string().min(5),
});

export async function POST(request: Request) {
  const parsed = rsaSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const result = await generateAndSaveCompanyRsa({
      companyId: parsed.data.companyId,
      adminInputs: {
        candidateSharingStrategy: "",
        interviewFocus: "",
        companyExpectations: "",
        trainingGap: "",
        additionalAdminNotes: parsed.data.adminRemarks,
        tags: [],
      },
    });

    return NextResponse.json({
      ok: true,
      report: {
        finalSummary: result.generatedRsa,
        improvementSuggestions: result.generatedRsa,
      },
      rsaReport: result.report,
    });
  } catch (error) {
    return rsaGenerationErrorResponse(error);
  }
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
