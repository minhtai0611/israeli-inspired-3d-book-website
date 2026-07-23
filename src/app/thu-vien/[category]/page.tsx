import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getIndex } from "@/lib/sefaria";
import { viBook, viCategory } from "@/lib/vi";
import { categoryFromSlug, categorySlug, flattenBooks, groupByCategory } from "@/lib/library";
import { CategoryBrowser, type BrowserBook } from "@/components/library/CategoryBrowser";

export const revalidate = 86400;

type Props = { params: Promise<{ category: string }> };

async function loadCategory(slug: string) {
  const nodes = await getIndex();
  const books = flattenBooks(nodes);
  const grouped = groupByCategory(books);
  const category = categoryFromSlug(slug, [...grouped.keys()]);
  return { category, list: category ? grouped.get(category) ?? [] : [] };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { category: slug } = await params;
  let category: string | undefined;
  try {
    ({ category } = await loadCategory(slug));
  } catch {
    category = undefined;
  }
  if (!category) return { title: "Bộ sưu tập" };
  const meta = viCategory(category);
  return {
    title: `${meta.name} · Toàn bộ tác phẩm`,
    description: `${meta.desc} Duyệt toàn bộ tác phẩm trong bộ “${meta.name}”, tìm nhanh theo tên sách.`,
    alternates: { canonical: `/thu-vien/${categorySlug(category)}` },
  };
}

export default async function CategoryPage({ params }: Props) {
  const { category: slug } = await params;

  let category: string | undefined;
  let list: ReturnType<typeof flattenBooks> = [];
  try {
    ({ category, list } = await loadCategory(slug));
  } catch {
    notFound();
  }
  if (!category) notFound();

  const meta = viCategory(category);
  const books: BrowserBook[] = list.map((b) => {
    const vi = viBook(b.title);
    return {
      title: b.title,
      heTitle: b.heTitle,
      viName: vi?.name,
      viBlurb: vi?.blurb,
      shortDesc: b.shortDesc,
    };
  });

  return (
    <div className="mx-auto max-w-7xl px-4 pb-24 pt-14 sm:px-6 lg:px-10">
      <nav className="mb-6 text-xs uppercase tracking-[0.28em] text-parchment/50">
        <Link href="/" className="hover:text-[#d4af37]">Trang chủ</Link>
        <span className="mx-2">/</span>
        <Link href="/thu-vien" className="hover:text-[#d4af37]">Thư viện</Link>
        <span className="mx-2">/</span>
        <span className="text-[#d4af37]">{meta.name}</span>
      </nav>

      <div className="mb-10 rise">
        <div className="flex items-center gap-3">
          <span className="text-4xl">{meta.icon}</span>
          <h1 className="font-display text-4xl sm:text-5xl">
            <span className="text-gradient-gold">{meta.name}</span>
          </h1>
        </div>
        <p className="mt-4 max-w-2xl font-serif text-lg text-parchment/75">{meta.desc}</p>
        <p className="mt-2 text-sm text-parchment/60">{books.length} tác phẩm trong bộ này.</p>
      </div>

      <div className="divider-ornate mb-10" />

      <CategoryBrowser books={books} />
    </div>
  );
}
