import { ImageResponse } from "next/og";

export const alt = "100BID — 100 Brand Spots. Highest Bid Wins.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const CELL = "#241f1b";
const ACCENT = "#e27252";

export default function Image() {
  const cells = Array.from({ length: 9 }, (_, i) => i === 4);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#14120f",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", gap: 14 }}>
          {cells.map((active, i) => (
            <div
              key={i}
              style={{
                width: 64,
                height: 64,
                borderRadius: 14,
                background: active ? ACCENT : CELL,
              }}
            />
          ))}
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 40,
            fontSize: 84,
            fontWeight: 700,
            letterSpacing: -2,
            color: "#f6f1ec",
          }}
        >
          100BID
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 16,
            fontSize: 30,
            color: "#b7ada2",
          }}
        >
          100 Brand Spots. Highest Bid Wins.
        </div>
      </div>
    ),
    { ...size }
  );
}
