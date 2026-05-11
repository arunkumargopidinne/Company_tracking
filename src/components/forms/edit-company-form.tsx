"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Pencil, Save, X } from "lucide-react";

import type { Company } from "@/lib/mock-data";
import { stageLabel } from "@/lib/pipeline";

export function EditCompanyForm({
  company,
  compact = false,
}: {
  company: Company;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const interviewProcess = useMemo(() => {
    if (company.interviewProcess) return company.interviewProcess;
    return [
      company.interviewMode ? `Mode - ${company.interviewMode}` : "",
      company.rounds.length ? `Rounds - ${company.rounds.map(stageLabel).join(", ")}` : "",
    ]
      .filter(Boolean)
      .join("\n");
  }, [company.interviewMode, company.interviewProcess, company.rounds]);

  if (!company.sheetRowNumber) {
    return null;
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");

    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/companies/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        rowNumber: company.sheetRowNumber,
        loadedDate: company.loadedDate,
        companyName: form.get("companyName"),
        role: form.get("role"),
        techStack: form.get("techStack"),
        skillsRequired: form.get("skillsRequired"),
        crm: form.get("crm"),
        location: form.get("location"),
        ctc: form.get("ctc"),
        jobType: form.get("jobType"),
        internshipDuration: form.get("internshipDuration"),
        stipend: form.get("stipend"),
        openings: form.get("openings"),
        eligibility: form.get("eligibility"),
        interviewProcess: form.get("interviewProcess"),
        workDetails: form.get("workDetails"),
        bond: form.get("bond"),
        remarks: form.get("remarks"),
        confirmationDate: form.get("confirmationDate"),
        interviewScheduledStatus: form.get("interviewScheduledStatus"),
        currentStatus: form.get("currentStatus"),
      }),
    });
    const data = await response.json();
    setLoading(false);

    if (!response.ok) {
      setError(
        data.details?.join(" ") ||
          data.sheetResult?.reason ||
          "Company could not be updated.",
      );
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
        className={
          compact
            ? "inline-flex h-9 items-center gap-2 rounded-[8px] border border-slate-200 px-3 text-xs font-bold text-slate-700 hover:border-indigo-300 hover:text-indigo-600"
            : "inline-flex h-10 items-center gap-2 rounded-[8px] border border-slate-200 px-3 text-sm font-bold text-slate-700 hover:border-indigo-300 hover:text-indigo-600"
        }
      >
        <Pencil className="h-4 w-4" aria-hidden="true" />
        Edit
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
          <form
            onSubmit={submit}
            className="max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-[8px] border border-slate-200 bg-white p-5 shadow-xl"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-black text-slate-950">Edit Company</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Updates this row in Company_tracking without creating a duplicate.
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

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <Field label="Company Name" name="companyName" defaultValue={company.name} required />
              <Field label="Role" name="role" defaultValue={company.jdTitle} required />
              <Field label="Tech Stack" name="techStack" defaultValue={company.techStack.join(", ")} />
              <Field label="Skills Required" name="skillsRequired" defaultValue={company.expectedSkills.join(", ")} />
              <Field label="CRM" name="crm" defaultValue={company.crm} />
              <Field label="Location" name="location" defaultValue={company.location} />
              <Field label="CTC" name="ctc" defaultValue={company.ctc} />
              <Field label="Job Type" name="jobType" defaultValue={company.jobType} />
              <Field
                label="Internship Duration"
                name="internshipDuration"
                defaultValue={company.internshipDuration}
              />
              <Field label="Stipend" name="stipend" defaultValue={company.stipend} />
              <Field label="Openings" name="openings" defaultValue={company.openings} />
              <Field
                label="Date of Confirmation"
                name="confirmationDate"
                defaultValue={company.confirmationDate}
              />
              <label className="text-sm font-bold text-slate-700">
                Interview Scheduled
                <select
                  name="interviewScheduledStatus"
                  defaultValue={company.interviewScheduledStatus}
                  className="mt-2 h-11 w-full rounded-[8px] border border-slate-200 bg-slate-50 px-3 text-sm"
                >
                  <option>Not Scheduled</option>
                  <option>Scheduled</option>
                  <option>Completed</option>
                </select>
              </label>
              <label className="text-sm font-bold text-slate-700">
                Company Status
                <select
                  name="currentStatus"
                  defaultValue={company.currentStatus}
                  className="mt-2 h-11 w-full rounded-[8px] border border-slate-200 bg-slate-50 px-3 text-sm"
                >
                  <option>In Progress</option>
                  <option>Hiring Done</option>
                  <option>Dropped</option>
                </select>
              </label>
              <TextArea label="Eligibility" name="eligibility" defaultValue={company.eligibility} />
              <TextArea
                label="Interview Process"
                name="interviewProcess"
                defaultValue={interviewProcess}
              />
              <TextArea label="Work Details" name="workDetails" defaultValue={company.workDetails} />
              <TextArea label="Bond / Service Agreement" name="bond" defaultValue={company.bond} />
              <TextArea label="Remarks" name="remarks" defaultValue={company.remarks} full />
            </div>

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
                  <Save className="h-4 w-4" aria-hidden="true" />
                )}
                Save Changes
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </>
  );
}

function Field({
  label,
  name,
  defaultValue,
  required,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  required?: boolean;
}) {
  return (
    <label className="text-sm font-bold text-slate-700">
      {label}
      <input
        name={name}
        defaultValue={defaultValue ?? ""}
        required={required}
        className="mt-2 h-11 w-full rounded-[8px] border border-slate-200 bg-slate-50 px-3 text-sm"
      />
    </label>
  );
}

function TextArea({
  label,
  name,
  defaultValue,
  full,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  full?: boolean;
}) {
  return (
    <label className={`text-sm font-bold text-slate-700 ${full ? "md:col-span-2" : ""}`}>
      {label}
      <textarea
        name={name}
        defaultValue={defaultValue ?? ""}
        rows={4}
        className="mt-2 w-full resize-y rounded-[8px] border border-slate-200 bg-slate-50 px-3 py-3 text-sm"
      />
    </label>
  );
}
