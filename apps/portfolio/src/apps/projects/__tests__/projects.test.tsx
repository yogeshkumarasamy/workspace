import React from "react";
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import projectsAppDefinition, {
  ProjectsApp,
  defaultGithubUrl,
  verifiedProjects,
} from "../index";
import type { Project } from "../types";

describe("Projects App (workspace#36 / PRD §5, §6, §13)", () => {
  describe("AppDefinition contract", () => {
    it("exports default AppDefinition conforming to PRD §13.1 & §13.2", () => {
      expect(projectsAppDefinition.id).toBe("projects");
      expect(projectsAppDefinition.title).toBe("Projects/");
      expect(projectsAppDefinition.icon).toBe("📁");
      expect(projectsAppDefinition.order).toBe(3);
      expect(projectsAppDefinition.defaultSize).toEqual({ w: 640, h: 480 });
      expect(projectsAppDefinition.component).toBeDefined();
    });

    it("is discoverable by registry with order 3", async () => {
      const { getApp } = await import("../../registry");
      const app = getApp("projects");
      expect(app).toBeDefined();
      expect(app?.id).toBe("projects");
      expect(app?.order).toBe(3);
      expect(app?.title).toBe("Projects/");
    });
  });

  describe("Verified content integrity (PRD §4)", () => {
    it("contains verified projects matching PRD §4 without invented facts", () => {
      expect(verifiedProjects).toHaveLength(1);

      const vitestProj = verifiedProjects[0];
      expect(vitestProj?.name).toBe("vitest-portfolio");
      expect(vitestProj?.language).toBe("TypeScript");
      expect(vitestProj?.description).toBe(
        "volume of browser test files to stress Vitest test runs and performance",
      );
      expect(vitestProj?.href).toBe(
        "https://github.com/yogeshkumarasamy/vitest-portfolio",
      );
    });

    it("excludes private workspace repo from public listing", () => {
      const names = verifiedProjects.map((p) => p.name.toLowerCase());
      const descriptions = verifiedProjects.map((p) => p.description.toLowerCase());
      const urls = verifiedProjects.map((p) => p.href.toLowerCase());

      for (const str of [...names, ...descriptions, ...urls]) {
        expect(str.includes("workspace#")).toBe(false);
        expect(str.includes("private")).toBe(false);
      }
    });

    it("provides verified GitHub profile link", () => {
      expect(defaultGithubUrl).toBe("https://github.com/yogeshkumarasamy");
    });
  });

  describe("File Explorer UI & List rendering", () => {
    it("renders file explorer chrome with menubar, addressbar, and toolbar", () => {
      render(<ProjectsApp />);

      expect(screen.getByTestId("projects-app")).toBeInTheDocument();
      expect(screen.getByRole("region", { name: /projects explorer/i })).toBeInTheDocument();
      expect(screen.getByRole("navigation", { name: /explorer menu/i })).toBeInTheDocument();
      expect(screen.getByRole("toolbar", { name: /explorer toolbar/i })).toBeInTheDocument();
      expect(screen.getByLabelText(/current path/i)).toHaveTextContent("C:\\PORTFOLIO\\PROJECTS");
    });

    it("renders explorer list with icon, name, language, and description", () => {
      render(<ProjectsApp />);

      const row = screen.getByTestId("project-item-vitest-portfolio");
      expect(row).toBeInTheDocument();

      const link = screen.getByTestId("project-link-vitest-portfolio");
      expect(link).toHaveTextContent("vitest-portfolio");
      expect(link).toHaveAttribute(
        "href",
        "https://github.com/yogeshkumarasamy/vitest-portfolio",
      );
      expect(link).toHaveAttribute("target", "_blank");
      expect(link).toHaveAttribute("rel", "noopener noreferrer");

      expect(screen.getByText("TypeScript")).toBeInTheDocument();
      expect(
        screen.getByText(
          "volume of browser test files to stress Vitest test runs and performance",
        ),
      ).toBeInTheDocument();
    });

    it("renders status bar showing object count and GitHub profile link", () => {
      render(<ProjectsApp />);

      const statusbar = screen.getByRole("status", { name: /status bar/i });
      expect(statusbar).toBeInTheDocument();
      expect(statusbar).toHaveTextContent("1 object(s)");

      const statusLink = screen.getByRole("link", { name: /github profile link/i });
      expect(statusLink).toHaveAttribute("href", "https://github.com/yogeshkumarasamy");
      expect(statusLink).toHaveAttribute("target", "_blank");
      expect(statusLink).toHaveAttribute("rel", "noopener noreferrer");
    });
  });

  describe("GitHub Profile Link", () => {
    it("renders accessible toolbar link to GitHub profile with rel=noopener", () => {
      render(<ProjectsApp />);

      const githubLink = screen.getByTestId("projects-github-link");
      expect(githubLink).toHaveAttribute(
        "href",
        "https://github.com/yogeshkumarasamy/vitest-portfolio".replace(
          "/vitest-portfolio",
          "",
        ),
      );
      expect(githubLink).toHaveAttribute("target", "_blank");
      expect(githubLink).toHaveAttribute("rel", "noopener noreferrer");
    });
  });

  describe("Empty state handling", () => {
    it("renders empty state message when projects array is empty", () => {
      render(<ProjectsApp projects={[]} />);

      const emptyState = screen.getByTestId("projects-empty-state");
      expect(emptyState).toBeInTheDocument();
      expect(screen.getByText("This folder is empty.")).toBeInTheDocument();
      expect(
        screen.getByText("No projects found in this directory."),
      ).toBeInTheDocument();

      // Table is not rendered when empty
      expect(screen.queryByRole("table")).not.toBeInTheDocument();

      // Status bar reflects 0 objects
      const statusbar = screen.getByRole("status", { name: /status bar/i });
      expect(statusbar).toHaveTextContent("0 object(s)");

      // Link to GitHub profile is present in empty state
      const emptyLink = screen.getByRole("link", {
        name: /browse all repositories on github/i,
      });
      expect(emptyLink).toHaveAttribute("href", "https://github.com/yogeshkumarasamy");
      expect(emptyLink).toHaveAttribute("target", "_blank");
      expect(emptyLink).toHaveAttribute("rel", "noopener noreferrer");
    });

    it("renders multiple projects when provided via props", () => {
      const mockProjects: Project[] = [
        {
          name: "alpha-tool",
          description: "Internal tooling suite",
          href: "https://github.com/yogeshkumarasamy/alpha-tool",
          language: "Rust",
        },
        {
          name: "beta-app",
          description: "Retro dashboard application",
          href: "https://github.com/yogeshkumarasamy/beta-app",
          language: "CSS",
        },
      ];

      render(<ProjectsApp projects={mockProjects} />);

      expect(screen.getByTestId("project-item-alpha-tool")).toBeInTheDocument();
      expect(screen.getByTestId("project-item-beta-app")).toBeInTheDocument();
      expect(screen.getByText("Rust")).toBeInTheDocument();
      expect(screen.getByText("CSS")).toBeInTheDocument();

      const statusbar = screen.getByRole("status", { name: /status bar/i });
      expect(statusbar).toHaveTextContent("2 object(s)");
    });
  });
});
