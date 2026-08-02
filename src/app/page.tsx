import Link from "next/link";
import type { Metadata } from "next";
import { HeroOrbit } from "@/components/HeroOrbit";
import { HebrewMarquee } from "@/components/HebrewMarquee";
import { ContinueReading } from "@/components/reader/ContinueReading";
import { getIndex } from "@/lib/sefaria";
import { HERO_QUOTES, viBook, viCategory } from "@/lib/vi";
import { GlossaryText } from "@/components/GlossaryText";

export const revalidate = 21600; // 6h

export const metadata: Metadata = {
  title: "Sifria · Ánh Sáng Cổ Thư — Đọc Torah, Talmud, Kabbalah song ngữ Hebrew–Anh",
  description:
    "Thư viện đọc sách online với giao diện tiếng Việt, lấy cảm hứng từ Israel: Torah, Talmud, Kabbalah, Thi thiên, Nhã ca… Toàn văn song ngữ Hebrew–Anh, trình bày sang trọng, chuyển động 3D.",
};

const FEATURED = [
  { book: "Genesis", chapter: 1, tag: "Sáng thế · Chương 1" },
  { book: "Psalms", chapter: 23, tag: "Thi thiên · Chương 23" },
  { book: "Song of Songs", chapter: 1, tag: "Nhã ca · Chương 1" },
  { book: "Ecclesiastes", chapter: 3, tag: "Truyền đạo · Chương 3" },
  { book: "Isaiah", chapter: 40, tag: "Isaiah · Chương 40" },
  { book: "Pirkei Avot", chapter: 1, tag: "Pirkei Avot · Chương 1" },
];

type TopCat = { key: string; ref: string };
const TOP_CATS: TopCat[] = [
  { key: "Torah", ref: "Genesis" },
  { key: "Prophets", ref: "Isaiah" },
  { key: "Writings", ref: "Psalms" },
  { key: "Mishnah", ref: "Pirkei Avot" },
  { key: "Talmud", ref: "Berakhot" },
  { key: "Kabbalah", ref: "Zohar" },
  { key: "Midrash", ref: "Bereshit Rabbah" },
  { key: "Jewish Thought", ref: "Guide for the Perplexed" },
];

export default async function HomePage() {
  // Preload the top-level index (cached 24h). If it fails, still render the page.
  let categoriesCount = 0;
  try {
    const idx = await getIndex();
    categoriesCount = idx.length;
  } catch {
    categoriesCount = 0;
  }

  return (
    <>
      {/* ============ HERO ============ */}
      <section className="relative overflow-hidden pt-10 sm:pt-16">
        {/* Floating orbs */}
        <div className="orb h-72 w-72 -left-20 top-10 bg-[#d4af37]/40" />
        <div className="orb h-96 w-96 right-0 top-40 bg-[#1b3a6b]/60" />
        <div className="orb h-64 w-64 left-1/3 bottom-0 bg-[#8b1e2d]/40" />

        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 pb-16 pt-6 sm:px-6 lg:grid-cols-2 lg:px-10 lg:pt-14">
          <div className="rise">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#d4af37]/40 bg-[#d4af37]/5 px-4 py-1.5 text-xs uppercase tracking-[0.3em] text-[#d4af37]">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#d4af37]" />
              סִפְרִיָּה · Thư viện ánh sáng
            </div>

            <h1 className="font-display text-5xl leading-[1.05] tracking-tight sm:text-6xl lg:text-7xl">
              <span className="text-parchment">Nơi </span>
              <span className="text-gradient-gold">Jerusalem cổ xưa</span>
              <span className="text-parchment"> ngân lên</span>
              <br />
              <span className="text-parchment">tiếng nói của </span>
              <span className="text-gradient-tekhelet">ngày mai</span>
              <span className="text-parchment">.</span>
            </h1>

            <p className="mt-6 max-w-xl font-serif text-lg leading-relaxed text-parchment/80 sm:text-xl">
              <strong className="text-parchment">Sifria</strong> là thư viện đọc sách trực
              tuyến tôn vinh di sản Israel — từ những chữ Torah được khắc trên đá 3.000
              năm trước, đến âm nhạc niggun của các Rabbi hôm nay, và giấc mơ khôi phục
              đền thờ mai sau. Mỗi trang là một mosaic của <em>nghệ thuật, kiến trúc, âm
              nhạc và tinh thần</em>.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3 rise rise-2">
              <Link href="/doc/Genesis/1" className="btn-gold">
                <span aria-hidden>📖</span> Đọc Sáng Thế Ký · Chương 1
              </Link>
              <Link href="/thu-vien" className="btn-outline">
                Khám phá {categoriesCount || 20}+ bộ sưu tập
              </Link>
            </div>

            <dl className="mt-10 grid grid-cols-3 gap-4 rise rise-3">
              {[
                { k: "3000+", v: "năm truyền thống" },
                { k: "Hebrew", v: "song ngữ với Anh" },
                { k: "0 đồng", v: "mở & miễn phí" },
              ].map((s) => (
                <div
                  key={s.v}
                  className="glass rounded-2xl px-4 py-3 text-center"
                >
                  <dt className="font-display text-2xl text-gradient-gold">
                    {s.k}
                  </dt>
                  <dd className="text-xs text-parchment/70">{s.v}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="rise rise-2">
            <HeroOrbit />
          </div>
        </div>

        <HebrewMarquee />
      </section>

      <ContinueReading />

      {/* ============ QUOTE STRIP ============ */}
      <section className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-10">
        <div className="divider-ornate" />
        <div className="grid gap-6 py-10 md:grid-cols-3">
          {HERO_QUOTES.map((q, i) => (
            <blockquote
              key={i}
              className="glass rounded-3xl p-6 text-center"
            >
              <p className="font-hebrew text-2xl text-[#f2d47a]" dir="rtl" lang="he">
                {q.he}
              </p>
              <p className="mt-3 font-serif text-lg italic text-parchment/85">
                {q.vi}
              </p>
              <footer className="mt-3 text-xs uppercase tracking-[0.28em] text-[#d4af37]/70">
                — {q.source}
              </footer>
            </blockquote>
          ))}
        </div>
        <div className="divider-ornate" />
      </section>

      {/* ============ CATEGORIES ============ */}
      <section className="relative z-10 mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-10">
        <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-[#d4af37]">
              Kho tàng
            </p>
            <h2 className="mt-2 font-display text-4xl sm:text-5xl">
              Bộ sưu tập <span className="text-gradient-gold">nghìn năm</span>
            </h2>
            <p className="mt-3 max-w-2xl font-serif text-lg text-parchment/70">
              Từ Ngũ Kinh Moses tới huyền học Kabbalah, từ Mishnah của các Rabbi
              thế kỷ III tới tư tưởng Israel đương đại — chọn nơi để bước vào.
            </p>
          </div>
          <Link href="/thu-vien" className="btn-outline text-sm">
            Xem toàn bộ →
          </Link>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {TOP_CATS.map((c, i) => {
            const meta = viCategory(c.key);
            return (
              <Link
                key={c.key}
                href={`/sach/${encodeURIComponent(c.ref)}`}
                className="tile card-3d glass block p-6"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <div className="card-inner">
                  <div className="mb-4 flex items-center justify-between">
                    <span className="text-3xl">{meta.icon}</span>
                    <span className="text-[10px] uppercase tracking-[0.28em] text-[#d4af37]/70">
                      {c.key}
                    </span>
                  </div>
                  <h3 className="font-display text-2xl text-parchment">
                    {meta.name}
                  </h3>
                  <p className="mt-2 text-sm text-parchment/70">
                    <GlossaryText text={meta.desc} />
                  </p>
                  <p className="mt-4 text-xs text-[#d4af37]/80">
                    Bắt đầu với “{c.ref}” →
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* ============ FEATURED CHAPTERS ============ */}
      <section className="relative z-10 mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-10">
        <div className="mb-10">
          <p className="text-xs uppercase tracking-[0.3em] text-[#d4af37]">
            Đọc nhanh
          </p>
          <h2 className="mt-2 font-display text-4xl sm:text-5xl">
            Chương <span className="text-gradient-gold">được tuyển</span>
          </h2>
        </div>

        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {FEATURED.map((f, i) => {
            const meta = viBook(f.book);
            return (
              <Link
                key={f.book + f.chapter}
                href={`/doc/${encodeURIComponent(f.book)}/${f.chapter}`}
                className="card-3d glass-strong group relative block overflow-hidden rounded-3xl p-6"
              >
                {/* embossed hebrew number */}
                <span className="absolute -right-4 -top-6 font-hebrew text-[6rem] leading-none text-[#d4af37]/10">
                  {["א","ב","ג","ד","ה","ו"][i]}
                </span>
                <div className="card-inner relative">
                  <p className="text-[10px] uppercase tracking-[0.28em] text-[#d4af37]/80">
                    {f.tag}
                  </p>
                  <h3 className="mt-2 font-display text-3xl text-parchment">
                    {meta?.name ?? f.book}
                  </h3>
                  <p className="mt-3 min-h-[3rem] font-serif italic text-parchment/75">
                    {meta?.blurb ?? "Một bản văn kinh điển của Israel."}
                  </p>
                  <div className="mt-6 flex items-center justify-between text-sm">
                    <span className="text-[#d4af37]">Mở trình đọc →</span>
                    <span className="rounded-full border border-[#d4af37]/30 px-3 py-1 text-xs text-parchment/70 transition group-hover:border-[#d4af37]">
                      Song ngữ HE / EN
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* ============ MANIFESTO / TRIPTYCH ============ */}
      <section className="relative z-10 mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-10">
        <div className="divider-ornate mb-10" />
        <div className="grid gap-8 lg:grid-cols-3">
          {[
            {
              era: "Cổ Xưa",
              he: "עָבָר",
              body:
                "Đá vôi Jerusalem, tiếng shofar trên núi Sinai, chữ Aleph khắc trên mảnh gốm Lachish. Chúng tôi giữ nguyên bản Masoretic Hebrew như ba nghìn năm về trước.",
              color: "from-[#8b1e2d] to-[#a37d1a]",
            },
            {
              era: "Hiện Tại",
              he: "הוֹוֶה",
              body:
                "Trên nền tảng Sefaria mã nguồn mở, chúng tôi mang toàn văn đến với người đọc Việt — nhanh, sạch, sang trọng, chạy trên mọi thiết bị.",
              color: "from-[#1b3a6b] to-[#0b3d5c]",
            },
            {
              era: "Tương Lai",
              he: "עָתִיד",
              body:
                "Một mosaic số vươn về phía trước: âm nhạc niggun sinh động, phối cảnh 3D, và nghi thức Shabbat được truyền cảm hứng cho cả một thế hệ mới.",
              color: "from-[#d4af37] to-[#6a7a2f]",
            },
          ].map((p) => (
            <article
              key={p.era}
              className={`card-3d relative overflow-hidden rounded-3xl bg-gradient-to-br ${p.color} p-8 text-parchment shadow-xl`}
            >
              <span className="font-hebrew absolute -right-4 -top-4 text-9xl text-parchment/10">
                {p.he}
              </span>
              <div className="card-inner relative">
                <p className="text-xs uppercase tracking-[0.3em] text-parchment/70">
                  {p.he}
                </p>
                <h3 className="mt-2 font-display text-4xl">{p.era}</h3>
                <p className="mt-4 font-serif text-lg leading-relaxed text-parchment/90">
                  {p.body}
                </p>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* ============ CTA ============ */}
      <section className="relative z-10 mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-10">
        <div className="glass-strong relative overflow-hidden rounded-[32px] p-10 text-center sm:p-16">
          <span className="floater absolute left-6 top-4 font-hebrew text-6xl">א</span>
          <span
            className="floater absolute right-8 bottom-8 font-hebrew text-6xl"
            style={{ animationDelay: "2s" }}
          >
            ת
          </span>
          <p className="text-xs uppercase tracking-[0.35em] text-[#d4af37]">
            Or chadash — Ánh sáng mới
          </p>
          <h2 className="mt-4 font-display text-4xl sm:text-5xl">
            Bước vào <span className="text-gradient-gold">trang đầu tiên</span>
          </h2>
          <p className="mx-auto mt-4 max-w-2xl font-serif text-lg text-parchment/80">
            Từ câu <em>“Bereshit bara Elohim”</em> — “Ban đầu, Elohim tạo dựng” — đến bản
            thánh ca của David, hành trình chỉ cách một cú chạm.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/doc/Genesis/1" className="btn-gold">
              Bắt đầu với Sáng Thế 1
            </Link>
            <Link href="/thu-vien" className="btn-outline">
              Duyệt toàn thư viện
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
