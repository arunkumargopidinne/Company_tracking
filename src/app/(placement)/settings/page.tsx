import { Database, FileSpreadsheet, KeyRound, ShieldCheck, Sparkles } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { auditLogs } from "@/lib/mock-data";

const integrations = [
  {
    title: "PostgreSQL + Prisma",
    icon: Database,
    status: "DATABASE_URL",
    detail: "Stores companies, students, applications, rounds, RSA reports, and audit logs.",
  },
  {
    title: "NextAuth / Firebase Auth",
    icon: ShieldCheck,
    status: "NEXTAUTH_SECRET",
    detail: "Demo credentials provider is included; Firebase can replace it from this boundary.",
  },
  {
    title: "Google Sheets API",
    icon: FileSpreadsheet,
    status: "GOOGLE_SHEETS_SPREADSHEET_ID",
    detail: "Dashboard-to-Sheets writes are routed through server API endpoints.",
  },
  {
    title: "OpenAI API",
    icon: Sparkles,
    status: "OPENAI_API_KEY",
    detail: "AI RSA generation uses OpenAI when configured and a local fallback otherwise.",
  },
  {
    title: "Admin Access",
    icon: KeyRound,
    status: "ADMIN_EMAIL",
    detail: "Use environment variables for production user access control.",
  },
];

export default function SettingsPage() {
  return (
    <>
      <PageHeader
        title="Settings"
        description="Configure database, auth, Sheets sync, OpenAI insights, and audit controls."
      />

      <div className="grid gap-5 md:grid-cols-2">
        {integrations.map((integration) => {
          const Icon = integration.icon;
          return (
            <section key={integration.title} className="rounded-[8px] border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-[8px] bg-indigo-50 text-indigo-600">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <div>
                  <h2 className="text-lg font-black text-slate-950">{integration.title}</h2>
                  <p className="mt-1 text-sm text-slate-600">{integration.detail}</p>
                  <code className="mt-3 inline-flex rounded-[8px] bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700">
                    {integration.status}
                  </code>
                </div>
              </div>
            </section>
          );
        })}
      </div>

      <section className="mt-7 rounded-[8px] border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-xl font-black text-slate-950">Important Automation Rules</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {[
            "No manual status typing: use dropdowns, drag and drop, and buttons.",
            "Every change is logged with actor, entity, action, before, and after state.",
            "Rejected students must always have a rejection round and remarks.",
            "Selected students must store selected round and selected date.",
            "Company dropped status must store dropped stage and reason.",
            "Every dashboard move is designed to update the company and student pipeline together.",
          ].map((rule) => (
            <p key={rule} className="rounded-[8px] bg-slate-50 p-3 text-sm font-semibold text-slate-600">
              {rule}
            </p>
          ))}
        </div>
      </section>

      <section className="mt-7 rounded-[8px] border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-xl font-black text-slate-950">Audit Log</h2>
        <div className="mt-4 divide-y divide-slate-100">
          {auditLogs.map((log) => (
            <div key={log.id} className="grid gap-2 py-3 text-sm md:grid-cols-[150px_120px_120px_1fr]">
              <span className="font-semibold text-slate-500">{log.at}</span>
              <span className="font-black text-slate-800">{log.actor}</span>
              <span className="font-black text-indigo-700">{log.action}</span>
              <span className="text-slate-600">{log.message}</span>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
