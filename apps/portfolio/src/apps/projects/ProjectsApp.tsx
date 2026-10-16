import React from "react";
import type { ProjectsAppProps } from "./types";
import { defaultGithubUrl, verifiedProjects } from "./__fixtures__/projects";
import "./projects.css";

/**
 * Projects App Window Component.
 * Implements a retro file-explorer interface for browsing portfolio projects.
 */
export const ProjectsApp: React.FC<ProjectsAppProps> = ({
  projects = verifiedProjects,
  githubUrl = defaultGithubUrl,
}) => {
  const isEmpty = !projects || projects.length === 0;

  return (
    <div className="yk-projects" data-testid="projects-app" role="region" aria-label="Projects Explorer">
      {/* Explorer Menu Bar */}
      <nav className="yk-projects-menubar" aria-label="Explorer Menu">
        <span className="yk-projects-menu-item">
          <u>F</u>ile
        </span>
        <span className="yk-projects-menu-item">
          <u>E</u>dit
        </span>
        <span className="yk-projects-menu-item">
          <u>V</u>iew
        </span>
        <span className="yk-projects-menu-item">
          <u>H</u>elp
        </span>
      </nav>

      {/* Explorer Toolbar */}
      <div className="yk-projects-toolbar" role="toolbar" aria-label="Explorer Toolbar">
        <button
          type="button"
          className="yk-projects-nav-btn"
          aria-label="Back"
          disabled
          tabIndex={-1}
        >
          &larr;
        </button>
        <button
          type="button"
          className="yk-projects-nav-btn"
          aria-label="Forward"
          disabled
          tabIndex={-1}
        >
          &rarr;
        </button>
        <button
          type="button"
          className="yk-projects-nav-btn"
          aria-label="Up one level"
          disabled
          tabIndex={-1}
        >
          &uarr;
        </button>
        <div className="yk-projects-toolbar-sep" aria-hidden="true" />
        <a
          href={githubUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="yk-projects-github-link"
          data-testid="projects-github-link"
          aria-label="Open Yogesh Kumarasamy GitHub profile in new tab"
        >
          <span aria-hidden="true">&#128187;</span> GitHub Profile &nearr;
        </a>
      </div>

      {/* Explorer Address Bar */}
      <div className="yk-projects-addressbar">
        <span className="yk-projects-address-label">Address</span>
        <div className="yk-projects-address-input" aria-label="Current path">
          C:\PORTFOLIO\PROJECTS
        </div>
      </div>

      {/* Explorer Main Content Area */}
      <div className="yk-projects-body">
        {isEmpty ? (
          <div className="yk-projects-empty" data-testid="projects-empty-state">
            <div className="yk-projects-empty-icon" aria-hidden="true">
              &#128193;
            </div>
            <h3 className="yk-projects-empty-title">This folder is empty.</h3>
            <p className="yk-projects-empty-desc">
              No projects found in this directory.
            </p>
            <a
              href={githubUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="yk-projects-empty-link"
              aria-label="Browse all repositories on GitHub profile"
            >
              Browse all repositories on GitHub &nearr;
            </a>
          </div>
        ) : (
          <table className="yk-projects-table" aria-label="Projects list">
            <thead>
              <tr>
                <th scope="col" className="yk-projects-col-name">Name</th>
                <th scope="col" className="yk-projects-col-lang">Language</th>
                <th scope="col" className="yk-projects-col-desc">Description</th>
              </tr>
            </thead>
            <tbody>
              {projects.map((project) => (
                <tr
                  key={project.name}
                  className="yk-projects-row"
                  data-testid={`project-item-${project.name}`}
                >
                  <td className="yk-projects-cell yk-projects-cell-name">
                    <a
                      href={project.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="yk-projects-item-link"
                      data-testid={`project-link-${project.name}`}
                      aria-label={`${project.name} repository on GitHub (opens in new tab)`}
                    >
                      <span className="yk-projects-item-icon" aria-hidden="true">
                        &#128193;
                      </span>
                      <span className="yk-projects-item-name">{project.name}</span>
                    </a>
                  </td>
                  <td className="yk-projects-cell">
                    {project.language ? (
                      <span className="yk-projects-badge">{project.language}</span>
                    ) : (
                      <span className="yk-projects-muted">&mdash;</span>
                    )}
                  </td>
                  <td className="yk-projects-cell yk-projects-desc">
                    {project.description}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Explorer Status Bar */}
      <footer className="yk-projects-statusbar" role="status" aria-label="Status bar">
        <div className="yk-projects-status-left">
          <span>{projects ? projects.length : 0} object(s)</span>
        </div>
        <div className="yk-projects-status-right">
          <a
            href={githubUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="yk-projects-status-link"
            aria-label="GitHub profile link"
          >
            github.com/yogeshkumarasamy
          </a>
        </div>
      </footer>
    </div>
  );
};

export default ProjectsApp;
