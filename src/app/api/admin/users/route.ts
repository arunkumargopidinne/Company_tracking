import { NextResponse } from "next/server";
import { z } from "zod";

import { AuditAction, Role, UserStatus } from "@/generated/prisma/enums";
import { ensureBootstrapSuperadmin, makeTemporaryCredential, rolePrefix } from "@/lib/auth";
import { prisma, hasDatabaseUrl } from "@/lib/db";
import { sendApprovalEmail } from "@/lib/notification-mail";
import { createUserCode, hashPassword } from "@/lib/password";
import { requireApiPermission } from "@/lib/rbac";

export const runtime = "nodejs";

const userActionSchema = z.object({
  userId: z.string().min(1),
  action: z.enum(["approve", "disable", "enable"]),
});

export async function GET() {
  const auth = await requireApiPermission("manage_users");
  if (auth.response) return auth.response;

  if (!hasDatabaseUrl()) {
    return NextResponse.json({ ok: true, users: [] });
  }

  await ensureBootstrapSuperadmin();

  const users = await prisma.user.findMany({
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    select: {
      id: true,
      name: true,
      username: true,
      email: true,
      role: true,
      status: true,
      authProvider: true,
      userCode: true,
      mustChangePassword: true,
      approvedAt: true,
      disabledAt: true,
      createdAt: true,
      lastLoginAt: true,
    },
  });

  return NextResponse.json({ ok: true, users });
}

export async function POST(request: Request) {
  const auth = await requireApiPermission("manage_users");
  if (auth.response) return auth.response;

  if (!hasDatabaseUrl()) {
    return NextResponse.json(
      { ok: false, error: "DATABASE_URL is required for user management." },
      { status: 500 },
    );
  }

  const parsed = userActionSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: parsed.error.flatten() }, { status: 400 });
  }

  const target = await prisma.user.findUnique({ where: { id: parsed.data.userId } });

  if (!target) {
    return NextResponse.json({ ok: false, error: "User not found." }, { status: 404 });
  }

  if (parsed.data.action === "disable" && target.id === auth.user?.id) {
    return NextResponse.json(
      { ok: false, error: "You cannot disable your own superadmin account." },
      { status: 400 },
    );
  }

  if (parsed.data.action === "approve") {
    const temporaryPassword = makeTemporaryCredential();
    const role = target.role === Role.SUPERADMIN ? Role.SUPERADMIN : Role.ADMIN;
    const userCode = target.userCode || createUserCode(rolePrefix(role));
    const updated = await prisma.user.update({
      where: { id: target.id },
      data: {
        role,
        userCode,
        passwordHash: hashPassword(temporaryPassword),
        status: UserStatus.APPROVED,
        mustChangePassword: true,
        approvedAt: new Date(),
        approvedById: auth.user?.id,
        disabledAt: null,
      },
    });
    const emailResult = await sendApprovalEmail({
      to: updated.email,
      name: updated.name,
      userCode,
      temporaryPassword,
    });

    await prisma.auditLog.create({
      data: {
        actorId: auth.user?.id,
        entityType: "User",
        entityId: target.id,
        action: AuditAction.APPROVE,
        message: `${auth.user?.name ?? "Superadmin"} approved ${updated.name} as ${updated.role}.`,
        after: {
          userCode,
          role: updated.role,
          status: updated.status,
          emailSent: !emailResult.skipped,
        },
      },
    });

    return NextResponse.json({
      ok: true,
      user: updated,
      emailResult,
      emailDraft: emailResult.draft,
      devTemporaryPassword:
        emailResult.skipped && process.env.NODE_ENV !== "production" ? temporaryPassword : undefined,
    });
  }

  const status =
    parsed.data.action === "disable" ? UserStatus.DISABLED : UserStatus.APPROVED;
  const updated = await prisma.user.update({
    where: { id: target.id },
    data: {
      status,
      disabledAt: status === UserStatus.DISABLED ? new Date() : null,
    },
  });

  await prisma.auditLog.create({
    data: {
      actorId: auth.user?.id,
      entityType: "User",
      entityId: target.id,
      action: status === UserStatus.DISABLED ? AuditAction.DISABLE : AuditAction.ENABLE,
      message: `${auth.user?.name ?? "Superadmin"} ${parsed.data.action}d ${target.name}.`,
      after: {
        status: updated.status,
      },
    },
  });

  return NextResponse.json({ ok: true, user: updated });
}
