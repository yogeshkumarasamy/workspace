import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { register } from "node:module";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { verifiedProfile, profileWithBio } from "../__fixtures__/profile";
import type { Profile } from "../types";

// Register no-op loader for .css files in raw Node / tsx environments
try {
  register(
    "data:text/javascript,export function load(url, context, nextLoad) { if (url.endsWith('.css')) return { format: 'module', shortCircuit: true, source: '' }; return nextLoad(url, context); }",
    import.meta.url,
  );
} catch {
  // Ignored in environments where register is unavailable or unnecessary
}

const { AboutView, ABOUT_DEV_PLACEHOLDER } = await import("../AboutApp");
const { default: aboutAppDef } = await import("../index");

const tests: Array<[string, () => void]> = [];

function it(name: string, fn: () => void) {
  tests.push([name, fn]);
}

it("exports valid AppDefinition contract with id about and order 1", () => {
  assert.equal(aboutAppDef.id, "about");
  assert.equal(aboutAppDef.order, 1);
  assert.equal(aboutAppDef.title, "About.txt");
  assert.equal(aboutAppDef.icon, "📄");
  assert.equal(typeof aboutAppDef.defaultSize, "object");
  assert.equal(aboutAppDef.defaultSize.w, 580);
  assert.equal(aboutAppDef.defaultSize.h, 420);
  assert.ok(aboutAppDef.component, "component should be defined");
});

it("renders verified profile facts (name, headline, location, skills, education)", () => {
  const html = renderToStaticMarkup(
    React.createElement(AboutView, {
      profile: verifiedProfile,
      isDev: false,
    }),
  );

  // Name, alias, headline, location
  assert.match(html, /Yogesh Kumarasamy/);
  assert.match(html, /yogesh kumar/);
  assert.match(html, /Senior Software Engineer at FULL Creative/);
  assert.match(html, /Chennai, Tamil Nadu, India/);

  // Top skills
  assert.match(html, /Continuous Integration and Continuous Delivery \(CI\/CD\)/);
  assert.match(html, /CSS-in-JS/);
  assert.match(html, /Vitest/);

  // Education
  assert.match(html, /RVS College of Engineering and Technology/);
  assert.match(html, /B\.Tech\., Information Technology/);
  assert.match(html, /2008–2012/);

  // Uses verified facts only — no invented phone, no private repo
  assert.ok(!html.includes("tel:"), "Must not include phone number");
  assert.ok(!html.includes("workspace#"), "Must not leak internal workspace");
});

it("hides bio placeholder in production when about is null", () => {
  const html = renderToStaticMarkup(
    React.createElement(AboutView, {
      profile: verifiedProfile,
      isDev: false,
    }),
  );

  assert.ok(
    !html.includes(ABOUT_DEV_PLACEHOLDER),
    "Dev placeholder must not be present in prod",
  );
  assert.ok(
    !html.includes('id="about-section-bio"'),
    "Bio section must not be present when about is null in prod",
  );
});

it("renders bio placeholder in dev mode when about is null", () => {
  const html = renderToStaticMarkup(
    React.createElement(AboutView, {
      profile: verifiedProfile,
      isDev: true,
    }),
  );

  assert.match(html, /\[TODO: Owner bio placeholder/);
  assert.match(html, /about-placeholder/);
});

it("renders bio text when about is provided, both in dev and prod", () => {
  const htmlProd = renderToStaticMarkup(
    React.createElement(AboutView, {
      profile: profileWithBio,
      isDev: false,
    }),
  );
  assert.match(
    htmlProd,
    /Lead and Senior UI Engineer specializing in design systems/,
  );
  assert.ok(!htmlProd.includes(ABOUT_DEV_PLACEHOLDER));

  const htmlDev = renderToStaticMarkup(
    React.createElement(AboutView, {
      profile: profileWithBio,
      isDev: true,
    }),
  );
  assert.match(
    htmlDev,
    /Lead and Senior UI Engineer specializing in design systems/,
  );
  assert.ok(!htmlDev.includes(ABOUT_DEV_PLACEHOLDER));
});

it("renders Notepad chrome with menu bar, document body, and status bar", () => {
  const html = renderToStaticMarkup(
    React.createElement(AboutView, {
      profile: verifiedProfile,
      isDev: false,
    }),
  );

  // Menu bar
  assert.match(html, /yk-about-menubar/);
  assert.match(html, /<u>F<\/u>ile/);
  assert.match(html, /<u>E<\/u>dit/);
  assert.match(html, /<u>S<\/u>earch/);
  assert.match(html, /<u>H<\/u>elp/);

  // Document body & file banner
  assert.match(html, /yk-about-body/);
  assert.match(html, /ABOUT\.TXT/);

  // Status bar
  assert.match(html, /yk-about-statusbar/);
  assert.match(html, /Ln 1, Col 1/);
  assert.match(html, /Windows \(CRLF\)/);
  assert.match(html, /UTF-8/);
});

it("uses S02 design tokens in about.css", () => {
  const cssPath = fileURLToPath(new URL("../about.css", import.meta.url));
  const css = readFileSync(cssPath, "utf8");

  assert.match(css, /var\(--yk-font-mono/);
  assert.match(css, /var\(--yk-window-bg/);
  assert.match(css, /var\(--yk-fg/);
  assert.match(css, /var\(--yk-muted/);
  assert.match(css, /var\(--yk-accent/);
  assert.match(css, /var\(--yk-bevel-dark/);
  assert.match(css, /var\(--yk-bevel-light/);
  assert.match(css, /var\(--yk-space-1/);
  assert.match(css, /var\(--yk-space-2/);
  assert.match(css, /var\(--yk-space-3/);
  assert.match(css, /var\(--yk-space-4/);
});

it("handles empty profile gracefully without crashing", () => {
  const emptyProfile: Profile = {
    name: "Minimal Dev",
    aliases: [],
    headline: "",
    location: "",
    email: "",
    about: null,
    photo: null,
    phone: null,
    links: { linkedin: "", github: "", medium: "" },
    skills: [],
    experience: [],
    projects: [],
    writing: [],
    education: [],
    certifications: [],
  };

  const html = renderToStaticMarkup(
    React.createElement(AboutView, {
      profile: emptyProfile,
      isDev: false,
    }),
  );

  assert.match(html, /Minimal Dev/);
  assert.ok(!html.includes('aria-label="Top skills"'));
  assert.ok(!html.includes('aria-label="Education history"'));
});

// Run directly if invoked with node
let failed = 0;
for (const [name, fn] of tests) {
  try {
    fn();
    console.log(`PASS: ${name}`);
  } catch (error) {
    failed += 1;
    console.error(`FAIL: ${name}`);
    console.error(error);
  }
}

if (failed > 0) {
  process.exit(1);
}
