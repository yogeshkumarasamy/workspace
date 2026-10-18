import type { Profile } from "../types";
import { profile } from "../../content/profile";

/**
 * The classic view and the desktop apps share `src/content/profile.ts`.
 * This re-export keeps fixture imports pointed at that source.
 */
export const verifiedProfile: Profile = profile;
