import { redirect } from "next/navigation";

import { PageHeader } from "@/components/page-header";
import { prisma, hasDatabaseUrl } from "@/lib/db";
import { can, getCurrentSessionUser } from "@/lib/rbac";

export const dynamic = "force-dynamic";

export default async function ActiveLogsPage() {
  const sessionUser = await getCurrentSessionUser();

  if (!can(sessionUser?.role, "audit_logs")) {
    redirect("/dashboard");
  }

  const logs = hasDatabaseUrl()
    ? await prisma.auditLog.findMany({
        orderBy: { createdAt: "desc" },
        take: 100,
        include: {
          actor: {
            select: {
              name: true,
              email: true,
              role: true,
            },
          },
        },
      })
    : [];

  return (
    <>
      <PageHeader
        title="Active Logs"
        description="Superadmin-only activity tracking for user, company, application, RSA, and update changes."
      />
      <section className="rounded-[8px] border border-slate-200 bg-white p-5 shadow-sm">
        <div className="divide-y divide-slate-100">
          {logs.map((log) => (
            <article key={log.id} className="grid gap-3 py-4 text-sm lg:grid-cols-[180px_180px_1fr]">
              <div>
                <p className="font-black text-slate-900">{formatDate(log.createdAt)}</p>
                <p className="text-xs font-semibold text-slate-500">{log.action}</p>
              </div>
              <div>
                <p className="font-bold text-slate-800">{log.actor?.name || "System"}</p>
                <p className="text-xs text-slate-500">{log.actor?.email || "-"}</p>
              </div>
              <div>
                <p className="font-semibold text-slate-700">{log.message}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {log.entityType} / {log.entityId}
                </p>
              </div>
            </article>
          ))}
          {logs.length === 0 ? (
            <div className="py-10 text-center text-sm font-semibold text-slate-500">
              No activity logs found yet.
            </div>
          ) : null}
        </div>
      </section>
    </>
  );
}

function formatDate(value: Date) {
  return value.toLocaleString("en-IN");
}
