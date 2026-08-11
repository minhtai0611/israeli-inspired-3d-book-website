import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Cormorant_Garamond, Frank_Ruhl_Libre, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { SITE_URL } from "@/lib/site";

const cormorant = Cormorant_Garamond({
  subsets: ["latin", "vietnamese"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-cormorant",
  display: "swap",
});

const frank = Frank_Ruhl_Libre({
  subsets: ["hebrew", "latin"],
  weight: ["300", "400", "500", "700", "900"],
  variable: "--font-frank",
  display: "swap",
});

const space = Space_Grotesk({
  subsets: ["latin", "vietnamese"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-space",
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0b1220",
  colorScheme: "dark",
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Sifria · Ánh Sáng Cổ Thư — Thư viện song ngữ Hebrew–Anh, giao diện tiếng Việt",
    template: "%s · Sifria",
  },
  description:
    "Sifria (סִפְרִיָּה) — thư viện đọc sách trực tuyến với giao diện tiếng Việt cho Torah, Talmud, Mishnah, Kabbalah, Thi thiên và các tác phẩm Israel từ cổ xưa đến hiện đại. Toàn văn song ngữ Hebrew–Anh, được cung cấp qua Sefaria API mã nguồn mở.",
  keywords: [
    "đọc sách online",
    "Torah song ngữ",
    "Talmud",
    "Kinh thánh Hebrew",
    "sách Israel",
    "Sefaria",
    "Kabbalah",
    "Thi thiên",
    "Do Thái giáo",
    "văn hoá Israel",
    "sifria",
    "ánh sáng cổ thư",
  ],
  authors: [{ name: "Sifria" }],
  creator: "Sifria",
  publisher: "Sifria",
  applicationName: "Sifria",
  robots: { index: true, follow: true },
  alternates: { canonical: "/" },
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/icon.svg" }],
  },
  openGraph: {
    type: "website",
    locale: "vi_VN",
    url: "/",
    siteName: "Sifria — Ánh Sáng Cổ Thư",
    title: "Sifria · Ánh Sáng Cổ Thư",
    description:
      "Thư viện đọc sách online với giao diện tiếng Việt, tôn vinh nghệ thuật, kiến trúc, âm nhạc và tinh thần Israel — toàn văn song ngữ Hebrew–Anh từ Torah cổ xưa đến các tác phẩm hiện đại.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Sifria · Ánh Sáng Cổ Thư",
    description:
      "Đọc Torah, Talmud, Kabbalah… trực tuyến, song ngữ Hebrew–Anh, giao diện tiếng Việt lấy cảm hứng từ Israel.",
  },
  category: "Books",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  const orgJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Sifria — Ánh Sáng Cổ Thư",
    alternateName: "Sifria",
    url: SITE_URL,
    inLanguage: "vi-VN",
    publisher: {
      "@type": "Organization",
      name: "Sifria",
      logo: {
        "@type": "ImageObject",
        url: `${SITE_URL}/icon.svg`,
      },
    },
    potentialAction: {
      "@type": "SearchAction",
      target: `${SITE_URL}/search?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };

  return (
    <html
      lang="vi"
      className={`${cormorant.variable} ${frank.variable} ${space.variable}`}
    >
      <body className="relative overflow-x-hidden">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }}
        />
        <a href="#main-content" className="skip-link">
          Bỏ qua đến nội dung chính
        </a>
        <SiteHeader />
        <main id="main-content" className="relative z-10">
          {children}
        </main>
        <SiteFooter />
      </body>
    </html>
  );
}
