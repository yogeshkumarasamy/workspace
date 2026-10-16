import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import contactApp, { ContactView } from "../index";
import { testProfile } from "../__fixtures__/profile";

describe("Contact App", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("matches AppDefinition contract requirements", () => {
    expect(contactApp.id).toBe("contact");
    expect(contactApp.order).toBe(5);
    expect(contactApp.title).toBe("Contact.lnk");
    expect(contactApp.icon).toBe("✉️");
    expect(contactApp.defaultSize).toEqual({ w: 460, h: 360 });
    expect(contactApp.component).toBeDefined();
  });

  it("renders mailto, LinkedIn, GitHub, and Medium links", () => {
    render(<ContactView windowId="test-contact" profile={testProfile} />);

    const mailto = screen.getByTestId("contact-email-link");
    expect(mailto).toHaveAttribute(
      "href",
      `mailto:${testProfile.email}`,
    );
    expect(mailto).toHaveTextContent(testProfile.email);

    const linkedin = screen.getByTestId("contact-linkedin");
    expect(linkedin).toHaveAttribute("href", testProfile.links.linkedin);
    expect(linkedin).toHaveAttribute("target", "_blank");
    expect(linkedin.getAttribute("rel")).toContain("noopener");

    const github = screen.getByTestId("contact-github");
    expect(github).toHaveAttribute("href", testProfile.links.github);

    const medium = screen.getByTestId("contact-medium");
    expect(medium).toHaveAttribute("href", testProfile.links.medium);
  });

  it("copies email to clipboard and provides accessible status announcement", async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: {
        writeText: writeTextMock,
      },
    });

    render(<ContactView windowId="test-contact" profile={testProfile} />);

    const copyBtn = screen.getByTestId("copy-email-btn");
    const statusMsg = screen.getByTestId("copy-status");

    expect(statusMsg).toHaveTextContent("");

    fireEvent.click(copyBtn);

    expect(writeTextMock).toHaveBeenCalledWith(testProfile.email);
    await waitFor(() => {
      expect(statusMsg).toHaveTextContent("Email copied to clipboard!");
    });
  });

  it("does not render any input forms or backends", () => {
    const { container } = render(
      <ContactView windowId="test-contact" profile={testProfile} />,
    );
    expect(container.querySelector("form")).toBeNull();
    expect(container.querySelector("input")).toBeNull();
  });
});
