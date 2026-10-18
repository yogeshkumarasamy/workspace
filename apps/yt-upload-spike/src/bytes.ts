/** Deterministic bytes so tests can rebuild a range without storing a fixture file. */
export function fillRange(seed: number, offset: number, length: number): Uint8Array {
  const out = new Uint8Array(length);
  for (let i = 0; i < length; i += 1) {
    out[i] = byteAt(seed, offset + i);
  }
  return out;
}

export function byteAt(seed: number, index: number): number {
  let x = (Math.imul(seed >>> 0, 0x9e3779b1) + (index >>> 0)) >>> 0;
  x ^= x << 13;
  x >>>= 0;
  x ^= x >>> 17;
  x ^= x << 5;
  return x & 0xff;
}

export function generatedStream(seed: number, offset: number, length: number): ReadableStream<Uint8Array> {
  const stride = 16 * 1024;
  let sent = 0;
  return new ReadableStream<Uint8Array>({
    pull(controller) {
      if (sent >= length) {
        controller.close();
        return;
      }
      const n = Math.min(stride, length - sent);
      controller.enqueue(fillRange(seed, offset + sent, n));
      sent += n;
    },
  });
}

export async function sha256Hex(data: Uint8Array): Promise<string> {
  const copy = new Uint8Array(data.byteLength);
  copy.set(data);
  const digest = await crypto.subtle.digest("SHA-256", copy.buffer);
  return hex(new Uint8Array(digest));
}

export function hex(bytes: Uint8Array): string {
  let out = "";
  for (const byte of bytes) out += byte.toString(16).padStart(2, "0");
  return out;
}

export function bytesToBase64(bytes: Uint8Array): string {
  const parts: string[] = [];
  const stride = 0x1000;
  for (let i = 0; i < bytes.length; i += stride) {
    parts.push(String.fromCharCode(...bytes.subarray(i, Math.min(i + stride, bytes.length))));
  }
  return btoa(parts.join(""));
}

export function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) out[i] = binary.charCodeAt(i);
  return out;
}
