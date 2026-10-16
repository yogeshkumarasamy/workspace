import { describe, it, expect } from "vitest";
import { personJsonLd } from "../index";
import { verifiedProfileFixture } from "../__fixtures__/profile";
import type { Profile } from "../types";

describe("personJsonLd", () => {
  it("generates valid schema.org Person data matching verified profile", () => {
    const jsonLd = personJsonLd(verifiedProfileFixture);

    expect(jsonLd["@context"]).toBe("https://schema.org");
    expect(jsonLd["@type"]).toBe("Person");
    expect(jsonLd.name).toBe("Yogesh Kumarasamy");
    expect(jsonLd.jobTitle).toBe("Senior Software Engineer");

    const worksFor = jsonLd.worksFor as { "@type": string; name: string; url: string };
    expect(worksFor?.name).toBe("FULL Creative");
    expect(worksFor?.url).toBe("https://full.io/");

    const sameAs = jsonLd.sameAs as string[];
    expect(sameAs).toContain("https://www.linkedin.com/in/yogeshkumarasamy");
    expect(sameAs).toContain("https://github.com/yogeshkumarasamy");
    expect(sameAs).toContain("https://medium.com/@yogeshkumarasamy");

    expect(jsonLd.email).toBe("mailto:yogeshkumarasamy@gmail.com");
    expect(jsonLd.url).toBe("https://yogeshkumarasamy.in");

    const aliases = jsonLd.alternateName as string[];
    expect(aliases).toContain("yogesh kumar");

    const skills = jsonLd.knowsAbout as string[];
    expect(skills).toContain("Vitest");
    expect(skills).toContain("Continuous Integration and Continuous Delivery (CI/CD)");

    const alumni = jsonLd.alumniOf as Array<{ name: string }>;
    expect(alumni?.some((a) => a.name === "RVS College of Engineering and Technology")).toBe(true);
  });

  it("handles minimal profile gracefully without inventing facts", () => {
    const minimalProfile: Profile = {
      name: "Minimal Dev",
      aliases: [],
      headline: "Frontend Engineer",
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

    const jsonLd = personJsonLd(minimalProfile);
    expect(jsonLd.name).toBe("Minimal Dev");
    expect(jsonLd.jobTitle).toBe("Frontend Engineer");
    expect(Array.isArray(jsonLd.sameAs) && jsonLd.sameAs.length === 0).toBe(true);
    expect(jsonLd.email).toBe(undefined);
  });

  it("extracts job title from headline when experience is empty", () => {
    const profileWithHeadline: Profile = {
      ...verifiedProfileFixture,
      experience: [],
      headline: "Principal Architect at Acme Corp",
    };

    const jsonLd = personJsonLd(profileWithHeadline);
    expect(jsonLd.jobTitle).toBe("Principal Architect");
  });
});
