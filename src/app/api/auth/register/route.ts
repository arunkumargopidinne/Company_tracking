import { NextResponse } from "next/server";
import { z } from "zod";

import { AuditAction, AuthProvider, Role, UserStatus } from "@/generated/prisma/enums";
import { ensureBootstrapSuperadmin } from "@/lib/auth";
import { prisma, hasDatabaseUrl } from "@/lib/db";

export const runtime = "nodejs";

const registerSchema = z.object({
  username: z.string().min(2),
  email: z.string().email(),
  role: z.enum(["ADMIN", "SUPERADMIN"]),
});

export async function POST(request: Request) {
  if (!hasDatabaseUrl()) {
    return NextResponse.json(
      { ok: false, error: "DATABASE_URL is required for registration." },
      { status: 500 },
    );
  }

  const parsed = registerSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: parsed.error.flatten() }, { status: 400 });
  }

  await ensureBootstrapSuperadmin();

  const email = parsed.data.email.toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });

  if (existing) {
    return NextResponse.json(
      { ok: false, error: "An account request already exists for this email." },
      { status: 409 },
    );
  }

  const user = await prisma.user.create({
    data: {
      name: parsed.data.username,
      username: parsed.data.username,
      email,
      role: parsed.data.role === "SUPERADMIN" ? Role.SUPERADMIN : Role.ADMIN,
      status: UserStatus.PENDING,
      authProvider: AuthProvider.CREDENTIALS,
      mustChangePassword: true,
    },
  });

  await prisma.auditLog.create({
    data: {
      entityType: "User",
      entityId: user.id,
      action: AuditAction.REGISTER,
      message: `${user.name} requested ${user.role} access.`,
      after: {
        email: user.email,
        role: user.role,
        status: user.status,
      },
    },
  });

  return NextResponse.json({
    ok: true,
    message: "Registration request submitted. Login will work after superadmin approval.",
  });
}
