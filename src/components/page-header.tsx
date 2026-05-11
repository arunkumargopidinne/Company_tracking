import { ReactNode } from "react";

export function PageHeader({
  title,
  eyebrow,
  description,
  action,
}: {
  title: string;
  eyebrow?: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-7 flex flex-col justify-between gap-4 md:flex-row md:items-end">
      <div>
        {eyebrow ? (
          <p className="mb-2 text-sm font-bold uppercase tracking-[0.16em] text-indigo-600">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="text-3xl font-black tracking-normal text-slate-950 md:text-4xl">
          {title}
        </h1>
        {description ? (
          <p className="mt-2 max-w-3xl text-base text-slate-600 md:text-lg">
            {description}
          </p>
        ) : null}
      </div>
      {action}
    </div>
  );
}
