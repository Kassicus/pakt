import QRCode from "qrcode";

export function getAppUrl(): string {
  const raw = process.env.NEXT_PUBLIC_APP_URL;
  if (!raw) return "http://localhost:3000";
  return raw.replace(/\/$/, "");
}

export function buildScanUrl(shortCode: string, moveId: string): string {
  const base = getAppUrl();
  const code = encodeURIComponent(shortCode);
  const m = encodeURIComponent(moveId);
  return `${base}/s/${code}?m=${m}`;
}

export async function generateQrSvg(
  url: string,
  options: { margin?: number } = {},
): Promise<string> {
  return QRCode.toString(url, {
    type: "svg",
    errorCorrectionLevel: "M",
    margin: options.margin ?? 1,
  });
}

export async function generateQrPngDataUrl(
  url: string,
  sizePx: number,
  options: { margin?: number } = {},
): Promise<string> {
  return QRCode.toDataURL(url, {
    errorCorrectionLevel: "M",
    margin: options.margin ?? 0,
    width: sizePx,
    color: { dark: "#000000", light: "#ffffff" },
  });
}
