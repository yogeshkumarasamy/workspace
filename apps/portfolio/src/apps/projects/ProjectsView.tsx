import React from "react";
import type { ProjectsViewProps, Profile, Project } from "./types";
import { groupProjectsByCompany } from "../../content/groupProjects";
import { testProfile } from "./__fixtures__/profile";
import "./projects.css";

const NEW_TAB = " (opens in a new tab)";

function ProjectRow({ project }: { project: Project }) {
  const title = project.href ? (
    <a
      href={project.href}
      className="yk-projects__item-title"
      target="_blank"
      rel="noopener noreferrer"
    >
      <span className="yk-projects__item-icon" aria-hidden="true">
        📦
      </span>
      <span>{project.name}</span>
      <span className="yk-projects__sr">{NEW_TAB}</span>
    </a>
  ) : (
    <span className="yk-projects__item-title">
      <span className="yk-projects__item-icon" aria-hidden="true">
        📦
      </span>
      <span>{project.name}</span>
    </span>
  );

  return (
    <li className="yk-projects__item">
      <div className="yk-projects__item-header">
        {title}
        {project.language ? (
          <span className="yk-projects__badge">{project.language}</span>
        ) : null}
      </div>
      {project.description ? (
        <p className="yk-projects__description">{project.description}</p>
      ) : null}
    </li>
  );
}

export const ProjectsView: React.FC<ProjectsViewProps> = ({
  windowId,
  profile: inputProfile,
}) => {
  const profile: Profile = inputProfile ?? testProfile;
  const headingId = `${windowId}-heading`;
  const projects = profile.projects ?? [];
  const githubHref = profile.links?.github;

  return (
    <section className="yk-projects" aria-labelledby={headingId}>
      <header className="yk-projects__pathbar">
        <span className="yk-projects__pathbar-label">Location:</span>
        <code>C:\PROJECTS</code>
      </header>

      <h2 id={headingId} className="yk-projects__sr">
        Projects
      </h2>

      {projects.length === 0 ? (
        <p className="yk-projects__empty" data-testid="projects-empty">
          No projects listed.
        </p>
      ) : projects.some((project) => project.company) ? (
        <ul className="yk-projects__list" data-testid="projects-list">
          {groupProjectsByCompany(projects).map((group) => (
            <li key={group.company || group.projects[0]?.name} className="yk-projects__company">
              {group.company ? (
                <h3 className="yk-projects__company-name">{group.company}</h3>
              ) : null}
              <ul className="yk-projects__company-projects">
                {group.projects.map((project) => (
                  <ProjectRow key={`${group.company}-${project.name}`} project={project} />
                ))}
              </ul>
            </li>
          ))}
        </ul>
      ) : (
        <ul className="yk-projects__list" data-testid="projects-list">
          {projects.map((project) => (
            <ProjectRow key={project.name} project={project} />
          ))}
        </ul>
      )}

      {githubHref && (
        <footer className="yk-projects__footer">
          <p>
            More repositories on{" "}
            <a
              href={githubHref}
              target="_blank"
              rel="noopener noreferrer"
              data-testid="github-profile-link"
            >
              GitHub profile
              <span className="yk-projects__sr">{NEW_TAB}</span>
            </a>
          </p>
        </footer>
      )}
    </section>
  );
};

export default ProjectsView;
