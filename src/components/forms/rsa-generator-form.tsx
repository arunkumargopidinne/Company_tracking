"use client";

import { useState } from "react";
import { Loader2, Sparkles } from "lucide-react";

export function RsaGeneratorForm({
  companyId,
  initialRemarks,
}: {
  companyId: string;
  initialRemarks?: string;
}) {
  const [remarks, setRemarks] = useState(initialRemarks ?? "");
  const [summary, setSummary] = useState("");
  const [loading, setLoading] = useState(false);

  async function generate() {
    if (!remarks.trim()) return;
    setLoading(true);
    const response = await fetch("/api/rsa/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ companyId, adminRemarks: remarks }),
    });
    const data = await response.json();
    setSummary(data.report?.finalSummary ?? data.report?.improvementSuggestions ?? "");
    setLoading(false);
  }

  return (
    <section className="rounded-[8px] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-black text-slate-950">AI RSA Generation</h2>
          <p className="mt-1 text-sm text-slate-500">
            Add admin remarks, then generate a stakeholder-ready summary.
          </p>
        </div>
        <Sparkles className="h-5 w-5 text-indigo-600" aria-hidden="true" />
      </div>
      <textarea
        value={remarks}
        onChange={(event) => setRemarks(event.target.value)}
        rows={5}
        className="mt-4 w-full resize-none rounded-[8px] border border-slate-200 bg-slate-50 px-3 py-3 text-sm"
        placeholder="Admin overall remarks, panel notes, assessment observations..."
      />
      <div className="mt-4 flex justify-end">
        <button
          type="button"
          onClick={generate}
          disabled={loading || !remarks.trim()}
          className="inline-flex h-11 items-center gap-2 rounded-[8px] bg-indigo-600 px-4 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <Sparkles className="h-4 w-4" aria-hidden="true" />
          )}
          Generate RSA
        </button>
      </div>
      {summary ? (
        <div className="mt-5 rounded-[8px] border border-indigo-100 bg-indigo-50 p-4 text-sm leading-6 text-indigo-950">
          {summary}
        </div>
      ) : null}
    </section>
  );
}
