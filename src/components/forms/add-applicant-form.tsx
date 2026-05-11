"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, UserRoundPlus, X } from "lucide-react";

export function AddApplicantForm({
  companyId,
  companyName,
}: {
  companyId: string;
  companyName: string;
}) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"single" | "bulk">("single");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");

    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/applications/add", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        companyId,
        companyName,
        ...(mode === "bulk"
          ? { bulkRaw: form.get("bulkRaw") }
          : {
              fullName: form.get("fullName"),
              email: form.get("email"),
              phoneNumber: form.get("phoneNumber"),
              resumeUrl: form.get("resumeUrl"),
              remarks: form.get("remarks"),
            }),
      }),
    });

    const data = await response.json();
    setLoading(false);

    if (!response.ok) {
      setError(data.sheetResult?.reason ?? "Applicant could not be saved.");
      return;
    }

    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-12 items-center gap-2 rounded-[8px] bg-indigo-600 px-5 text-sm font-bold text-white shadow-sm hover:bg-indigo-700"
      >
        <UserRoundPlus className="h-4 w-4" aria-hidden="true" />
        Add Applicant
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
          <form
            onSubmit={submit}
            className="w-full max-w-2xl rounded-[8px] border border-slate-200 bg-white p-5 shadow-xl"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-black text-slate-950">Add Applicant</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Candidate data is stored in the Applications sheet and starts in Applied.
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

            <div className="mt-5 inline-flex rounded-[8px] border border-slate-200 bg-slate-50 p-1">
              <button
                type="button"
                onClick={() => setMode("single")}
                className={modeButton(mode === "single")}
              >
                Single
              </button>
              <button
                type="button"
                onClick={() => setMode("bulk")}
                className={modeButton(mode === "bulk")}
              >
                Bulk
              </button>
            </div>

            {mode === "single" ? (
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <Field label="Full Name" name="fullName" required />
                <Field label="Email" name="email" type="email" required />
                <Field label="Phone Number" name="phoneNumber" required />
                <Field label="Resume Link" name="resumeUrl" type="url" />
                <label className="md:col-span-2 text-sm font-bold text-slate-700">
                  Remarks
                  <textarea
                    name="remarks"
                    rows={3}
                    className="mt-2 w-full resize-none rounded-[8px] border border-slate-200 bg-slate-50 px-3 py-3 text-sm"
                    placeholder="Any profile notes, source, shortlist comments..."
                  />
                </label>
              </div>
            ) : (
              <label className="mt-5 block text-sm font-bold text-slate-700">
                Bulk Applicant Rows
                <textarea
                  name="bulkRaw"
                  rows={12}
                  required={mode === "bulk"}
                  className="mt-2 w-full resize-y rounded-[8px] border border-slate-200 bg-slate-50 px-3 py-3 font-mono text-xs"
                  placeholder="candidate-uuid<TAB>Full Name<TAB>Phone<TAB>Student ID<TAB>Email<TAB>Degree<TAB>Branch<TAB>Passout<TAB>Percentage<TAB>Resume URL"
                />
                <span className="mt-2 block text-xs font-semibold text-slate-500">
                  Paste tab-separated rows: UUID, name, phone, student ID, email,
                  degree, branch, passout year, percentage, resume.
                </span>
              </label>
            )}

            {error ? (
              <p className="mt-4 rounded-[8px] bg-rose-50 p-3 text-sm font-semibold text-rose-700">
                {error}
              </p>
            ) : null}

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="h-11 rounded-[8px] border border-slate-200 px-4 text-sm font-bold text-slate-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="inline-flex h-11 items-center gap-2 rounded-[8px] bg-indigo-600 px-4 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Plus className="h-4 w-4" aria-hidden="true" />
                )}
                {mode === "bulk" ? "Save Bulk Applicants" : "Save Applicant"}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </>
  );
}

function modeButton(active: boolean) {
  return `h-9 rounded-[8px] px-3 text-sm font-bold ${
    active ? "bg-indigo-600 text-white" : "text-slate-600"
  }`;
}

function Field({
  label,
  name,
  type = "text",
  required,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="text-sm font-bold text-slate-700">
      {label}
      <input
        name={name}
        type={type}
        required={required}
        className="mt-2 h-11 w-full rounded-[8px] border border-slate-200 bg-slate-50 px-3 text-sm"
      />
    </label>
  );
}
