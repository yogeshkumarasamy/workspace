import type { Profile } from "../types";
import { profile as sharedProfile } from "../../../content/profile";

export const testProfile: Profile = {
  name: "Yogesh Kumarasamy",
  aliases: ["yogesh kumar"],
  headline: "Senior Software Engineer at FULL Creative",
  location: "Chennai, Tamil Nadu, India",
  email: "yogeshkumarasamy@gmail.com",
  about: null,
  photo: null,
  phone: null,
  links: {
    linkedin: "https://www.linkedin.com/in/yogeshkumarasamy",
    github: "https://github.com/yogeshkumarasamy",
    medium: "https://medium.com/@yogeshkumarasamy",
  },
  skills: sharedProfile.skills,
  skillGroups: sharedProfile.skillGroups,
  experience: [],
  projects: sharedProfile.projects,
  writing: [],
  education: [],
  certifications: [],
};

export const emptyProjectsProfile: Profile = {
  ...testProfile,
  projects: [],
};
