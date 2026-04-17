import { ImageResponse } from "next/og";
import { buildScanUrl, generateQrPngDataUrl } from "@/lib/qr";

export const LABEL_WIDTH = 472;
export const LABEL_HEIGHT = 354;
const QR_SIZE = 290;
const PAD = 12;
const TAG_BAR_HEIGHT = 48;

const TAG_LABELS: Record<string, string> = {
  fragile: "FRAGILE",
  perishable: "PERISHABLE",
  live_animal: "LIVE ANIMAL",
};

export type LabelBox = {
  shortCode: string;
  moveId: string;
  tags: string[];
  destinationRoomLabel: string | null;
  sourceRoomLabel: string | null;
};

function tagFontSize(text: string): number {
  if (text.length <= 14) return 32;
  if (text.length <= 22) return 26;
  return 22;
}

function routeLine(src: string | null, dest: string | null): string | null {
  if (src && dest) return `${src} → ${dest}`;
  if (dest) return `→ ${dest}`;
  if (src) return `${src} →`;
  return null;
}

function renderLabelJsx(box: LabelBox, qrDataUrl: string) {
  const hasTags = box.tags.length > 0;
  const contentHeight = LABEL_HEIGHT - (hasTags ? TAG_BAR_HEIGHT : 0);
  const contentCenterY = contentHeight / 2;
  const qrTop = Math.max(PAD, (contentHeight - QR_SIZE) / 2);
  const tagText = box.tags
    .map((t) => TAG_LABELS[t] ?? t.toUpperCase())
    .join(" · ");

  // Right strip: after QR, to right edge
  const stripLeft = PAD + QR_SIZE + 8; // 310
  const stripRight = LABEL_WIDTH - PAD; // 460
  const stripWidth = stripRight - stripLeft; // 150
  const col1CenterX = stripLeft + stripWidth * 0.35; // ~363 — big short code closer to QR
  const col2CenterX = stripLeft + stripWidth * 0.78; // ~427 — smaller route on far right

  // Pre-rotation text boxes — wide enough to fit the text, rotated around their center
  const codeBoxW = 320;
  const codeBoxH = 60;
  const routeBoxW = 320;
  const routeBoxH = 28;

  const route = routeLine(box.sourceRoomLabel, box.destinationRoomLabel);

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
      {/* QR */}
      <div
        style={{
          position: "absolute",
          left: PAD,
          top: qrTop,
          width: QR_SIZE,
          height: QR_SIZE,
          display: "flex",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={qrDataUrl} alt="" width={QR_SIZE} height={QR_SIZE} />
      </div>

      {/* Short code — rotated -90°, big and bold, closer to QR */}
      <div
        style={{
          position: "absolute",
          left: col1CenterX - codeBoxW / 2,
          top: contentCenterY - codeBoxH / 2,
          width: codeBoxW,
          height: codeBoxH,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transform: "rotate(-90deg)",
          transformOrigin: "center center",
          fontSize: 56,
          fontWeight: 900,
          letterSpacing: "0.04em",
          whiteSpace: "nowrap",
        }}
      >
        {box.shortCode}
      </div>

      {/* source → destination — rotated -90°, medium, far right */}
      {route ? (
        <div
          style={{
            position: "absolute",
            left: col2CenterX - routeBoxW / 2,
            top: contentCenterY - routeBoxH / 2,
            width: routeBoxW,
            height: routeBoxH,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transform: "rotate(-90deg)",
            transformOrigin: "center center",
            fontSize: 24,
            fontWeight: 700,
            letterSpacing: "0.01em",
            whiteSpace: "nowrap",
          }}
        >
          {route}
        </div>
      ) : null}

      {/* Tag stripe — textShadow stroke fattens the glyphs so thermal
          printers don't print splotchy thin strokes. */}
      {hasTags ? (
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
            fontSize: tagFontSize(tagText),
            fontWeight: 900,
            letterSpacing: "0.18em",
            height: TAG_BAR_HEIGHT,
            textShadow:
              "-1px 0 0 #fff, 1px 0 0 #fff, 0 -1px 0 #fff, 0 1px 0 #fff, -1px -1px 0 #fff, 1px -1px 0 #fff, -1px 1px 0 #fff, 1px 1px 0 #fff",
          }}
        >
          {tagText}
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
