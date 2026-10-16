import React from "react";
import type { Profile } from "../contracts/content";
import { verifiedProfileFixture } from "./fixtures";
import "./classic.css";

export interface ClassicViewProps {
  profile?: Profile;
}

/**
 * Helper to format ISO date strings (e.g. "2024-07", "2025-04-17", "2008") into readable English dates.
 */
function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "Present";

  const parts = dateStr.split("-");
  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  if (parts.length === 2) {
    const [year, month] = parts;
    const m = parseInt(month, 10);
    if (m >= 1 && m <= 12) {
      return `${monthNames[m - 1]} ${year}`;
    }
  }

  if (parts.length === 3) {
    const [year, month, day] = parts;
    const m = parseInt(month, 10);
    const d = parseInt(day, 10);
    if (m >= 1 && m <= 12) {
      return `${monthNames[m - 1]} ${d}, ${year}`;
    }
  }

  return dateStr;
}

/**
 * ClassicView: Canonical accessible single-page résumé fallback.
 * PRD §4, §5, §8, §13 · Ticket workspace#39 (S13)
 *
 * Designed for keyboard, screen-reader, and reduced-motion users, and busy recruiters.
 * Features semantic landmarks, single <h1>, sections: about, experience, projects,
 * writing, skills, education, contact, print stylesheet, and zero animations.
 */
export function ClassicView({
  profile = verifiedProfileFixture,
}: ClassicViewProps): React.ReactElement {
  const isDev = Boolean(
    typeof import.meta !== "undefined" &&
      import.meta.env &&
      import.meta.env.DEV,
  );

  return (
    <div className="yk-classic-view" data-testid="classic-view">
      {/* Skip to Main Landmark for Keyboard Accessibility */}
      <a href="#main-content" className="yk-classic__skip-link">
        Skip to main content
      </a>

      {/* Header Landmark */}
      <header role="banner" className="yk-classic__header">
        <div className="yk-classic__toolbar">
          <a
            href="#/"
            className="yk-classic__back-link"
            aria-label="Return to Retro Desktop view"
          >
            ← Return to Retro Desktop
          </a>
          <span className="yk-classic__print-hint" aria-hidden="true">
            Printable Résumé (Ctrl+P / Cmd+P)
          </span>
        </div>

        {/* Single H1 on the Page */}
        <h1 className="yk-classic__title">
          {profile.name}
          {profile.aliases && profile.aliases.length > 0 && (
            <span className="yk-classic__aliases">
              ({profile.aliases.join(", ")})
            </span>
          )}
        </h1>

        <p className="yk-classic__headline">{profile.headline}</p>
        <p className="yk-classic__location">{profile.location}</p>

        <ul
          className="yk-classic__header-contacts"
          aria-label="Quick contact links"
        >
          <li>
            <a
              href={`mailto:${profile.email}`}
              aria-label={`Email ${profile.email}`}
            >
              {profile.email}
            </a>
          </li>
          {profile.links.linkedin && (
            <li>
              <a
                href={profile.links.linkedin}
                target="_blank"
                rel="noopener noreferrer"
              >
                LinkedIn
              </a>
            </li>
          )}
          {profile.links.github && (
            <li>
              <a
                href={profile.links.github}
                target="_blank"
                rel="noopener noreferrer"
              >
                GitHub
              </a>
            </li>
          )}
          {profile.links.medium && (
            <li>
              <a
                href={profile.links.medium}
                target="_blank"
                rel="noopener noreferrer"
              >
                Medium
              </a>
            </li>
          )}
        </ul>

        {/* In-page navigation for keyboard & screen-reader users */}
        <nav className="yk-classic__nav" aria-label="Résumé sections">
          <ul className="yk-classic__nav-list">
            <li className="yk-classic__nav-item">
              <a href="#about">About</a>
            </li>
            <li className="yk-classic__nav-item">
              <a href="#experience">Experience</a>
            </li>
            <li className="yk-classic__nav-item">
              <a href="#projects">Projects</a>
            </li>
            <li className="yk-classic__nav-item">
              <a href="#writing">Writing</a>
            </li>
            <li className="yk-classic__nav-item">
              <a href="#skills">Skills</a>
            </li>
            <li className="yk-classic__nav-item">
              <a href="#education">Education</a>
            </li>
            <li className="yk-classic__nav-item">
              <a href="#contact">Contact</a>
            </li>
          </ul>
        </nav>
      </header>

      {/* Main Landmark */}
      <main
        id="main-content"
        className="yk-classic__main"
        role="main"
        tabIndex={-1}
      >
        {/* 1. About Section */}
        <section
          id="about"
          className="yk-classic__section"
          aria-labelledby="heading-about"
        >
          <h2 id="heading-about" className="yk-classic__section-heading">
            About
          </h2>
          {profile.about ? (
            <p>{profile.about}</p>
          ) : (
            <>
              <p>
                {profile.headline} based in {profile.location}.
              </p>
              {isDev && (
                <p className="yk-classic__placeholder">
                  [Bio pending from profile owner — hidden in production]
                </p>
              )}
            </>
          )}
        </section>

        {/* 2. Experience Section */}
        <section
          id="experience"
          className="yk-classic__section"
          aria-labelledby="heading-experience"
        >
          <h2 id="heading-experience" className="yk-classic__section-heading">
            Experience
          </h2>
          <ol className="yk-classic__item-list">
            {profile.experience.map((role, idx) => {
              const startFormatted = formatDate(role.start);
              const endFormatted = role.end ? formatDate(role.end) : "Present";
              return (
                <li key={`${role.company}-${idx}`} className="yk-classic__item">
                  <div className="yk-classic__item-header">
                    <h3 className="yk-classic__item-title">
                      {role.title} ·{" "}
                      {role.companyUrl ? (
                        <a
                          href={role.companyUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {role.company}
                        </a>
                      ) : (
                        <span>{role.company}</span>
                      )}
                    </h3>
                    <span className="yk-classic__item-meta">
                      <time dateTime={role.start}>{startFormatted}</time> –{" "}
                      {role.end ? (
                        <time dateTime={role.end}>{endFormatted}</time>
                      ) : (
                        <span>Present</span>
                      )}
                    </span>
                  </div>
                  {role.location && (
                    <div className="yk-classic__item-location">
                      {role.location}
                    </div>
                  )}
                  {role.bullets && role.bullets.length > 0 ? (
                    <ul className="yk-classic__bullets">
                      {role.bullets.map((bullet, bIdx) => (
                        <li key={bIdx}>{bullet}</li>
                      ))}
                    </ul>
                  ) : (
                    isDev && (
                      <p className="yk-classic__placeholder">
                        [Role achievements pending from profile owner — hidden
                        in production]
                      </p>
                    )
                  )}
                </li>
              );
            })}
          </ol>
        </section>

        {/* 3. Projects Section */}
        <section
          id="projects"
          className="yk-classic__section"
          aria-labelledby="heading-projects"
        >
          <h2 id="heading-projects" className="yk-classic__section-heading">
            Projects
          </h2>
          <ul className="yk-classic__item-list">
            {profile.projects.map((project, idx) => (
              <li key={`${project.name}-${idx}`} className="yk-classic__item">
                <div className="yk-classic__item-header">
                  <h3 className="yk-classic__item-title">
                    <a
                      href={project.href}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {project.name}
                    </a>
                  </h3>
                  {project.language && (
                    <span className="yk-classic__item-meta">
                      {project.language}
                    </span>
                  )}
                </div>
                <p>{project.description}</p>
              </li>
            ))}
          </ul>
        </section>

        {/* 4. Writing Section */}
        <section
          id="writing"
          className="yk-classic__section"
          aria-labelledby="heading-writing"
        >
          <h2 id="heading-writing" className="yk-classic__section-heading">
            Writing
          </h2>
          <ul className="yk-classic__item-list">
            {profile.writing.map((article, idx) => (
              <li key={`${article.title}-${idx}`} className="yk-classic__item">
                <div className="yk-classic__item-header">
                  <h3 className="yk-classic__item-title">
                    <a
                      href={article.href}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {article.title}
                    </a>
                  </h3>
                  <span className="yk-classic__item-meta">
                    {article.publication} ·{" "}
                    <time dateTime={article.date}>
                      {formatDate(article.date)}
                    </time>
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </section>

        {/* 5. Skills Section */}
        <section
          id="skills"
          className="yk-classic__section"
          aria-labelledby="heading-skills"
        >
          <h2 id="heading-skills" className="yk-classic__section-heading">
            Skills
          </h2>
          <ul
            className="yk-classic__skills-list"
            aria-label="Verified technical skills"
          >
            {profile.skills.map((skill, idx) => (
              <li key={idx}>
                <span className="yk-classic__skill-badge">{skill}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* 6. Education Section */}
        <section
          id="education"
          className="yk-classic__section"
          aria-labelledby="heading-education"
        >
          <h2 id="heading-education" className="yk-classic__section-heading">
            Education
          </h2>
          <ul className="yk-classic__item-list">
            {profile.education.map((edu, idx) => (
              <li
                key={`${edu.institution}-${idx}`}
                className="yk-classic__item"
              >
                <div className="yk-classic__item-header">
                  <h3 className="yk-classic__item-title">
                    {edu.credential ? `${edu.credential} · ` : ""}
                    {edu.institution}
                  </h3>
                  <span className="yk-classic__item-meta">
                    <time dateTime={`${edu.start}`}>{edu.start}</time> –{" "}
                    <time dateTime={`${edu.end}`}>{edu.end}</time>
                  </span>
                </div>
              </li>
            ))}
          </ul>

          {profile.certifications && profile.certifications.length > 0 ? (
            <div style={{ marginTop: "1rem" }}>
              <h4>Certifications</h4>
              <ul className="yk-classic__bullets">
                {profile.certifications.map((cert, cIdx) => (
                  <li key={cIdx}>{cert}</li>
                ))}
              </ul>
            </div>
          ) : (
            isDev && (
              <p className="yk-classic__placeholder">
                [Certifications pending from profile owner — hidden in
                production]
              </p>
            )
          )}
        </section>

        {/* 7. Contact Section */}
        <section
          id="contact"
          className="yk-classic__section"
          aria-labelledby="heading-contact"
        >
          <h2 id="heading-contact" className="yk-classic__section-heading">
            Contact
          </h2>
          <ul className="yk-classic__contact-list">
            <li className="yk-classic__contact-item">
              <span className="yk-classic__contact-label">Email:</span>
              <a href={`mailto:${profile.email}`}>{profile.email}</a>
            </li>
            {profile.links.linkedin && (
              <li className="yk-classic__contact-item">
                <span className="yk-classic__contact-label">LinkedIn:</span>
                <a
                  href={profile.links.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {profile.links.linkedin}
                </a>
              </li>
            )}
            {profile.links.github && (
              <li className="yk-classic__contact-item">
                <span className="yk-classic__contact-label">GitHub:</span>
                <a
                  href={profile.links.github}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {profile.links.github}
                </a>
              </li>
            )}
            {profile.links.medium && (
              <li className="yk-classic__contact-item">
                <span className="yk-classic__contact-label">Medium:</span>
                <a
                  href={profile.links.medium}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {profile.links.medium}
                </a>
              </li>
            )}
            {profile.phone ? (
              <li className="yk-classic__contact-item">
                <span className="yk-classic__contact-label">Phone:</span>
                <a href={`tel:${profile.phone}`}>{profile.phone}</a>
              </li>
            ) : (
              isDev && (
                <li className="yk-classic__contact-item">
                  <span className="yk-classic__contact-label">Phone:</span>
                  <span className="yk-classic__placeholder">
                    [Phone pending from profile owner — hidden in production]
                  </span>
                </li>
              )
            )}
          </ul>
        </section>
      </main>

      {/* Footer Landmark */}
      <footer role="contentinfo" className="yk-classic__footer">
        <p className="yk-classic__footer-copy">
          © {new Date().getFullYear()} {profile.name} · Plain accessible résumé
        </p>
        <a href="#/" className="yk-classic__footer-link">
          ← Switch to Retro Desktop Mode
        </a>
      </footer>
    </div>
  );
}

export default ClassicView;
