"use client";

import { ExternalLink, Eye } from "lucide-react";
import { useState } from "react";

import { JDModal } from "./jd-modal";

export function JDViewButton({
  companyName,
  role,
  jdContent,
  jdLink,
  compact = false,
}: {
  companyName: string;
  role: string;
  jdContent: string;
  jdLink?: string;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);

  if (jdContent) {
    return (
      <>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={
            compact
              ? "inline-flex h-9 items-center gap-1.5 rounded-[8px] border border-slate-200 px-3 text-xs font-bold text-slate-700 hover:border-indigo-300 hover:text-indigo-600"
              : "inline-flex h-10 items-center gap-2 rounded-[8px] border border-slate-200 px-3 text-sm font-bold text-slate-700 hover:border-indigo-300 hover:text-indigo-600"
          }
        >
          <Eye className="h-4 w-4" aria-hidden="true" />
          View JD
        </button>
        <JDModal
          isOpen={open}
          onClose={() => setOpen(false)}
          companyName={companyName}
          role={role}
          jdContent={jdContent}
        />
      </>
    );
  }

  if (jdLink) {
    return (
      <a
        href={jdLink}
        target="_blank"
        rel="noreferrer"
        className="inline-flex h-9 items-center gap-1.5 rounded-[8px] border border-slate-200 px-3 text-xs font-bold text-slate-700 hover:border-indigo-300 hover:text-indigo-600"
      >
        <ExternalLink className="h-4 w-4" aria-hidden="true" />
        View JD
      </a>
    );
  }

  return null;
}
