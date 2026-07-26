import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Sifria · Ánh Sáng Cổ Thư";

export default function Image() {
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
        <span style={{ fontSize: 26, letterSpacing: 6, color: "#d4af37" }}>
          סִפְרִיָּה · SIFRIA
        </span>
        <span style={{ fontSize: 68, fontWeight: 700, marginTop: 24 }}>
          Ánh Sáng Cổ Thư
        </span>
        <span style={{ fontSize: 30, color: "rgba(244,234,210,0.67)", marginTop: 16 }}>
          Torah · Talmud · Kabbalah — song ngữ Hebrew–Anh
        </span>
      </div>
    ),
    size,
  );
}
