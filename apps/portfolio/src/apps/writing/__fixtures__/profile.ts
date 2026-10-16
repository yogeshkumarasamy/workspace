import type { Profile } from "../types";

/**
 * Verified writing facts from PRD §4.
 * S07 will own the shared `profile` module. This fixture is the stand-in.
 */
export const verifiedProfile = {
  links: {
    medium: "https://medium.com/@yogeshkumarasamy",
  },
  writing: [
    {
      title: "How SSH Makes Managing Multiple Git Accounts Easy and Secure",
      publication: "FULL Creative blog on Medium",
      date: "2025-04-17",
      href: "https://medium.com/full-creative-blog/how-ssh-makes-managing-multiple-git-accounts-easy-and-secure-1e9f43c8b071",
    },
  ],
} satisfies Profile;
