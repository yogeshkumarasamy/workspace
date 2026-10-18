import type { Profile } from "../types";
import { profile } from "../../../content/profile";

/**
 * Shared with classic view and the other desktop apps via `src/content/profile.ts`.
 */
export const verifiedProfile: Profile = profile;

/**
 * Fixture profile with an explicit about bio for testing non-null scenarios.
 */
export const profileWithBio: Profile = {
  ...verifiedProfile,
  about:
    "Lead and Senior UI Engineer specializing in design systems, CI/CD, and developer tooling.",
};
