import { redirect } from "next/navigation";

import { AppShell } from "@/components/app-shell";
import { UserStatus } from "@/generated/prisma/enums";
import { hasDatabaseUrl, prisma } from "@/lib/db";
import { getUnreadNotificationCount } from "@/lib/notifications-source";
import { getCurrentUserRecord } from "@/lib/rbac";

export default async function PlacementLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getCurrentUserRecord();

  if (!user) {
    redirect("/login");
  }

  if (user.mustChangePassword) {
    redirect("/change-password");
  }

  const pendingApprovalCount =
    user.role === "SUPERADMIN" && hasDatabaseUrl()
      ? await prisma.user.count({
          where: { status: UserStatus.PENDING },
        })
      : 0;
  const notificationCount = await getUnreadNotificationCount(user.id);

  return (
    <AppShell
      user={{
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      }}
      pendingApprovalCount={pendingApprovalCount}
      notificationCount={notificationCount}
    >
      {children}
    </AppShell>
  );
}
