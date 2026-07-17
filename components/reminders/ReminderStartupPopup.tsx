"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Badge from "@/components/common/Badge";
import LocalDateTime from "@/components/common/LocalDateTime";
import { canCreateFlags } from "@/lib/client-permissions";

const SESSION_STORAGE_KEY = "hca-reminder-summary-shown";

type Reminder = {
  id: string;
  flagType: string;
  description: string | null;
  priority: string;
  status: string;
  reminderAt: string;
  securityId: string | null;
  positionId: string | null;
  watchlistEntryId: string | null;
  security: {
    id: string;
    ticker: string;
    name: string;
  } | null;
};

function priorityTone(priority: string) {
  if (priority === "HIGH") {
    return "red";
  }

  if (priority === "MEDIUM") {
    return "amber";
  }

  return "slate";
}

function ReminderList({
  title,
  description,
  reminders,
  tone,
  canResolve,
  resolvingId,
  onResolve,
}: {
  title: string;
  description: string;
  reminders: Reminder[];
  tone: "red" | "amber" | "blue";
  canResolve: boolean;
  resolvingId: string | null;
  onResolve: (reminder: Reminder) => Promise<void>;
}) {
  if (!reminders.length) {
    return null;
  }

  const toneClasses = {
    red: "border-rose-200 bg-rose-50 text-rose-700",
    amber: "border-amber-200 bg-amber-50 text-amber-700",
    blue: "border-blue-200 bg-blue-50 text-blue-700",
  };

  return (
    <section>
      <div
        className={`flex items-center justify-between rounded-2xl border px-4 py-3 ${toneClasses[tone]}`}
      >
        <div>
          <h3 className="text-sm font-semibold">
            {title}
          </h3>

          <p className="mt-0.5 text-xs opacity-80">
            {description}
          </p>
        </div>

        <span className="flex h-8 min-w-8 items-center justify-center rounded-full bg-white px-2 text-sm font-bold shadow-sm">
          {reminders.length}
        </span>
      </div>

      <div className="mt-2 space-y-2">
        {reminders.map((reminder) => (
          <div
            key={reminder.id}
            className="rounded-2xl border border-slate-200 bg-white p-4"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-slate-950">
                    {reminder.security?.ticker || "General"}
                  </span>

                  <Badge tone="blue">
                    {reminder.flagType}
                  </Badge>

                  <Badge
                    tone={
                      priorityTone(reminder.priority) as
                        | "red"
                        | "amber"
                        | "slate"
                    }
                  >
                    {reminder.priority}
                  </Badge>
                </div>

                <p className="mt-2 text-sm leading-6 text-slate-700">
                  {reminder.description ||
                    `${reminder.flagType} item`}
                </p>

                <p className="mt-2 text-xs font-semibold text-violet-700">
                  Due{" "}
                  <LocalDateTime
                    value={reminder.reminderAt}
                    className="text-xs font-semibold text-violet-700"
                  />
                </p>
              </div>

              {canResolve ? (
                <button
                  type="button"
                  onClick={() => onResolve(reminder)}
                  disabled={resolvingId === reminder.id}
                  className="shrink-0 rounded-xl bg-slate-900 px-3 py-2 text-xs font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {resolvingId === reminder.id
                    ? "Resolving..."
                    : "Resolve"}
                </button>
              ) : (
                <span className="shrink-0 rounded-xl bg-slate-100 px-3 py-2 text-xs font-medium text-slate-400">
                  Read Only
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export default function ReminderStartupPopup() {
  const router = useRouter();

  const [reminders, setReminders] = useState<Reminder[]>(
    []
  );

  const [currentUser, setCurrentUser] = useState<any | null>(
    null
  );

  const [isOpen, setIsOpen] = useState(false);

  const [resolvingId, setResolvingId] = useState<
    string | null
  >(null);

  const [error, setError] = useState("");

  useEffect(() => {
    let isCancelled = false;

    async function loadReminderSummary() {
      const hasCheckedThisTab =
        window.sessionStorage.getItem(
          SESSION_STORAGE_KEY
        );

      if (hasCheckedThisTab) {
        return;
      }

      window.sessionStorage.setItem(
        SESSION_STORAGE_KEY,
        "true"
      );

      try {
        const now = new Date();

        const through = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate() + 8
        );

        const summaryUrl =
          `/api/reminders/summary?through=${encodeURIComponent(
            through.toISOString()
          )}`;

        const [summaryResponse, userResponse] =
          await Promise.all([
            fetch(summaryUrl, {
              credentials: "include",
            }),
            fetch("/api/auth/me", {
              credentials: "include",
            }),
          ]);

        if (
          summaryResponse.status === 401 ||
          userResponse.status === 401
        ) {
          return;
        }

        const summaryData =
          await summaryResponse.json();

        const userData = await userResponse.json();

        if (!summaryResponse.ok) {
          throw new Error(
            summaryData.error ||
              "Failed to load reminders."
          );
        }

        if (!userResponse.ok) {
          throw new Error(
            userData.error ||
              "Failed to load the current user."
          );
        }

        if (isCancelled) {
          return;
        }

        const loadedReminders: Reminder[] =
          Array.isArray(summaryData.reminders)
            ? summaryData.reminders
            : [];

        setCurrentUser(userData.user);
        setReminders(loadedReminders);

        if (loadedReminders.length > 0) {
          setIsOpen(true);
        }
      } catch (loadError) {
        if (isCancelled) {
          return;
        }

        console.error(
          "Failed to load startup reminders",
          loadError
        );
      }
    }

    loadReminderSummary();

    return () => {
      isCancelled = true;
    };
  }, []);

  const groupedReminders = useMemo(() => {
    const now = new Date();

    const startOfToday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    );

    const startOfTomorrow = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + 1
    );

    const endOfUpcomingWindow = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + 8
    );

    const overdue = reminders.filter((reminder) => {
      const reminderDate = new Date(
        reminder.reminderAt
      );

      return reminderDate < startOfToday;
    });

    const today = reminders.filter((reminder) => {
      const reminderDate = new Date(
        reminder.reminderAt
      );

      return (
        reminderDate >= startOfToday &&
        reminderDate < startOfTomorrow
      );
    });

    const upcoming = reminders.filter((reminder) => {
      const reminderDate = new Date(
        reminder.reminderAt
      );

      return (
        reminderDate >= startOfTomorrow &&
        reminderDate < endOfUpcomingWindow
      );
    });

    return {
      overdue,
      today,
      upcoming,
    };
  }, [reminders]);

  const userCanResolve = canCreateFlags(
    currentUser?.role
  );

  async function handleResolve(reminder: Reminder) {
    const contextLabel =
      reminder.security?.ticker || "General";

    const confirmed = window.confirm(
      `Resolve reminder for ${contextLabel}?`
    );

    if (!confirmed) {
      return;
    }

    setError("");
    setResolvingId(reminder.id);

    try {
      const response = await fetch(
        `/api/flags/${reminder.id}/resolve`,
        {
          method: "POST",
          credentials: "include",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Failed to resolve reminder."
        );
      }

      setReminders((currentReminders) => {
        const nextReminders =
          currentReminders.filter(
            (item) => item.id !== reminder.id
          );

        if (nextReminders.length === 0) {
          setIsOpen(false);
        }

        return nextReminders;
      });
    } catch (resolveError) {
      setError(
        resolveError instanceof Error
          ? resolveError.message
          : "Failed to resolve reminder."
      );
    } finally {
      setResolvingId(null);
    }
  }

  function handleClose() {
    setError("");
    setIsOpen(false);
  }

  function handleOpenAlerts() {
    setError("");
    setIsOpen(false);
    router.push("/alerts");
  }

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">
      <div className="flex max-h-[88vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 p-6">
          <div>
            <h2 className="text-xl font-semibold text-slate-950">
              Reminder Summary
            </h2>

            <p className="mt-1 text-sm leading-6 text-slate-500">
              Open reminders that are overdue, due today,
              or due during the next seven calendar days.
            </p>
          </div>

          <button
            type="button"
            onClick={handleClose}
            className="rounded-xl p-2 text-slate-500 hover:bg-slate-100"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-auto p-6">
          <ReminderList
            title="Overdue"
            description="Scheduled before today"
            reminders={groupedReminders.overdue}
            tone="red"
            canResolve={userCanResolve}
            resolvingId={resolvingId}
            onResolve={handleResolve}
          />

          <ReminderList
            title="Due Today"
            description="Scheduled for today"
            reminders={groupedReminders.today}
            tone="amber"
            canResolve={userCanResolve}
            resolvingId={resolvingId}
            onResolve={handleResolve}
          />

          <ReminderList
            title="Upcoming — Next 7 Days"
            description="Scheduled after today and within the next seven calendar days"
            reminders={groupedReminders.upcoming}
            tone="blue"
            canResolve={userCanResolve}
            resolvingId={resolvingId}
            onResolve={handleResolve}
          />

          {error ? (
            <div className="rounded-2xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
              {error}
            </div>
          ) : null}
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-200 p-4">
          <button
            type="button"
            onClick={handleClose}
            className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Close
          </button>

          <button
            type="button"
            onClick={handleOpenAlerts}
            className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            Open Alerts
          </button>
        </div>
      </div>
    </div>
  );
}