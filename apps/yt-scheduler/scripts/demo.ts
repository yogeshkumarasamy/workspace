/**
 * Offline demo: in-memory store + mocked YouTube/Drive so the UI can be explored without Google creds.
 *   pnpm --filter @apps/yt-scheduler build && pnpm --filter @apps/yt-scheduler demo   → http://localhost:8788 (key: demo)
 */
import { Readable } from "node:stream";
import { fileURLToPath } from "node:url";
import { serve } from "@hono/node-server";
import { createApp } from "../src/app.js";
import { createJob } from "../src/jobs.js";
import { DEFAULT_RULES } from "../src/slots.js";
import { MemoryStore } from "../src/store.js";
import type { YouTubeApi } from "../src/youtube.js";

const store = new MemoryStore();
const ch = await store.upsertChannel({ youtubeChannelId: "UCmeeyazhpirai0000000", handle: "@meeyazhpirai", title: "Meeyazh & Pirai", refreshTokenEnc: "x", googleEmail: "owner@example.com", driveRefreshTokenEnc: null, defaults: { categoryId: "1", defaultLanguage: "ta", madeForKids: true, shortsPlaylist: "Meeyazh & Pirai Shorts" }, slots: DEFAULT_RULES });
await store.upsertChannel({ youtubeChannelId: "UCsecondchannel000000", handle: "@tamilrhymes", title: "Tamil Rhymes", refreshTokenEnc: "x", googleEmail: "owner@example.com", driveRefreshTokenEnc: null, defaults: { categoryId: "27" }, slots: { ...DEFAULT_RULES, shortsTime: "18:30" } });

const titles = ["மீயாழ் & பிறை | The Lost Kite", "Rain Dance", "Moon Cake Adventure", "The Talking Parrot", "Pirai Learns to Swim", "Festival of Lights", "Counting Stars", "Mango Tree Secret"];
for (let i = 0; i < 8; i++) await createJob({ idempotencyKey: `short-${i}`, channel: "@meeyazhpirai", video: { driveFileId: `drivefileshort${i}xx` }, thumbnail: { url: `https://picsum.photos/seed/s${i}/360/640` }, metadata: { title: `Short ${String(i + 1).padStart(2, "0")} - ${titles[i]}`, type: "short", tags: ["tamil kids", "cartoon"] } }, store);
for (let i = 0; i < 4; i++) await createJob({ idempotencyKey: `ep-${i}`, channel: ch.id, video: { driveFileId: `drivefileepisode${i}x` }, thumbnail: { url: `https://picsum.photos/seed/e${i}/1280/720` }, metadata: { title: `Ep ${String(i + 1).padStart(2, "0")} - ${titles[i]}`, type: "long", description: "Meeyazh and Pirai go on an adventure.", tags: ["tamil cartoon"] } }, store);
await createJob({ idempotencyKey: "rhyme-1", channel: "@tamilrhymes", video: "https://example.com/rhyme.mp4", metadata: { title: "Rhyme 01 - Nila Nila", type: "short" } }, store);

const jobs = await store.listJobs({});
const [a, b, c] = jobs.filter((j) => j.metadata.type === "short");
await store.updateJob(a!.id, { status: "scheduled", youtubeVideoId: "dQw4w9WgXcQ", attempts: 1, log: [...a!.log, { at: new Date().toISOString(), msg: "uploaded as dQw4w9WgXcQ" }, { at: new Date().toISOString(), msg: "thumbnail set" }] });
await store.updateJob(b!.id, { status: "failed", attempts: 5, lastError: "socket hang up (503)", log: [...b!.log, { at: new Date().toISOString(), msg: "failed permanently: socket hang up" }] });
await store.updateJob(c!.id, { warnings: ["thumbnail failed: forbidden (custom thumbnails need a phone-verified channel)"] });
await store.addQuota(ch.id, (await import("../src/quota.js")).quotaDay(new Date()), 3402);

const mock: YouTubeApi = {
  open: async () => ({ stream: Readable.from(["x"]) }), insertVideo: async () => "demoVideo01", setThumbnail: async () => {},
  resolvePlaylist: async () => "PLdemo00000000", addToPlaylist: async () => {}, updateSchedule: async () => {},
  listPlaylists: async () => [{ id: "PLdemo00000000", title: "Meeyazh & Pirai Shorts" }, { id: "PLdemo00000001", title: "Full Episodes" }],
};
const FOLDER = "application/vnd.google-apps.folder";
const app = createApp({
  store, apiKey: "demo", encryptionKey: Buffer.alloc(32).toString("base64"), dailyQuota: 10000, audited: false, defaultSlots: DEFAULT_RULES,
  oauth: { authUrl: () => "/?connected=demo", exchange: async () => ({ refreshToken: "", email: null, channels: [] }) },
  worker: { store, apiFor: () => mock, dailyQuota: 10000 },
  webDir: fileURLToPath(new URL("../dist", import.meta.url)),
  driveFor: () => ({
    list: async (id) => id === "15UNBqiwoEZoNzJ8hl-U2HccZgFftwWsV" || id === "root"
      ? [1, 2, 3].map((n) => ({ id: `epfolder${n}xxxxx`, name: `Ep 0${n} - ${titles[n]}`, mimeType: FOLDER }))
      : [{ id: `${id}-v`, name: "episode.mp4", mimeType: "video/mp4", size: "94371840" }, { id: `${id}-t`, name: "thumbnail.jpg", mimeType: "image/jpeg" }, { id: `${id}-m`, name: "metadata.json", mimeType: "application/json" }, ...(id.includes("short") ? [] : [{ id: `${id}short1`, name: "Short 01 - Teaser", mimeType: FOLDER }])],
    readText: async () => JSON.stringify({ title: "Imported from Drive", tags: ["tamil kids"] }),
    download: async () => { const r = await fetch("https://picsum.photos/seed/drive/1280/720"); return { stream: Readable.fromWeb(r.body as never), mimeType: "image/jpeg" }; },
  }),
});
serve({ fetch: app.fetch, port: Number(process.env.PORT ?? 8788) }, (i) => console.log(`demo on :${i.port} (API key: demo)`));
