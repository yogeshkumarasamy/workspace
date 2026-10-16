import { describe, it, expect } from "vitest";
import { createElement, type ComponentType, type LazyExoticComponent } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import writing from "../index";
import { verifiedProfile } from "../__fixtures__/profile";
import { formatIsoDate, httpsHref, isoDateTime } from "../format";
import type { AppProps, Profile } from "../types";
import WritingApp from "../WritingApp";
import { WritingView } from "../WritingView";

const ARTICLE_HREF =
  "https://medium.com/full-creative-blog/how-ssh-makes-managing-multiple-git-accounts-easy-and-secure-1e9f43c8b071";
const ARTICLE_TITLE = "How SSH Makes Managing Multiple Git Accounts Easy and Secure";
const MEDIUM_PROFILE = "https://medium.com/@yogeshkumarasamy";

function render(node: ReturnType<typeof createElement>) {
  return renderToStaticMarkup(node);
}

function view(profile: Profile, windowId = "writing-window") {
  return render(createElement(WritingView, { windowId, profile }));
}

describe("Writing App", () => {
  it("formats calendar dates and refuses non-https links", () => {
    expect(formatIsoDate("2025-04-17")).toBe("17 Apr 2025");
    expect(formatIsoDate("not-a-date")).toBe("not-a-date");
    expect(isoDateTime("2025-04-17")).toBe("2025-04-17");
    expect(isoDateTime("2025-13-17")).toBeNull();
    expect(isoDateTime("2025-04")).toBeNull();
    expect(httpsHref(MEDIUM_PROFILE)).toBe(MEDIUM_PROFILE);
    expect(httpsHref("javascript:alert(1)")).toBeNull();
    expect(httpsHref("http://medium.com/@yogeshkumarasamy")).toBeNull();
  });

  it("exports the writing app definition at order 4", () => {
    expect(writing.id).toBe("writing");
    expect(writing.title).toBe("Writing");
    expect(writing.order).toBe(4);
    expect(writing.icon).toBe("✎");
    expect(writing.defaultSize.w).toBe(480);
    expect(writing.defaultSize.h).toBe(360);
    const lazyType = (writing.component as LazyExoticComponent<ComponentType<AppProps>>).$$typeof;
    expect(lazyType).toBe(Symbol.for("react.lazy"));
  });

  it("lists profile.writing with publication and a time date", () => {
    const html = view(verifiedProfile);
    expect(html).toMatch(new RegExp(`href="${ARTICLE_HREF}"`));
    expect(html).toMatch(new RegExp(ARTICLE_TITLE));
    expect(html).toMatch(/FULL Creative blog on Medium/);
    expect(html).toMatch(/<time [^>]*datetime="2025-04-17">17 Apr 2025<\/time>/i);
    expect(html).toMatch(/id="writing-window-heading"/);
    expect(html.includes("yogeshkumarasamy/workspace")).toBe(false);
  });

  it("links to the Medium profile", () => {
    const html = render(createElement(WritingApp, { windowId: "win-1" }));
    expect(html).toMatch(new RegExp(`href="${MEDIUM_PROFILE}"`));
    expect(html).toMatch(/Medium profile/);
    expect(html).toMatch(/rel="noreferrer"/);
    expect(html).toMatch(/id="win-1-heading"/);
    expect(html).toMatch(/<time [^>]*datetime="2025-04-17">/i);
  });

  it("lists every article and hides the empty state", () => {
    const profile: Profile = {
      ...verifiedProfile,
      writing: [verifiedProfile.writing[0], verifiedProfile.writing[0]],
    };
    const html = view(profile, "win-2");
    const times = html.match(/<time /g) ?? [];
    expect(times.length).toBe(2);
    expect(html.includes("No articles listed.")).toBe(false);
  });

  it("shows an empty list without inventing articles", () => {
    const html = view({ ...verifiedProfile, writing: [] }, "win-empty");
    expect(html).toMatch(/No articles listed\./);
    expect(html.includes("<time")).toBe(false);
    expect(html.includes(ARTICLE_TITLE)).toBe(false);
    expect(html).toMatch(new RegExp(`href="${MEDIUM_PROFILE}"`));
  });

  it("does not turn unsafe urls into links and skips an invalid time", () => {
    const html = view(
      {
        links: { medium: "javascript:alert(1)" },
        writing: [
          {
            ...verifiedProfile.writing[0],
            href: "javascript:alert(1)",
            date: "not-a-date",
          },
        ],
      },
      "win-unsafe",
    );
    expect(html.includes("javascript:")).toBe(false);
    expect(html.includes("<time")).toBe(false);
    expect(html).toMatch(/not-a-date/);
    expect(html).toMatch(new RegExp(ARTICLE_TITLE));
    expect(html.includes("Medium profile")).toBe(false);
  });
});
