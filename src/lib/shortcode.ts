import { customAlphabet } from "nanoid";

const SAFE_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

const boxShortCodeBody = customAlphabet(SAFE_ALPHABET, 4);

export function generateBoxShortCode(): string {
  return `B-${boxShortCodeBody()}`;
}

const idBody = customAlphabet(
  "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ",
  10,
);

export function generateId(
  prefix: "mov" | "rm" | "itm" | "ph" | "box" | "bi" | "chk",
): string {
  return `${prefix}_${idBody()}`;
}
