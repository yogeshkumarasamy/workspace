import { Readable } from "node:stream";
import { vi } from "vitest";
import { MemoryStore } from "../src/store.js";
import { DEFAULT_RULES } from "../src/slots.js";
import type { YouTubeApi } from "../src/youtube.js";

export async function seeded() {
  const store = new MemoryStore();
  const ch = await store.upsertChannel({
    youtubeChannelId: "UCmeeyazh0000000000000", handle: "@meeyazhpirai", title: "Meeyazh & Pirai", refreshTokenEnc: "x", googleEmail: null,
    driveRefreshTokenEnc: null, defaults: { categoryId: "1", defaultLanguage: "ta", madeForKids: true, shortsPlaylist: "Meeyazh & Pirai Shorts" }, slots: DEFAULT_RULES,
  });
  return { store, ch };
}

export function mockApi(over: Partial<YouTubeApi> = {}): YouTubeApi {
  return {
    open: vi.fn(async () => ({ stream: Readable.from(["bytes"]), mimeType: "video/mp4" })),
    insertVideo: vi.fn(async () => "vid123"),
    setThumbnail: vi.fn(async () => {}),
    resolvePlaylist: vi.fn(async () => "PLabcdefghijkl"),
    addToPlaylist: vi.fn(async () => {}),
    ...over,
  };
}
