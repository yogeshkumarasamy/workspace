import { lazy } from "react";
import type { ComponentType } from "react";
import type { AppDefinition, AppProps } from "./types";

const LazyWritingApp = lazy(
  () =>
    import("./WritingApp") as Promise<{
      default: ComponentType<AppProps>;
    }>,
);

export const writingApp: AppDefinition = {
  id: "writing",
  title: "Writing/",
  icon: "📰",
  order: 4,
  defaultSize: { w: 600, h: 440 },
  component: LazyWritingApp,
};

export default writingApp;
export { verifiedArticles, verifiedMediumUrl } from "./__fixtures__/writing";
export * from "./types";
export * from "./format";
