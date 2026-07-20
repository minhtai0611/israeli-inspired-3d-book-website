import Link from "next/link";
import { Logo } from "./Logo";

export function SiteFooter() {
  return (
    <footer className="relative z-10 mt-24 border-t border-[#d4af37]/15 bg-[#06080f]/70 backdrop-blur-xl">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-4 lg:px-10">
        <div className="lg:col-span-2">
          <Logo />
          <p className="mt-5 max-w-md font-serif text-lg leading-relaxed text-parchment/70">
            <span className="text-gradient-gold">Sifria</span> — nơi hơi thở cổ xưa của
            Jerusalem gặp gỡ ngôn ngữ hôm nay và giấc mơ ngày mai. Đọc Torah, Talmud,
            Kabbalah, Thi thiên… bằng tiếng Việt, song ngữ Hebrew &amp; Anh, dưới ánh
            sáng của menorah bảy nhánh.
          </p>
          <p className="mt-4 text-xs text-parchment/50">
            Toàn bộ nội dung sách được cung cấp qua{" "}
            <a
              href="https://developers.sefaria.org/"
              target="_blank"
              rel="noopener noreferrer"
              className="underline decoration-[#d4af37]/50 underline-offset-2 hover:text-[#d4af37]"
            >
              Sefaria Open API
            </a>{" "}
            — kho mở của các văn bản Israel — không sáng tác, không chỉnh sửa.
          </p>
        </div>
        <div>
          <h4 className="mb-4 text-xs uppercase tracking-[0.3em] text-[#d4af37]">
            Khám phá
          </h4>
          <ul className="space-y-2 text-sm text-parchment/75">
            <li><Link className="hover:text-parchment" href="/thu-vien">Toàn bộ thư viện</Link></li>
            <li><Link className="hover:text-parchment" href="/sach/Genesis">Sáng Thế Ký</Link></li>
            <li><Link className="hover:text-parchment" href="/sach/Psalms">Thi Thiên</Link></li>
            <li><Link className="hover:text-parchment" href="/sach/Song%20of%20Songs">Nhã Ca</Link></li>
            <li><Link className="hover:text-parchment" href="/sach/Pirkei%20Avot">Pirkei Avot</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="mb-4 text-xs uppercase tracking-[0.3em] text-[#d4af37]">
            Sifria
          </h4>
          <ul className="space-y-2 text-sm text-parchment/75">
            <li><Link className="hover:text-parchment" href="/ve-chung-toi">Về chúng tôi</Link></li>
            <li>
              <a
                className="hover:text-parchment"
                href="https://www.sefaria.org"
                target="_blank"
                rel="noopener noreferrer"
              >
                Sefaria.org
              </a>
            </li>
            <li>
              <a
                className="hover:text-parchment"
                href="https://github.com/Sefaria"
                target="_blank"
                rel="noopener noreferrer"
              >
                Mã nguồn mở
              </a>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-[#d4af37]/10 py-4 text-center text-xs text-parchment/50">
        © {new Date().getFullYear()} Sifria · סִפְרִיָּה — “Or chadash al Tsion ta’ir” · Xây bằng lòng
        kính tôn dành cho di sản Israel.
      </div>
    </footer>
  );
}
