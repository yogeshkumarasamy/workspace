import { useEffect, useState } from "react";
import { Alert, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Label, Select, Switch } from "@repo/ui/shadcn";
import { api, connectUrl } from "../api";
import type { Channel } from "../api";
import { useApp } from "../state";

const DOW = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const TZS = ["Asia/Kolkata", "UTC", "America/New_York", "America/Los_Angeles", "Europe/London", "Asia/Singapore", "Asia/Dubai", "Australia/Sydney"];

export function Settings() {
  const { channels, channel, quota, refresh, toast } = useApp();
  const list = channel ? [channel] : channels;
  return (
    <div className="space-y-4">
      {channels.length === 0 && <Alert>No channels yet. <a className="text-blue-400 underline" href={connectUrl()}>Connect a YouTube channel</a>.</Alert>}
      {list.map((c) => <ChannelCard key={c.id} c={c} used={quota?.byChannel[c.id] ?? 0} onSaved={async () => { toast("Channel saved"); await refresh(); }} />)}
      <Button variant="outline" onClick={() => (location.href = connectUrl())}>+ Connect another channel</Button>
    </div>
  );
}

function ChannelCard({ c, used, onSaved }: { c: Channel; used: number; onSaved(): void }) {
  const [d, setD] = useState(c.defaults);
  const [s, setS] = useState(c.slots);
  const [err, setErr] = useState("");
  useEffect(() => { setD(c.defaults); setS(c.slots); }, [c]);
  const save = async () => {
    setErr("");
    try { await api(`/channels/${c.id}`, { method: "PATCH", json: { defaults: d, slots: s } }); onSaved(); } catch (e) { setErr((e as Error).message); }
  };
  return (
    <Card>
      <CardHeader>
        <CardTitle>{c.title} <span className="text-sm font-normal text-muted-foreground">{c.handle}</span></CardTitle>
        <CardDescription>{c.youtubeChannelId} · {c.googleEmail ?? "unknown account"} · Drive via {c.separateDriveAccount ? "separate account" : "same account"} · {used} quota units today</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6 md:grid-cols-2">
        <div className="space-y-3">
          <h3 className="font-medium">Schedule slots</h3>
          <div className="space-y-2"><Label>Timezone</Label><Select value={s.timezone} onChange={(e) => setS({ ...s, timezone: e.target.value })}>{[...new Set([s.timezone, ...TZS])].map((t) => <option key={t}>{t}</option>)}</Select></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2"><Label>Shorts: daily at</Label><Input type="time" value={s.shortsTime} onChange={(e) => setS({ ...s, shortsTime: e.target.value })} /></div>
            <div className="space-y-2"><Label>Min lead (minutes)</Label><Input type="number" min={0} value={s.minLeadMinutes} onChange={(e) => setS({ ...s, minLeadMinutes: Number(e.target.value) })} /></div>
            <div className="space-y-2"><Label>Long: weekly on</Label><Select value={s.longWeekday} onChange={(e) => setS({ ...s, longWeekday: Number(e.target.value) })}>{DOW.map((n, i) => <option key={n} value={i}>{n}</option>)}</Select></div>
            <div className="space-y-2"><Label>Long: at</Label><Input type="time" value={s.longTime} onChange={(e) => setS({ ...s, longTime: e.target.value })} /></div>
          </div>
        </div>
        <div className="space-y-3">
          <h3 className="font-medium">Defaults for new jobs</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2"><Label>Category</Label><Select value={d.categoryId ?? "1"} onChange={(e) => setD({ ...d, categoryId: e.target.value })}><option value="1">Film & Animation</option><option value="27">Education</option><option value="24">Entertainment</option></Select></div>
            <div className="space-y-2"><Label>Language</Label><Select value={d.defaultLanguage ?? "ta"} onChange={(e) => setD({ ...d, defaultLanguage: e.target.value, defaultAudioLanguage: e.target.value })}><option value="ta">Tamil</option><option value="en">English</option><option value="hi">Hindi</option></Select></div>
          </div>
          <div className="space-y-2"><Label>Shorts playlist</Label><Input value={d.shortsPlaylist ?? ""} placeholder="Meeyazh & Pirai Shorts" onChange={(e) => setD({ ...d, shortsPlaylist: e.target.value || undefined })} /></div>
          <div className="space-y-2"><Label>Long episodes playlist</Label><Input value={d.longPlaylist ?? ""} onChange={(e) => setD({ ...d, longPlaylist: e.target.value || undefined })} /></div>
          <label className="flex items-center gap-2 text-sm"><Switch checked={d.madeForKids ?? true} onCheckedChange={(v) => setD({ ...d, madeForKids: v })} /> Made for kids by default</label>
        </div>
        {err && <Alert variant="destructive" className="md:col-span-2">{err}</Alert>}
        <div className="flex gap-2 md:col-span-2">
          <Button onClick={save}>Save</Button>
          <Button variant="outline" onClick={() => (location.href = connectUrl())}>Reconnect</Button>
          <Button variant="ghost" onClick={() => (location.href = connectUrl(`&purpose=drive&channelId=${c.id}`))}>Use separate Drive account</Button>
        </div>
      </CardContent>
    </Card>
  );
}
