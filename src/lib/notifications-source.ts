import "server-only";

import { NotificationType, Role, UserStatus } from "@/generated/prisma/enums";
import { hasDatabaseUrl, prisma } from "./db";

type UserNotificationDelegate = Pick<
  typeof prisma.userNotification,
  "count" | "createMany" | "findMany" | "updateMany"
>;

export type AppNotification = {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  href: string | null;
  readAt: string | null;
  createdAt: string;
  companyName: string | null;
};

export async function createCompanyUpdateNotifications(input: {
  companyId: string;
  companyName: string;
  companyUpdateId: string;
  authorId?: string;
  content: string;
}) {
  const userNotification = getUserNotificationDelegate();

  if (!hasDatabaseUrl() || !userNotification) {
    return { created: 0 };
  }

  const recipients = await prisma.user.findMany({
    where: {
      status: UserStatus.APPROVED,
      role: { in: [Role.ADMIN, Role.STAKEHOLDER, Role.SUPERADMIN] },
      ...(input.authorId ? { id: { not: input.authorId } } : {}),
    },
    select: { id: true },
  });

  if (!recipients.length) {
    return { created: 0 };
  }

  const preview = normalizePreview(input.content);

  await userNotification.createMany({
    data: recipients.map((recipient) => ({
      userId: recipient.id,
      type: NotificationType.COMPANY_UPDATE,
      title: `New update: ${input.companyName}`,
      message: preview,
      href: `/companies/${encodeURIComponent(input.companyId)}`,
      companyId: input.companyId,
      companyUpdateId: input.companyUpdateId,
    })),
  });

  return { created: recipients.length };
}

export async function getUnreadNotificationCount(userId: string) {
  const userNotification = getUserNotificationDelegate();

  if (!hasDatabaseUrl() || userId === "bootstrap-superadmin" || !userNotification) {
    return 0;
  }

  return userNotification.count({
    where: {
      userId,
      readAt: null,
    },
  });
}

export async function getNotificationsForUser(userId: string, limit = 50): Promise<AppNotification[]> {
  const userNotification = getUserNotificationDelegate();

  if (!hasDatabaseUrl() || userId === "bootstrap-superadmin" || !userNotification) {
    return [];
  }

  const notifications = await userNotification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      company: {
        select: {
          name: true,
        },
      },
    },
  });

  return notifications.map((notification) => ({
    id: notification.id,
    type: notification.type,
    title: notification.title,
    message: notification.message,
    href: notification.href,
    readAt: notification.readAt?.toISOString() ?? null,
    createdAt: notification.createdAt.toISOString(),
    companyName: notification.company?.name ?? null,
  }));
}

export async function markNotificationsRead(userId: string, notificationIds?: string[]) {
  const userNotification = getUserNotificationDelegate();

  if (!hasDatabaseUrl() || userId === "bootstrap-superadmin" || !userNotification) {
    return { updated: 0 };
  }

  const result = await userNotification.updateMany({
    where: {
      userId,
      readAt: null,
      ...(notificationIds?.length ? { id: { in: notificationIds } } : {}),
    },
    data: {
      readAt: new Date(),
    },
  });

  return { updated: result.count };
}

function getUserNotificationDelegate() {
  const client = prisma as unknown as {
    userNotification?: UserNotificationDelegate;
  };

  return client.userNotification ?? null;
}

function normalizePreview(content: string) {
  const compact = content.replace(/\s+/g, " ").trim();

  if (compact.length <= 180) {
    return compact;
  }

  return `${compact.slice(0, 177)}...`;
}
