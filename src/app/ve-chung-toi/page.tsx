import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Về Sifria — Sứ mệnh và nguồn sách",
  description:
    "Sifria (סִפְרִיָּה) là dự án đọc sách trực tuyến tiếng Việt lấy cảm hứng từ Israel. Tìm hiểu sứ mệnh, thẩm mỹ và nguồn dữ liệu Sefaria Open API.",
  alternates: { canonical: "/ve-chung-toi" },
};

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-10">
      <p className="text-xs uppercase tracking-[0.3em] text-[#d4af37]">
        סִפְרִיָּה · Về chúng tôi
      </p>
      <h1 className="mt-3 font-display text-5xl sm:text-6xl">
        Một <span className="text-gradient-gold">mosaic</span> giữa Đông và Tây,
        giữa cổ và mai
      </h1>

      <div className="divider-ornate my-10" />

      <div className="glass rounded-3xl p-8 sm:p-10 font-serif text-lg leading-relaxed text-parchment/85">
        <p>
          <strong className="text-parchment">Sifria</strong> — tiếng Hebrew nghĩa
          là <em>“thư viện”</em> — sinh ra từ một mong ước đơn giản: mang bộ sách
          lâu đời và sống động nhất của loài người đến gần hơn với người đọc
          Việt, trong một không gian số xứng đáng với vẻ đẹp của nó.
        </p>
        <p className="mt-5">
          Chúng tôi không viết lại Torah, không tóm lược Talmud, không diễn giải
          Kabbalah theo ý riêng. Mọi câu chữ bạn đọc trên Sifria đều được lấy
          trực tiếp từ{" "}
          <a
            href="https://www.sefaria.org"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#d4af37] underline decoration-[#d4af37]/40 underline-offset-2"
          >
            Sefaria
          </a>{" "}
          — dự án mã nguồn mở lớn nhất thế giới về văn bản Do Thái, do một đội
          ngũ tại Jerusalem và New York gìn giữ dưới các giấy phép Creative
          Commons.
        </p>
        <p className="mt-5">
          Về mặt thẩm mỹ, Sifria là một cuộc đối thoại: đá vôi Jerusalem gặp
          gradient neon Tel Aviv, chữ Aleph khắc trên mảnh gốm Lachish gặp
          hình học 3D của tương lai. Palette chúng tôi rút ra từ <em>tekhelet</em>
          — sắc xanh trong tua áo tzitzit —, từ vàng của menorah bảy nhánh, và
          từ đỏ lựu (pomegranate) tượng trưng cho 613 điều răn.
        </p>
        <p className="mt-5">
          Nếu bạn thấy điều gì hay ho ở đây, phần lớn công lao thuộc về các học
          giả, các Rabbi, các nhà dịch thuật, các lập trình viên và cộng đồng
          Sefaria — những người đã âm thầm số hoá tri thức nghìn năm để mọi
          người trên hành tinh này có thể đọc miễn phí. Chúng tôi chỉ mượn ánh
          sáng của họ mà thắp lên một cây nến nhỏ.
        </p>
        <p className="mt-8 text-right font-hebrew text-2xl text-[#d4af37]" dir="rtl">
          אוֹר חָדָשׁ עַל צִיּוֹן תָּאִיר
        </p>
        <p className="text-right text-sm italic text-parchment/60">
          — “Xin cho một ánh sáng mới rực rỡ trên Zion.”
        </p>
      </div>

      <div className="mt-10 flex flex-wrap justify-center gap-3">
        <Link href="/thu-vien" className="btn-gold">
          Vào thư viện
        </Link>
        <Link href="/doc/Genesis/1" className="btn-outline">
          Đọc trang đầu tiên
        </Link>
      </div>
    </div>
  );
}
