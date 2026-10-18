/**
 * Per-directory model of the LiteSpeed/Apache subset these templates use.
 *
 * It is the acceptance check we can run without the live hosts. Ticket T08
 * still probes real LiteSpeed. A parent rewrite that returns a status or
 * redirect does not inherit headers from directories it did not enter.
 * Header always set replaces the same header from a parent directory;
 * Header set applies only to 2xx responses.
 */

const HOP_LIMIT = 16;

function parseCond(line) {
  const match = line.match(/^RewriteCond\s+(\S+)\s+(\S+)(?:\s+\[([^\]]*)\])?$/);
  if (!match) throw new Error(`bad RewriteCond: ${line}`);
  return { test: match[1], pattern: match[2], flags: match[3] ?? "" };
}

function parseRule(line) {
  const match = line.match(/^RewriteRule\s+(\S+)\s+(\S+)(?:\s+\[([^\]]*)\])?$/);
  if (!match) throw new Error(`bad RewriteRule: ${line}`);
  return { pattern: match[1], subst: match[2], flags: match[3] ?? "" };
}

function parseHeader(line) {
  const match = line.match(/^Header\s+(always\s+)?set\s+(\S+)\s+"([^"]*)"$/);
  if (!match) throw new Error(`bad Header: ${line}`);
  return { always: Boolean(match[1]), name: match[2], value: match[3] };
}

export function parseHtaccess(text) {
  const rules = [];
  const headers = [];
  const denies = [];
  let conditions = [];
  let filesMatch = null;
  let rewriteBase = null;
  for (const raw of String(text).split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    if (line.startsWith("<IfModule") || line === "</IfModule>") continue;
    if (line.startsWith("<FilesMatch")) {
      const match = line.match(/^<FilesMatch "(.+)">$/);
      if (!match) throw new Error(`bad FilesMatch: ${line}`);
      filesMatch = new RegExp(match[1]);
      continue;
    }
    if (line === "</FilesMatch>") {
      filesMatch = null;
      continue;
    }
    if (line.startsWith("RewriteBase ")) {
      rewriteBase = line.slice("RewriteBase ".length).trim();
      continue;
    }
    if (line.startsWith("RewriteCond ")) {
      conditions.push(parseCond(line));
      continue;
    }
    if (line.startsWith("RewriteRule ")) {
      rules.push({ ...parseRule(line), conditions });
      conditions = [];
      continue;
    }
    if (line.startsWith("Header ")) {
      headers.push({ ...parseHeader(line), filesMatch });
      continue;
    }
    if (line === "Require all denied") {
      if (!filesMatch) throw new Error("Require all denied is only modelled inside FilesMatch");
      denies.push(filesMatch);
    }
  }
  return { rules, headers, denies, rewriteBase };
}

function expandTest(token, ctx) {
  if (token === "%{HTTPS}") return ctx.https ? "on" : "off";
  if (token === "%{REQUEST_URI}") return ctx.path;
  if (token === "%{HTTP_HOST}") return ctx.host;
  if (token === "%{REQUEST_FILENAME}") return ctx.path;
  const header = token.match(/^%\{HTTP:([^}]+)\}$/);
  if (header) return ctx.requestHeaders[header[1].toLowerCase()] ?? "";
  return token;
}

function conditionResult(cond, ctx) {
  const value = expandTest(cond.test, ctx);
  let pattern = cond.pattern;
  let negate = false;
  if (pattern.startsWith("!")) {
    negate = true;
    pattern = pattern.slice(1);
  }
  const insensitive = cond.flags.toLowerCase().includes("nc");
  let ok = false;
  let captures = [];
  if (pattern === "-f") ok = ctx.isFile;
  else if (pattern === "-d") ok = ctx.isDir;
  else if (pattern.startsWith("=")) ok = value === pattern.slice(1);
  else {
    const match = new RegExp(pattern, insensitive ? "i" : "").exec(value);
    ok = Boolean(match);
    captures = match ? match.slice(1) : [];
  }
  if (negate) return { ok: !ok, captures: [] };
  return { ok, captures };
}

function relativePath(requestPath, dirPrefix) {
  if (dirPrefix === "/") return requestPath === "/" ? "" : requestPath.replace(/^\//, "");
  const dir = dirPrefix.replace(/\/$/, "");
  const bare = requestPath.length > 1 ? requestPath.replace(/\/$/, "") : requestPath;
  if (bare === dir) return "";
  const prefix = `${dir}/`;
  if (requestPath.startsWith(prefix)) return requestPath.slice(prefix.length);
  return null;
}

function directoriesFor(requestPath, htaccess) {
  const dirs = [];
  for (const dir of Object.keys(htaccess)) {
    const prefix = dir === "/" ? "/" : dir.replace(/\/$/, "");
    const bare = requestPath.length > 1 ? requestPath.replace(/\/$/, "") : requestPath;
    if (prefix === "/" || bare === prefix || requestPath.startsWith(`${prefix}/`)) dirs.push(dir);
  }
  dirs.sort((left, right) => left.length - right.length);
  return dirs;
}

function joinBase(rewriteBase, dirPrefix, subst) {
  if (/^https?:\/\//i.test(subst)) return subst;
  if (subst.startsWith("/")) return subst.replace(/\/{2,}/g, "/");
  const base = rewriteBase ?? dirPrefix;
  const prefix = base.endsWith("/") ? base : `${base}/`;
  return `${prefix}${subst}`.replace(/\/{2,}/g, "/");
}

function applyRules(parsed, ctx) {
  const relative = relativePath(ctx.path, ctx.dirPrefix);
  if (relative === null) return { type: "none" };
  for (const rule of parsed.rules) {
    let captures = [];
    let matched = true;
    for (const cond of rule.conditions) {
      const result = conditionResult(cond, ctx);
      if (!result.ok) {
        matched = false;
        break;
      }
      if (result.captures.length) captures = result.captures;
    }
    if (!matched) continue;
    const insensitive = rule.flags.toLowerCase().includes("nc");
    const found = new RegExp(rule.pattern, insensitive ? "i" : "").exec(relative);
    if (!found) continue;
    const flags = rule.flags.split(",").map((flag) => flag.trim());
    const statusFlag = flags.find((flag) => /^R=\d+$/.test(flag));
    const status = statusFlag ? Number(statusFlag.slice(2)) : null;
    if (rule.subst === "-") {
      if (status === 404 || (status && (status < 300 || status >= 400))) return { type: "status", status: status ?? 404 };
      if (status) return { type: "redirect", status, location: ctx.path };
      return { type: "pass" };
    }
    let subst = rule.subst.replace(/\$(\d)/g, (_, index) => found[Number(index)] ?? "");
    subst = subst.replace(/%(\d)/g, (_, index) => captures[Number(index) - 1] ?? "");
    subst = subst.replaceAll("%{HTTP_HOST}", ctx.host);
    subst = subst.replaceAll("%{REQUEST_URI}", ctx.path);
    const target = joinBase(parsed.rewriteBase, ctx.dirPrefix, subst);
    if (status && status >= 300 && status < 400) return { type: "redirect", status, location: target };
    if (status) return { type: "status", status };
    return { type: "rewrite", path: target.startsWith("/") ? target : `/${target}` };
  }
  return { type: "none" };
}

function contentType(filePath) {
  if (filePath.endsWith(".html")) return "text/html; charset=utf-8";
  if (filePath.endsWith(".js") || filePath.endsWith(".mjs")) return "text/javascript";
  if (filePath.endsWith(".css")) return "text/css";
  if (filePath.endsWith(".json")) return "application/json";
  if (filePath.endsWith(".webmanifest")) return "application/manifest+json";
  if (filePath.endsWith(".svg")) return "image/svg+xml";
  if (filePath.endsWith(".txt")) return "text/plain";
  if (filePath.endsWith(".xml")) return "application/xml";
  return "application/octet-stream";
}

function filePath(requestPath, files) {
  if (Object.hasOwn(files, requestPath)) return requestPath;
  return null;
}

function headerBag(dirs, htaccess, basename, status) {
  const headers = {};
  for (const dir of dirs) {
    const parsed = parseHtaccess(htaccess[dir]);
    for (const header of parsed.headers) {
      if (header.filesMatch && !header.filesMatch.test(basename)) continue;
      if (!header.always && (status < 200 || status >= 300)) continue;
      headers[header.name.toLowerCase()] = header.value;
    }
  }
  return headers;
}

function denied(dirs, htaccess, basename) {
  for (const dir of dirs) {
    const parsed = parseHtaccess(htaccess[dir]);
    if (parsed.denies.some((pattern) => pattern.test(basename))) return true;
  }
  return false;
}

function finish({ status, path: requestPath, location = null, body = "", contentType: type = null, htaccess, applied }) {
  const dirs = applied ?? directoriesFor(requestPath, htaccess);
  const basename = requestPath.split("/").pop() ?? "";
  return {
    status,
    path: requestPath,
    location,
    body,
    contentType: type,
    headers: headerBag(dirs, htaccess, basename, status),
  };
}

/**
 * @param {object} input
 * @param {string} input.path
 * @param {string} input.host
 * @param {boolean} [input.https]
 * @param {Record<string, string>} [input.headers]
 * @param {Record<string, string>} input.htaccess directory prefix → htaccess text
 * @param {Record<string, string>} input.files URL path → body
 */
export function resolveRequest(input) {
  const htaccess = input.htaccess ?? {};
  const files = input.files ?? {};
  const requestHeaders = {};
  for (const [name, value] of Object.entries(input.headers ?? {})) {
    requestHeaders[name.toLowerCase()] = value;
  }
  let requestPath = input.path.startsWith("/") ? input.path : `/${input.path}`;
  requestPath = requestPath.replace(/\/{2,}/g, "/");
  const history = [];

  for (let hop = 0; hop < HOP_LIMIT; hop += 1) {
    history.push(requestPath);
    const dirs = directoriesFor(requestPath, htaccess);
    const applied = [];
    let rewritten = false;
    for (const dir of dirs) {
      applied.push(dir);
      const parsed = parseHtaccess(htaccess[dir]);
      const outcome = applyRules(parsed, {
        path: requestPath,
        dirPrefix: dir,
        host: input.host,
        https: input.https !== false,
        requestHeaders,
        isFile: filePath(requestPath, files) !== null,
        isDir: false,
      });
      if (outcome.type === "status") {
        return finish({ status: outcome.status, path: requestPath, htaccess, applied });
      }
      if (outcome.type === "redirect") {
        return finish({ status: outcome.status, path: requestPath, location: outcome.location, htaccess, applied });
      }
      if (outcome.type === "rewrite") {
        if (outcome.path === requestPath) break;
        requestPath = outcome.path;
        rewritten = true;
        break;
      }
    }
    if (rewritten) continue;

    const match = filePath(requestPath, files);
    if (match) {
      const basename = match.split("/").pop() ?? "";
      if (denied(applied, htaccess, basename)) {
        return finish({ status: 403, path: match, htaccess, applied });
      }
      return finish({
        status: 200,
        path: match,
        body: files[match],
        contentType: contentType(match),
        htaccess,
        applied,
      });
    }
    return finish({ status: 404, path: requestPath, htaccess, applied });
  }

  return finish({
    status: 500,
    path: history[history.length - 1] ?? input.path,
    body: history.join(" -> "),
    htaccess,
    applied: directoriesFor(history[history.length - 1] ?? input.path, htaccess),
  });
}
