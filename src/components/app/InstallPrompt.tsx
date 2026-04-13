"use client";

import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISSED_KEY = "pakt_install_dismissed_at";
const DISMISS_TTL_MS = 1000 * 60 * 60 * 24 * 30;

export function InstallPrompt() {
  const [evt, setEvt] = useState<BeforeInstallPromptEvent | null>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    function onBeforeInstall(e: Event) {
      e.preventDefault();
      const dismissedAt = Number(localStorage.getItem(DISMISSED_KEY) ?? 0);
      if (Date.now() - dismissedAt < DISMISS_TTL_MS) return;
      setEvt(e as BeforeInstallPromptEvent);
      setShow(true);
    }
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstall);
  }, []);

  async function install() {
    if (!evt) return;
    await evt.prompt();
    await evt.userChoice.catch(() => null);
    setShow(false);
    setEvt(null);
  }

  function dismiss() {
    localStorage.setItem(DISMISSED_KEY, String(Date.now()));
    setShow(false);
  }

  if (!show) return null;

  return (
    <div className="fixed inset-x-3 bottom-20 z-40 mx-auto max-w-md rounded-xl border bg-card/95 p-3 shadow-lg backdrop-blur md:bottom-4">
      <div className="flex items-start gap-3">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
          <Download className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium">Install pakt</div>
          <div className="text-xs text-muted-foreground">
            Add to your home screen for camera + scanner that feels native.
          </div>
        </div>
        <Button size="sm" onClick={install}>
          Install
        </Button>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss"
          className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}
