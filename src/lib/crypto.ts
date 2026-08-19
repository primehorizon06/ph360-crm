import crypto from "crypto";
import { env } from "@/env";

// encryptDeterministic usa un IV derivado del texto plano (mismo valor ->
// mismo cifrado) para preservar búsquedas por igualdad, como el índice único
// de SSN; encryptRandom es para campos que nunca se buscan por valor.
// decrypt() devuelve el valor sin cambios si no tiene el prefijo ENC_PREFIX,
// para no romper filas legadas aún no migradas.

const ALGO = "aes-256-gcm";
const IV_LENGTH = 12;
const TAG_LENGTH = 16;
const ENC_PREFIX = "enc:v1:";

const KEY = Buffer.from(env.ENCRYPTION_KEY, "base64");

function seal(plaintext: string, iv: Buffer): string {
  const cipher = crypto.createCipheriv(ALGO, KEY, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return ENC_PREFIX + Buffer.concat([iv, tag, ciphertext]).toString("base64");
}

export function encryptRandom(plaintext: string): string;
export function encryptRandom(plaintext: string | null | undefined): string | null;
export function encryptRandom(plaintext: string | null | undefined): string | null {
  if (!plaintext) return plaintext ?? null;
  return seal(plaintext, crypto.randomBytes(IV_LENGTH));
}

export function encryptDeterministic(plaintext: string): string;
export function encryptDeterministic(plaintext: string | null | undefined): string | null;
export function encryptDeterministic(plaintext: string | null | undefined): string | null {
  if (!plaintext) return plaintext ?? null;
  const iv = crypto.createHmac("sha256", KEY).update(plaintext).digest().subarray(0, IV_LENGTH);
  return seal(plaintext, iv);
}

export function decrypt(value: string | null | undefined): string | null {
  if (!value) return value ?? null;
  if (!value.startsWith(ENC_PREFIX)) return value;

  const raw = Buffer.from(value.slice(ENC_PREFIX.length), "base64");
  const iv = raw.subarray(0, IV_LENGTH);
  const tag = raw.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
  const ciphertext = raw.subarray(IV_LENGTH + TAG_LENGTH);

  const decipher = crypto.createDecipheriv(ALGO, KEY, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
}
