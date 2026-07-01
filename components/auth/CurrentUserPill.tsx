"use client";

import { useEffect, useState } from "react";

export default function CurrentUserPill() {
  const [user, setUser] = useState<any | null>(null);

  useEffect(() => {
    async function loadUser() {
      const response = await fetch("/api/auth/me");

      if (!response.ok) return;

      const data = await response.json();
      setUser(data.user);
    }

    loadUser();
  }, []);

  if (!user) {
    return (
      <div className="rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-500">
        Loading user...
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-slate-200 px-3 py-2">
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white">
        {(user.name || user.email || "?").slice(0, 1).toUpperCase()}
      </div>

      <div className="hidden text-sm md:block">
        <p className="font-medium text-slate-900">
          {user.name || user.email}
        </p>
        <p className="text-xs text-slate-500">{user.role}</p>
      </div>
    </div>
  );
}