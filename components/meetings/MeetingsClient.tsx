"use client";

import AppSidebar from "@/components/common/AppSidebar";
import CurrentUserPill from "@/components/auth/CurrentUserPill";

type MeetingsClientProps = {
  initialMeetings: any[];
  securities: any[];
};

export default function MeetingsClient({
  initialMeetings,
}: MeetingsClientProps) {
  return (
    <main className="h-screen overflow-hidden bg-slate-100 text-slate-900">
      <div className="flex h-full">
        <AppSidebar activePage="/meetings" />

        <section className="flex min-w-0 flex-1 flex-col">
          <header className="flex h-20 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-6">
            <div>
              <p className="text-sm font-medium text-slate-900">
                Meetings
              </p>

              <p className="text-xs text-slate-500">
                Meeting notes and management discussions
              </p>
            </div>

            <CurrentUserPill />
          </header>

          <div className="overflow-auto p-6">
            <h2 className="text-3xl font-semibold tracking-tight">
              Meetings
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              {initialMeetings.length} meetings
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}