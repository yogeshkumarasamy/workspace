import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import projectsApp, { ProjectsView } from "../index";
import { testProfile, emptyProjectsProfile } from "../__fixtures__/profile";

describe("Projects App", () => {
  it("matches AppDefinition contract requirements", () => {
    expect(projectsApp.id).toBe("projects");
    expect(projectsApp.order).toBe(3);
    expect(projectsApp.title).toBe("Projects");
    expect(projectsApp.icon).toBe("📁");
    expect(projectsApp.defaultSize).toEqual({ w: 580, h: 420 });
    expect(projectsApp.component).toBeDefined();
  });

  it("renders verified projects list with explorer styling and links", () => {
    render(<ProjectsView windowId="test-win" profile={testProfile} />);

    expect(screen.getByText("C:\\PROJECTS")).toBeInTheDocument();

    const projectLink = screen.getByRole("link", { name: /vitest-portfolio/i });
    expect(projectLink).toBeInTheDocument();
    expect(projectLink).toHaveAttribute(
      "href",
      "https://github.com/yogeshkumarasamy/vitest-portfolio",
    );
    expect(projectLink).toHaveAttribute("target", "_blank");
    expect(projectLink.getAttribute("rel")).toContain("noopener");

    expect(screen.getByText("TypeScript")).toBeInTheDocument();
    expect(
      screen.getByText(/volume of browser test files to stress Vitest/i),
    ).toBeInTheDocument();

    const githubProfileLink = screen.getByTestId("github-profile-link");
    expect(githubProfileLink).toHaveAttribute(
      "href",
      "https://github.com/yogeshkumarasamy",
    );
  });

  it("handles empty projects state gracefully", () => {
    render(
      <ProjectsView windowId="test-empty" profile={emptyProjectsProfile} />,
    );

    expect(screen.getByTestId("projects-empty")).toHaveTextContent(
      "No projects listed.",
    );
    expect(screen.queryByTestId("projects-list")).not.toBeInTheDocument();
  });
});
