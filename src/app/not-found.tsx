import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-3xl flex-col items-center justify-center px-4 py-24 text-center">
      <p className="font-hebrew text-6xl text-[#d4af37]/70" dir="rtl">לֹא נִמְצָא</p>
      <h1 className="mt-4 font-display text-5xl text-parchment">
        Trang này chưa xuất hiện trong <span className="text-gradient-gold">cuộn sách</span>
      </h1>
      <p className="mt-3 max-w-lg font-serif text-lg text-parchment/70">
        Có thể tên cuốn sách đã được đánh vần khác đi, hoặc chương này chưa có
        trong kho Sefaria. Hãy trở về thư viện và thử một hành trình khác.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link href="/" className="btn-gold">Về trang chủ</Link>
        <Link href="/thu-vien" className="btn-outline">Vào thư viện</Link>
      </div>
    </div>
  );
}
