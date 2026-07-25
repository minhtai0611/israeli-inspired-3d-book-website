"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[sifria]", error);
  }, [error]);

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-2xl flex-col items-center justify-center px-4 py-24 text-center">
      <p className="font-hebrew text-4xl text-[#d4af37]/70" dir="rtl" lang="he">שְׁגִיאָה</p>
      <h1 className="mt-4 font-display text-3xl text-parchment">Có trục trặc khi tải trang</h1>
      <p className="mt-3 max-w-lg font-serif text-lg text-parchment/70">
        Nguồn văn bản (Sefaria) có thể đang tạm thời không phản hồi. Bạn thử lại sau ít phút nhé.
      </p>
      <button onClick={reset} className="btn-gold mt-8">Thử lại</button>
    </div>
  );
}
