"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, Check, CheckCheck, ExternalLink } from "lucide-react";
import { useMemo, useState } from "react";

import type { AppNotification } from "@/lib/notifications-source";
import { clsx } from "clsx";

export function NotificationsPanel({
  notifications,
}: {
  notifications: AppNotification[];
}) {
  const router = useRouter();
  const [items, setItems] = useState(notifications);
  const [error, setError] = useState("");
  const [savingIds, setSavingIds] = useState<string[]>([]);
  const unreadCount = useMemo(
    () => items.filter((notification) => !notification.readAt).length,
    [items],
  );

  async function markRead(notificationIds?: string[]) {
    const targetIds = notificationIds ?? items.filter((item) => !item.readAt).map((item) => item.id);

    if (!targetIds.length) {
      return;
    }

    setError("");
    setSavingIds(targetIds);

    const readAt = new Date().toISOString();
    const previousItems = items;
    const nextItems = items.map((item) =>
      targetIds.includes(item.id) ? { ...item, readAt: item.readAt ?? readAt } : item,
    );

    setItems(nextItems);
    broadcastUnreadCount(nextItems);

    try {
      const response = await fetch("/api/notifications/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationIds: notificationIds ?? undefined }),
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload.error || "Notification could not be updated.");
      }

      router.refresh();
    } catch (markError) {
      setItems(previousItems);
      broadcastUnreadCount(previousItems);
      setError(markError instanceof Error ? markError.message : "Notification could not be updated.");
    } finally {
      setSavingIds([]);
    }
  }

  return (
    <section className="rounded-[8px] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-black text-slate-950">Company Update Alerts</h2>
          <p className="mt-1 text-sm font-semibold text-slate-500">
            {unreadCount
              ? `${unreadCount} unread update${unreadCount === 1 ? "" : "s"}`
              : "All updates are read."}
          </p>
        </div>
        <button
          type="button"
          onClick={() => markRead()}
          disabled={!unreadCount || savingIds.length > 0}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-[8px] bg-indigo-600 px-4 text-sm font-black text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
        >
          <CheckCheck className="h-5 w-5" aria-hidden="true" />
          Mark all read
        </button>
      </div>

      {error ? (
        <div className="mt-4 rounded-[8px] bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">
          {error}
        </div>
      ) : null}

      <div className="mt-4 space-y-3">
        {items.length ? (
          items.map((notification) => {
            const isUnread = !notification.readAt;
            const href = notification.href || "/companies";
            const isSaving = savingIds.includes(notification.id);

            return (
              <article
                key={notification.id}
                className={clsx(
                  "grid gap-4 rounded-[8px] border p-4 transition sm:grid-cols-[1fr_auto]",
                  isUnread
                    ? "border-indigo-200 bg-indigo-50/70"
                    : "border-slate-200 bg-white",
                )}
              >
                <div className="flex gap-3">
                  <span
                    className={clsx(
                      "mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-[8px]",
                      isUnread ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-500",
                    )}
                  >
                    <Bell className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-black text-slate-950">
                        {notification.title}
                      </h3>
                      {isUnread ? (
                        <span className="rounded-full bg-rose-600 px-2 py-0.5 text-[11px] font-black uppercase text-white">
                          New
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 text-sm font-medium leading-6 text-slate-600">
                      {notification.message}
                    </p>
                    <p className="mt-2 text-xs font-bold uppercase text-slate-400">
                      {formatDate(notification.createdAt)}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                  <Link
                    href={href}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-[8px] border border-slate-200 bg-white px-3 text-sm font-black text-slate-700 transition hover:bg-slate-50"
                  >
                    <ExternalLink className="h-4 w-4" aria-hidden="true" />
                    Open company
                  </Link>
                  {isUnread ? (
                    <button
                      type="button"
                      onClick={() => markRead([notification.id])}
                      disabled={isSaving}
                      className="inline-flex h-10 items-center justify-center gap-2 rounded-[8px] bg-slate-950 px-3 text-sm font-black text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                    >
                      <Check className="h-4 w-4" aria-hidden="true" />
                      Mark read
                    </button>
                  ) : null}
                </div>
              </article>
            );
          })
        ) : (
          <div className="rounded-[8px] border border-dashed border-slate-300 p-10 text-center">
            <Bell className="mx-auto h-8 w-8 text-slate-400" aria-hidden="true" />
            <p className="mt-3 text-sm font-bold text-slate-500">
              No notifications yet. New company updates from superadmins will appear here.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function broadcastUnreadCount(items: AppNotification[]) {
  window.dispatchEvent(
    new CustomEvent("notifications:count", {
      detail: {
        count: items.filter((item) => !item.readAt).length,
      },
    }),
  );
}
