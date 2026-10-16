import React from "react";
import type { AboutAppProps, Profile } from "./types";
import { verifiedProfile } from "./__fixtures__/profile";
import "./about.css";

/**
 * Placeholder message rendered in dev mode when profile.about is null.
 * Completely omitted in production.
 */
export const ABOUT_DEV_PLACEHOLDER =
  "[TODO: Owner bio placeholder — about copy to be supplied by Owner]";

export const AboutView: React.FC<AboutAppProps> = ({
  profile: inputProfile,
  isDev: isDevProp,
}) => {
  const profile: Profile = inputProfile ?? verifiedProfile;
  const isDev = isDevProp ?? Boolean(import.meta.env?.DEV);

  const showAbout = Boolean(profile.about);
  const showPlaceholder = !showAbout && isDev;

  return (
    <div className="yk-about-app" data-testid="about-app">
      {/* Retro Notepad Menu Bar */}
      <nav className="yk-about-menubar" aria-label="Notepad Menu">
        <span className="yk-about-menu-item">
          <u>F</u>ile
        </span>
        <span className="yk-about-menu-item">
          <u>E</u>dit
        </span>
        <span className="yk-about-menu-item">
          <u>S</u>earch
        </span>
        <span className="yk-about-menu-item">
          <u>H</u>elp
        </span>
      </nav>

      {/* Notepad Document Body */}
      <div className="yk-about-body">
        <article className="yk-about-doc" aria-label="About Yogesh Kumarasamy">
          <header className="yk-about-header">
            <p className="yk-about-file-banner">C:\PORTFOLIO\ABOUT.TXT</p>
            <h1 className="yk-about-name">{profile.name}</h1>
            {profile.aliases && profile.aliases.length > 0 && (
              <p className="yk-about-aliases">
                Also known as: {profile.aliases.join(", ")}
              </p>
            )}
            {profile.headline && (
              <p className="yk-about-headline">{profile.headline}</p>
            )}
            {profile.location && (
              <p className="yk-about-location">{profile.location}</p>
            )}
          </header>

          <hr className="yk-about-divider" aria-hidden="true" />

          {/* About / Bio section */}
          {showAbout && (
            <section
              className="yk-about-section"
              aria-labelledby="about-section-bio"
            >
              <h2
                id="about-section-bio"
                className="yk-about-section-heading"
              >
                Bio
              </h2>
              <p className="yk-about-bio-text">{profile.about}</p>
            </section>
          )}

          {showPlaceholder && (
            <section
              className="yk-about-section"
              aria-labelledby="about-section-bio"
            >
              <h2
                id="about-section-bio"
                className="yk-about-section-heading"
              >
                Bio
              </h2>
              <p
                className="yk-about-placeholder"
                data-testid="about-placeholder"
              >
                {ABOUT_DEV_PLACEHOLDER}
              </p>
            </section>
          )}

          {/* Skills section */}
          {profile.skills && profile.skills.length > 0 && (
            <section
              className="yk-about-section"
              aria-labelledby="about-section-skills"
            >
              <h2
                id="about-section-skills"
                className="yk-about-section-heading"
              >
                Skills
              </h2>
              <ul className="yk-about-skills" aria-label="Top skills">
                {profile.skills.map((skill) => (
                  <li key={skill} className="yk-about-skill-item">
                    {skill}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Education section */}
          {profile.education && profile.education.length > 0 && (
            <section
              className="yk-about-section"
              aria-labelledby="about-section-education"
            >
              <h2
                id="about-section-education"
                className="yk-about-section-heading"
              >
                Education
              </h2>
              <div
                className="yk-about-education-list"
                aria-label="Education history"
              >
                {profile.education.map((edu) => (
                  <div key={edu.institution} className="yk-about-edu-card">
                    <h3 className="yk-about-edu-institution">
                      {edu.institution}
                    </h3>
                    {edu.credential && (
                      <p className="yk-about-edu-credential">{edu.credential}</p>
                    )}
                    <p className="yk-about-edu-dates">
                      {edu.start}–{edu.end}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}
        </article>
      </div>

      {/* Retro Notepad Status Bar */}
      <footer className="yk-about-statusbar" aria-label="Document status">
        <div className="yk-about-status-group">
          <span className="yk-about-status-cell">Ln 1, Col 1</span>
          <span className="yk-about-status-cell">100%</span>
        </div>
        <div className="yk-about-status-group">
          <span className="yk-about-status-cell">Windows (CRLF)</span>
          <span className="yk-about-status-cell">UTF-8</span>
        </div>
      </footer>
    </div>
  );
};

export default AboutView;
