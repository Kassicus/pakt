import { customAlphabet } from "nanoid";

const SAFE_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

const boxShortCodeBody = customAlphabet(SAFE_ALPHABET, 4);

export function generateBoxShortCode(): string {
  return `B-${boxShortCodeBody()}`;
}

const STANDARD_ALPHABET =
  "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";

const idBody = customAlphabet(STANDARD_ALPHABET, 10);

export function generateId(
  prefix: "mov" | "rm" | "itm" | "ph" | "box" | "bi" | "chk" | "mmb" | "inv",
): string {
  return `${prefix}_${idBody()}`;
}

const inviteTokenBody = customAlphabet(STANDARD_ALPHABET, 32);

export function generateInviteToken(): string {
  return inviteTokenBody();
}
