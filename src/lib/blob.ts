import { customAlphabet } from "nanoid";
import { upload } from "@vercel/blob/client";

const pathNanoid = customAlphabet(
  "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ",
  21,
);

export function buildPhotoPathname(moveId: string, ext = "jpg"): string {
  return `p/${moveId}/${pathNanoid()}.${ext}`;
}

export type CompressedImage = {
  blob: Blob;
  width: number;
  height: number;
  contentType: string;
  originalSize: number;
};

const MAX_LONG_EDGE = 1600;
const JPEG_QUALITY = 0.82;
const SKIP_COMPRESS_SIZE = 20 * 1024 * 1024;

export async function compressImage(file: File): Promise<CompressedImage> {
  if (file.size > SKIP_COMPRESS_SIZE) {
    return {
      blob: file,
      width: 0,
      height: 0,
      contentType: file.type || "image/jpeg",
      originalSize: file.size,
    };
  }

  let bitmap: ImageBitmap | null = null;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    return {
      blob: file,
      width: 0,
      height: 0,
      contentType: file.type || "image/jpeg",
      originalSize: file.size,
    };
  }

  const { width: w0, height: h0 } = bitmap;
  const scale = Math.min(1, MAX_LONG_EDGE / Math.max(w0, h0));
  const width = Math.round(w0 * scale);
  const height = Math.round(h0 * scale);

  const canvas: HTMLCanvasElement | OffscreenCanvas =
    typeof OffscreenCanvas !== "undefined"
      ? new OffscreenCanvas(width, height)
      : (() => {
          const c = document.createElement("canvas");
          c.width = width;
          c.height = height;
          return c;
        })();

  const ctx = canvas.getContext("2d") as
    | CanvasRenderingContext2D
    | OffscreenCanvasRenderingContext2D
    | null;
  if (!ctx) {
    bitmap.close();
    return {
      blob: file,
      width: w0,
      height: h0,
      contentType: file.type || "image/jpeg",
      originalSize: file.size,
    };
  }

  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  let out: Blob;
  if (canvas instanceof OffscreenCanvas) {
    out = await canvas.convertToBlob({ type: "image/jpeg", quality: JPEG_QUALITY });
  } else {
    out = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error("canvas.toBlob failed"))),
        "image/jpeg",
        JPEG_QUALITY,
      );
    });
  }

  return {
    blob: out,
    width,
    height,
    contentType: "image/jpeg",
    originalSize: file.size,
  };
}

export type UploadedPhoto = {
  url: string;
  pathname: string;
  width: number;
  height: number;
  byteSize: number;
  contentType: string;
};

export async function uploadPhotoFromFile(
  file: File,
  moveId: string,
): Promise<UploadedPhoto> {
  const compressed = await compressImage(file);
  const pathname = buildPhotoPathname(moveId, compressed.contentType === "image/png" ? "png" : "jpg");
  const result = await upload(pathname, compressed.blob, {
    access: "public",
    handleUploadUrl: "/api/blob/upload",
    clientPayload: JSON.stringify({ moveId }),
    contentType: compressed.contentType,
  });
  return {
    url: result.url,
    pathname: result.pathname,
    width: compressed.width,
    height: compressed.height,
    byteSize: compressed.blob.size,
    contentType: compressed.contentType,
  };
}
