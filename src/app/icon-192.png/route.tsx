import { ImageResponse } from "next/og";

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0a0a0a",
          color: "#fafafa",
          fontSize: 140,
          fontWeight: 800,
          letterSpacing: "-0.08em",
        }}
      >
        p
      </div>
    ),
    { width: 192, height: 192 },
  );
}
