/** 32-byte AES-GCM key, base64. Ciphertext is `iv.tag.data`, matching the Node server's layout. */

function decodeB64(value: string): Uint8Array {
  const bin = atob(value);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function encodeB64(bytes: Uint8Array): string {
  let bin = "";
  for (const byte of bytes) bin += String.fromCharCode(byte);
  return btoa(bin);
}

async function importKey(keyB64: string): Promise<CryptoKey> {
  const raw = decodeB64(keyB64);
  if (raw.byteLength !== 32) throw new Error("ENCRYPTION_KEY must be 32 bytes, base64");
  return crypto.subtle.importKey("raw", raw, "AES-GCM", false, ["encrypt", "decrypt"]);
}

export async function encrypt(plain: string, keyB64: string): Promise<string> {
  const key = await importKey(keyB64);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const packed = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(plain)));
  const tag = packed.slice(packed.byteLength - 16);
  const data = packed.slice(0, packed.byteLength - 16);
  return [encodeB64(iv), encodeB64(tag), encodeB64(data)].join(".");
}

export async function decrypt(blob: string, keyB64: string): Promise<string> {
  const [ivB64, tagB64, dataB64] = blob.split(".");
  if (!ivB64 || !tagB64 || !dataB64) throw new Error("refresh token blob is malformed");
  const key = await importKey(keyB64);
  const iv = decodeB64(ivB64);
  const tag = decodeB64(tagB64);
  const data = decodeB64(dataB64);
  const packed = new Uint8Array(data.byteLength + tag.byteLength);
  packed.set(data, 0);
  packed.set(tag, data.byteLength);
  const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, packed);
  return new TextDecoder().decode(plain);
}

export function timingSafeEqual(a: string, b: string): boolean {
  const left = new TextEncoder().encode(a);
  const right = new TextEncoder().encode(b);
  const length = Math.max(left.length, right.length);
  let diff = left.length === right.length ? 0 : 1;
  for (let i = 0; i < length; i++) diff |= (left[i] ?? 0) ^ (right[i] ?? 0);
  return diff === 0;
}
