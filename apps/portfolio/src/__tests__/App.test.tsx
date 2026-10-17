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

  it("highlights active open app in Start menu and brings it to focus when clicked", async () => {
    window.sessionStorage.setItem("yk-booted", "1");
    render(<App />);

    // Open projects app from desktop icon
    const projectsIcon = screen.getByTestId("desktop-icon-projects");
    act(() => {
      fireEvent.click(projectsIcon);
    });
    // On desktop, click selects; second click opens
    act(() => {
      fireEvent.click(projectsIcon);
    });

    const projectsDialog = await screen.findByRole("dialog", { name: /projects/i });
    expect(projectsDialog).toBeInTheDocument();

    // Now open the Start Menu
    const startButton = screen.getByRole("button", { name: /start/i });
    act(() => {
      fireEvent.click(startButton);
    });

    const startMenu = await screen.findByTestId("start-menu");
    expect(startMenu).toBeInTheDocument();

    // The active app (projects) should be the focused/selected item in the Start menu
    const projectsItem = screen.getByTestId("start-menu-item-projects");
    expect(projectsItem.classList.contains("yk-start-menu__item--focused")).toBe(true);

    // Clicking the active selected item should keep it open, focus it, and close Start menu
    act(() => {
      fireEvent.click(projectsItem);
    });

    expect(screen.queryByTestId("start-menu")).not.toBeInTheDocument();
    expect(projectsDialog).toBeInTheDocument();
  }, 30000);

  it("activates the desktop tab matching a classic view link instead of About.txt", async () => {
    window.sessionStorage.setItem("yk-booted", "1");
    window.location.hash = "#/classic";
    render(<App />);

    const projectsLink = screen.getByRole("link", { name: "Open Projects on desktop" });
    expect(projectsLink).toHaveAttribute("href", "#/app/projects");

    act(() => {
      window.location.hash = projectsLink.getAttribute("href") ?? "";
      window.dispatchEvent(new HashChangeEvent("hashchange"));
    });

    const projectsTab = await screen.findByTestId("taskbar-window-win-projects");
    expect(projectsTab.classList.contains("yk-taskbar__window-btn--active")).toBe(true);
    expect(screen.queryByTestId("taskbar-window-win-about")).not.toBeInTheDocument();

    act(() => {
      window.location.hash = "#experience";
      window.dispatchEvent(new HashChangeEvent("hashchange"));
    });

    const experienceTab = await screen.findByTestId("taskbar-window-win-experience");
    expect(experienceTab.classList.contains("yk-taskbar__window-btn--active")).toBe(true);
    expect(projectsTab.classList.contains("yk-taskbar__window-btn--active")).toBe(false);
    expect(screen.queryByTestId("taskbar-window-win-about")).not.toBeInTheDocument();
  }, 30000);

  it("toggles minimize and restore when clicking active taskbar window button", async () => {
    window.sessionStorage.setItem("yk-booted", "1");
    render(<App />);

    // Open about app
    const aboutIcon = screen.getByTestId("desktop-icon-about");
    act(() => {
      fireEvent.click(aboutIcon);
    });
    act(() => {
      fireEvent.click(aboutIcon);
    });

    const aboutDialog = await screen.findByRole("dialog", { name: /about/i });
    expect(aboutDialog).toBeInTheDocument();
    expect(aboutDialog).not.toHaveAttribute("hidden");

    // Taskbar window button should be active
    const taskbarBtn = await screen.findByTestId("taskbar-window-win-about");
    expect(taskbarBtn.classList.contains("yk-taskbar__window-btn--active")).toBe(true);

    // Clicking active taskbar button minimizes the window
    act(() => {
      fireEvent.click(taskbarBtn);
    });
    expect(aboutDialog).toHaveAttribute("hidden");

    // Clicking minimized taskbar button restores it
    act(() => {
      fireEvent.click(taskbarBtn);
    });
    expect(aboutDialog).not.toHaveAttribute("hidden");
  }, 30000);
});
