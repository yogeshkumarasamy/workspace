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
  }, 30000);

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
  }, 30000);

  it("opens app on single click on mobile viewport and allows using Start menu while window is open", async () => {
    window.sessionStorage.setItem("yk-booted", "1");
    // Emulate mobile width
    window.innerWidth = 375;

    render(<App />);

    // Tapping desktop icon opens the window directly on mobile
    const aboutIcon = screen.getByTestId("desktop-icon-about");
    act(() => {
      fireEvent.click(aboutIcon);
    });

    // Window should be open
    const aboutDialog = await screen.findByRole("dialog", { name: /about/i });
    expect(aboutDialog).toBeInTheDocument();

    // Start button should still be clickable and open Start Menu over the window
    const startButton = screen.getByRole("button", { name: /start/i });
    act(() => {
      fireEvent.click(startButton);
    });

    expect(startButton).toHaveAttribute("aria-expanded", "true");
    const startMenu = await screen.findByTestId("start-menu");
    expect(startMenu).toBeInTheDocument();

    // Clicking an item in the Start Menu should open the next window
    const projectsItem = screen.getByTestId("start-menu-item-projects");
    act(() => {
      fireEvent.click(projectsItem);
    });

    const projectsDialog = await screen.findByRole("dialog", {
      name: /projects/i,
    });
    expect(projectsDialog).toBeInTheDocument();
  }, 30000);

  it("maintains clickable Start menu and icons after transitioning between pages and returning to desktop", async () => {
    window.sessionStorage.setItem("yk-booted", "1");

    const { rerender } = render(<App />);

    // Transition to classic view
    act(() => {
      window.location.hash = "#/classic";
      window.dispatchEvent(new HashChangeEvent("hashchange"));
    });
    rerender(<App />);

    // Classic view is displayed
    expect(
      screen.getByRole("heading", { level: 1, name: /Yogesh Kumarasamy/i }),
    ).toBeInTheDocument();

    // Transition back to desktop
    act(() => {
      window.location.hash = "#/";
      window.dispatchEvent(new HashChangeEvent("hashchange"));
    });
    rerender(<App />);

    // Start button should be clickable
    const startButton = await screen.findByRole("button", { name: /start/i });
    expect(startButton).toBeInTheDocument();

    act(() => {
      fireEvent.click(startButton);
    });

    expect(startButton).toHaveAttribute("aria-expanded", "true");
  }, 30000);
});
