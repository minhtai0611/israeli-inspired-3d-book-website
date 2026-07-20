import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Cormorant_Garamond, Frank_Ruhl_Libre, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";

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
  metadataBase: new URL("https://sifria.app"),
  title: {
    default: "Sifria · Ánh Sáng Cổ Thư — Thư viện sách Israel cổ điển và đương đại",
    template: "%s · Sifria",
  },
  description:
    "Sifria (סִפְרִיָּה) — thư viện đọc sách trực tuyến bằng tiếng Việt, mang đến toàn văn Torah, Talmud, Mishnah, Kabbalah, Thi thiên và các tác phẩm Israel từ cổ xưa đến hiện đại. Nội dung song ngữ Hebrew — Anh, được cung cấp qua Sefaria API mã nguồn mở.",
  keywords: [
    "đọc sách online",
    "Torah tiếng Việt",
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
      "Thư viện đọc sách online tiếng Việt, tôn vinh nghệ thuật, kiến trúc, âm nhạc và tinh thần Israel — từ Torah cổ xưa đến các tác phẩm hiện đại.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Sifria · Ánh Sáng Cổ Thư",
    description:
      "Đọc Torah, Talmud, Kabbalah… trực tuyến, song ngữ Hebrew–Anh, giao diện lấy cảm hứng từ Israel.",
  },
  category: "Books",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  const orgJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Sifria — Ánh Sáng Cổ Thư",
    alternateName: "Sifria",
    url: "https://sifria.app",
    inLanguage: "vi-VN",
    publisher: {
      "@type": "Organization",
      name: "Sifria",
      logo: {
        "@type": "ImageObject",
        url: "https://sifria.app/icon.svg",
      },
    },
    potentialAction: {
      "@type": "SearchAction",
      target: "https://sifria.app/tim-kiem?q={search_term_string}",
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
        <SiteHeader />
        <main className="relative z-10">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
