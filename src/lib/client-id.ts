// Anonymous (no-login) client identity for the reader-retention tables in
// src/db/schema.ts — a UUID v4 generated once per browser and reused from
// localStorage, mirroring the same anonymous-id pattern reader-storage.ts
// already uses for prefs/history, just persisted server-side too.

const CLIENT_ID_KEY = "sifria:client-id";

/** Client-only — reading_history/reading_progress writes happen from ReaderView's effects. */
export function getClientId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const existing = window.localStorage.getItem(CLIENT_ID_KEY);
    if (existing) return existing;
    const id = crypto.randomUUID();
    window.localStorage.setItem(CLIENT_ID_KEY, id);
    return id;
  } catch {
    // localStorage unavailable (private browsing, quota) — degrade to no sync.
    return null;
  }
}
