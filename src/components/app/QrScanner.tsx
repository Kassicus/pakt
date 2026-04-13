"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { Camera, CameraOff, Loader2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Mode = "idle" | "starting" | "scanning" | "error";

export function QrScanner({ moveId }: { moveId: string }) {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const controlsRef = useRef<{ stop: () => void } | null>(null);
  const handledRef = useRef(false);
  const [mode, setMode] = useState<Mode>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [manual, setManual] = useState("");

  useEffect(() => {
    return () => {
      controlsRef.current?.stop();
    };
  }, []);

  async function start() {
    if (mode === "scanning" || mode === "starting") return;
    handledRef.current = false;
    setMode("starting");
    setErrorMsg(null);
    try {
      const reader = new BrowserMultiFormatReader();
      const controls = await reader.decodeFromVideoDevice(
        undefined,
        videoRef.current!,
        (result) => {
          if (handledRef.current) return;
          if (!result) return;
          handledRef.current = true;
          const text = result.getText();
          const code = extractShortCode(text);
          controlsRef.current?.stop();
          if (navigator.vibrate) navigator.vibrate(30);
          if (code) {
            router.push(`/s/${encodeURIComponent(code)}?m=${encodeURIComponent(moveId)}`);
          } else {
            router.push(text);
          }
        },
      );
      controlsRef.current = controls;
      setMode("scanning");
    } catch (e) {
      setMode("error");
      setErrorMsg(
        e instanceof Error
          ? e.message
          : "Couldn't start the camera. Check permissions, or enter the code manually.",
      );
    }
  }

  function stop() {
    controlsRef.current?.stop();
    controlsRef.current = null;
    setMode("idle");
  }

  function submitManual(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmed = manual.trim().toUpperCase().replace(/^B\s*-?\s*/, "B-");
    if (!trimmed) return;
    const code = trimmed.startsWith("B-") ? trimmed : `B-${trimmed}`;
    router.push(`/s/${encodeURIComponent(code)}?m=${encodeURIComponent(moveId)}`);
  }

  return (
    <div className="space-y-4">
      <div className="relative overflow-hidden rounded-lg border bg-black">
        <video
          ref={videoRef}
          playsInline
          muted
          className="aspect-square w-full object-cover"
          style={{ background: "#000" }}
        />
        {mode !== "scanning" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-sm text-white/80">
            {mode === "starting" ? (
              <>
                <Loader2 className="size-5 animate-spin" />
                <span>Starting camera…</span>
              </>
            ) : mode === "error" ? (
              <>
                <CameraOff className="size-6" />
                <span className="max-w-xs text-center">{errorMsg}</span>
              </>
            ) : (
              <>
                <Camera className="size-6" />
                <span>Tap to scan a box label</span>
              </>
            )}
          </div>
        )}
        {mode === "scanning" && (
          <div className="pointer-events-none absolute inset-0 border-4 border-white/40" />
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {mode === "scanning" ? (
          <Button onClick={stop} variant="secondary">
            <CameraOff className="mr-2 size-4" /> Stop scanning
          </Button>
        ) : (
          <Button onClick={start} disabled={mode === "starting"}>
            <Camera className="mr-2 size-4" />
            {mode === "starting" ? "Starting…" : "Start camera"}
          </Button>
        )}
      </div>

      <form onSubmit={submitManual} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={manual}
            onChange={(e) => setManual(e.target.value)}
            placeholder="Or enter code (e.g. A7K2)"
            className="pl-9 uppercase"
            autoCapitalize="characters"
            autoCorrect="off"
            spellCheck={false}
            maxLength={8}
          />
        </div>
        <Button type="submit" variant="secondary" disabled={!manual.trim()}>
          Go
        </Button>
      </form>
    </div>
  );
}

function extractShortCode(text: string): string | null {
  const match = text.match(/\/s\/([^/?#]+)/);
  if (match) return decodeURIComponent(match[1]);
  const bareMatch = text.match(/^B-[0-9A-Z]{2,6}$/i);
  if (bareMatch) return bareMatch[0].toUpperCase();
  return null;
}
