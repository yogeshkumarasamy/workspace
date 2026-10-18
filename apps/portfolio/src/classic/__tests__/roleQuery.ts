type El = {
  tag: string;
  attrs: Record<string, string>;
  children: Array<El | string>;
};

export type RoleMatch = {
  role: string;
  name: string;
  tag: string;
  level?: number;
  href?: string;
};

const SECTIONING = new Set(["article", "aside", "main", "nav", "section"]);
const VOID = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "source", "track", "wbr"]);

function decode(text: string): string {
  return text
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex: string) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec: string) => String.fromCodePoint(Number(dec)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

function parseAttrs(raw: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  const re = /([^\s=/]+)(?:="([^"]*)")?/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(raw))) {
    attrs[match[1]] = decode(match[2] ?? "");
  }
  return attrs;
}

function parseFragment(html: string): El {
  const root: El = { tag: "#root", attrs: {}, children: [] };
  const stack: El[] = [root];
  const re = /<!--[\s\S]*?-->|<\/([a-zA-Z0-9]+)>|<([a-zA-Z0-9]+)([^>]*?)(\/?)>|([^<]+)/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(html))) {
    if (match[0].startsWith("<!--")) continue;
    if (match[1]) {
      const tag = match[1].toLowerCase();
      while (stack.length > 1 && stack[stack.length - 1].tag !== tag) stack.pop();
      if (stack.length > 1) stack.pop();
      continue;
    }
    if (match[2]) {
      const tag = match[2].toLowerCase();
      const el: El = { tag, attrs: parseAttrs(match[3] ?? ""), children: [] };
      stack[stack.length - 1].children.push(el);
      const selfClosing = match[4] === "/" || VOID.has(tag);
      if (!selfClosing) stack.push(el);
      continue;
    }
    if (match[5]) stack[stack.length - 1].children.push(decode(match[5]));
  }
  return root;
}

function textOf(node: El | string): string {
  if (typeof node === "string") return node;
  if (node.attrs["aria-hidden"] === "true") return "";
  return node.children.map(textOf).join("");
}

function findById(node: El, id: string): El | null {
  if (node.attrs.id === id) return node;
  for (const child of node.children) {
    if (typeof child === "string") continue;
    const found = findById(child, id);
    if (found) return found;
  }
  return null;
}

function accessibleName(node: El, root: El): string {
  const labelledBy = node.attrs["aria-labelledby"];
  if (node.attrs["aria-label"]) return normalize(node.attrs["aria-label"]);
  if (labelledBy) {
    const names = labelledBy.split(/\s+/).map((id) => {
      const target = findById(root, id);
      return target ? normalize(textOf(target)) : "";
    });
    return normalize(names.join(" "));
  }
  return normalize(textOf(node));
}

function normalize(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function implicitRole(node: El, ancestors: El[]): string | null {
  if (node.attrs.role) return node.attrs.role;
  if (/^h[1-6]$/.test(node.tag)) return "heading";
  if (node.tag === "a" && node.attrs.href) return "link";
  if (node.tag === "nav") return "navigation";
  if (node.tag === "main") return "main";
  if (node.tag === "header" || node.tag === "footer") {
    const nested = ancestors.some((ancestor) => SECTIONING.has(ancestor.tag));
    if (nested) return null;
    return node.tag === "header" ? "banner" : "contentinfo";
  }
  if ((node.tag === "section" || node.tag === "article") && (node.attrs["aria-label"] || node.attrs["aria-labelledby"])) {
    return "region";
  }
  if (node.tag === "ul" || node.tag === "ol") return "list";
  if (node.tag === "li") return "listitem";
  return null;
}

function isHidden(node: El, ancestors: El[]): boolean {
  if (node.attrs.hidden !== undefined) return true;
  return [node, ...ancestors].some((item) => item.attrs["aria-hidden"] === "true");
}

function collect(node: El, ancestors: El[], root: El, matches: RoleMatch[]) {
  if (node.tag !== "#root" && !isHidden(node, ancestors)) {
    const role = implicitRole(node, ancestors);
    if (role) {
      const level = role === "heading" ? Number(node.tag.slice(1)) : undefined;
      matches.push({
        role,
        name: accessibleName(node, root),
        tag: node.tag,
        level,
        href: node.attrs.href,
      });
    }
  }
  const nextAncestors = node.tag === "#root" ? ancestors : [...ancestors, node];
  for (const child of node.children) {
    if (typeof child === "string") continue;
    collect(child, nextAncestors, root, matches);
  }
}

export function getAllByRole(
  html: string,
  role: string,
  options: { name?: string | RegExp; level?: number } = {},
): RoleMatch[] {
  const root = parseFragment(html);
  const matches: RoleMatch[] = [];
  collect(root, [], root, matches);
  return matches.filter((match) => {
    if (match.role !== role) return false;
    if (options.level !== undefined && match.level !== options.level) return false;
    if (options.name === undefined) return true;
    if (typeof options.name === "string") return match.name === options.name;
    return options.name.test(match.name);
  });
}

export function queryByRole(
  html: string,
  role: string,
  options: { name?: string | RegExp; level?: number } = {},
): RoleMatch | null {
  const found = getAllByRole(html, role, options);
  if (found.length > 1) {
    throw new Error(`Found ${found.length} ${role} roles for ${describe(options)}: ${found.map((item) => item.name).join(" | ")}`);
  }
  return found[0] ?? null;
}

export function getByRole(
  html: string,
  role: string,
  options: { name?: string | RegExp; level?: number } = {},
): RoleMatch {
  const found = queryByRole(html, role, options);
  if (!found) {
    const all = getAllByRole(html, role).map((item) => item.name);
    throw new Error(`No ${role} for ${describe(options)}. Saw: ${all.join(" | ")}`);
  }
  return found;
}

function describe(options: { name?: string | RegExp; level?: number }): string {
  const name = options.name instanceof RegExp ? options.name.toString() : options.name;
  return JSON.stringify({ ...options, name });
}
