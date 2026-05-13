import { redirect } from "next/navigation";

import { UserApprovalPanel } from "@/components/admin/user-approval-panel";
import { PageHeader } from "@/components/page-header";
import { ensureBootstrapSuperadmin } from "@/lib/auth";
import { prisma, hasDatabaseUrl } from "@/lib/db";
import { can, getCurrentSessionUser } from "@/lib/rbac";

export const dynamic = "force-dynamic";

export default async function UserApprovalsPage() {
  const sessionUser = await getCurrentSessionUser();

  if (!can(sessionUser?.role, "manage_users")) {
    redirect("/dashboard");
  }

  await ensureBootstrapSuperadmin();
  const users = hasDatabaseUrl()
    ? await prisma.user.findMany({
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
          createdAt: true,
          lastLoginAt: true,
        },
      })
    : [];

  return (
    <>
      <PageHeader
        title="User Approvals"
        description="Approve admins and superadmins, generate temporary passwords, and disable access when needed."
      />
      <UserApprovalPanel users={users} />
    </>
  );
}
