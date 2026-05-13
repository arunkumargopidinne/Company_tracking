"use client";

import { useState } from "react";
import { Loader2, Plus } from "lucide-react";

import type { CompanyDailyUpdate } from "@/lib/company-updates-source";

export function CompanyUpdatesPanel({
  companyId,
  updates,
  canCreate,
}: {
  companyId: string;
  updates: CompanyDailyUpdate[];
  canCreate: boolean;
}) {
  const [items, setItems] = useState(updates);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");

    const response = await fetch(`/api/companies/${encodeURIComponent(companyId)}/updates`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });
    const data = await response.json().catch(() => ({}));
    setLoading(false);

    if (!response.ok) {
      setError(formatUpdateError(data));
      if (data.update) {
        setItems((current) => [data.update, ...current]);
        setContent("");
      }
      return;
    }

    setItems((current) => [data.update, ...current]);
    setContent("");
  }

  return (
    <section className="mt-7 rounded-[8px] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-black text-slate-950">Daily Company Updates</h2>
          <p className="mt-1 text-sm font-medium text-slate-500">
            Updates are synced to the Company_Updates sheet and visible to admins and stakeholders.
          </p>
        </div>
      </div>

      {canCreate ? (
        <form onSubmit={submit} className="mt-4 rounded-[8px] bg-slate-50 p-4">
          {error ? (
            <p className="mb-3 rounded-[8px] bg-rose-50 p-3 text-sm font-semibold text-rose-700">
              {error}
            </p>
          ) : null}
          <label className="block text-sm font-bold text-slate-700">
            Current Update
            <textarea
              value={content}
              onChange={(event) => setContent(event.target.value)}
              rows={4}
              className="mt-2 w-full resize-y rounded-[8px] border border-slate-200 bg-white px-3 py-3 text-sm"
              placeholder="Yet to get update from the company to start the process of interviews"
            />
          </label>
          <div className="mt-3 flex justify-end">
            <button
              type="submit"
              disabled={loading || !content.trim()}
              className="inline-flex h-10 items-center gap-2 rounded-[8px] bg-indigo-600 px-4 text-sm font-black text-white disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Add Update
            </button>
          </div>
        </form>
      ) : null}

      <div className="mt-5 space-y-3">
        {items.map((update) => (
          <article key={update.id} className="rounded-[8px] border border-slate-200 bg-slate-50 p-4">
            <div className="mb-2 flex flex-wrap justify-between gap-2 text-xs font-bold uppercase text-slate-500">
              <span>{formatDate(update.updateDate)}</span>
              <span>{update.authorName}</span>
            </div>
            <pre className="whitespace-pre-wrap break-words font-sans text-sm leading-6 text-slate-800">
              {update.content}
            </pre>
          </article>
        ))}
        {items.length === 0 ? (
          <div className="rounded-[8px] border border-dashed border-slate-300 p-8 text-center text-sm font-semibold text-slate-500">
            No daily updates added yet.
          </div>
        ) : null}
      </div>
    </section>
  );
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString("en-IN");
}

function formatUpdateError(data: { error?: unknown; sheetResult?: { reason?: string } }) {
  if (typeof data.error === "string") {
    return data.error;
  }

  if (data.sheetResult?.reason) {
    return data.sheetResult.reason;
  }

  return "Update could not be saved.";
}
