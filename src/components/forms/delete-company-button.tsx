"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";

export function DeleteCompanyButton({
  rowNumber,
  companyName,
}: {
  rowNumber?: number;
  companyName: string;
}) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  if (!rowNumber) {
    return null;
  }

  async function remove() {
    const ok = window.confirm(`Delete ${companyName} from Company_tracking?`);
    if (!ok || !rowNumber) return;

    setLoading(true);
    await fetch("/api/companies/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rowNumber }),
    });
    setLoading(false);
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={remove}
      disabled={loading}
      className="inline-flex h-9 items-center gap-2 rounded-[8px] border border-rose-200 px-3 text-xs font-bold text-rose-700 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {loading ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
      ) : (
        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
      )}
      Delete
    </button>
  );
}
