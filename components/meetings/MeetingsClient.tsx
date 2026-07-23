"use client";

import { useMemo, useState } from "react";

import AppSidebar from "@/components/common/AppSidebar";
import Badge from "@/components/common/Badge";
import CurrentUserPill from "@/components/auth/CurrentUserPill";
import LocalDateTime from "@/components/common/LocalDateTime";

type MeetingsClientProps = {
  initialMeetings: any[];
  securities: any[];
};

function getTodayInputValue() {
  const date = new Date();

  const offset =
    date.getTimezoneOffset() * 60 * 1000;

  return new Date(
    date.getTime() - offset
  )
    .toISOString()
    .slice(0, 10);
}

function formatMeetingDate(
  value: string
) {
  return new Intl.DateTimeFormat(
    "en-US",
    {
      month: "long",
      day: "numeric",
      year: "numeric",
    }
  ).format(new Date(value));
}

export default function MeetingsClient({
  initialMeetings,
  securities,
}: MeetingsClientProps) {
  const [meetings, setMeetings] =
    useState(initialMeetings);

  const [query, setQuery] =
    useState("");

  const [showAddMeeting, setShowAddMeeting] =
    useState(false);

    const [activeMeetingForNote, setActiveMeetingForNote] =
    useState<any | null>(null);

  const [meetingTitle, setMeetingTitle] =
    useState("");

  const [
    meetingDate,
    setMeetingDate,
  ] = useState(
    getTodayInputValue()
  );

  const [isSavingMeeting, setIsSavingMeeting] =
    useState(false);

  const [meetingError, setMeetingError] =
    useState("");

  const [
    noteDrafts,
    setNoteDrafts,
  ] = useState<Record<string, string>>(
    {}
  );

  const [
    selectedSecurityIds,
    setSelectedSecurityIds,
  ] = useState<Record<string, string>>(
    {}
  );

  const [
    savingMeetingNoteId,
    setSavingMeetingNoteId,
  ] = useState<string | null>(null);

  const filteredMeetings =
    useMemo(() => {
      const normalized =
        query.toLowerCase();

      if (!normalized) {
        return meetings;
      }

      return meetings.filter(
        (meeting: any) => {
          const searchable = [
            meeting.title,
            ...(meeting.comments || []).map(
              (comment: any) =>
                comment.content
            ),
          ]
            .join(" ")
            .toLowerCase();

          return searchable.includes(
            normalized
          );
        }
      );
    }, [meetings, query]);

  const totalNotes =
    meetings.reduce(
      (count: number, meeting: any) =>
        count +
        (meeting.comments?.length || 0),
      0
    );

  async function handleCreateMeeting() {
    setMeetingError("");

    if (!meetingTitle.trim()) {
      setMeetingError(
        "Meeting title is required."
      );

      return;
    }

    setIsSavingMeeting(true);

    try {
      const response =
        await fetch(
          "/api/meetings",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            credentials: "include",
            body: JSON.stringify({
              title:
                meetingTitle.trim(),
              meetingDate:
                new Date(
                  meetingDate
                ).toISOString(),
            }),
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Failed to create meeting."
        );
      }

      setMeetings((current) => [
        {
          ...data.meeting,
          comments: [],
        },
        ...current,
      ]);

      setMeetingTitle("");
      setMeetingDate(
        getTodayInputValue()
      );

      setShowAddMeeting(false);
    } catch (error) {
      setMeetingError(
        error instanceof Error
          ? error.message
          : "Failed to create meeting."
      );
    } finally {
      setIsSavingMeeting(false);
    }
  }

  async function handleSaveNote(
    meetingId: string
  ) {
    const content =
      noteDrafts[meetingId]?.trim();

    if (!content) {
      return;
    }

    setSavingMeetingNoteId(
      meetingId
    );

    try {
      const response =
        await fetch(
          "/api/comments",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            credentials: "include",
            body: JSON.stringify({
              meetingId,
              securityId:
                selectedSecurityIds[
                  meetingId
                ] || null,
              tag: "NOTE",
              content,
            }),
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Failed to create note."
        );
      }

      setMeetings((current) =>
        current.map(
          (meeting: any) =>
            meeting.id ===
            meetingId
              ? {
                  ...meeting,
                  comments: [
                    data.comment,
                    ...(meeting.comments ||
                      []),
                  ],
                }
              : meeting
        )
      );

  add
    } finally {
      setSavingMeetingNoteId(
        null
      );
    }
  }

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
                Meeting notes and
                management discussions
              </p>
            </div>

            <CurrentUserPill />
          </header>

          <div className="overflow-auto p-6">
            <div className="flex items-end justify-between">
              <div>
                <h2 className="text-3xl font-semibold tracking-tight">
                  Meetings
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Capture management
                  meetings and related
                  notes.
                </p>
              </div>

              <button
                onClick={() =>
                  setShowAddMeeting(
                    true
                  )
                }
                className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-medium text-white"
              >
                Add Meeting
              </button>
            </div>

            <div className="mt-5 grid grid-cols-3 gap-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">
                  Meetings
                </p>

                <p className="mt-2 text-2xl font-semibold">
                  {meetings.length}
                </p>
              </div>

              

              
            </div>

            <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-3">
              <input
                value={query}
                onChange={(event) =>
                  setQuery(
                    event.target.value
                  )
                }
                placeholder="Search meetings and notes..."
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none"
              />
            </div>

            <div className="mt-5 space-y-5">
              {filteredMeetings.map(
                (meeting: any) => (
                  <div
                    key={meeting.id}
                    className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
                  >
                    <div className="border-b border-slate-200 bg-slate-50 px-5 py-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-lg font-semibold">
                            {
                              meeting.title
                            }
                          </h3>

                          <p className="mt-1 text-sm text-slate-500">
                            {formatMeetingDate(
                              meeting.meetingDate
                            )}
                          </p>
                        </div>

                       <div className="flex items-center gap-2">
                            <Badge tone="blue">
                                {meeting.comments?.length} Notes
                            </Badge>

                            <button
                                type="button"
                                onClick={() =>
                                setActiveMeetingForNote(meeting)
                                }
                                className="rounded-xl bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800"
                            >
                                + Note
                            </button>
                        </div>
                      </div>
                    </div>

                    <div className="p-5">
                      

                      <div className="mt-4 space-y-3">
                        {meeting
                          .comments
                          ?.length ? (
                          meeting.comments.map(
                            (
                              comment: any
                            ) => (
                              <div
                                key={
                                  comment.id
                                }
                                className="rounded-2xl border border-slate-200 p-4"
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    {comment.security ? (
                                      <Badge tone="blue">
                                        {
                                          comment
                                            .security
                                            .ticker
                                        }
                                      </Badge>
                                    ) : (
                                      <Badge>
                                        NOTE
                                      </Badge>
                                    )}
                                  </div>

                                  <LocalDateTime
                                    value={
                                      comment.createdAt
                                    }
                                    className="text-xs text-slate-400"
                                  />
                                </div>

                                <p className="mt-3 text-sm text-slate-700">
                                  {
                                    comment.content
                                  }
                                </p>

                                <p className="mt-2 text-xs text-slate-400">
                                  by{" "}
                                  {comment
                                    .author
                                    ?.name ||
                                    comment
                                      .author
                                      ?.email}
                                </p>
                              </div>
                            )
                          )
                        ) : (
                          <div className="rounded-2xl border border-slate-200 p-4 text-sm text-slate-500">
                            No notes yet.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              )}
            </div>
          </div>
        </section>

        {showAddMeeting ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 p-4">
            <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl">
              <h3 className="text-xl font-semibold">
                Add Meeting
              </h3>

              <input
                value={meetingTitle}
                onChange={(event) =>
                  setMeetingTitle(
                    event.target.value
                  )
                }
                placeholder="Meeting title"
                className="mt-4 w-full rounded-2xl border border-slate-200 px-4 py-3"
              />

              <input
                type="date"
                value={meetingDate}
                onChange={(event) =>
                  setMeetingDate(
                    event.target.value
                  )
                }
                className="mt-3 w-full rounded-2xl border border-slate-200 px-4 py-3"
              />

              {meetingError ? (
                <p className="mt-3 text-sm text-rose-600">
                  {meetingError}
                </p>
              ) : null}

              <div className="mt-5 flex justify-end gap-2">
                <button
                  onClick={() =>
                    setShowAddMeeting(
                      false
                    )
                  }
                  className="rounded-2xl border border-slate-200 px-4 py-2"
                >
                  Cancel
                </button>

                <button
                  onClick={
                    handleCreateMeeting
                  }
                  disabled={
                    isSavingMeeting
                  }
                  className="rounded-2xl bg-slate-900 px-4 py-2 text-white"
                >
                  {isSavingMeeting
                    ? "Saving..."
                    : "Create Meeting"}
                </button>
              </div>
            </div>
          </div>
        ) : null}
        {activeMeetingForNote ? (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 p-4">
                <div className="w-full max-w-xl rounded-3xl bg-white p-6 shadow-2xl">
                <div className="flex items-start justify-between">
                    <div>
                    <h3 className="text-xl font-semibold">
                        Add Note
                    </h3>

                    <p className="mt-1 text-sm text-slate-500">
                        {activeMeetingForNote.title}
                    </p>
                    </div>

                    <button
                    type="button"
                    onClick={() =>
                        setActiveMeetingForNote(null)
                    }
                    className="rounded-xl p-2 text-slate-500 hover:bg-slate-100"
                    >
                    ✕
                    </button>
                </div>

                <select
                    value={
                    selectedSecurityIds[
                        activeMeetingForNote.id
                    ] || ""
                    }
                    onChange={(event) =>
                    setSelectedSecurityIds(
                        (current) => ({
                        ...current,
                        [activeMeetingForNote.id]:
                            event.target.value,
                        })
                    )
                    }
                    className="mt-4 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
                >
                    <option value="">
                    No Security
                    </option>

                    {securities.map(
                    (security: any) => (
                        <option
                        key={security.id}
                        value={security.id}
                        >
                        {security.ticker} •{" "}
                        {security.name}
                        </option>
                    )
                    )}
                </select>

                <textarea
                    value={
                    noteDrafts[
                        activeMeetingForNote.id
                    ] || ""
                    }
                    onChange={(event) =>
                    setNoteDrafts(
                        (current) => ({
                        ...current,
                        [activeMeetingForNote.id]:
                            event.target.value,
                        })
                    )
                    }
                    placeholder="Write meeting note..."
                    className="mt-4 min-h-32 w-full rounded-2xl border border-slate-200 px-4 py-3"
                />

                <div className="mt-5 flex justify-end gap-2">
                    <button
                    type="button"
                    onClick={() =>
                        setActiveMeetingForNote(null)
                    }
                    className="rounded-2xl border border-slate-200 px-4 py-2"
                    >
                    Cancel
                    </button>

                    <button
                    type="button"
                    onClick={async () => {
                        await handleSaveNote(
                        activeMeetingForNote.id
                        );

                        setActiveMeetingForNote(null);
                    }}
                    className="rounded-2xl bg-slate-900 px-4 py-2 text-white"
                    >
                    Add Note
                    </button>
                </div>
                </div>
            </div>
            ) : null}
        
      </div>
    </main>
  );
}