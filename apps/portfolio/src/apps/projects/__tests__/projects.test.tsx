import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import projectsApp, { ProjectsView } from "../index";
import { profile } from "../../../content/profile";
import { emptyProjectsProfile } from "../__fixtures__/profile";

describe("Projects App", () => {
  it("matches AppDefinition contract requirements", () => {
    expect(projectsApp.id).toBe("projects");
    expect(projectsApp.order).toBe(3);
    expect(projectsApp.title).toBe("Projects");
    expect(projectsApp.icon).toBe("📁");
    expect(projectsApp.defaultSize).toEqual({ w: 580, h: 420 });
    expect(projectsApp.component).toBeDefined();
  });

  it("renders company projects from the shared profile, with links only where a URL exists", () => {
    render(<ProjectsView windowId="test-win" profile={profile} />);

    expect(screen.getByText("C:\\PROJECTS")).toBeInTheDocument();
    expect(screen.queryByText(/vitest-portfolio/i)).not.toBeInTheDocument();

    expect(screen.getByRole("heading", { name: "Full Creative" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Trimble" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "BI WORLDWIDE" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Accenture" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Pearson English" })).toBeInTheDocument();

    const booking = screen.getByRole("link", { name: /Booking page/i });
    expect(booking).toHaveAttribute("href", "https://anywhere.setmore.com/kevin-payne");
    expect(booking).toHaveAttribute("target", "_blank");
    expect(booking.getAttribute("rel")).toContain("noopener");

    expect(screen.getByRole("link", { name: /BaseApp/i })).toHaveAttribute(
      "href",
      "https://go.setmore.com/",
    );
    expect(screen.getByRole("link", { name: /ChatSupport/i })).toHaveAttribute(
      "href",
      "https://chatsupport.co/",
    );

    expect(screen.getByText("Kuebix")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Kuebix/i })).not.toBeInTheDocument();
    expect(screen.getByText("Daymaker")).toBeInTheDocument();
    expect(screen.getByText("Digital Classroom")).toBeInTheDocument();

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
