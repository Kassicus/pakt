"use client";

import { openDB, type IDBPDatabase } from "idb";
import { nanoid } from "nanoid";
import {
  addItem,
  deleteItem,
  updateDisposition,
  updateItem,
} from "@/actions/items";
import type { Disposition } from "@/lib/validators";

const DB_NAME = "pakt-outbox";
const DB_VERSION = 1;
const STORE = "ops";

type OpBase = {
  clientId: string;
  createdAt: number;
  attempts: number;
  lastError?: string;
};

export type AddItemPayload = {
  moveId: string;
  sourceRoomId: string;
  name: string;
  categoryId: string;
  quantity: number;
  disposition: Disposition;
  fragility: "normal" | "fragile" | "very_fragile";
  notes: string;
  clientItemId: string;
};

export type UpdateItemPayload = {
  itemId: string;
  name: string;
  categoryId: string;
  quantity: number;
  fragility: "normal" | "fragile" | "very_fragile";
  sourceRoomId: string;
  destinationRoomId: string;
  notes: string;
  volumeCuFtOverride: string;
  weightLbsOverride: string;
};

export type QueuedOp = OpBase &
  (
    | { kind: "updateDisposition"; payload: { itemId: string; disposition: Disposition } }
    | { kind: "addItem"; payload: AddItemPayload }
    | { kind: "updateItem"; payload: UpdateItemPayload }
    | { kind: "deleteItem"; payload: { itemId: string } }
  );

type EnqueueInput = QueuedOp extends infer T
  ? T extends { kind: infer K; payload: infer P }
    ? { kind: K; payload: P }
    : never
  : never;

let dbPromise: Promise<IDBPDatabase> | null = null;

function getOutbox(): Promise<IDBPDatabase> {
  if (typeof window === "undefined") {
    throw new Error("Outbox is browser-only");
  }
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE)) {
          const store = db.createObjectStore(STORE, { keyPath: "clientId" });
          store.createIndex("createdAt", "createdAt");
        }
      },
    });
  }
  return dbPromise;
}

class OutboxEventBus extends EventTarget {}
export const outboxEvents = new OutboxEventBus();

function notifyChange() {
  outboxEvents.dispatchEvent(new Event("change"));
}

export async function enqueue(input: EnqueueInput): Promise<string> {
  const db = await getOutbox();
  const op: QueuedOp = {
    ...input,
    clientId: nanoid(12),
    createdAt: Date.now(),
    attempts: 0,
  };
  await db.put(STORE, op);
  notifyChange();
  return op.clientId;
}

export async function outboxSize(): Promise<number> {
  if (typeof window === "undefined") return 0;
  const db = await getOutbox();
  return db.count(STORE);
}

export async function listOps(): Promise<QueuedOp[]> {
  const db = await getOutbox();
  return db.getAllFromIndex(STORE, "createdAt") as Promise<QueuedOp[]>;
}

async function dispatchOp(op: QueuedOp): Promise<void> {
  switch (op.kind) {
    case "updateDisposition": {
      const fd = new FormData();
      fd.set("itemId", op.payload.itemId);
      fd.set("disposition", op.payload.disposition);
      await updateDisposition(fd);
      return;
    }
    case "addItem": {
      const p = op.payload;
      const fd = new FormData();
      fd.set("moveId", p.moveId);
      fd.set("sourceRoomId", p.sourceRoomId);
      fd.set("name", p.name);
      fd.set("categoryId", p.categoryId);
      fd.set("quantity", String(p.quantity));
      fd.set("disposition", p.disposition);
      fd.set("fragility", p.fragility);
      fd.set("notes", p.notes);
      fd.set("clientItemId", p.clientItemId);
      await addItem(fd);
      return;
    }
    case "updateItem": {
      const p = op.payload;
      const fd = new FormData();
      fd.set("itemId", p.itemId);
      fd.set("name", p.name);
      fd.set("categoryId", p.categoryId);
      fd.set("quantity", String(p.quantity));
      fd.set("fragility", p.fragility);
      fd.set("sourceRoomId", p.sourceRoomId);
      fd.set("destinationRoomId", p.destinationRoomId);
      fd.set("notes", p.notes);
      fd.set("volumeCuFtOverride", p.volumeCuFtOverride);
      fd.set("weightLbsOverride", p.weightLbsOverride);
      await updateItem(fd);
      return;
    }
    case "deleteItem": {
      const fd = new FormData();
      fd.set("itemId", op.payload.itemId);
      await deleteItem(fd);
      return;
    }
  }
}

export function isNetworkError(err: unknown): boolean {
  if (typeof navigator !== "undefined" && !navigator.onLine) return true;
  if (err instanceof TypeError) return true;
  const msg = err instanceof Error ? err.message.toLowerCase() : "";
  return (
    msg.includes("network") ||
    msg.includes("failed to fetch") ||
    msg.includes("load failed")
  );
}

const MAX_ATTEMPTS = 5;
let flushing = false;

export async function flushOutbox(): Promise<{ flushed: number; failed: number; remaining: number }> {
  if (typeof window === "undefined") return { flushed: 0, failed: 0, remaining: 0 };
  if (flushing) return { flushed: 0, failed: 0, remaining: await outboxSize() };
  if (!navigator.onLine) return { flushed: 0, failed: 0, remaining: await outboxSize() };

  flushing = true;
  let flushed = 0;
  let failed = 0;
  try {
    const db = await getOutbox();
    const ops = (await db.getAllFromIndex(STORE, "createdAt")) as QueuedOp[];
    for (const op of ops) {
      try {
        await dispatchOp(op);
        await db.delete(STORE, op.clientId);
        flushed += 1;
      } catch (err) {
        if (isNetworkError(err)) {
          // Stop — we're offline again. Leave remaining ops for next flush.
          break;
        }
        const next: QueuedOp = {
          ...op,
          attempts: op.attempts + 1,
          lastError: err instanceof Error ? err.message : String(err),
        };
        if (next.attempts >= MAX_ATTEMPTS) {
          await db.delete(STORE, op.clientId);
          failed += 1;
        } else {
          await db.put(STORE, next);
        }
      }
    }
    const remaining = await db.count(STORE);
    return { flushed, failed, remaining };
  } finally {
    flushing = false;
    notifyChange();
  }
}
