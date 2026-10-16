import React, { lazy } from "react";
import type { AppDefinition, AppProps } from "../types";

const MockAppComponent: React.FC<AppProps> = ({ windowId }) => {
  return React.createElement(
    "div",
    { "data-testid": `app-content-${windowId}` },
    `App content for window ${windowId}`,
  );
};

export const sampleAppsFixture: AppDefinition[] = [
  {
    id: "about",
    title: "About",
    icon: "📄",
    order: 1,
    defaultSize: { w: 560, h: 420 },
    component: lazy(async () => ({ default: MockAppComponent })),
  },
  {
    id: "experience",
    title: "Experience",
    icon: "💼",
    order: 2,
    defaultSize: { w: 680, h: 500 },
    component: lazy(async () => ({ default: MockAppComponent })),
  },
  {
    id: "projects",
    title: "Projects",
    icon: "📁",
    order: 3,
    defaultSize: { w: 720, h: 520 },
    component: lazy(async () => ({ default: MockAppComponent })),
  },
  {
    id: "writing",
    title: "Writing",
    icon: "📝",
    order: 4,
    defaultSize: { w: 640, h: 460 },
    component: lazy(async () => ({ default: MockAppComponent })),
  },
  {
    id: "contact",
    title: "Contact",
    icon: "📬",
    order: 5,
    defaultSize: { w: 480, h: 360 },
    component: lazy(async () => ({ default: MockAppComponent })),
  },
  {
    id: "terminal",
    title: "Terminal",
    icon: "💻",
    order: 6,
    defaultSize: { w: 640, h: 400 },
    component: lazy(async () => ({ default: MockAppComponent })),
  },
];
