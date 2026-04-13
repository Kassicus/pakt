import { ImageResponse } from "next/og";
import { buildScanUrl, generateQrPngDataUrl } from "@/lib/qr";

export const LABEL_WIDTH = 472;
export const LABEL_HEIGHT = 354;
const QR_SIZE = 300;

export type LabelBox = {
  shortCode: string;
  size: string;
  moveId: string;
  fragile: boolean;
  destinationRoomLabel: string | null;
  sourceRoomLabel: string | null;
};

const SIZE_LABEL: Record<string, string> = {
  small: "Small",
  medium: "Medium",
  large: "Large",
  dish_pack: "Dish pack",
  wardrobe: "Wardrobe",
  tote: "Tote",
};

function renderLabelJsx(box: LabelBox, qrDataUrl: string) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        background: "#ffffff",
        color: "#000000",
        border: "1px solid #000000",
        padding: 16,
        fontFamily: "Geist, Helvetica, Arial, sans-serif",
      }}
    >
      <div
        style={{
          width: QR_SIZE,
          height: QR_SIZE,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={qrDataUrl}
          alt=""
          width={QR_SIZE}
          height={QR_SIZE}
          style={{ width: QR_SIZE, height: QR_SIZE }}
        />
      </div>
      <div
        style={{
          marginLeft: 14,
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              fontSize: 48,
              fontWeight: 800,
              letterSpacing: 2,
              lineHeight: 1,
              fontFamily: "Geist Mono, ui-monospace, monospace",
            }}
          >
            {box.shortCode}
          </div>
          <div
            style={{
              marginTop: 8,
              fontSize: 14,
              color: "#444",
              textTransform: "uppercase",
              letterSpacing: 1,
            }}
          >
            {SIZE_LABEL[box.size] ?? box.size}
          </div>
          {box.destinationRoomLabel ? (
            <div
              style={{
                marginTop: 14,
                fontSize: 26,
                fontWeight: 600,
                lineHeight: 1.1,
              }}
            >
              → {box.destinationRoomLabel}
            </div>
          ) : null}
          {box.sourceRoomLabel ? (
            <div style={{ marginTop: 4, fontSize: 14, color: "#666" }}>
              from {box.sourceRoomLabel}
            </div>
          ) : null}
        </div>
        {box.fragile ? (
          <div
            style={{
              alignSelf: "flex-start",
              background: "#000",
              color: "#fff",
              fontWeight: 800,
              fontSize: 16,
              letterSpacing: 3,
              padding: "4px 10px",
              display: "flex",
            }}
          >
            FRAGILE
          </div>
        ) : null}
      </div>
    </div>
  );
}

export async function renderLabelPngBuffer(box: LabelBox): Promise<Buffer> {
  const qrDataUrl = await generateQrPngDataUrl(
    buildScanUrl(box.shortCode, box.moveId),
    QR_SIZE,
    { margin: 0 },
  );
  const response = new ImageResponse(renderLabelJsx(box, qrDataUrl), {
    width: LABEL_WIDTH,
    height: LABEL_HEIGHT,
  });
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

export function labelFilename(shortCode: string): string {
  const safe = shortCode.replace(/[^A-Za-z0-9_-]/g, "_");
  return `pakt-${safe}.png`;
}
