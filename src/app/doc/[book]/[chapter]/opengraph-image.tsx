import { ImageResponse } from "next/og";
import { viBook } from "@/lib/vi";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// No Hebrew text here: next/og's renderer (satori) has no access to the
// site's CSS-loaded Hebrew font (next/font's Frank Ruhl Libre isn't
// available as a raw file to pass via ImageResponse's `fonts` option), so
// rendering heTitle would risk silent tofu/missing glyphs instead of an
// actual improvement.
export default async function Image({
  params,
}: {
  params: Promise<{ book: string; chapter: string }>;
}) {
  const { book, chapter: rawChapter } = await params;
  const title = decodeURIComponent(book);
  const chapter = decodeURIComponent(rawChapter);
  const vi = viBook(title);
  const label = vi?.name ?? title;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px 96px",
          background: "#0b1220",
          backgroundImage:
            "radial-gradient(ellipse at 20% 10%, rgba(212,175,55,0.25), transparent 60%)",
          color: "#f4ead2",
          fontFamily: "serif",
        }}
      >
        <span style={{ fontSize: 22, letterSpacing: 6, color: "#d4af37" }}>
          SIFRIA
        </span>
        <span style={{ fontSize: 60, fontWeight: 700, marginTop: 24 }}>
          {label}
        </span>
        <span style={{ fontSize: 32, color: "rgba(244,234,210,0.67)", marginTop: 16 }}>
          {title} · {chapter}
        </span>
      </div>
    ),
    size,
  );
}
