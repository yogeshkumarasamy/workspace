import { spawn } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const script = join(fileURLToPath(new URL(".", import.meta.url)), "../scripts/yt-scheduler-serve.py");

function startServer(directory: string): Promise<{ origin: string; stop: () => void }> {
  const child = spawn("python3", [script, "--directory", directory, "--bind", "127.0.0.1", "--port", "0"], {
    stdio: ["ignore", "pipe", "pipe"],
  });
  let logs = "";
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      child.kill();
      reject(new Error(`server did not listen\n${logs}`));
    }, 5000);
    const onData = (chunk: Buffer) => {
      logs += chunk.toString();
      const match = logs.match(/listening http:\/\/127\.0\.0\.1:(\d+)\//);
      if (!match) return;
      clearTimeout(timer);
      child.stdout?.off("data", onData);
      resolve({
        origin: `http://127.0.0.1:${match[1]}`,
        stop: () => {
          child.kill();
        },
      });
    };
    child.stdout?.on("data", onData);
    child.stderr?.on("data", (chunk) => {
      logs += chunk.toString();
    });
    child.on("exit", (code) => {
      clearTimeout(timer);
      reject(new Error(`server exited ${code}\n${logs}`));
    });
  });
}

describe("static host directory index", () => {
  it("serves privacy and terms before the SPA shell", async () => {
    const dir = mkdtempSync(join(tmpdir(), "yt-serve-"));
    mkdirSync(join(dir, "privacy"));
    mkdirSync(join(dir, "terms"));
    mkdirSync(join(dir, "empty"));
    writeFileSync(join(dir, "index.html"), "<html>spa-shell</html>");
    writeFileSync(join(dir, "privacy", "index.html"), "<html>privacy-body</html>");
    writeFileSync(join(dir, "terms", "index.html"), "<html>terms-body</html>");
    writeFileSync(join(dir, "app-config.json"), "{\"ok\":true}");
    const server = await startServer(dir);
    try {
      const slash = await fetch(`${server.origin}/privacy`, { redirect: "manual" });
      expect(slash.status).toBe(301);
      expect(slash.headers.get("location")).toBe("/privacy/");

      for (const [path, marker] of [
        ["/privacy", "privacy-body"],
        ["/privacy/", "privacy-body"],
        ["/privacy/index.html", "privacy-body"],
        ["/terms", "terms-body"],
        ["/terms/", "terms-body"],
        ["/terms/index.html", "terms-body"],
      ] as const) {
        const page = await fetch(`${server.origin}${path}`);
        expect(page.status, path).toBe(200);
        expect(page.headers.get("content-type"), path).toMatch(/text\/html/);
        expect(await page.text(), path).toContain(marker);
      }

      const calendar = await fetch(`${server.origin}/calendar`);
      expect(calendar.status).toBe(200);
      expect(await calendar.text()).toContain("spa-shell");

      const blank = await fetch(`${server.origin}/empty/`);
      expect(blank.status).toBe(200);
      expect(await blank.text()).toContain("spa-shell");

      const asset = await fetch(`${server.origin}/assets/missing.js`);
      expect(asset.status).toBe(404);
      expect(await asset.text()).not.toContain("spa-shell");

      const config = await fetch(`${server.origin}/app-config.json`);
      expect(config.status).toBe(200);
      expect(await config.json()).toEqual({ ok: true });
    } finally {
      server.stop();
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
