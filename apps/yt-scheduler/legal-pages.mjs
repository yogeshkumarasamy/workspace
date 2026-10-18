/**
 * Stamp crawlable privacy and terms HTML with the build base and the contact
 * from web/src/legal-contact.json.
 *
 * The GitHub profile does not publish an email. Leave contactEmail empty to
 * show only that profile. Set it when you have an address you want on the
 * page. Do not invent one.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const LEGAL_PAGES = ["privacy", "terms"];

const APP_ROOT = path.dirname(fileURLToPath(import.meta.url));

export function readLegalContact(root = APP_ROOT) {
  const data = JSON.parse(readFileSync(path.join(root, "web/src/legal-contact.json"), "utf8"));
  const contactUrl = String(data.contactUrl ?? "").trim();
  const contactEmail = String(data.contactEmail ?? "").trim();
  if (!contactUrl.startsWith("https://")) {
    throw new Error("legal-contact.json contactUrl must be an https URL");
  }
  if (contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) {
    throw new Error("legal-contact.json contactEmail must be empty or an email address. Do not invent one.");
  }
  return { contactUrl, contactEmail };
}

function escapeText(value) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function escapeAttr(value) {
  return escapeText(value).replace(/"/g, "&quot;");
}

export function contactMarkup(contact) {
  const profile = `<a href="${escapeAttr(contact.contactUrl)}">${escapeText(contact.contactUrl.replace(/^https:\/\//, ""))}</a>`;
  if (!contact.contactEmail) return profile;
  return `<a href="mailto:${escapeAttr(contact.contactEmail)}">${escapeText(contact.contactEmail)}</a> (${profile})`;
}

export function renderLegalHtml(html, base, contact) {
  const safeBase = base.endsWith("/") ? base : `${base}/`;
  const rendered = String(html).replaceAll("__APP_BASE__", safeBase).replaceAll("__CONTACT__", contactMarkup(contact));
  if (rendered.includes("__APP_BASE__") || rendered.includes("__CONTACT__")) {
    throw new Error("unresolved legal page placeholder");
  }
  return rendered;
}

export function stampDist(distDir, base, root = APP_ROOT) {
  const contact = readLegalContact(root);
  for (const name of LEGAL_PAGES) {
    const src = path.join(root, "web/public", name, "index.html");
    const destDir = path.join(distDir, name);
    mkdirSync(destDir, { recursive: true });
    writeFileSync(path.join(destDir, "index.html"), renderLegalHtml(readFileSync(src, "utf8"), base, contact));
  }
  const index = path.join(distDir, "index.html");
  if (!existsSync(index)) return;
  const html = readFileSync(index, "utf8");
  if (html.includes("__CONTACT__") || html.includes("__APP_BASE__")) {
    writeFileSync(index, renderLegalHtml(html, base, contact));
  }
}

/** Match /privacy, /privacy/, and /privacy/index.html under the app base or site root. */
export function legalRequestName(url, base) {
  const pathOnly = String(url ?? "").split("?")[0];
  const prefixes = [base.endsWith("/") ? base : `${base}/`];
  if (!prefixes.includes("/")) prefixes.push("/");
  for (const name of LEGAL_PAGES) {
    for (const prefix of prefixes) {
      const stem = `${prefix}${name}`.replace(/\/{2,}/g, "/");
      if (pathOnly === stem || pathOnly === `${stem}/` || pathOnly === `${stem}/index.html`) return name;
    }
  }
  return null;
}

export function legalPagesPlugin(base, root = APP_ROOT) {
  let outDir = path.join(root, "dist");
  const contact = readLegalContact(root);
  return {
    name: "yt-legal-pages",
    configResolved(config) {
      outDir = path.resolve(config.root, config.build.outDir);
    },
    transformIndexHtml(html) {
      if (!html.includes("__CONTACT__") && !html.includes("__APP_BASE__")) return html;
      return renderLegalHtml(html, base, contact);
    },
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const name = legalRequestName(req.url ?? "", base);
        if (!name) return next();
        const html = renderLegalHtml(readFileSync(path.join(root, "web/public", name, "index.html"), "utf8"), base, contact);
        res.statusCode = 200;
        res.setHeader("Content-Type", "text/html; charset=utf-8");
        res.setHeader("Cache-Control", "no-cache");
        res.end(html);
      });
    },
    closeBundle() {
      stampDist(outDir, base, root);
    },
  };
}
