"use client";

import { X } from "lucide-react";
import { createPortal } from "react-dom";

export function JDModal({
  isOpen,
  onClose,
  companyName,
  role,
  jdContent,
}: {
  isOpen: boolean;
  onClose: () => void;
  companyName: string;
  role: string;
  jdContent: string;
}) {
  if (!isOpen) return null;

  if (typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/45 p-4">
      <section className="flex h-auto max-h-[80vh] w-[calc(100vw-2rem)] max-w-[1000px] flex-col overflow-hidden rounded-[8px] border border-slate-200 bg-white shadow-xl sm:w-[80vw] sm:min-w-[640px]">
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-100 bg-white p-5">
          <div>
            <h2 className="text-xl font-black text-slate-950">{companyName}</h2>
            <p className="mt-1 text-sm font-semibold text-indigo-600">{role}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-[8px] p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
            title="Close"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          <div className="whitespace-pre-wrap break-words text-sm leading-6 text-slate-700">
            {jdContent}
          </div>
        </div>
      </section>
    </div>,
    document.body,
  );
}
