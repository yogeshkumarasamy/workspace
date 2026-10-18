/**
 * Landmark checks use role queries on server-rendered markup.
 * S01 owns the test runner and dependencies, so this file runs under node
 * and does not import jest-axe or Testing Library.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ClassicView } from "../index";
import { verifiedProfile } from "../__fixtures__/profile";
import { formatIsoDate, formatRoleDates, formatYearMonth, httpsHref } from "../format";
import type { Profile } from "../types";
import { getAllByRole, getByRole, queryByRole } from "./roleQuery";

const dev = import.meta.env.DEV;

function readOwn(relativePath: string): string {
  const candidates = [relativePath, `apps/portfolio/${relativePath}`];
  for (const candidate of candidates) {
    try {
      return readFileSync(candidate, "utf8");
    } catch {
      // Try the repo-root path when the test runs from the workspace root.
    }
  }
  throw new Error(`Could not read ${relativePath} from ${process.cwd()}`);
}

function render(profile: Profile = verifiedProfile) {
  const html = renderToStaticMarkup(createElement(ClassicView, { profile }));
  return {
    html,
    getByRole: (role: string, options?: { name?: string | RegExp; level?: number }) =>
      getByRole(html, role, options),
    getAllByRole: (role: string, options?: { name?: string | RegExp; level?: number }) =>
      getAllByRole(html, role, options),
    queryByRole: (role: string, options?: { name?: string | RegExp; level?: number }) =>
      queryByRole(html, role, options),
  };
}

import { it } from "vitest";

it("formats verified dates without inventing a month", () => {
  assert.equal(formatYearMonth("2024-07"), "Jul 2024");
  assert.equal(formatYearMonth("2012-10"), "Oct 2012");
  assert.equal(formatYearMonth("not-a-date"), "not-a-date");
  assert.equal(formatIsoDate("2025-04-17"), "17 Apr 2025");
  assert.equal(formatRoleDates("2024-07", null), "Jul 2024 \u2013 Present");
  assert.equal(formatRoleDates("2023-01", "2024-07"), "Jan 2023 \u2013 Jul 2024");
  assert.equal(httpsHref("https://full.io/"), "https://full.io/");
  assert.equal(httpsHref("javascript:alert(1)"), null);
});

it("renders one h1 and the résumé landmarks", () => {
  const view = render();
  assert.equal(view.getAllByRole("heading", { level: 1 }).length, 1);
  assert.equal(view.getByRole("heading", { level: 1 }).name, "Yogesh Kumarasamy");
  assert.equal(view.getAllByRole("banner").length, 1);
  assert.equal(view.getAllByRole("main").length, 1);
  assert.equal(view.getByRole("navigation", { name: "Desktop" }).name, "Desktop");
  assert.equal(view.getByRole("navigation", { name: "On this page" }).name, "On this page");

  for (const name of ["About", "Experience", "Projects", "Writing", "Skills", "Education", "Contact"]) {
    assert.equal(view.getByRole("region", { name }).name, name);
    assert.equal(view.getByRole("heading", { level: 2, name }).name, name);
  }
});

it("links back to the desktop hash route", () => {
  const view = render();
  const back = view.getByRole("link", { name: "Back to desktop" });
  assert.equal(back.href, "#/");
  const skip = view.getByRole("link", { name: "Skip to content" });
  assert.equal(skip.href, "#classic-content");
});

it("shows verified profile facts and no invented bio, phone, or achievements", () => {
  const view = render();
  assert.match(view.html, /Senior Software Engineer at FULL Creative/);
  assert.match(view.html, /Also known as yogesh kumar/);
  assert.match(view.html, /Chennai, Tamil Nadu, India/);

  for (const role of verifiedProfile.experience) {
    assert.ok(view.getAllByRole("heading", { level: 3, name: role.company }).length >= 1);
    assert.match(view.html, new RegExp(role.title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }

  assert.equal(view.getAllByRole("heading", { name: "Trimble Inc." }).length, 2);
  assert.equal(view.getAllByRole("heading", { name: "BI WORLDWIDE" }).length, 3);
  assert.match(view.html, /Jul 2024/);
  assert.match(view.html, /Present/);
  assert.equal(view.getByRole("link", { name: "FULL Creative" }).href, "https://full.io/");

  const designFactory = view.html.slice(view.html.indexOf("Front end web developer"));
  assert.equal(designFactory.includes("Chennai"), false);

  assert.equal(view.html.toLowerCase().includes("vitest-portfolio"), false);
  assert.equal(
    view.getByRole("link", { name: "Booking page" }).href,
    "https://anywhere.setmore.com/kevin-payne",
  );
  assert.equal(view.getByRole("link", { name: "BaseApp" }).href, "https://go.setmore.com/");
  assert.equal(
    view.getByRole("link", { name: "ChatSupport" }).href,
    "https://chatsupport.co/",
  );
  assert.equal(view.getByRole("heading", { level: 3, name: "Full Creative" }).name, "Full Creative");
  assert.equal(view.getByRole("heading", { level: 3, name: "Trimble" }).name, "Trimble");
  assert.equal(view.getByRole("heading", { level: 3, name: "Pearson English" }).name, "Pearson English");
  assert.match(view.html, /Kuebix/);
  assert.equal(view.queryByRole("link", { name: "Kuebix" }), null);
  assert.equal(
    view.getByRole("link", { name: "Open Projects on desktop" }).href,
    "#/app/projects",
  );
  assert.equal(
    view.getByRole("link", { name: "Open Experience on desktop" }).href,
    "#/app/experience",
  );

  const article = view.getByRole("link", {
    name: "How SSH Makes Managing Multiple Git Accounts Easy and Secure",
  });
  assert.equal(
    article.href,
    "https://medium.com/full-creative-blog/how-ssh-makes-managing-multiple-git-accounts-easy-and-secure-1e9f43c8b071",
  );
  assert.match(view.html, /FULL Creative blog on Medium/);
  assert.match(view.html, /17 Apr 2025/);

  for (const skill of verifiedProfile.skills) {
    assert.equal(view.getByRole("listitem", { name: skill }).name, skill);
  }
  for (const group of verifiedProfile.skillGroups ?? []) {
    assert.equal(view.getByRole("heading", { level: 3, name: group.label }).name, group.label);
    for (const skill of group.skills) {
      assert.equal(view.getByRole("listitem", { name: skill }).name, skill);
    }
  }
  assert.equal(view.getByRole("link", { name: "Projects" }).href, "#/classic/projects");

  assert.equal(
    view.getByRole("heading", { name: "RVS College of Engineering and Technology" }).name,
    "RVS College of Engineering and Technology",
  );
  assert.match(view.html, /B\.Tech\., Information Technology/);
  assert.match(view.html, /2008–2012/);

  const email = view.getByRole("link", { name: "yogeshkumarasamy@gmail.com" });
  assert.equal(email.href, "mailto:yogeshkumarasamy@gmail.com");
  assert.equal(view.getByRole("link", { name: "LinkedIn" }).href, verifiedProfile.links.linkedin);
  assert.equal(view.getByRole("link", { name: "GitHub" }).href, verifiedProfile.links.github);
  assert.equal(view.getByRole("link", { name: "Medium" }).href, verifiedProfile.links.medium);

  assert.equal(view.html.includes("tel:"), false);
  assert.equal(view.html.includes("yogeshkumarasamy/workspace"), false);
  assert.equal(view.queryByRole("region", { name: "Certifications" }), null);
  assert.equal(view.html.includes("Placeholder:"), dev);
});

it("renders supplied optional fields and refuses non-https urls", () => {
  const profile: Profile = {
    ...verifiedProfile,
    about: "Fixture bio for the renderer.",
    photo: "/photo.jpg",
    phone: "+1-555-0100",
    certifications: ["Fixture certification."],
    experience: [
      {
        ...verifiedProfile.experience[0],
        bullets: ["Fixture achievement."],
      },
    ],
    projects: [
      {
        name: "Unsafe fixture",
        description: "Fixture description.",
        href: "javascript:alert(1)",
      },
    ],
  };
  const view = render(profile);
  assert.match(view.html, /Fixture bio for the renderer\./);
  assert.match(view.html, /<img class="yk-classic__photo" src="\/photo\.jpg" alt=""/);
  assert.equal(view.getByRole("link", { name: "+1-555-0100" }).href, "tel:+1-555-0100");
  assert.match(view.html, /Fixture achievement\./);
  assert.equal(view.getByRole("region", { name: "Certifications" }).name, "Certifications");
  assert.match(view.html, /Fixture certification\./);
  assert.equal(view.html.includes("javascript:"), false);
  assert.match(view.html, /Unsafe fixture/);
  assert.equal(view.queryByRole("link", { name: "Unsafe fixture" }), null);
});

it("keeps an empty profile to a single h1 and the seven sections", () => {
  const profile: Profile = {
    name: "Empty Fixture",
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
  const view = render(profile);
  assert.equal(view.getAllByRole("heading", { level: 1 }).length, 1);
  assert.equal(view.getByRole("heading", { level: 1 }).name, "Empty Fixture");
  assert.equal(view.getAllByRole("region").length, 7);
  assert.equal(view.queryByRole("link", { name: "LinkedIn" }), null);
  assert.equal(view.html.includes("mailto:"), false);
});

it("ships a print stylesheet and does not animate", () => {
  const screen = readOwn("src/classic/classic.css");
  const print = readOwn("src/classic/print.css");
  assert.match(screen, /var\(--yk-bg/);
  assert.match(screen, /var\(--yk-fg/);
  assert.match(screen, /var\(--yk-accent/);
  assert.match(screen, /var\(--yk-focus/);
  assert.match(screen, /animation:\s*none/);
  assert.match(screen, /prefers-reduced-motion/);
  assert.equal(screen.includes("@keyframes"), false);
  assert.equal(screen.includes("scanline"), false);
  assert.match(print, /@media print/);
  assert.match(print, /\.yk-classic__desktop/);
  assert.match(print, /attr\(href\)/);
  assert.equal(print.includes("@keyframes"), false);
});

// End of tests
