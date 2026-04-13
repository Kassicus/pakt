import { ImageResponse } from "next/og";
import { buildScanUrl, generateQrPngDataUrl } from "@/lib/qr";

export const LABEL_WIDTH = 472;
export const LABEL_HEIGHT = 354;
const QR_SIZE = 240;
const PAD = 14;
const GAP = 12;
const FRAGILE_BAR_HEIGHT = 30;

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
  const rightColX = PAD + QR_SIZE + GAP;
  const bottomReserve = box.fragile ? FRAGILE_BAR_HEIGHT : 0;
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        position: "relative",
        background: "#ffffff",
        color: "#000000",
      }}
    >
      {/* QR, vertically centered in the non-fragile area */}
      <div
        style={{
          position: "absolute",
          left: PAD,
          top: PAD,
          width: QR_SIZE,
          height: QR_SIZE,
          display: "flex",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={qrDataUrl} alt="" width={QR_SIZE} height={QR_SIZE} />
      </div>

      {/* Right-column text, absolute so it escapes the flex row */}
      <div
        style={{
          position: "absolute",
          left: rightColX,
          top: PAD,
          right: PAD,
          bottom: PAD + bottomReserve,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 46,
            fontWeight: 900,
            lineHeight: 1,
            letterSpacing: "0.04em",
            whiteSpace: "nowrap",
          }}
        >
          {box.shortCode}
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 6,
            fontSize: 13,
            color: "#555",
            letterSpacing: "0.14em",
            textTransform: "uppercase",
          }}
        >
          {SIZE_LABEL[box.size] ?? box.size}
        </div>
        {box.destinationRoomLabel ? (
          <div
            style={{
              display: "flex",
              marginTop: 16,
              fontSize: 26,
              fontWeight: 700,
              lineHeight: 1.1,
            }}
          >
            → {box.destinationRoomLabel}
          </div>
        ) : null}
        {box.sourceRoomLabel ? (
          <div
            style={{
              display: "flex",
              marginTop: 8,
              fontSize: 18,
              color: "#333",
              fontWeight: 500,
            }}
          >
            from {box.sourceRoomLabel}
          </div>
        ) : null}
      </div>

      {box.fragile ? (
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#000",
            color: "#fff",
            fontSize: 18,
            fontWeight: 900,
            letterSpacing: "0.35em",
            height: FRAGILE_BAR_HEIGHT,
          }}
        >
          FRAGILE
        </div>
      ) : null}
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
