import { NextResponse } from "next/server";

import { markNotificationsRead } from "@/lib/notifications-source";
import { getCurrentSessionUser } from "@/lib/rbac";

export async function POST(request: Request) {
  const user = await getCurrentSessionUser();

  if (!user) {
    return NextResponse.json(
      { ok: false, error: "Authentication required." },
      { status: 401 },
    );
  }

  const body = await request.json().catch(() => ({}));
  const notificationIds = Array.isArray(body.notificationIds)
    ? body.notificationIds.filter(
        (id: unknown): id is string => typeof id === "string" && Boolean(id.trim()),
      )
    : undefined;
  const result = await markNotificationsRead(user.id, notificationIds);

  return NextResponse.json({ ok: true, ...result });
}
