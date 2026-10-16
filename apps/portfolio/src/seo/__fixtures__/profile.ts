import type { Profile } from "../types";

/**
 * Verified profile fixture strictly sourced from PRD §4.
 * No invented facts.
 */
export const verifiedProfileFixture: Profile = {
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
  skills: [
    "Continuous Integration and Continuous Delivery (CI/CD)",
    "CSS-in-JS",
    "Vitest",
  ],
  experience: [
    {
      company: "FULL Creative",
      title: "Senior Software Engineer",
      start: "2024-07",
      end: "present",
      location: "Chennai, Tamil Nadu, India",
      bullets: [],
    },
    {
      company: "Trimble Inc.",
      title: "Lead UI Engineer",
      start: "2023-01",
      end: "2024-07",
      location: "Chennai, Tamil Nadu, India",
      bullets: [],
    },
    {
      company: "Trimble Inc.",
      title: "Senior Software Engineer",
      start: "2021-02",
      end: "2023-01",
      location: "Chennai, Tamil Nadu, India",
      bullets: [],
    },
    {
      company: "BI WORLDWIDE",
      title: "Associate Specialist",
      start: "2020-09",
      end: "2021-02",
      location: "Chennai, Tamil Nadu, India",
      bullets: [],
    },
    {
      company: "BI WORLDWIDE",
      title: "Senior Software Engineer",
      start: "2018-05",
      end: "2020-09",
      location: "Chennai, Tamil Nadu, India",
      bullets: [],
    },
    {
      company: "Accenture",
      title: "Application Development Senior Analyst",
      start: "2016-07",
      end: "2018-04",
      location: "Chennai Area, India",
      bullets: [],
    },
    {
      company: "Pearson English Business Solutions",
      title: "UI Developer",
      start: "2016-01",
      end: "2017-07",
      location: "Chennai Area, India",
      bullets: [],
    },
    {
      company: "ISGN",
      title: "UI Developer",
      start: "2014-05",
      end: "2015-01",
      location: "Chennai Area, India",
      bullets: [],
    },
    {
      company: "The Design Factory",
      title: "Front end web developer",
      start: "2012-10",
      end: "2014-04",
      location: null,
      bullets: [],
    },
  ],
  projects: [
    {
      name: "vitest-portfolio",
      summary:
        "volume of browser test files to stress Vitest test runs and performance",
      url: "https://github.com/yogeshkumarasamy/vitest-portfolio",
      tags: ["TypeScript"],
    },
  ],
  writing: [
    {
      title: "How SSH Makes Managing Multiple Git Accounts Easy and Secure",
      url: "https://medium.com/full-creative-blog/how-ssh-makes-managing-multiple-git-accounts-easy-and-secure-1e9f43c8b071",
      date: "2025-04-17",
      publisher: "FULL Creative blog on Medium",
    },
  ],
  education: [
    {
      institution: "RVS College of Engineering and Technology",
      degree: "Bachelor of Technology (B.Tech.)",
      field: "Information Technology",
      start: 2008,
      end: 2012,
    },
  ],
  certifications: [],
};
