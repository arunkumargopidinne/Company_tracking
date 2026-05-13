"use client";

import { useState } from "react";
import { CheckCircle2, Copy, Loader2, Mail, ShieldOff, ShieldCheck } from "lucide-react";

type ManagedUser = {
  id: string;
  name: string;
  username: string | null;
  email: string;
  role: string;
  status: string;
  authProvider: string;
  userCode: string | null;
  mustChangePassword: boolean;
  createdAt: string | Date;
  lastLoginAt: string | Date | null;
};

type EmailDraft = {
  to: string;
  subject: string;
  body: string;
  mailtoUrl: string;
};

type UserActionResponse = {
  emailResult?: {
    skipped?: boolean;
  };
  devTemporaryPassword?: string;
};

export function UserApprovalPanel({ users }: { users: ManagedUser[] }) {
  const [items, setItems] = useState(users);
  const [loadingId, setLoadingId] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [emailDraft, setEmailDraft] = useState<EmailDraft | null>(null);

  async function act(userId: string, action: "approve" | "disable" | "enable") {
    setLoadingId(userId);
    setNotice("");
    setError("");
    setEmailDraft(null);
    const response = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, action }),
    });
    const data = await response.json().catch(() => ({}));
    setLoadingId("");

    if (!response.ok) {
      setError(data.error || "User action failed.");
      return;
    }

    setItems((current) =>
      current.map((item) =>
        item.id === userId
          ? {
              ...item,
              status: data.user.status,
              userCode: data.user.userCode,
              role: data.user.role,
            }
          : item,
      ),
    );
    if (action === "approve") {
      setEmailDraft(data.emailDraft ?? null);

      if (data.emailResult?.skipped && data.emailDraft?.mailtoUrl) {
        window.open(data.emailDraft.mailtoUrl, "_blank", "noopener,noreferrer");
      }
    }

    setNotice(buildNotice(action, data));
  }

  async function copyDraft() {
    if (!emailDraft) return;
    await navigator.clipboard.writeText(
      [`To: ${emailDraft.to}`, `Subject: ${emailDraft.subject}`, "", emailDraft.body].join("\n"),
    );
    setNotice("Email draft copied.");
  }

  return (
    <section className="rounded-[8px] border border-slate-200 bg-white p-5 shadow-sm">
      {notice ? (
        <p className="mb-4 rounded-[8px] bg-emerald-50 p-3 text-sm font-semibold text-emerald-700">
          {notice}
        </p>
      ) : null}
      {error ? (
        <p className="mb-4 rounded-[8px] bg-rose-50 p-3 text-sm font-semibold text-rose-700">
          {error}
        </p>
      ) : null}
      {emailDraft ? (
        <div className="mb-4 rounded-[8px] border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
          <p className="font-black">Approval email draft</p>
          <p className="mt-1">
            Email provider is not configured or failed, so a mail draft was opened for{" "}
            <span className="font-bold">{emailDraft.to}</span>.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <a
              href={emailDraft.mailtoUrl}
              className="inline-flex h-9 items-center gap-2 rounded-[8px] bg-amber-600 px-3 text-xs font-black text-white"
            >
              <Mail className="h-4 w-4" />
              Open Draft
            </a>
            <button
              type="button"
              onClick={copyDraft}
              className="inline-flex h-9 items-center gap-2 rounded-[8px] border border-amber-300 px-3 text-xs font-black text-amber-900"
            >
              <Copy className="h-4 w-4" />
              Copy Message
            </button>
          </div>
        </div>
      ) : null}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-3 py-3">User</th>
              <th className="px-3 py-3">Role</th>
              <th className="px-3 py-3">Provider</th>
              <th className="px-3 py-3">User ID</th>
              <th className="px-3 py-3">Status</th>
              <th className="px-3 py-3">Last Login</th>
              <th className="px-3 py-3">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.map((user) => (
              <tr key={user.id}>
                <td className="px-3 py-3">
                  <p className="font-black text-slate-950">{user.name}</p>
                  <p className="text-xs font-semibold text-slate-500">{user.email}</p>
                </td>
                <td className="px-3 py-3 font-semibold text-slate-700">{label(user.role)}</td>
                <td className="px-3 py-3 text-slate-600">{label(user.authProvider)}</td>
                <td className="px-3 py-3 font-mono text-xs text-slate-700">{user.userCode || "-"}</td>
                <td className="px-3 py-3">
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-700">
                    {label(user.status)}
                  </span>
                </td>
                <td className="px-3 py-3 text-slate-600">{formatDate(user.lastLoginAt)}</td>
                <td className="px-3 py-3">
                  <div className="flex flex-wrap gap-2">
                    {user.status === "PENDING" ? (
                      <ActionButton
                        label="Approve"
                        icon={CheckCircle2}
                        loading={loadingId === user.id}
                        onClick={() => act(user.id, "approve")}
                      />
                    ) : null}
                    {user.status === "DISABLED" ? (
                      <ActionButton
                        label="Enable"
                        icon={ShieldCheck}
                        loading={loadingId === user.id}
                        onClick={() => act(user.id, "enable")}
                      />
                    ) : (
                      <ActionButton
                        label="Disable"
                        icon={ShieldOff}
                        loading={loadingId === user.id}
                        onClick={() => act(user.id, "disable")}
                        variant="secondary"
                      />
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function ActionButton({
  label,
  icon: Icon,
  loading,
  onClick,
  variant = "primary",
}: {
  label: string;
  icon: typeof CheckCircle2;
  loading: boolean;
  onClick: () => void;
  variant?: "primary" | "secondary";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className={
        variant === "primary"
          ? "inline-flex h-9 items-center gap-2 rounded-[8px] bg-indigo-600 px-3 text-xs font-black text-white disabled:opacity-60"
          : "inline-flex h-9 items-center gap-2 rounded-[8px] border border-slate-200 px-3 text-xs font-black text-slate-700 disabled:opacity-60"
      }
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Icon className="h-4 w-4" />}
      {label}
    </button>
  );
}

function label(value: string) {
  return value
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDate(value: string | Date | null) {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleString("en-IN");
}

function buildNotice(action: "approve" | "disable" | "enable", data: UserActionResponse) {
  if (action !== "approve") {
    return "User updated successfully.";
  }

  if (!data.emailResult?.skipped) {
    return "Approved and login email sent automatically.";
  }

  const password = data.devTemporaryPassword
    ? ` Temporary password: ${data.devTemporaryPassword}`
    : "";

  return `Approved. Email draft opened because mail sending is not configured.${password}`;
}
