import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import React from "react";
import { describe, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { verifiedProfile, profileWithBio } from "../__fixtures__/profile";
import type { Profile } from "../types";
import { AboutView, ABOUT_DEV_PLACEHOLDER } from "../AboutApp";
import aboutAppDef from "../index";

describe("About App Window (S08)", () => {
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

    // Name and aliases
    assert.match(html, /Yogesh Kumarasamy/);
    assert.match(html, /yogesh kumar/);

    // Headline and Location
    assert.match(html, /Senior Software Engineer at FULL Creative/);
    assert.match(html, /Chennai, Tamil Nadu, India/);

    // Shared skills list and groups
    assert.match(html, /HTML5/);
    assert.match(html, /React\.js/);
    assert.match(html, /Caching and remote task caching in CI/);
    assert.match(html, /pnpm/);
    assert.match(html, /Monorepos/);
    assert.match(html, /Moonrepo/);
    assert.match(html, /Turborepo/);
    assert.match(html, /Design tools/);
    assert.match(html, /Figma/);
    assert.match(html, /Agentic tools/);
    assert.match(html, /Antigravity/);
    assert.equal(html.toLowerCase().includes("vitest-portfolio"), false);
    assert.equal(html.includes("CSS-in-JS"), false);

    // Education
    assert.match(html, /RVS College of Engineering and Technology/);
    assert.match(html, /B\.Tech\., Information Technology/);
    assert.match(html, /2008[–\s-]+2012/);

    // No invented facts / workspace repo mention
    assert.ok(!html.includes("yogeshkumarasamy/workspace"));
  });

  it("hides bio placeholder in production when about is null", () => {
    const htmlProd = renderToStaticMarkup(
      React.createElement(AboutView, {
        profile: verifiedProfile,
        isDev: false,
      }),
    );

    assert.ok(!htmlProd.includes(ABOUT_DEV_PLACEHOLDER));
    assert.ok(!htmlProd.includes("TODO"));
  });

  it("renders bio placeholder in dev mode when about is null", () => {
    const htmlDev = renderToStaticMarkup(
      React.createElement(AboutView, {
        profile: verifiedProfile,
        isDev: true,
      }),
    );

    assert.ok(htmlDev.includes(ABOUT_DEV_PLACEHOLDER));
  });

  it("treats whitespace-only or empty about as null (omitted in prod, placeholder in dev)", () => {
    const blankBioProfile: Profile = {
      ...verifiedProfile,
      about: "   \n\t  ",
    };

    const htmlProd = renderToStaticMarkup(
      React.createElement(AboutView, {
        profile: blankBioProfile,
        isDev: false,
      }),
    );
    assert.ok(!htmlProd.includes(ABOUT_DEV_PLACEHOLDER));

    const htmlDev = renderToStaticMarkup(
      React.createElement(AboutView, {
        profile: blankBioProfile,
        isDev: true,
      }),
    );
    assert.ok(htmlDev.includes(ABOUT_DEV_PLACEHOLDER));
  });

  it("formats single-year education as single year without dash", () => {
    const singleYearProfile: Profile = {
      ...verifiedProfile,
      education: [
        {
          institution: "Test Institute",
          credential: "Cert",
          start: 2020,
          end: 2020,
        },
      ],
    };

    const html = renderToStaticMarkup(
      React.createElement(AboutView, {
        profile: singleYearProfile,
        isDev: false,
      }),
    );
    assert.match(html, />2020<\//);
    assert.ok(!html.includes("2020 – 2020"));
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
    const candidates = [
      path.resolve(process.cwd(), "apps/portfolio/src/apps/about/about.css"),
      path.resolve(process.cwd(), "src/apps/about/about.css"),
    ];
    const cssPath = candidates.find((c) => existsSync(c));
    assert.ok(cssPath, "about.css must exist");
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
});
