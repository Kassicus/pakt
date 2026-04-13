import {
  Book,
  Boxes,
  FileText,
  Hammer,
  Utensils,
  Sparkles,
  Monitor,
  Shirt,
  BedDouble,
  Armchair,
  Lightbulb,
  Palette,
  Gamepad2,
  Package,
} from "lucide-react";
import { cn } from "@/lib/utils";

const PAIRS: Record<string, { icon: React.ComponentType<{ className?: string }>; color: string }> = {
  cat_books: { icon: Book, color: "from-amber-500/30 to-amber-600/20" },
  cat_documents_files: { icon: FileText, color: "from-slate-500/30 to-slate-600/20" },
  cat_tools: { icon: Hammer, color: "from-stone-500/30 to-stone-600/20" },
  cat_kitchen_dishes: { icon: Utensils, color: "from-rose-500/30 to-rose-600/20" },
  cat_kitchen_cookware: { icon: Utensils, color: "from-rose-500/30 to-orange-500/20" },
  cat_kitchen_small_appliance: { icon: Sparkles, color: "from-orange-500/30 to-orange-600/20" },
  cat_kitchen_pantry: { icon: Utensils, color: "from-lime-500/30 to-lime-600/20" },
  cat_clothes_hanging: { icon: Shirt, color: "from-sky-500/30 to-sky-600/20" },
  cat_clothes_folded: { icon: Shirt, color: "from-blue-500/30 to-blue-600/20" },
  cat_shoes: { icon: Shirt, color: "from-indigo-500/30 to-indigo-600/20" },
  cat_linens_bedding: { icon: BedDouble, color: "from-violet-500/30 to-violet-600/20" },
  cat_towels: { icon: BedDouble, color: "from-fuchsia-500/30 to-fuchsia-600/20" },
  cat_electronics_small: { icon: Monitor, color: "from-cyan-500/30 to-cyan-600/20" },
  cat_electronics_monitor: { icon: Monitor, color: "from-teal-500/30 to-teal-600/20" },
  cat_decor_small: { icon: Lightbulb, color: "from-yellow-500/30 to-yellow-600/20" },
  cat_decor_art_framed: { icon: Palette, color: "from-pink-500/30 to-pink-600/20" },
  cat_toys: { icon: Gamepad2, color: "from-emerald-500/30 to-emerald-600/20" },
  cat_furniture_small: { icon: Armchair, color: "from-amber-700/30 to-amber-800/20" },
  cat_furniture_medium: { icon: Armchair, color: "from-stone-700/30 to-stone-800/20" },
  cat_furniture_large: { icon: Armchair, color: "from-zinc-700/30 to-zinc-800/20" },
  cat_mattress_queen: { icon: BedDouble, color: "from-purple-500/30 to-purple-600/20" },
  cat_mattress_king: { icon: BedDouble, color: "from-purple-600/30 to-purple-700/20" },
  cat_other: { icon: Boxes, color: "from-gray-500/30 to-gray-600/20" },
};

export function CategoryPlaceholder({
  categoryId,
  className,
}: {
  categoryId: string | null;
  className?: string;
}) {
  const pair = (categoryId && PAIRS[categoryId]) || { icon: Package, color: "from-muted to-muted" };
  const Icon = pair.icon;
  return (
    <div
      className={cn(
        "relative flex items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br",
        pair.color,
        className,
      )}
    >
      <Icon className="size-16 text-foreground/40" />
    </div>
  );
}
