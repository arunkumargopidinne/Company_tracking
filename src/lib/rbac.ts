import "server-only";

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { UserStatus } from "@/generated/prisma/enums";
import { authOptions, type AppRole } from "./auth";
import { prisma, hasDatabaseUrl } from "./db";

export type Permission = "write" | "manage_users" | "company_updates" | "audit_logs";

export function can(role: AppRole | undefined, permission: Permission) {
  if (role === "SUPERADMIN") return true;
  if (role === "ADMIN") return permission === "write";
  return false;
}

export function isReadOnlyRole(role?: AppRole) {
  return role === "STAKEHOLDER";
}

export async function getCurrentSessionUser() {
  const session = await getServerSession(authOptions);

  return session?.user ?? null;
}

export async function getCurrentUserRecord() {
  const sessionUser = await getCurrentSessionUser();

  if (!sessionUser) {
    return null;
  }

  if (!hasDatabaseUrl() || sessionUser.id === "bootstrap-superadmin") {
    return {
      id: sessionUser.id,
      name: sessionUser.name ?? "Super Admin",
      email: sessionUser.email ?? "",
      role: sessionUser.role,
      status: sessionUser.status,
      mustChangePassword: sessionUser.mustChangePassword,
    };
  }

  const user = await prisma.user.findUnique({ where: { id: sessionUser.id } });

  if (!user || user.status !== UserStatus.APPROVED) {
    return null;
  }

  return user;
}

export async function requireApiPermission(permission: Permission) {
  const sessionUser = await getCurrentSessionUser();

  if (!sessionUser) {
    return {
      response: NextResponse.json({ ok: false, error: "Authentication required." }, { status: 401 }),
      user: null,
    };
  }

  if (!can(sessionUser.role, permission)) {
    return {
      response: NextResponse.json({ ok: false, error: "You do not have permission for this action." }, { status: 403 }),
      user: sessionUser,
    };
  }

  return {
    response: null,
    user: sessionUser,
  };
}
