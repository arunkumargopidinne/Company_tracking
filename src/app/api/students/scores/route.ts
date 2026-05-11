import { NextResponse } from "next/server";
import { z } from "zod";
import { getStudentScores, filterStudents, studentsToCSV } from "@/lib/student-scores";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const querySchema = z.object({
  benchmarkingMin: z.coerce.number().optional(),
  assessmentMin: z.coerce.number().optional(),
  mentorMin: z.coerce.number().optional(),
  batch: z.string().optional(),
  status: z.string().optional(),
  search: z.string().optional(),
  export: z.enum(["csv", "json"]).optional(),
});

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const parsed = querySchema.safeParse({
    benchmarkingMin: searchParams.get("benchmarkingMin") ?? undefined,
    assessmentMin: searchParams.get("assessmentMin") ?? undefined,
    mentorMin: searchParams.get("mentorMin") ?? undefined,
    batch: searchParams.get("batch") ?? undefined,
    status: searchParams.get("status") ?? undefined,
    search: searchParams.get("search") ?? undefined,
    export: searchParams.get("export") ?? undefined,
  });

  if (!parsed.success) {
    console.error("[Student Scores API] Query validation failed:", parsed.error.flatten());
    return NextResponse.json(
      { error: "Invalid query parameters", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  console.log("[Student Scores API] Fetching student scores with filters", parsed.data);

  const students = await getStudentScores();
  const filtered = filterStudents(students, {
    benchmarkingMin: parsed.data.benchmarkingMin,
    assessmentMin: parsed.data.assessmentMin,
    mentorMin: parsed.data.mentorMin,
    batch: parsed.data.batch,
    status: parsed.data.status,
    searchText: parsed.data.search,
  });

  console.log("[Student Scores API] Filtered results", {
    totalStudents: students.length,
    filteredStudents: filtered.length,
  });

  if (parsed.data.export === "csv") {
    const csv = studentsToCSV(filtered);
    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="student-scores-${new Date().toISOString().split("T")[0]}.csv"`,
      },
    });
  }

  return NextResponse.json({
    ok: true,
    totalStudents: students.length,
    filteredStudents: filtered.length,
    students: filtered,
  });
}
