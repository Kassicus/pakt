"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Search, X, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";

export function SearchForm({
  moveId,
  initialQuery,
}: {
  moveId: string;
  initialQuery: string;
}) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement | null>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const q = query.trim();
    const target = q
      ? `/${moveId}/search?q=${encodeURIComponent(q)}`
      : `/${moveId}/search`;
    startTransition(() => router.push(target));
  }

  function clear() {
    setQuery("");
    startTransition(() => router.push(`/${moveId}/search`));
    inputRef.current?.focus();
  }

  return (
    <form onSubmit={onSubmit} className="relative">
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        ref={inputRef}
        type="search"
        name="q"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search items, categories, notes…"
        className="h-11 pl-9 pr-10 text-base"
        autoFocus
        autoComplete="off"
        enterKeyHint="search"
      />
      {query && (
        <button
          type="button"
          onClick={clear}
          aria-label="Clear search"
          className="absolute right-2 top-1/2 inline-flex size-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          {isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <X className="size-4" />
          )}
        </button>
      )}
    </form>
  );
}
