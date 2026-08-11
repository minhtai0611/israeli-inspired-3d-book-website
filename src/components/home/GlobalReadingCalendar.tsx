import Link from "next/link";
import { calendarLinkTarget, getGlobalCalendars, type CalendarItem } from "@/lib/sefaria";

/**
 * "Ánh Sáng Hôm Nay" homepage widget: today's Daf Yomi and this week's Parashat HaShavua,
 * each a direct link into /read/[book]/[chapter]. Server Component — the calendar fetch is
 * cached 24h (getGlobalCalendars), so this costs nothing per-request beyond the cache TTL.
 * Renders nothing (not an error state) if Sefaria is unreachable or neither item is
 * present — this is a homepage enhancement, not something that should ever break the page.
 */
export async function GlobalReadingCalendar() {
  let items: CalendarItem[] = [];
  try {
    items = (await getGlobalCalendars()).calendar_items;
  } catch {
    return null;
  }

  const dafYomi = items.find((i) => i.title.en === "Daf Yomi");
  const parashah = items.find((i) => i.title.en === "Parashat Hashavua");
  const dafLink = dafYomi && calendarLinkTarget(dafYomi);
  const parashahLink = parashah && calendarLinkTarget(parashah);

  if (!dafLink && !parashahLink) return null;

  return (
    <section className="relative z-10 mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-10">
      <div className="glass-strong rounded-3xl p-8 text-center sm:p-10">
        <p className="text-xs uppercase tracking-[0.3em] text-[#d4af37]">
          Or Hayom — Ánh Sáng Hôm Nay
        </p>
        <h2 className="mt-2 font-display text-3xl sm:text-4xl">
          Đọc <span className="text-gradient-gold">cùng thế giới</span>
        </h2>
        <p className="mt-3 font-serif text-parchment/70">
          Mỗi ngày, hàng triệu người Do Thái khắp thế giới cùng đọc một trang Talmud, cùng
          mở một chương Torah của tuần.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          {parashah && parashahLink && (
            <Link
              href={`/read/${encodeURIComponent(parashahLink.book)}/${parashahLink.chapter}`}
              className="btn-gold"
            >
              📖 Parashat {parashah.displayValue.en} — Torah tuần này
            </Link>
          )}
          {dafYomi && dafLink && (
            <Link
              href={`/read/${encodeURIComponent(dafLink.book)}/${dafLink.chapter}`}
              className="btn-outline"
            >
              📚 Daf Yomi — {dafYomi.displayValue.en}
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}
