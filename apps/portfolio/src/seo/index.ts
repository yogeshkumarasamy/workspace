import type { Profile } from "./types";

/**
 * Returns a Schema.org Person JSON-LD object for the given profile.
 * PRD §10: JSON-LD Person (name, jobTitle, worksFor FULL Creative, sameAs LinkedIn/GitHub/Medium)
 */
export function personJsonLd(profile: Profile): Record<string, unknown> {
  const currentRole = profile.experience.find(
    (r) => r.end === "present" || r.company.toLowerCase().includes("full creative")
  );

  const jobTitle =
    currentRole?.title ||
    (profile.headline.includes(" at ")
      ? profile.headline.split(" at ")[0]?.trim()
      : profile.headline);

  const sameAs: string[] = [
    profile.links.linkedin,
    profile.links.github,
    profile.links.medium,
  ].filter((link): link is string => Boolean(link && link.trim()));

  const worksFor = {
    "@type": "Organization",
    name: "FULL Creative",
    url: "https://full.io/",
  };

  const jsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: profile.name,
    jobTitle,
    worksFor,
    url: "https://yogeshkumarasamy.in",
    email: profile.email ? `mailto:${profile.email}` : undefined,
    sameAs,
  };

  if (profile.aliases && profile.aliases.length > 0) {
    jsonLd.alternateName = profile.aliases;
  }

  if (profile.location) {
    jsonLd.address = {
      "@type": "PostalAddress",
      addressLocality: profile.location,
    };
  }

  if (profile.skills && profile.skills.length > 0) {
    jsonLd.knowsAbout = profile.skills;
  }

  if (profile.education && profile.education.length > 0) {
    jsonLd.alumniOf = profile.education.map((edu) => ({
      "@type": "EducationalOrganization",
      name: edu.institution,
      ...(edu.degree || edu.field
        ? {
            hasCredential: {
              "@type": "EducationalOccupationalCredential",
              credentialCategory: edu.degree,
              educationalLevel: edu.field,
            },
          }
        : {}),
    }));
  }

  return jsonLd;
}

export type { Profile } from "./types";
