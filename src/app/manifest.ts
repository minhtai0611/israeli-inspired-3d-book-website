import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Sifria — Ánh Sáng Cổ Thư",
    short_name: "Sifria",
    description:
      "Thư viện đọc sách Israel bằng tiếng Việt: Torah, Talmud, Kabbalah…",
    start_url: "/",
    display: "standalone",
    background_color: "#0b1220",
    theme_color: "#d4af37",
    lang: "vi",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
    ],
  };
}
