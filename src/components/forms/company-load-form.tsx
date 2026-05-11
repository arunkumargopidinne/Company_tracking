"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ClipboardPaste, Loader2, Plus, X } from "lucide-react";

export function CompanyLoadForm() {
  const [text, setText] = useState("");
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const router = useRouter();

  async function submit() {
    if (!text.trim()) return;
    setStatus("loading");
    setMessage("");

    let response: Response;
    let data: {
      details?: string[];
      error?: string;
      message?: string;
      parsed?: { companyName?: string };
      range?: string;
      syncedToSheets?: boolean;
    };

    try {
      response = await fetch("/api/companies/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ raw: text }),
      });
      data = await response.json();
    } catch {
      setStatus("error");
      setMessage("JD import failed because the server did not respond. Please try again.");
      return;
    }

    if (!response.ok) {
      setStatus("error");
      setMessage(
        data.details?.join(" ") ||
          data.error ||
          "JD could not be loaded. Check the pasted text and try again.",
      );
      return;
    }

    setStatus("done");
    setText("");
    setMessage(
      data.message ||
      (data.syncedToSheets
        ? `Stored ${data.parsed?.companyName ?? "company"} in ${data.range}.`
        : "Parsed successfully, but Sheets credentials are not configured yet."),
    );
    router.refresh();
  }

  return (
    <>
      <button
        className="inline-flex h-12 items-center gap-2 rounded-[8px] bg-indigo-600 px-5 text-sm font-bold text-white shadow-sm hover:bg-indigo-700"
        type="button"
        onClick={() => {
          setOpen(true);
          setStatus("idle");
          setMessage("");
        }}
      >
        <Plus className="h-4 w-4" aria-hidden="true" />
        Load Job
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
          <section className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-[8px] border border-slate-200 bg-white p-5 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <ClipboardPaste className="h-5 w-5 text-indigo-600" aria-hidden="true" />
                  <h2 className="text-xl font-black text-slate-950">Paste JD</h2>
                </div>
                <p className="mt-1 text-sm text-slate-500">
                  Paste the full JD block. The app extracts company, stack, rounds, location,
                  status, and stores it in Google Sheets with today&apos;s load date.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-[8px] p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                title="Close"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
            <textarea
              value={text}
              onChange={(event) => setText(event.target.value)}
              rows={18}
              className="mt-4 w-full resize-y rounded-[8px] border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-900"
              placeholder={`Company: EWall Solutions\n\nRole: React JS Developer\n\nLocation: Kodambakkam, Chennai\n\nSkills Required:\nReact JS\n\nInterview Process:\nMode - Offline\nRounds - Coding Round, Technical Interview, HR Round`}
            />
            {message ? (
              <p
                className={`mt-3 rounded-[8px] p-3 text-sm font-semibold ${
                  status === "error"
                    ? "bg-rose-50 text-rose-700"
                    : "bg-indigo-50 text-indigo-700"
                }`}
              >
                {message}
              </p>
            ) : null}
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs font-semibold text-slate-500">
                Target sheet range: Company_tracking!A:N.
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="h-11 rounded-[8px] border border-slate-200 px-4 text-sm font-bold text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={submit}
                  disabled={status === "loading" || !text.trim()}
                  className="inline-flex h-11 items-center gap-2 rounded-[8px] bg-indigo-600 px-4 text-sm font-bold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  {status === "loading" ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <Plus className="h-4 w-4" aria-hidden="true" />
                  )}
                  Store in Sheets
                </button>
              </div>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
