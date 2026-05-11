"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  Clipboard,
  Download,
  FileClock,
  Loader2,
  Save,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { clsx } from "clsx";

import {
  RSA_TAG_OPTIONS,
  type RsaAdminInputs,
  type RsaReportRecord,
  type RsaStatus,
} from "@/lib/rsa-types";
import { StatusBadge } from "./status-badge";

type TabId = "inputs" | "draft" | "final" | "history";

const emptyAdminInputs: RsaAdminInputs = {
  candidateSharingStrategy: "",
  interviewFocus: "",
  companyExpectations: "",
  trainingGap: "",
  additionalAdminNotes: "",
  tags: [],
};

export function CompanyRsaWorkspace({
  companyId,
  existingRsa,
  history,
}: {
  companyId: string;
  existingRsa: RsaReportRecord | null;
  history: RsaReportRecord[];
}) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabId>("inputs");
  const [adminInputs, setAdminInputs] = useState<RsaAdminInputs>(
    existingRsa?.adminInputs ?? emptyAdminInputs,
  );
  const [rsaId, setRsaId] = useState(existingRsa?.rsaId ?? "");
  const [aiGeneratedRsa, setAiGeneratedRsa] = useState(
    existingRsa?.aiGeneratedRsa ?? "",
  );
  const [finalEditedRsa, setFinalEditedRsa] = useState(
    existingRsa?.finalEditedRsa || existingRsa?.aiGeneratedRsa || "",
  );
  const [status, setStatus] = useState<RsaStatus | "">(
    existingRsa?.status ?? "",
  );
  const [items, setItems] = useState(history);
  const [operation, setOperation] = useState<
    "generate" | "draft" | "confirm" | ""
  >("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const confirmedRsa = useMemo(
    () =>
      items.find((item) => item.status === "Confirmed") ??
      (status === "Confirmed"
        ? {
            rsaId,
            finalEditedRsa,
            aiGeneratedRsa,
            status,
            updatedAt: "",
            confirmedAt: "",
          }
        : null),
    [aiGeneratedRsa, finalEditedRsa, items, rsaId, status],
  );
  const finalRsaText =
    status === "Confirmed" ? finalEditedRsa : confirmedRsa?.finalEditedRsa || "";

  async function generate() {
    setOperation("generate");
    setError("");
    setNotice("");

    const data = await postJson(`/api/companies/${encodeURIComponent(companyId)}/rsa/generate`, {
      method: "POST",
      body: adminInputs,
    });

    setOperation("");

    if (!data.ok) {
      setError(data.error || "RSA generation failed. Please retry.");
      return;
    }

    const report = data.report as RsaReportRecord;
    setRsaId(report.rsaId);
    setAiGeneratedRsa(data.generatedRsa ?? report.aiGeneratedRsa);
    setFinalEditedRsa(report.finalEditedRsa || data.generatedRsa || "");
    setStatus(report.status);
    setItems((current) => mergeHistory(report, current));
    setNotice("RSA generated and saved in RSA_Reports.");
    setActiveTab("draft");
    router.refresh();
  }

  async function saveDraft() {
    if (!finalEditedRsa.trim()) return;
    setOperation("draft");
    setError("");
    setNotice("");

    const data = await postJson(`/api/companies/${encodeURIComponent(companyId)}/rsa/draft`, {
      method: "PUT",
      body: {
        rsaId,
        adminInputs,
        aiGeneratedRsa,
        finalEditedRsa,
      },
    });

    setOperation("");

    if (!data.ok) {
      setError(data.error || "Draft could not be saved.");
      return;
    }

    const report = data.report as RsaReportRecord;
    setRsaId(report.rsaId);
    setStatus(report.status);
    setItems((current) => mergeHistory(report, current));
    setNotice("Draft saved in RSA_Reports.");
    router.refresh();
  }

  async function confirm() {
    if (!finalEditedRsa.trim()) return;
    setOperation("confirm");
    setError("");
    setNotice("");

    const data = await postJson(`/api/companies/${encodeURIComponent(companyId)}/rsa/confirm`, {
      method: "POST",
      body: {
        rsaId,
        adminInputs,
        aiGeneratedRsa,
        finalEditedRsa,
      },
    });

    setOperation("");

    if (!data.ok) {
      setError(data.error || "RSA could not be confirmed.");
      return;
    }

    const report = data.report as RsaReportRecord;
    setRsaId(report.rsaId);
    setStatus(report.status);
    setItems((current) => mergeHistory(report, current));
    setNotice("RSA confirmed and stored in RSA_Reports.");
    setActiveTab("final");
    router.refresh();
  }

  function updateField(key: keyof Omit<RsaAdminInputs, "tags">, value: string) {
    setAdminInputs((current) => ({ ...current, [key]: value }));
  }

  function toggleTag(tag: string) {
    setAdminInputs((current) => ({
      ...current,
      tags: current.tags.includes(tag)
        ? current.tags.filter((item) => item !== tag)
        : [...current.tags, tag],
    }));
  }

  async function copyFinalRsa() {
    await navigator.clipboard.writeText(finalRsaText);
    setNotice("Final RSA copied.");
  }

  function downloadFinalRsa() {
    const blob = new Blob([finalRsaText], { type: "text/plain;charset=utf-8" });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${companyId}-rsa.txt`;
    document.body.appendChild(anchor);
    anchor.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(anchor);
  }

  return (
    <section className="rounded-[8px] border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap gap-2 border-b border-slate-200 p-3">
        <TabButton active={activeTab === "inputs"} onClick={() => setActiveTab("inputs")}>
          Admin Inputs
        </TabButton>
        <TabButton active={activeTab === "draft"} onClick={() => setActiveTab("draft")}>
          AI Draft
        </TabButton>
        <TabButton active={activeTab === "final"} onClick={() => setActiveTab("final")}>
          Final RSA
        </TabButton>
        <TabButton active={activeTab === "history"} onClick={() => setActiveTab("history")}>
          History
        </TabButton>
        {status ? (
          <span className="ml-auto flex items-center">
            <StatusBadge tone={status === "Confirmed" ? "selected" : "warning"}>
              {status}
            </StatusBadge>
          </span>
        ) : null}
      </div>

      <div className="p-5">
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

        {activeTab === "inputs" ? (
          <div className="space-y-5">
            <div className="grid gap-4 lg:grid-cols-2">
              <TextAreaField
                label="Candidate Sharing Strategy"
                value={adminInputs.candidateSharingStrategy}
                onChange={(value) => updateField("candidateSharingStrategy", value)}
                placeholder="For this drive, we shared students who applied for the opportunity..."
              />
              <TextAreaField
                label="Interview Focus"
                value={adminInputs.interviewFocus}
                onChange={(value) => updateField("interviewFocus", value)}
                placeholder="Resume explanation, programming basics, Django, Java, AWS..."
              />
              <TextAreaField
                label="Company Expectations"
                value={adminInputs.companyExpectations}
                onChange={(value) => updateField("companyExpectations", value)}
                placeholder="Production-level projects, deployment, backend knowledge..."
              />
              <TextAreaField
                label="Training Gap / Internal Observation"
                value={adminInputs.trainingGap}
                onChange={(value) => updateField("trainingGap", value)}
                placeholder="Students were mainly trained on React JS, but company expected..."
              />
            </div>
            <TextAreaField
              label="Additional Admin Notes"
              value={adminInputs.additionalAdminNotes}
              onChange={(value) => updateField("additionalAdminNotes", value)}
              placeholder="Surprise tests, advanced questions, communication observations..."
            />
            <div>
              <p className="text-sm font-black text-slate-800">Tags</p>
              <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                {RSA_TAG_OPTIONS.map((tag) => (
                  <label
                    key={tag}
                    className="flex min-h-10 items-center gap-2 rounded-[8px] border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-700"
                  >
                    <input
                      type="checkbox"
                      checked={adminInputs.tags.includes(tag)}
                      onChange={() => toggleTag(tag)}
                      className="h-4 w-4 rounded border-slate-300 text-indigo-600"
                    />
                    <span>{tag}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="flex justify-end">
              <ActionButton
                onClick={generate}
                loading={operation === "generate"}
                icon={Sparkles}
              >
                Generate RSA
              </ActionButton>
            </div>
          </div>
        ) : null}

        {activeTab === "draft" ? (
          <div>
            <textarea
              value={finalEditedRsa}
              onChange={(event) => setFinalEditedRsa(event.target.value)}
              rows={24}
              className="w-full resize-y rounded-[8px] border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-800 outline-none focus:border-indigo-300 focus:bg-white"
              placeholder="Generate RSA to create the AI draft."
            />
            <div className="mt-4 flex flex-wrap justify-end gap-2">
              <ActionButton
                onClick={generate}
                loading={operation === "generate"}
                icon={Sparkles}
                variant="secondary"
              >
                Regenerate
              </ActionButton>
              <ActionButton
                onClick={saveDraft}
                loading={operation === "draft"}
                icon={Save}
                disabled={!finalEditedRsa.trim()}
                variant="secondary"
              >
                Save Draft
              </ActionButton>
              <ActionButton
                onClick={confirm}
                loading={operation === "confirm"}
                icon={CheckCircle2}
                disabled={!finalEditedRsa.trim()}
              >
                Confirm RSA
              </ActionButton>
            </div>
          </div>
        ) : null}

        {activeTab === "final" ? (
          <div>
            {confirmedRsa ? (
              <>
                <div className="rounded-[8px] border border-slate-200 bg-slate-50 p-5">
                  <pre className="whitespace-pre-wrap break-words font-sans text-sm leading-7 text-slate-800">
                    {finalRsaText}
                  </pre>
                </div>
                <div className="mt-4 flex flex-wrap justify-end gap-2">
                  <ActionButton onClick={copyFinalRsa} icon={Clipboard} variant="secondary">
                    Copy RSA
                  </ActionButton>
                  <ActionButton onClick={downloadFinalRsa} icon={Download} variant="secondary">
                    Download Text
                  </ActionButton>
                  <ActionButton onClick={() => setActiveTab("draft")} icon={FileClock}>
                    Edit RSA
                  </ActionButton>
                </div>
              </>
            ) : (
              <div className="rounded-[8px] border border-dashed border-slate-300 p-8 text-center text-sm font-semibold text-slate-500">
                No confirmed RSA is available for this company yet.
              </div>
            )}
          </div>
        ) : null}

        {activeTab === "history" ? (
          <div className="space-y-3">
            {items.length ? (
              items.map((item) => (
                <button
                  key={item.rsaId}
                  type="button"
                  onClick={() => {
                    setRsaId(item.rsaId);
                    setAdminInputs(item.adminInputs);
                    setAiGeneratedRsa(item.aiGeneratedRsa);
                    setFinalEditedRsa(item.finalEditedRsa || item.aiGeneratedRsa);
                    setStatus(item.status);
                    setActiveTab(item.status === "Confirmed" ? "final" : "draft");
                  }}
                  className="w-full rounded-[8px] border border-slate-200 p-4 text-left transition hover:border-indigo-300 hover:bg-indigo-50"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-black text-slate-950">{item.rsaId}</p>
                      <p className="mt-1 text-sm text-slate-500">
                        Updated {formatDate(item.updatedAt || item.generatedDate)}
                      </p>
                    </div>
                    <StatusBadge tone={item.status === "Confirmed" ? "selected" : "warning"}>
                      {item.status}
                    </StatusBadge>
                  </div>
                  <p className="mt-3 line-clamp-2 text-sm text-slate-600">
                    {item.finalEditedRsa || item.aiGeneratedRsa}
                  </p>
                </button>
              ))
            ) : (
              <div className="rounded-[8px] border border-dashed border-slate-300 p-8 text-center text-sm font-semibold text-slate-500">
                No RSA history found.
              </div>
            )}
          </div>
        ) : null}
      </div>
    </section>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        "h-10 rounded-[8px] px-4 text-sm font-black transition",
        active
          ? "bg-indigo-600 text-white shadow-sm"
          : "text-slate-600 hover:bg-slate-100 hover:text-slate-950",
      )}
    >
      {children}
    </button>
  );
}

function TextAreaField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <label className="block text-sm font-black text-slate-800">
      {label}
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={4}
        className="mt-2 w-full resize-y rounded-[8px] border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-medium leading-6 text-slate-800 outline-none focus:border-indigo-300 focus:bg-white"
        placeholder={placeholder}
      />
    </label>
  );
}

function ActionButton({
  children,
  onClick,
  loading,
  icon: Icon,
  disabled,
  variant = "primary",
}: {
  children: React.ReactNode;
  onClick: () => void;
  loading?: boolean;
  icon: LucideIcon;
  disabled?: boolean;
  variant?: "primary" | "secondary";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading || disabled}
      className={clsx(
        "inline-flex h-11 items-center gap-2 rounded-[8px] px-4 text-sm font-black transition disabled:cursor-not-allowed disabled:opacity-60",
        variant === "primary"
          ? "bg-indigo-600 text-white hover:bg-indigo-700"
          : "border border-slate-200 bg-white text-slate-700 hover:border-indigo-300 hover:text-indigo-600",
      )}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
      ) : (
        <Icon className="h-4 w-4" aria-hidden="true" />
      )}
      {children}
    </button>
  );
}

async function postJson(
  url: string,
  options: { method: "POST" | "PUT"; body: unknown },
) {
  const response = await fetch(url, {
    method: options.method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(options.body),
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    return {
      ok: false,
      error: typeof data.error === "string" ? data.error : JSON.stringify(data.error),
    };
  }

  return data;
}

function mergeHistory(report: RsaReportRecord, history: RsaReportRecord[]) {
  return [
    report,
    ...history.filter((item) => item.rsaId !== report.rsaId),
  ].sort((a, b) => dateValue(b.updatedAt) - dateValue(a.updatedAt));
}

function dateValue(value: string) {
  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
}

function formatDate(value: string) {
  if (!value) return "-";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString("en-IN");
}
