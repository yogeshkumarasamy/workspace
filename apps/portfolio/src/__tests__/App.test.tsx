import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { App } from "../App";

describe("App & Shell layout", () => {
  beforeEach(() => {
    window.location.hash = "#/";
    window.sessionStorage.clear();
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders CRT overlay as a separate element without poisoning yk-os-root with pointer-events: none", async () => {
    // Mark boot as already done in session storage to jump directly to desktop
    window.sessionStorage.setItem("yk-os-booted", "1");

    const { container } = render(<App />);

    const root = container.querySelector(".yk-os-root");
    expect(root).not.toBeNull();
    // Crucial: yk-os-root must NOT have yk-crt class, which carries pointer-events: none
    expect(root?.classList.contains("yk-crt")).toBe(false);

    // Instead, yk-crt should exist as a separate overlay element
    const crtOverlay = container.querySelector(".yk-crt");
    expect(crtOverlay).not.toBeNull();
    expect(crtOverlay).toHaveAttribute("aria-hidden", "true");
  });

  it("allows clicking desktop icons and start button after boot completes", async () => {
    window.sessionStorage.setItem("yk-os-booted", "1");

    render(<App />);

    // Start button should be clickable
    const startButton = screen.getByRole("button", { name: /start/i });
    expect(startButton).toBeInTheDocument();
    expect(startButton).toHaveAttribute("aria-expanded", "false");

    act(() => {
      fireEvent.click(startButton);
    });

    expect(startButton).toHaveAttribute("aria-expanded", "true");

    // Desktop icons: clicking another icon (e.g. projects) updates selection
    const projectsIcon = screen.getByTestId("desktop-icon-projects");
    expect(projectsIcon).toBeInTheDocument();
    expect(projectsIcon.classList.contains("yk-desktop-icon--selected")).toBe(
      false,
    );

    act(() => {
      fireEvent.click(projectsIcon);
    });

    expect(projectsIcon.classList.contains("yk-desktop-icon--selected")).toBe(
      true,
    );
  });
});
