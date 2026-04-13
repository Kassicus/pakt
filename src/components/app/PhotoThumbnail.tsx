import Image from "next/image";
import { cn } from "@/lib/utils";

export function PhotoThumbnail({
  src,
  alt,
  size = 48,
  className,
}: {
  src: string;
  alt: string;
  size?: number;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative shrink-0 overflow-hidden rounded-md border bg-muted",
        className,
      )}
      style={{ width: size, height: size }}
    >
      <Image
        src={src}
        alt={alt}
        width={size}
        height={size}
        className="h-full w-full object-cover"
        sizes={`${size}px`}
        unoptimized
      />
    </div>
  );
}
