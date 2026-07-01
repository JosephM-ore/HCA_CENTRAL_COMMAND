"use client";

import { useState } from "react";

export default function LoginPage() {
  const [email, setEmail] = useState("trader1@example.com");
  const [password, setPassword] = useState("password123");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Login failed.");
        return;
      }

      window.location.href = "/";
    } catch {
      setError("Login failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 p-6 text-slate-900">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-xl">
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-900 text-white">
            ⌘
          </div>

          <div>
            <h1 className="text-lg font-semibold leading-tight">
              HCA Central Command
            </h1>
            <p className="text-sm text-slate-500">Portfolio operations hub</p>
          </div>
        </div>

        <h2 className="text-2xl font-semibold tracking-tight">Sign in</h2>
        <p className="mt-1 text-sm text-slate-500">
          Use a seeded local MVP account.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="text-sm font-medium text-slate-700">
              Email
            </label>
            <input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-slate-900"
              placeholder="trader1@example.com"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700">
              Password
            </label>
            <input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-slate-900"
              placeholder="password123"
            />
          </div>

          {error ? (
            <div className="rounded-2xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
              {error}
            </div>
          ) : null}

          <button
            disabled={isLoading}
            className="w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <div className="mt-6 rounded-2xl bg-slate-50 p-4 text-xs text-slate-500">
          <p className="font-semibold text-slate-700">Seeded users</p>
          <p className="mt-2">admin@example.com / password123</p>
          <p>trader1@example.com / password123</p>
          <p>trader2@example.com / password123</p>
          <p>viewer@example.com / password123</p>
        </div>
      </div>
    </main>
  );
}