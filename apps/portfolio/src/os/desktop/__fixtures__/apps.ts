import { lazy } from "react";
import type { AppDefinition } from "../types";

// Dummy component for lazy definitions in fixtures
const DummyComponent = lazy(async () => ({
  default: () => null,
}));

export const defaultAppsFixture: AppDefinition[] = [
  {
    id: "about",
    title: "About.txt",
    icon: "📄",
    order: 1,
    defaultSize: { w: 580, h: 420 },
    component: DummyComponent,
  },
  {
    id: "experience",
    title: "Experience.exe",
    icon: "💼",
    order: 2,
    defaultSize: { w: 640, h: 480 },
    component: DummyComponent,
  },
  {
    id: "projects",
    title: "Projects/",
    icon: "📁",
    order: 3,
    defaultSize: { w: 640, h: 480 },
    component: DummyComponent,
  },
  {
    id: "writing",
    title: "Writing/",
    icon: "📰",
    order: 4,
    defaultSize: { w: 600, h: 440 },
    component: DummyComponent,
  },
  {
    id: "contact",
    title: "Contact.lnk",
    icon: "📬",
    order: 5,
    defaultSize: { w: 520, h: 360 },
    component: DummyComponent,
  },
  {
    id: "terminal",
    title: "Terminal",
    icon: "📟",
    order: 6,
    defaultSize: { w: 680, h: 420 },
    component: DummyComponent,
  },
];
