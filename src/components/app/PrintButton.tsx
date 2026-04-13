"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PrintButton({ label = "Print labels" }: { label?: string }) {
  return (
    <Button onClick={() => window.print()} variant="secondary">
      <Printer className="mr-2 size-4" /> {label}
    </Button>
  );
}
