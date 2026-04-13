import { FileDown } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ExportPdfButton({ moveId }: { moveId: string }) {
  return (
    <a
      href={`/api/inventory/pdf?m=${encodeURIComponent(moveId)}`}
      className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
      download
    >
      <FileDown className="mr-2 size-4" />
      Export PDF
    </a>
  );
}
