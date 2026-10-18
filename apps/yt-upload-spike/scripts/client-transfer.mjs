#!/usr/bin/env node
/**
 * Free-plan fallback: move the bytes on this machine.
 * The Worker only sees them when --sink is the mock. Point --sink at a YouTube
 * resumable session URL to keep the bytes off Workers entirely.
 */
import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { fileURLToPath } from "node:url";

function parseArgs(argv) {
  const args = { chunkMib: 64, help: false };
  for (let i = 0; i < argv.length; i += 1) {
    const flag = argv[i];
    if (flag === "--help" || flag === "-h") args.help = true;
    else if (flag === "--file") args.file = argv[++i];
    else if (flag === "--base") args.base = argv[++i];
    else if (flag === "--token") args.token = argv[++i];
    else if (flag === "--chunk-mib") args.chunkMib = Number(argv[++i]);
    else throw new Error(`unknown argument ${flag}`);
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || !args.file || !args.base) {
    console.log(`Usage: node scripts/client-transfer.mjs --file VIDEO --base https://yt-upload-spike.<account>.workers.dev [--token SPIKE] [--chunk-mib 64]

Reads the file on this machine and PUTs aligned ranges to the mock sink.
Compare the local sha256 with the sink. Workers CPU is not used for the copy
when you PUT a YouTube session URL yourself; this script's --base form is the
mock, so the sink Worker does receive the body.`);
    process.exitCode = args.help ? 0 : 2;
    return;
  }
  const info = await stat(args.file);
  const chunkBytes = Math.round(args.chunkMib * 1024 * 1024);
  const headers = args.token ? { Authorization: `Bearer ${args.token}` } : {};
  const created = await fetch(`${args.base.replace(/\/$/, "")}/sink/sessions`, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({ totalSize: info.size, storage: info.size > 256 * 1024 ? "r2" : "memory" }),
  });
  const session = await created.json();
  if (!created.ok) throw new Error(`session ${created.status}: ${JSON.stringify(session)}`);

  const local = createHash("sha256");
  let offset = 0;
  while (offset < info.size) {
    const end = Math.min(offset + chunkBytes, info.size) - 1;
    const stream = createReadStream(args.file, { start: offset, end });
    stream.on("data", (chunk) => local.update(chunk));
    const put = await fetch(`${args.base.replace(/\/$/, "")}/sink/sessions/${session.id}`, {
      method: "PUT",
      headers: {
        ...headers,
        "Content-Range": `bytes ${offset}-${end}/${info.size}`,
        "Content-Type": "application/octet-stream",
      },
      body: stream,
      duplex: "half",
    });
    const body = await put.json();
    if (put.status !== 308 && put.status !== 200) {
      throw new Error(`PUT ${put.status}: ${JSON.stringify(body)}`);
    }
    console.log(`${put.status} received ${body.received} appended ${body.appended}`);
    offset = body.received;
  }
  console.log(`local sha256 ${local.digest("hex")}`);
  console.log(`sink sha256 ${session.sha256 ?? "(null when parts are in R2; GET the session and hash the parts)"}`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
