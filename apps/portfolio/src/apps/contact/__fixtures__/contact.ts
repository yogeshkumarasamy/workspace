import type { ContactData } from "../types";

/**
 * Verified contact facts from PRD §4 only.
 * Source: LinkedIn PDF export and PR #18 content-inventory.md.
 * No invented facts. Placeholders/omissions preserved.
 * Private workspace repo is excluded.
 */
export const verifiedContact: ContactData = {
  name: "Yogesh Kumarasamy",
  headline: "Senior Software Engineer at FULL Creative",
  location: "Chennai, Tamil Nadu, India",
  email: "yogeshkumarasamy@gmail.com",
  links: {
    linkedin: "https://www.linkedin.com/in/yogeshkumarasamy",
    github: "https://github.com/yogeshkumarasamy",
    medium: "https://medium.com/@yogeshkumarasamy",
  },
};
