import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { api } from "./api";
import type { Channel, Job, Quota } from "./api";

interface Ctx {
  channels: Channel[]; channelId: string; setChannelId(id: string): void; channel: Channel | null;
  jobs: Job[]; quota: Quota | null; audited: boolean; tz: string; youtubeMode: string; driveScope: string;
  refresh(): Promise<void>; toast(msg: string, kind?: "ok" | "err"): void;
  channelById(id: string): Channel | undefined;
}
const C = createContext<Ctx>(null as unknown as Ctx);
export const useApp = () => useContext(C);

function getStored(key: string): string {
  try {
    if (typeof window !== "undefined" && window.localStorage) return window.localStorage.getItem(key) ?? "";
    if (typeof localStorage !== "undefined" && localStorage) return localStorage.getItem(key) ?? "";
  } catch {
    // ignore
  }
  return "";
}

function setStored(key: string, val: string): void {
  try {
    if (typeof window !== "undefined" && window.localStorage) { window.localStorage.setItem(key, val); return; }
    if (typeof localStorage !== "undefined" && localStorage) { localStorage.setItem(key, val); }
  } catch {
    // ignore
  }
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [channelId, setChannelIdS] = useState(getStored("ytch"));
  const [jobs, setJobs] = useState<Job[]>([]);
  const [quota, setQuota] = useState<Quota | null>(null);
  const [audited, setAudited] = useState(true);
  const [youtubeMode, setYoutubeMode] = useState("");
  const [driveScope, setDriveScope] = useState("file");
  const [toasts, setToasts] = useState<{ id: number; msg: string; kind: string }[]>([]);

  const setChannelId = (id: string) => { setStored("ytch", id); setChannelIdS(id); };
  const refresh = useCallback(async () => {
    const [chs, js, q, cfg] = await Promise.all([
      api<Channel[]>("/channels"), api<Job[]>(`/jobs?limit=1000${channelId ? `&channel=${channelId}` : ""}`), api<Quota>("/quota"), api<{ audited: boolean; youtubeMode?: string; driveScope?: string }>("/config"),
    ]);
    setChannels(chs); setJobs(js); setQuota(q); setAudited(cfg.audited);
    setYoutubeMode(cfg.youtubeMode ?? ""); setDriveScope(cfg.driveScope ?? "file");
  }, [channelId]);
  useEffect(() => { refresh().catch(() => {}); const t = setInterval(() => refresh().catch(() => {}), 15000); return () => clearInterval(t); }, [refresh]);

  const toast = (msg: string, kind: "ok" | "err" = "ok") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, msg, kind }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 5000);
  };
  const channel = channels.find((c) => c.id === channelId) ?? null;
  const tz = channel?.slots.timezone ?? channels[0]?.slots.timezone ?? "Asia/Kolkata";
  return (
    <C.Provider value={{ channels, channelId, setChannelId, channel, jobs, quota, audited, tz, youtubeMode, driveScope, refresh, toast, channelById: (id) => channels.find((c) => c.id === id) }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[60] space-y-2">
        {toasts.map((t) => (
          <div key={t.id} className={`max-w-sm rounded-lg border px-4 py-3 text-sm shadow-lg ${t.kind === "err" ? "border-red-500/50 bg-red-950 text-red-200" : "border-emerald-500/40 bg-emerald-950 text-emerald-100"}`}>{t.msg}</div>
        ))}
      </div>
    </C.Provider>
  );
}
