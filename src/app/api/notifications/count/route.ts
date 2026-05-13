import { NextResponse } from "next/server";

import { getUnreadNotificationCount } from "@/lib/notifications-source";
import { getCurrentSessionUser } from "@/lib/rbac";

export async function GET() {
  const user = await getCurrentSessionUser();

  if (!user) {
    return NextResponse.json({ ok: false, count: 0 }, { status: 401 });
  }

  const count = await getUnreadNotificationCount(user.id);

  return NextResponse.json({ ok: true, count });
}
