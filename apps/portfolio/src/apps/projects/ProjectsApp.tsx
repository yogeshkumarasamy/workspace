import React from "react";
import type { AppProps } from "./types";
import { ProjectsView } from "./ProjectsView";
import { profile } from "../../content/profile";

export const ProjectsApp: React.FC<AppProps> = ({ windowId }) => {
  return <ProjectsView windowId={windowId} profile={profile} />;
};

export default ProjectsApp;
