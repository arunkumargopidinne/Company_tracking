import { clsx } from "clsx";

const toneMap = {
  selected: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  rejected: "bg-rose-50 text-rose-700 ring-rose-200",
  progress: "bg-indigo-50 text-indigo-700 ring-indigo-200",
  upcoming: "bg-sky-50 text-sky-700 ring-sky-200",
  warning: "bg-amber-50 text-amber-700 ring-amber-200",
  muted: "bg-slate-100 text-slate-700 ring-slate-200",
};

export function StatusBadge({
  children,
  tone = "muted",
}: {
  children: React.ReactNode;
  tone?: keyof typeof toneMap;
}) {
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full px-3 py-1 text-xs font-bold ring-1",
        toneMap[tone],
      )}
    >
      {children}
    </span>
  );
}
