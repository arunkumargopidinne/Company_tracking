import { NextResponse } from "next/server";
import { z } from "zod";

import { AuditAction } from "@/generated/prisma/enums";
import { prisma, hasDatabaseUrl } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import { getCurrentSessionUser } from "@/lib/rbac";

export const runtime = "nodejs";

const changePasswordSchema = z.object({
  password: z.string().min(8),
});

export async function POST(request: Request) {
  if (!hasDatabaseUrl()) {
    return NextResponse.json({ ok: true });
  }

  const sessionUser = await getCurrentSessionUser();

  if (!sessionUser?.id) {
    return NextResponse.json({ ok: false, error: "Authentication required." }, { status: 401 });
  }

  const parsed = changePasswordSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: parsed.error.flatten() }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: sessionUser.id },
    data: {
      passwordHash: hashPassword(parsed.data.password),
      mustChangePassword: false,
    },
  });

  await prisma.auditLog.create({
    data: {
      actorId: sessionUser.id,
      entityType: "User",
      entityId: sessionUser.id,
      action: AuditAction.PASSWORD_CHANGE,
      message: `${sessionUser.name ?? sessionUser.email} changed the temporary password.`,
    },
  });

  return NextResponse.json({ ok: true });
}
