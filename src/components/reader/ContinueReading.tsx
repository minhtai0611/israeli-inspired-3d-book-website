"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import {
  getHistoryServerSnapshot,
  getHistorySnapshot,
  subscribeHistory,
} from "@/lib/reader-storage";

export function ContinueReading() {
  const history = useSyncExternalStore(
    subscribeHistory,
    getHistorySnapshot,
    getHistoryServerSnapshot,
  );

  if (history.length === 0) return null;

  return (
    <section className="relative z-10 mx-auto max-w-7xl px-4 pt-6 sm:px-6 lg:px-10">
      <div className="mb-4 flex items-baseline justify-between">
        <p className="text-xs uppercase tracking-[0.3em] text-[#d4af37]">
          Tiếp tục đọc
        </p>
      </div>
      <div className="no-scrollbar flex gap-4 overflow-x-auto pb-2">
        {history.map((h) => (
          <Link
            key={`${h.book}-${h.chapter}`}
            href={`/read/${encodeURIComponent(h.book)}/${encodeURIComponent(h.chapter)}`}
            className="glass card-3d block w-56 flex-shrink-0 rounded-2xl p-4"
          >
            <div className="card-inner">
              <p className="font-hebrew text-lg text-[#d4af37]" dir="rtl" lang="he">
                {h.heTitle}
              </p>
              <p className="mt-1 font-display text-lg text-parchment">
                {h.label} · Ch.{h.chapter}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
