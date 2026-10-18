import { profile } from "./profile";
import type { AppProps } from "./types";
import { WritingView } from "./WritingView";

export default function WritingApp({ windowId }: AppProps) {
  return <WritingView windowId={windowId} profile={profile} />;
}
