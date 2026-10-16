import { lazy, type ComponentType, type LazyExoticComponent } from "react";
import type { AppDefinition, AppProps } from "./types";

const component: LazyExoticComponent<ComponentType<AppProps>> = lazy(
  () => import("./WritingApp"),
);

const writing: AppDefinition = {
  id: "writing",
  title: "Writing",
  icon: "✎",
  order: 4,
  defaultSize: { w: 480, h: 360 },
  component,
};

export default writing;
