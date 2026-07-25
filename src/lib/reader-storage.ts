// Client-side reader preferences + reading history, persisted to localStorage and
// exposed as external stores (for useSyncExternalStore) so components don't need
// the effect+setState pattern to read them. No account system exists, so this is
// anonymous/per-browser — see docs/db-sync.md for the DB-backed retention
// foundation this could eventually sync to.

export type ReaderPrefs = {
  fontScale: number; // 0.85–1.3
  lineSpacing: "normal" | "relaxed" | "loose";
  mode: "both" | "he" | "en";
};

export const DEFAULT_READER_PREFS: ReaderPrefs = {
  fontScale: 1,
  lineSpacing: "normal",
  mode: "both",
};

export type HistoryEntry = {
  book: string;
  /** URL segment, e.g. "5", "2a" (Talmud daf), or "Introduction" (complex-schema section) — not always numeric. */
  chapter: string;
  label: string;
  heTitle: string;
  visitedAt: number;
};

const PREFS_KEY = "sifria:reader-prefs";
const HISTORY_KEY = "sifria:history";
const HISTORY_LIMIT = 12;

type Listener = () => void;

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return { ...fallback, ...JSON.parse(raw) };
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // localStorage unavailable (private browsing, quota) — silently skip persistence.
  }
}

// --- Reader preferences store ---

let prefsCache: ReaderPrefs | null = null;
const prefsListeners = new Set<Listener>();

export function subscribeReaderPrefs(cb: Listener) {
  prefsListeners.add(cb);
  return () => {
    prefsListeners.delete(cb);
  };
}

export function getReaderPrefsSnapshot(): ReaderPrefs {
  if (!prefsCache) prefsCache = readJson(PREFS_KEY, DEFAULT_READER_PREFS);
  return prefsCache;
}

export function getReaderPrefsServerSnapshot(): ReaderPrefs {
  return DEFAULT_READER_PREFS;
}

export function setReaderPrefs(next: ReaderPrefs) {
  prefsCache = next;
  writeJson(PREFS_KEY, next);
  for (const l of prefsListeners) l();
}

// --- Reading history store ---

let historyCache: HistoryEntry[] | null = null;
const historyListeners = new Set<Listener>();

export function subscribeHistory(cb: Listener) {
  historyListeners.add(cb);
  return () => {
    historyListeners.delete(cb);
  };
}

export function getHistorySnapshot(): HistoryEntry[] {
  if (!historyCache) {
    if (typeof window === "undefined") {
      historyCache = [];
    } else {
      try {
        const raw = window.localStorage.getItem(HISTORY_KEY);
        const parsed = raw ? JSON.parse(raw) : [];
        historyCache = Array.isArray(parsed) ? parsed : [];
      } catch {
        historyCache = [];
      }
    }
  }
  return historyCache;
}

export function getHistoryServerSnapshot(): HistoryEntry[] {
  return [];
}

export function recordVisit(entry: Omit<HistoryEntry, "visitedAt">) {
  if (typeof window === "undefined") return;
  const existing = getHistorySnapshot().filter(
    (h) => !(h.book === entry.book && h.chapter === entry.chapter),
  );
  const next = [{ ...entry, visitedAt: Date.now() }, ...existing].slice(0, HISTORY_LIMIT);
  historyCache = next;
  writeJson(HISTORY_KEY, next);
  for (const l of historyListeners) l();
}
