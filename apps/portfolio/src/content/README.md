# Portfolio Content Data Module (`src/content`)

This directory serves as the **single source of truth** for all site content across the retro portfolio ("YK-OS"), including:

- **Desktop Windows**: About, Experience, Projects, Writing, Contact
- **Terminal App**: `whoami`, `about`, `experience`, `projects`, `writing`, `skills`, `contact` commands
- **Classic View**: Accessible semantic single-page fallback résumé
- **SEO & Meta**: Person JSON-LD schema (`personJsonLd(profile)`) and `<noscript>` fallback

All content is strongly typed against `Profile` (from `src/content/types.ts`, matching PRD §13.1).

---

## Verified Content & Constraints

All data adheres to **PRD §4 (Verified facts only — never invent)**:

- **Source**: LinkedIn export and verified content inventory.
- **Experience Order**: Reverse-chronological matching LinkedIn exactly (overlaps preserved).
- **Date Format**: ISO month format (`YYYY-MM`, e.g., `"2024-07"`) or `null` for current ongoing roles.
- **Private Repos**: Internal/private repositories (such as `workspace`) must **never** be listed in `projects`.

---

## Owner TODOs: How to Populate Placeholders

The following fields are initialized as empty/null placeholders per PRD §4. As the Owner, update `src/content/profile.ts` to populate them:

### 1. Bio / About (`about`)

- **Location**: `profile.about` in `src/content/profile.ts`
- **Current value**: `null`
- **How to fill**: Replace `null` with a string containing your personal bio, engineering focus, and background.
  ```ts
  about: "Senior Frontend Engineer with 12+ years of experience specializing in web performance, CI/CD systems, and modern UI architectures...",
  ```

### 2. Profile Photo (`photo`)

- **Location**: `profile.photo` in `src/content/profile.ts`
- **Current value**: `null`
- **How to fill**: Add an image file under `public/` (e.g., `public/photo.jpg`) and reference its root path or an external HTTPS URL:
  ```ts
  photo: "/photo.jpg",
  ```

### 3. Contact Phone (`phone`)

- **Location**: `profile.phone` in `src/content/profile.ts`
- **Current value**: `null`
- **How to fill**: Provide your international phone number as a string, or keep `null` to exclude phone from public contact channels:
  ```ts
  phone: "+91 90000 00000", // or null
  ```

### 4. Certifications (`certifications`)

- **Location**: `profile.certifications` in `src/content/profile.ts`
- **Current value**: `[]`
- **How to fill**: Add verified certification names as strings in the array:
  ```ts
  certifications: [
    "AWS Certified Solutions Architect",
    "Meta Front-End Developer Professional Certificate",
  ],
  ```

### 5. Role Achievements (`experience[].bullets`)

- **Location**: `experience[].bullets` for each entry in `profile.experience`
- **Current value**: `[]`
- **How to fill**: Add impact bullets and key accomplishments for each role:
  ```ts
  {
    company: "FULL Creative",
    companyUrl: "https://full.io/",
    title: "Senior Software Engineer",
    start: "2024-07",
    end: null,
    location: "Chennai, Tamil Nadu, India",
    bullets: [
      "Led frontend architecture across multi-product SaaS ecosystem using React and TypeScript.",
      "Optimized build and test execution pipelines using Vitest and Turborepo.",
    ],
  },
  ```
  _Note: UI components will omit bullet lists when `bullets` is empty._

---

## Verifying Changes

After updating profile data, run:

```bash
pnpm --filter @apps/portfolio lint
pnpm --filter @apps/portfolio test
pnpm --filter @apps/portfolio build
```

Unit tests under `src/content/__tests__/` automatically assert shape validity, non-empty strings, reverse-chronological experience ordering, and absence of private repositories.
