import { redirect } from "next/navigation";

import { NotificationsPanel } from "@/components/notifications-panel";
import { getNotificationsForUser } from "@/lib/notifications-source";
import { getCurrentUserRecord } from "@/lib/rbac";

export default async function NotificationsPage() {
  const user = await getCurrentUserRecord();

  if (!user) {
    redirect("/login");
  }

  const notifications = await getNotificationsForUser(user.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl font-black tracking-normal text-slate-950">
          Notifications
        </h1>
        <p className="mt-2 text-lg text-slate-600">
          Company updates and important placement activity that need your attention.
        </p>
      </div>

      <NotificationsPanel notifications={notifications} />
    </div>
  );
}
