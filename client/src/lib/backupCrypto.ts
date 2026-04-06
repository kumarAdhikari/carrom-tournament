// =============================================================================
// Password-protected tournament backups (Web Crypto: PBKDF2 + AES-GCM)
// =============================================================================

const FORMAT = "carrom-backup-encrypted-v1";
const PBKDF2_ITERATIONS = 250_000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function isEncryptedBackupFile(parsed: unknown): boolean {
  if (!isRecord(parsed)) return false;
  return (
    parsed.format === FORMAT &&
    typeof parsed.salt === "string" &&
    typeof parsed.iv === "string" &&
    typeof parsed.ciphertext === "string" &&
    (parsed.iterations === undefined || typeof parsed.iterations === "number")
  );
}

function bytesToB64(u8: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < u8.length; i++) bin += String.fromCharCode(u8[i]!);
  return btoa(bin);
}

function b64ToBytes(b64: string): Uint8Array | null {
  try {
    const bin = atob(b64);
    const u8 = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
    return u8;
  } catch {
    return null;
  }
}

async function deriveAesKey(password: string, salt: Uint8Array, iterations: number): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations, hash: "SHA-256" },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

/** Wraps the same string as a plain backup file (`{ version, state }` JSON). */
export async function encryptBackupPlaintext(plaintext: string, password: string): Promise<string> {
  const enc = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const iterations = PBKDF2_ITERATIONS;
  const key = await deriveAesKey(password, salt, iterations);
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, enc.encode(plaintext));
  const envelope = {
    format: FORMAT,
    version: 1,
    kdf: "PBKDF2-SHA256",
    iterations,
    salt: bytesToB64(salt),
    iv: bytesToB64(iv),
    ciphertext: bytesToB64(new Uint8Array(ciphertext)),
  };
  return JSON.stringify(envelope, null, 2);
}

/** Returns decrypted UTF-8 plaintext or null if password wrong / corrupt. */
export async function decryptBackupToPlaintext(envelope: Record<string, unknown>, password: string): Promise<string | null> {
  const salt = b64ToBytes(envelope.salt as string);
  const iv = b64ToBytes(envelope.iv as string);
  const ct = b64ToBytes(envelope.ciphertext as string);
  if (!salt || !iv || !ct) return null;
  const iterations =
    typeof envelope.iterations === "number" && envelope.iterations >= 100_000 ? envelope.iterations : PBKDF2_ITERATIONS;
  try {
    const key = await deriveAesKey(password, salt, iterations);
    const plainBuf = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ct);
    return new TextDecoder().decode(plainBuf);
  } catch {
    return null;
  }
}
