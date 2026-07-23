"use client";

import { useState } from "react";

type SummaryModalProps = {
  open: boolean;
  onClose: () => void;
};

export default function SummaryModal({
  open,
  onClose,
}: SummaryModalProps) {
  const [activeTab, setActiveTab] =
    useState("EXECUTIVE");

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 p-4 backdrop-blur-sm">
      <div className="flex h-[90vh] w-full max-w-7xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 p-6">
          <div>
            <h2 className="text-2xl font-semibold text-slate-950">
              Fund Summaries
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Executive dashboard and portfolio analytics.
            </p>
          </div>

          <button
            onClick={onClose}
            className="rounded-xl p-2 text-slate-500 hover:bg-slate-100"
          >
            ✕
          </button>
        </div>

        <div className="border-b border-slate-200 px-6 py-3">
          <div className="flex gap-2">
            <button
              onClick={() =>
                setActiveTab(
                  "EXECUTIVE"
                )
              }
              className={`rounded-xl px-4 py-2 text-sm ${
                activeTab ===
                "EXECUTIVE"
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-600"
              }`}
            >
              Executive Summary
            </button>

            <button
              onClick={() =>
                setActiveTab(
                  "REPORT"
                )
              }
              className={`rounded-xl px-4 py-2 text-sm ${
                activeTab ===
                "REPORT"
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-600"
              }`}
            >
              Fund Report
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-6">
          {activeTab ===
          "EXECUTIVE" ? (
            <div className="rounded-2xl border border-slate-200 p-8 text-center">
              <h3 className="text-xl font-semibold">
                Executive Summary
              </h3>

              <p className="mt-2 text-slate-500">
                Analytics coming in
                Commit 2.
              </p>
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-200 p-8 text-center">
              <h3 className="text-xl font-semibold">
                Fund Report
              </h3>

              <p className="mt-2 text-slate-500">
                Portfolio reporting
                coming in Commit 3.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}