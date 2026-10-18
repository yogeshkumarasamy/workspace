import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useRegisterSW } from "virtual:pwa-register/react";
import { Button } from "@repo/ui/shadcn";

interface BeforeInstallPromptEvent extends Event { prompt(): Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> }

export function useMedia(q: string) {
  const [m, setM] = useState(() => typeof window !== "undefined" && window.matchMedia(q).matches);
  useEffect(() => { const mq = window.matchMedia(q); const f = () => setM(mq.matches); mq.addEventListener("change", f); f(); return () => mq.removeEventListener("change", f); }, [q]);
  return m;
}
export const useNarrow = () => useMedia("(max-width: 767px)");

export function useOnline() {
  const [on, setOn] = useState(navigator.onLine);
  useEffect(() => { const a = () => setOn(true), b = () => setOn(false); addEventListener("online", a); addEventListener("offline", b); return () => { removeEventListener("online", a); removeEventListener("offline", b); }; }, []);
  return on;
}

const isStandalone = () => window.matchMedia("(display-mode: standalone)").matches || (navigator as unknown as { standalone?: boolean }).standalone === true;
const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

/** Header button: native install prompt (Chromium) or iOS "Add to Home Screen" hint. */
export function InstallButton() {
  const [evt, setEvt] = useState<BeforeInstallPromptEvent | null>(null);
  const [iosHint, setIosHint] = useState(false);
  const [installed, setInstalled] = useState(isStandalone());
  useEffect(() => {
    const h = (e: Event) => { e.preventDefault(); setEvt(e as BeforeInstallPromptEvent); };
    const done = () => { setInstalled(true); setEvt(null); };
    addEventListener("beforeinstallprompt", h); addEventListener("appinstalled", done);
    return () => { removeEventListener("beforeinstallprompt", h); removeEventListener("appinstalled", done); };
  }, []);
  if (installed) return null;
  if (evt) return <Button size="sm" variant="secondary" onClick={async () => { await evt.prompt(); const r = await evt.userChoice; if (r.outcome === "accepted") setEvt(null); }}>⬇ Install app</Button>;
  if (!isIos()) return null;
  return (
    <>
      <Button size="sm" variant="secondary" onClick={() => setIosHint(true)}>⬇ Install</Button>
      {/* Portal: the header's backdrop-filter would otherwise trap position:fixed */}
      {iosHint && createPortal(
        <div className="fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-[70] rounded-xl border bg-card p-4 text-sm shadow-2xl" role="dialog">
          <div className="mb-1 font-semibold">Add YT Scheduler to your Home Screen</div>
          <ol className="list-decimal space-y-1 pl-5 text-muted-foreground"><li>Tap the <b>Share</b> button <span aria-hidden>⎋</span> in Safari’s toolbar.</li><li>Choose <b>Add to Home Screen</b>.</li><li>Tap <b>Add</b>.</li></ol>
          <Button size="sm" className="mt-3 w-full" variant="outline" onClick={() => setIosHint(false)}>Got it</Button>
        </div>, document.body
      )}
    </>
  );
}

/** Registers the service worker; shows "Update available" when a new build is waiting. Checks hourly. */
export function UpdateToast() {
  const { needRefresh: [need, setNeed], offlineReady: [ready, setReady], updateServiceWorker } = useRegisterSW({
    onRegisteredSW(_url, reg) { if (reg) setInterval(() => reg.update().catch(() => {}), 60 * 60 * 1000); },
  });
  useEffect(() => { if (!ready) return undefined; const t = setTimeout(() => setReady(false), 4000); return () => clearTimeout(t); }, [ready, setReady]);
  if (!need && !ready) return null;
  return (
    <div className="fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-[65] mx-auto flex max-w-md items-center gap-3 rounded-xl border bg-card px-4 py-3 text-sm shadow-2xl sm:left-auto sm:right-4" role="status">
      <span className="flex-1">{need ? "Update available." : "App ready to work offline."}</span>
      {need && <Button size="sm" onClick={() => updateServiceWorker(true)}>Reload</Button>}
      <Button size="sm" variant="ghost" onClick={() => { setNeed(false); setReady(false); }}>✕</Button>
    </div>
  );
}

export function OfflineScreen({ onRetry }: { onRetry(): void }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
      <div className="text-5xl">📡</div>
      <h1 className="text-xl font-semibold">You’re offline</h1>
      <p className="max-w-sm text-sm text-muted-foreground">YT Scheduler needs a connection to load your jobs and talk to YouTube. Nothing is cached from the API, so you always see live data once you’re back online.</p>
      <Button onClick={onRetry}>Try again</Button>
    </div>
  );
}
