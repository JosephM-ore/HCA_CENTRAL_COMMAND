export function canCreateComments(role?: string | null) {
  return ["ADMIN", "TRADER", "ANALYST", "PM"].includes(role || "");
}

export function canEditWatchlist(role?: string | null) {
  return ["ADMIN", "TRADER", "ANALYST"].includes(role || "");
}

export function canCreateFlags(role?: string | null) {
  return ["ADMIN", "TRADER", "PM"].includes(role || "");
}