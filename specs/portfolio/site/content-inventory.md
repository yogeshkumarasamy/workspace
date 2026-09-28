# Content Inventory: Portfolio Rebuild

> **Status**: Companion to [prd.md](./prd.md) (PRD Approved)  
> **Date**: 2026-09-28  
> **Rule**: Use **only** verified facts below. Gaps are placeholders for the Owner — **do not invent**.  
> **Primary source**: LinkedIn PDF export → `/workspace/linkedin-profile/resume-or-export.txt`  
> **Secondary**: Medium scrape + brief-verified GitHub / full.io links

---

## 1. Verified facts (safe to render)

### Identity & contact

| Field | Value | Source |
| --- | --- | --- |
| Display name | Yogesh Kumarasamy | LinkedIn PDF (also “yogesh kumar”) |
| Name alias | yogesh kumar | LinkedIn PDF |
| Headline | Senior software engineer at FULL Creative | LinkedIn PDF |
| Location | Chennai, Tamil Nadu, India | LinkedIn PDF |
| Email | yogeshkumarasamy@gmail.com | LinkedIn PDF Contact |
| LinkedIn | https://www.linkedin.com/in/yogeshkumarasamy | LinkedIn PDF |
| Medium profile | https://medium.com/@yogeshkumarasamy | Medium scrape |
| GitHub user | yogeshkumarasamy | Brief |
| Company URL | https://full.io/ | Prior verified |
| Company blog | https://full.io/full-blog | Prior verified |

### Top skills (LinkedIn PDF)

| Skill | Source |
| --- | --- |
| Continuous Integration and Continuous Delivery (CI/CD) | LinkedIn PDF Top Skills |
| Css in js | LinkedIn PDF Top Skills |
| Vitest | LinkedIn PDF Top Skills |

### Experience (as listed on LinkedIn — keep overlapping dates)

Render in this order. **Do not invent role bullets.** `bullets: []` for every entry until Owner provides copy.

| # | Company | Title | Dates | Location | Notes |
| --- | --- | --- | --- | --- | --- |
| 1 | FULL Creative | Senior Software Engineer | July 2024 – Present | Chennai, Tamil Nadu, India | LinkedIn also shows a second line “Senior software engineer at FULL Creative” under the role (headline echo — **no extra bullets**). Company total duration on PDF: “(2 years 3 months)” as of export. |
| 2a | Trimble Inc. | Lead UI Engineer | January 2023 – July 2024 | Chennai, Tamil Nadu, India | Company group total: **3 years 6 months** |
| 2b | Trimble Inc. | Senior Software Engineer | February 2021 – January 2023 | Chennai, Tamil Nadu, India | Same company group |
| 3a | BI WORLDWIDE | Associate Specialist | September 2020 – February 2021 | Chennai, Tamil Nadu, India | Company group total: **2 years 10 months** |
| 3b | BI WORLDWIDE | Senior Software Engineer | May 2018 – September 2020 | Chennai, Tamil Nadu, India | Same company group |
| 4 | Accenture | Application Development Senior Analyst | July 2016 – April 2018 | Chennai Area, India | Overlaps Pearson dates — **keep as on LinkedIn** |
| 5 | Pearson English Business Solutions | UI Developer | January 2016 – July 2017 | Chennai Area, India | Overlaps Accenture — **keep as on LinkedIn** |
| 6 | ISGN | UI Developer | May 2014 – January 2015 | Chennai Area, India | |
| 7 | The Design Factory | Front end web developer | October 2012 – April 2014 | _(location not on PDF)_ | |

### Education

| Institution | Credential | Years | Source |
| --- | --- | --- | --- |
| RVS College of Engineering and Technology | Bachelor of Technology (B.Tech.), Information Technology | 2008 – 2012 | LinkedIn PDF |
| A V Higher Secondary School | _(degree/credential not listed)_ | 1996 – 2008 | LinkedIn PDF |

### Projects & writing (prior verified — keep)

| Kind | Value | Source |
| --- | --- | --- |
| Project | yogeshkumarasamy/vitest-portfolio — TypeScript — “volume of browser test files to stress Vitest test runs and performance” — https://github.com/yogeshkumarasamy/vitest-portfolio | Brief |
| Writing | “How SSH Makes Managing Multiple Git Accounts Easy and Secure” — FULL Creative (Medium) — Apr 17, 2025 — https://medium.com/full-creative-blog/how-ssh-makes-managing-multiple-git-accounts-easy-and-secure-1e9f43c8b071 | Medium scrape |
| Private monorepo | yogeshkumarasamy/workspace | Context only — **do not present private repo details on the public site** |

---

## 2. Gaps / placeholders (Owner fill — never fabricate)

| Field | Current status | Content-module shape |
| --- | --- | --- |
| About / bio paragraph | Still missing | `about: string \| null` — `null` until Owner writes copy |
| Experience role bullets / achievements | Still missing for every role | `bullets: string[]` — empty arrays; UI may omit bullet list when empty |
| Certifications | Incomplete prior SERP snippet (“Exam 480…”) — **not confirmed in PDF** | `certifications: []` — **omit** until Owner confirms full names |
| Phone | Unknown | `phone: string \| null` |
| Profile photo / avatar | Not retrieved | Optional asset — omit until Owner supplies |
| Social beyond LinkedIn / Medium / GitHub / email | Unknown | Only add when Owner confirms |
| The Design Factory location | Not on PDF | `location: null` or omit |

---

## 3. Recommended content module sketch (documentation only — not production code)

```ts
// Illustrative shape for apps/portfolio/src/content/profile.ts
export const profile = {
  name: "Yogesh Kumarasamy",
  nameAliases: ["yogesh kumar"],
  headline: "Senior software engineer at FULL Creative",
  location: "Chennai, Tamil Nadu, India",
  about: null, // TODO: Owner — no bio in PDF
  experience: [
    {
      title: "Senior Software Engineer",
      company: "FULL Creative",
      companyUrl: "https://full.io/",
      location: "Chennai, Tamil Nadu, India",
      startDate: "2024-07",
      endDate: null,
      isCurrent: true,
      bullets: [], // TODO: Owner — PDF has no achievement bullets
      note: "Senior software engineer at FULL Creative", // LinkedIn sub-line; not a bullet list
    },
    {
      title: "Lead UI Engineer",
      company: "Trimble Inc.",
      companyGroupTotal: "3 years 6 months",
      location: "Chennai, Tamil Nadu, India",
      startDate: "2023-01",
      endDate: "2024-07",
      isCurrent: false,
      bullets: [],
    },
    {
      title: "Senior Software Engineer",
      company: "Trimble Inc.",
      location: "Chennai, Tamil Nadu, India",
      startDate: "2021-02",
      endDate: "2023-01",
      isCurrent: false,
      bullets: [],
    },
    {
      title: "Associate Specialist",
      company: "BI WORLDWIDE",
      companyGroupTotal: "2 years 10 months",
      location: "Chennai, Tamil Nadu, India",
      startDate: "2020-09",
      endDate: "2021-02",
      isCurrent: false,
      bullets: [],
    },
    {
      title: "Senior Software Engineer",
      company: "BI WORLDWIDE",
      location: "Chennai, Tamil Nadu, India",
      startDate: "2018-05",
      endDate: "2020-09",
      isCurrent: false,
      bullets: [],
    },
    {
      title: "Application Development Senior Analyst",
      company: "Accenture",
      location: "Chennai Area, India",
      startDate: "2016-07",
      endDate: "2018-04",
      isCurrent: false,
      bullets: [],
    },
    {
      title: "UI Developer",
      company: "Pearson English Business Solutions",
      location: "Chennai Area, India",
      startDate: "2016-01",
      endDate: "2017-07",
      isCurrent: false,
      bullets: [],
    },
    {
      title: "UI Developer",
      company: "ISGN",
      location: "Chennai Area, India",
      startDate: "2014-05",
      endDate: "2015-01",
      isCurrent: false,
      bullets: [],
    },
    {
      title: "Front end web developer",
      company: "The Design Factory",
      location: null,
      startDate: "2012-10",
      endDate: "2014-04",
      isCurrent: false,
      bullets: [],
    },
  ],
  education: [
    {
      school: "RVS College of Engineering and Technology",
      degree: "Bachelor of Technology (B.Tech.), Information Technology",
      years: "2008 - 2012",
    },
    {
      school: "A V Higher Secondary School",
      degree: null,
      years: "1996 - 2008",
    },
  ],
  skills: [
    "Continuous Integration and Continuous Delivery (CI/CD)",
    "Css in js",
    "Vitest",
  ],
  certifications: [], // omit until Owner confirms
  projects: [
    {
      name: "vitest-portfolio",
      url: "https://github.com/yogeshkumarasamy/vitest-portfolio",
      language: "TypeScript",
      description:
        "volume of browser test files to stress Vitest test runs and performance",
    },
  ],
  writing: [
    {
      title: "How SSH Makes Managing Multiple Git Accounts Easy and Secure",
      venue: "FULL Creative (Medium)",
      date: "2025-04-17",
      url: "https://medium.com/full-creative-blog/how-ssh-makes-managing-multiple-git-accounts-easy-and-secure-1e9f43c8b071",
    },
  ],
  links: {
    linkedIn: "https://www.linkedin.com/in/yogeshkumarasamy",
    medium: "https://medium.com/@yogeshkumarasamy",
    github: "https://github.com/yogeshkumarasamy",
    company: "https://full.io/",
    email: "yogeshkumarasamy@gmail.com",
    phone: null, // TODO: Owner
  },
} as const;
```

---

## 4. Source files on this machine

* `/workspace/linkedin-profile/resume-or-export.txt` — **authoritative LinkedIn PDF extract**  
* `/workspace/linkedin-profile/medium-profile.md`  
* `/workspace/linkedin-profile/profile-summary.md` (pre-PDF; superseded for experience/education/skills/email)
