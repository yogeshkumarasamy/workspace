import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { ContactApp } from "../ContactApp";
import { contactAppDefinition } from "../index";
import { verifiedContact } from "../__fixtures__/contact";
import type { ContactData } from "../types";

describe("Contact App (workspace#38 / S12)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe("1. AppDefinition Contract Compliance", () => {
    it("exports default AppDefinition conforming to PRD §13.1 & §13.2", () => {
      expect(contactAppDefinition.id).toBe("contact");
      expect(contactAppDefinition.title).toBe("Contact.lnk");
      expect(contactAppDefinition.icon).toBe("📬");
      expect(contactAppDefinition.order).toBe(5);
      expect(contactAppDefinition.defaultSize.w).toBe(520);
      expect(contactAppDefinition.defaultSize.h).toBe(360);
      expect(contactAppDefinition.component).toBeTruthy();
    });
  });

  describe("2. Verified Content & Info Presentation (PRD §4)", () => {
    it("renders verified facts: name, headline, location, email without invented data", () => {
      const { container } = render(<ContactApp />);

      expect(screen.getByText("Yogesh Kumarasamy")).toBeTruthy();
      expect(screen.getByText("Senior Software Engineer at FULL Creative")).toBeTruthy();
      expect(screen.getByText("Chennai, Tamil Nadu, India")).toBeTruthy();
      expect(screen.getByTestId("contact-email").textContent).toBe("yogeshkumarasamy@gmail.com");

      // Verify no invented facts
      expect(container.innerHTML).not.toContain("tel:");
      expect(container.innerHTML).not.toContain("workspace#");
    });

    it("renders custom contact data when provided via props", () => {
      const customContact: ContactData = {
        name: "Test Recruiter Contact",
        headline: "Staff Recruiter",
        location: "Remote",
        email: "recruiter@example.com",
        links: {
          linkedin: "https://linkedin.com/in/custom",
          github: "https://github.com/custom",
          medium: "https://medium.com/@custom",
        },
      };

      render(<ContactApp contact={customContact} />);

      expect(screen.getByText("Test Recruiter Contact")).toBeTruthy();
      expect(screen.getByText("Staff Recruiter")).toBeTruthy();
      expect(screen.getByText("Remote")).toBeTruthy();
      expect(screen.getByTestId("contact-email").textContent).toBe("recruiter@example.com");

      const mailtoLink = screen.getByTestId("contact-mailto-link");
      expect(mailtoLink.getAttribute("href")).toBe("mailto:recruiter@example.com");
    });
  });

  describe("3. One-Click Recruiter Links (mailto, LinkedIn, GitHub, Medium)", () => {
    it("provides direct mailto link with correct attributes", () => {
      render(<ContactApp />);

      const mailtoLink = screen.getByTestId("contact-mailto-link");
      expect(mailtoLink).toBeTruthy();
      expect(mailtoLink.getAttribute("href")).toBe(`mailto:${verifiedContact.email}`);
      expect(mailtoLink.getAttribute("aria-label")).toBe(`Send email to ${verifiedContact.email}`);
    });

    it("provides LinkedIn, GitHub, and Medium links opening in new tab with security attributes", () => {
      render(<ContactApp />);

      const linkedinLink = screen.getByTestId("contact-link-linkedin");
      expect(linkedinLink.getAttribute("href")).toBe("https://www.linkedin.com/in/yogeshkumarasamy");
      expect(linkedinLink.getAttribute("target")).toBe("_blank");
      expect(linkedinLink.getAttribute("rel")).toBe("noopener noreferrer");

      const githubLink = screen.getByTestId("contact-link-github");
      expect(githubLink.getAttribute("href")).toBe("https://github.com/yogeshkumarasamy");
      expect(githubLink.getAttribute("target")).toBe("_blank");
      expect(githubLink.getAttribute("rel")).toBe("noopener noreferrer");

      const mediumLink = screen.getByTestId("contact-link-medium");
      expect(mediumLink.getAttribute("href")).toBe("https://medium.com/@yogeshkumarasamy");
      expect(mediumLink.getAttribute("target")).toBe("_blank");
      expect(mediumLink.getAttribute("rel")).toBe("noopener noreferrer");
    });
  });

  describe("4. Copy-Email Button & Accessible Status Announcement", () => {
    it("copies email to clipboard and displays accessible polite status announcement", async () => {
      const writeTextMock = vi.fn().mockResolvedValue(undefined);
      Object.assign(navigator, {
        clipboard: {
          writeText: writeTextMock,
        },
      });

      render(<ContactApp />);

      const copyBtn = screen.getByTestId("contact-copy-btn");
      const statusArea = screen.getByTestId("contact-copy-status");

      expect(statusArea.getAttribute("role")).toBe("status");
      expect(statusArea.getAttribute("aria-live")).toBe("polite");
      expect(statusArea.textContent).toBe("");

      await act(async () => {
        fireEvent.click(copyBtn);
      });

      expect(writeTextMock).toHaveBeenCalledWith(verifiedContact.email);
      expect(statusArea.textContent).toBe("Email copied to clipboard!");

      // Advances timer by 3 seconds to verify auto-clear
      act(() => {
        vi.advanceTimersByTime(3000);
      });

      expect(statusArea.textContent).toBe("");
    });

    it("handles clipboard write failure gracefully", async () => {
      const writeTextMock = vi.fn().mockRejectedValue(new Error("Clipboard denied"));
      Object.assign(navigator, {
        clipboard: {
          writeText: writeTextMock,
        },
      });

      // Stub document.execCommand to also fail if defined
      const originalExecCommand = document.execCommand;
      document.execCommand = vi.fn().mockReturnValue(false);

      render(<ContactApp />);

      const copyBtn = screen.getByTestId("contact-copy-btn");
      const statusArea = screen.getByTestId("contact-copy-status");

      await act(async () => {
        fireEvent.click(copyBtn);
      });

      expect(statusArea.textContent).toBe("Failed to copy email.");
      expect(statusArea.className).toContain("yk-contact-status--error");

      act(() => {
        vi.advanceTimersByTime(3000);
      });

      expect(statusArea.textContent).toBe("");
      if (originalExecCommand) {
        document.execCommand = originalExecCommand;
      } else {
        // @ts-expect-error cleanup
        delete document.execCommand;
      }
    });

    it("uses execCommand fallback if clipboard API is not available", async () => {
      const originalClipboard = navigator.clipboard;
      // @ts-expect-error simulating missing clipboard
      delete navigator.clipboard;

      const execCommandMock = vi.fn().mockReturnValue(true);
      document.execCommand = execCommandMock;

      render(<ContactApp />);

      const copyBtn = screen.getByTestId("contact-copy-btn");
      const statusArea = screen.getByTestId("contact-copy-status");

      await act(async () => {
        fireEvent.click(copyBtn);
      });

      expect(execCommandMock).toHaveBeenCalledWith("copy");
      expect(statusArea.textContent).toBe("Email copied to clipboard!");

      // @ts-expect-error cleanup
      delete document.execCommand;
      Object.assign(navigator, { clipboard: originalClipboard });
    });
  });

  describe("5. Form & Backend Absence Verification", () => {
    it("contains no form element, no inputs, and no textareas", () => {
      const { container } = render(<ContactApp />);

      expect(container.querySelector("form")).toBeNull();
      expect(container.querySelectorAll("input").length).toBe(0);
      expect(container.querySelectorAll("textarea").length).toBe(0);
    });
  });
});
