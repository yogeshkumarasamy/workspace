import { useMemo } from "react";
import type { ExperienceAppProps } from "./types";
import { defaultRoles } from "./__fixtures__/experience";
import { computeRoleDuration, formatMonthYear } from "./format";
import { groupRolesByCompany } from "./group";
import "./experience.css";

export function ExperienceApp({
  roles = defaultRoles,
  referenceDate,
}: ExperienceAppProps) {
  const companyGroups = useMemo(
    () => groupRolesByCompany(roles, referenceDate),
    [roles, referenceDate],
  );

  return (
    <div className="yk-experience" data-testid="experience-app">
      <header className="yk-experience__header">
        <h2 className="yk-experience__heading">Work Experience</h2>
        <span className="yk-experience__count">
          {roles.length} roles across {companyGroups.length} companies
        </span>
      </header>
      <ol className="yk-experience__companies" aria-label="Work experience by company">
        {companyGroups.map((group) => {
          const companySlug = group.company.toLowerCase().replace(/[^a-z0-9]+/g, "-");
          const headingId = `exp-company-${companySlug}`;

          return (
            <li key={group.company} className="yk-experience__company-item">
              <article className="yk-experience__company" aria-labelledby={headingId}>
                <header className="yk-experience__company-header">
                  <h3 id={headingId} className="yk-experience__company-name">
                    {group.companyUrl ? (
                      <a
                        href={group.companyUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="yk-experience__company-link"
                      >
                        {group.company}
                      </a>
                    ) : (
                      <span>{group.company}</span>
                    )}
                  </h3>
                  {group.roles.length > 1 && (
                    <div className="yk-experience__company-summary">
                      <span className="yk-experience__dates">
                        <time dateTime={group.start}>{formatMonthYear(group.start)}</time>
                        {" \u2013 "}
                        {group.end ? (
                          <time dateTime={group.end}>{formatMonthYear(group.end)}</time>
                        ) : (
                          <span>Present</span>
                        )}
                      </span>
                      {" \u00B7 "}
                      <span className="yk-experience__duration">{group.duration}</span>
                      {group.location && (
                        <span className="yk-experience__location">
                          {" \u00B7 "}
                          {group.location}
                        </span>
                      )}
                    </div>
                  )}
                </header>
                <ol className="yk-experience__roles" aria-label={`Roles at ${group.company}`}>
                  {group.roles.map((role) => (
                    <li
                      key={`${role.company}-${role.title}-${role.start}`}
                      className="yk-experience__role-item"
                    >
                      <div className="yk-experience__role">
                        <h4 className="yk-experience__role-title">{role.title}</h4>
                        <div className="yk-experience__role-meta">
                          <span className="yk-experience__dates">
                            <time dateTime={role.start}>{formatMonthYear(role.start)}</time>
                            {" \u2013 "}
                            {role.end ? (
                              <time dateTime={role.end}>{formatMonthYear(role.end)}</time>
                            ) : (
                              <span>Present</span>
                            )}
                          </span>
                          {" \u00B7 "}
                          <span className="yk-experience__duration">
                            {computeRoleDuration(role, referenceDate)}
                          </span>
                          {role.location && (
                            <span className="yk-experience__location">
                              {" \u00B7 "}
                              {role.location}
                            </span>
                          )}
                        </div>
                        {role.bullets && role.bullets.length > 0 ? (
                          <ul className="yk-experience__bullets">
                            {role.bullets.map((bullet, idx) => (
                              <li key={idx} className="yk-experience__bullet-item">
                                {bullet}
                              </li>
                            ))}
                          </ul>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ol>
              </article>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export default ExperienceApp;
