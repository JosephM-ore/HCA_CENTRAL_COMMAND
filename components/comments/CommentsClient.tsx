"use client";
import LocalDateTime from "@/components/common/LocalDateTime";
import Badge from "@/components/common/Badge";
import Link from "next/link";
import { useMemo, useState } from "react";
import CurrentUserPill from "@/components/auth/CurrentUserPill";
import HcaLogo from "@/components/common/HcaLogo";
type CommentsClientProps = {
  initialComments: any[];
};

function getTagTone(tag: string) {
  if (tag === "RISK") return "red";
  if (tag === "EXIT") return "yellow";
  if (tag === "THESIS") return "green";
  if (tag === "CATALYST") return "amber";
  if (tag === "TRADE") return "blue";
  if (tag === "NOTE") return "blue";
  return "slate";
}

function getContextLabel(comment: any) {
  if (comment.watchlistEntryId) return "Watchlist";
  if (comment.position?.status === "CLOSED") return "Past Position";
  if (comment.position?.status === "ACTIVE") return "Active Position";
  if (comment.securityId) return "Security";
  return "General Note";
}

function isGeneralComment(comment: any) {
  return (
    !comment.securityId &&
    !comment.positionId &&
    !comment.watchlistEntryId
  );
}



export default function CommentsClient({
  initialComments,
}: CommentsClientProps) {
  const [query, setQuery] = useState("");
  const [localComments, setLocalComments] = useState<any[]>(initialComments);
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null);
  const [deleteCommentError, setDeleteCommentError] = useState("");
  const [generalNoteContent, setGeneralNoteContent] = useState("");
  const [isSavingGeneralNote, setIsSavingGeneralNote] = useState(false);
  const [generalNoteError, setGeneralNoteError] = useState("");

  const filteredComments = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) return localComments;

  return localComments.filter((comment) => {
      const searchable = [
        comment.security?.ticker,
        comment.security?.name,
        comment.security?.sector,
        comment.tag,
        comment.content,
        comment.author?.name,
        comment.author?.email,
        getContextLabel(comment),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchable.includes(normalizedQuery);
    });
  }, [localComments, query]);

  const riskComments = localComments.filter(
    (comment) => comment.tag === "RISK"
  ).length;

  const exitComments = localComments.filter(
    (comment) => comment.tag === "EXIT"
  ).length;

  const tradeComments = localComments.filter(
    (comment) => comment.tag === "TRADE"
  ).length;

  async function handleCreateGeneralNote() {
    const content = generalNoteContent.trim();

    if (!content) {
      setGeneralNoteError("General note content is required.");
      return;
    }

    setIsSavingGeneralNote(true);
    setGeneralNoteError("");

    try {
      const response = await fetch("/api/comments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          tag: "NOTE",
          content,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create general note.");
      }

      setLocalComments((current) => [data.comment, ...current]);
      setGeneralNoteContent("");
    } catch (error) {
      setGeneralNoteError(
        error instanceof Error ? error.message : "Failed to create general note."
      );
    } finally {
      setIsSavingGeneralNote(false);
    }
  }

  async function handleDeleteComment(comment: any) {
    const confirmed = window.confirm(
      "Delete this comment? This will remove it from the comments timeline."
    );

    if (!confirmed) return;

    setDeletingCommentId(comment.id);
    setDeleteCommentError("");

    try {
      const response = await fetch(`/api/comments/${comment.id}`, {
        method: "DELETE",
        credentials: "include",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to delete comment.");
      }

      setLocalComments((current) =>
        current.filter((currentComment) => currentComment.id !== comment.id)
      );
    } catch (error) {
      setDeleteCommentError(
        error instanceof Error ? error.message : "Failed to delete comment."
      );
    } finally {
      setDeletingCommentId(null);
    }
  }

return (
    <main className="h-screen overflow-hidden bg-slate-100 text-slate-900">
      <div className="flex h-full">
        <aside className="flex w-72 shrink-0 flex-col border-r border-slate-200 bg-white p-4">
          <div className="mb-6 flex items-center gap-3 px-2 py-2">
            <HcaLogo />
            <div>
              <h1 className="font-semibold leading-tight">
                HCA Central Command
              </h1>
              <p className="text-xs text-slate-500">Portfolio operations hub</p>
            </div>
          </div>

          <nav className="space-y-2">
            <Link
              href="/"
              className="block rounded-2xl px-3 py-2.5 text-sm text-slate-600 hover:bg-slate-100"
            >
              Home / Positions
            </Link>

            <Link
              href="/watchlist"
              className="block rounded-2xl px-3 py-2.5 text-sm text-slate-600 hover:bg-slate-100"
            >
              Watchlist
            </Link>

            <Link
              href="/past-positions"
              className="block rounded-2xl px-3 py-2.5 text-sm text-slate-600 hover:bg-slate-100"
            >
              Past Positions
            </Link>

            <Link
              href="/comments"
              className="block rounded-2xl bg-slate-900 px-3 py-2.5 text-sm text-white shadow-sm"
            >
              Comments
            </Link>

            <Link
              href="/alerts"
              className="block rounded-2xl px-3 py-2.5 text-sm text-slate-600 hover:bg-slate-100"
            >
              Alerts
            </Link>

            <Link
              href="/settings"
              className="block rounded-2xl px-3 py-2.5 text-sm text-slate-600 hover:bg-slate-100"
            >
              Settings
            </Link>
          </nav>

          <div className="mt-auto rounded-3xl bg-slate-50 p-4">
            <div className="mb-2 text-sm font-medium">Compliance Mode</div>
            <p className="text-xs leading-5 text-slate-500">
              Global comments preserve internal rationale, risk updates, exit
              notes, and trade context across positions and watchlists.
            </p>
          </div>
        </aside>

        <section className="flex min-w-0 flex-1 flex-col">
          <header className="flex h-20 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-6">
            <div>
              <p className="text-sm font-medium text-slate-900">Global Comments</p>
              <p className="text-xs text-slate-500">Searchable comment timeline</p>
            </div>

            <div className="ml-4 flex items-center gap-3">
              <Badge tone="green">Live data mock</Badge>
              <CurrentUserPill />
            </div>
          </header>

          <div className="min-w-0 flex-1 overflow-auto p-6">
            <div className="space-y-5">
              <div>
                <h2 className="text-3xl font-semibold tracking-tight">
                  Global Comments
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Search all position, watchlist, and historical comment
                  sections across the portfolio operations hub.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-slate-950">
                      Add General Note
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Create a desk-level note that is not attached to a specific security,
                      position, or watchlist item.
                    </p>
                  </div>

                  <Badge tone="blue">NOTE</Badge>
                </div>

                <textarea
                  value={generalNoteContent}
                  onChange={(event) => setGeneralNoteContent(event.target.value)}
                  placeholder="Write a general portfolio, desk, or workflow note..."
                  className="mt-3 min-h-24 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-slate-900"
                />

                {generalNoteError ? (
                  <div className="mt-3 rounded-2xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
                    {generalNoteError}
                  </div>
                ) : null}

                <div className="mt-3 flex justify-end">
                  <button
                    type="button"
                    onClick={handleCreateGeneralNote}
                    disabled={isSavingGeneralNote}
                    className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSavingGeneralNote ? "Saving..." : "Add General Note"}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Total Comments
                </p>
                <p className="mt-2 text-2xl font-semibold text-slate-950">
                {localComments.length}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                Across all entities
                </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Risk Notes
                </p>
                <p className="mt-2 text-2xl font-semibold text-rose-600">
                {riskComments}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                Tagged risk comments
                </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Exit Notes
                </p>
                <p className="mt-2 text-2xl font-semibold text-yellow-700">
                {exitComments}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                Closed-position rationale
                </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Trade Notes
                </p>
                <p className="mt-2 text-2xl font-semibold text-blue-600">
                {tradeComments}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                Execution/context notes
                </p>
            </div>
            </div>

            {deleteCommentError ? (
              <div className="rounded-2xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
                {deleteCommentError}
              </div>
            ) : null}
            <div className="rounded-2xl border border-slate-200 bg-white p-3">
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search ticker, company, comment text, author, category..."
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-slate-900"
              />
            </div>

              <div className="space-y-3">
                {filteredComments.length ? (
                  filteredComments.map((comment) => (
                    <div
                      key={comment.id}
                      className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex flex-wrap items-center gap-2">
                          {isGeneralComment(comment) ? (
                            <Badge tone="blue">NOTE</Badge>
                          ) : (
                            <>
                              <Badge tone="blue">
                                {comment.security?.ticker || "N/A"}
                              </Badge>

                              <Badge tone={getTagTone(comment.tag) as any}>
                                {comment.tag}
                              </Badge>

                              <Badge>{getContextLabel(comment)}</Badge>

                              {comment.position?.side ? (
                                <Badge
                                  tone={
                                    comment.position.side === "SHORT"
                                      ? "red"
                                      : "green"
                                  }
                                >
                                  {comment.position.side}
                                </Badge>
                              ) : null}
                            </>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <LocalDateTime
                            value={comment.createdAt}
                            className="text-xs text-slate-400"
                          />

                          <button
                          type="button"
                          onClick={() => handleDeleteComment(comment)}
                          disabled={deletingCommentId === comment.id}
                          title="Delete comment"
                          className="inline-flex h-8 w-8 items-center justify-center rounded-xl text-rose-600 hover:bg-rose-50 hover:text-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {deletingCommentId === comment.id ? (
                            <span className="text-xs font-semibold">...</span>
                          ) : (
                            <svg
                              viewBox="0 0 24 24"
                              aria-hidden="true"
                              className="h-5 w-5"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M3 6h18" />
                              <path d="M8 6V4h8v2" />
                              <path d="M6 6l1 15h10l1-15" />
                              <path d="M10 11v6" />
                              <path d="M14 11v6" />
                            </svg>
                          )}
                        </button>
</div>
                      </div>

                      <p className="mt-3 text-sm leading-6 text-slate-700">
                        {comment.content}
                      </p>

                      <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
                        <span>
                          by{" "}
                          {comment.author?.name ||
                            comment.author?.email ||
                            "Unknown"}
                        </span>

                        <span>
                          {isGeneralComment(comment)
                            ? "General note"
                            : comment.security?.name || "—"}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 shadow-sm">
                    No comments matched your search.
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}