/**
 * @vitest-environment jsdom
 */
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { JobForm } from "../web/src/components/JobForm";
import { AppProvider } from "../web/src/state";

const channel = {
  id: "ch-1",
  youtubeChannelId: "UCmockchannel0001",
  handle: "@mock",
  title: "Mock Channel",
  googleEmail: null,
  separateDriveAccount: false,
  defaults: { categoryId: "1", defaultLanguage: "ta", defaultAudioLanguage: "ta", madeForKids: true },
  slots: { timezone: "Asia/Kolkata", shortsTime: "07:00", longWeekday: 6, longTime: "18:00", minLeadMinutes: 30 },
};

const { api, driveImageUrl } = vi.hoisted(() => ({
  api: vi.fn(),
  driveImageUrl: vi.fn(async () => "blob:thumb"),
}));

vi.mock("../web/src/api", () => ({
  api,
  driveImageUrl,
  getKey: () => "test",
  setKey: () => {},
  getRuntimeConfig: () => ({ youtubeMode: "mock" }),
  initApi: async () => "https://example.test/api/",
}));

function Harness() {
  const [open, setOpen] = useState(false);
  return (
    <AppProvider>
      <button type="button" onClick={() => setOpen(true)}>Open form</button>
      <JobForm open={open} onOpenChange={setOpen} />
    </AppProvider>
  );
}

beforeEach(() => {
  if (typeof URL.revokeObjectURL !== "function") URL.revokeObjectURL = () => {};
  vi.useFakeTimers();
  api.mockImplementation(async (path: string, init?: { method?: string; json?: Record<string, unknown> }) => {
    if (path === "/channels") return [channel];
    if (path === "/quota") return { day: "2026-10-18", limit: 10000, used: 0, byChannel: {}, uploadsLeftToday: 6, resetsAt: "2026-10-19T00:00:00.000Z", note: "mock" };
    if (path === "/config") return { audited: true, youtubeMode: "mock", driveScope: "file" };
    if (path.includes("/playlists")) return [{ id: "PL1", title: "Stories" }];
    if (path.startsWith("/slots/next")) return { publishAt: "2026-10-19T02:30:00.000Z" };
    if (path === "/jobs" && init?.method === "POST") return { id: "job-1" };
    if (path.startsWith("/jobs")) return [];
    return {};
  });
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  api.mockReset();
  driveImageUrl.mockClear();
});

it("keeps every field through a refetch and creates the job from Drive share URLs", async () => {
  render(<Harness />);
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });

  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Open form" }));
  });

  const dialog = screen.getByRole("dialog");
  const video = screen.getAllByPlaceholderText("Drive file id or share link")[0]!;
  const thumb = screen.getAllByPlaceholderText("Drive file id or share link")[1]!;
  const title = screen.getByPlaceholderText(/Ep 04/);
  const description = dialog.querySelector("textarea") as HTMLTextAreaElement;
  const tags = screen.getByPlaceholderText("tamil kids, cartoon");
  const playlist = screen.getByPlaceholderText(/playlist name/);
  const idempotency = screen.getByPlaceholderText("auto");
  const [, category, language, privacy] = dialog.querySelectorAll("select");

  fireEvent.change(dialog.querySelector("select")!, { target: { value: "ch-1" } });
  fireEvent.click(screen.getByRole("button", { name: "Long" }));
  fireEvent.change(video, { target: { value: "https://drive.google.com/file/d/VIDEOFILEID123/view?usp=sharing" } });
  fireEvent.change(title, { target: { value: "Ep 04 persist" } });
  fireEvent.change(description, { target: { value: "A description that must stay" } });
  fireEvent.change(tags, { target: { value: "tamil kids, cartoon" } });
  fireEvent.change(category!, { target: { value: "27" } });
  fireEvent.change(language!, { target: { value: "en" } });
  fireEvent.change(privacy!, { target: { value: "public" } });
  fireEvent.change(playlist, { target: { value: "Stories" } });
  fireEvent.click(screen.getByRole("checkbox"));
  const [kids, synthetic] = screen.getAllByRole("switch");
  fireEvent.click(kids!);
  fireEvent.click(synthetic!);
  fireEvent.change(thumb, { target: { value: "https://drive.google.com/open?id=THUMBFILEID99" } });
  const publish = dialog.querySelector('input[type="datetime-local"]') as HTMLInputElement;
  fireEvent.change(publish, { target: { value: "2026-10-18T20:30" } });
  fireEvent.click(screen.getByRole("button", { name: "Later" }));
  const upload = dialog.querySelectorAll('input[type="datetime-local"]')[1] as HTMLInputElement;
  fireEvent.change(upload, { target: { value: "2026-10-18T20:25" } });
  fireEvent.change(idempotency, { target: { value: "ep-persist" } });

  expect((video as HTMLInputElement).value).toBe("VIDEOFILEID123");
  expect((thumb as HTMLInputElement).value).toBe("THUMBFILEID99");

  await act(async () => {
    await vi.advanceTimersByTimeAsync(15000);
  });

  expect(screen.getByRole("dialog")).toBe(dialog);
  expect((video as HTMLInputElement).value).toBe("VIDEOFILEID123");
  expect((thumb as HTMLInputElement).value).toBe("THUMBFILEID99");
  expect((title as HTMLInputElement).value).toBe("Ep 04 persist");
  expect(description.value).toBe("A description that must stay");
  expect((tags as HTMLInputElement).value).toBe("tamil kids, cartoon");
  expect((category as HTMLSelectElement).value).toBe("27");
  expect((language as HTMLSelectElement).value).toBe("en");
  expect((privacy as HTMLSelectElement).value).toBe("public");
  expect((playlist as HTMLInputElement).value).toBe("Stories");
  expect((screen.getByRole("checkbox") as HTMLInputElement).checked).toBe(true);
  expect(kids?.getAttribute("aria-checked")).toBe("false");
  expect(synthetic?.getAttribute("aria-checked")).toBe("true");
  expect(publish.value).toBe("2026-10-18T20:30");
  expect(upload.value).toBe("2026-10-18T20:25");
  expect((idempotency as HTMLInputElement).value).toBe("ep-persist");
  expect(screen.getByRole("button", { name: "Long" }).className).toContain("bg-background");

  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Create job" }));
    await Promise.resolve();
    await Promise.resolve();
  });

  const created = api.mock.calls.find((call) => call[0] === "/jobs" && call[1]?.method === "POST");
  expect(created?.[1].json).toMatchObject({
    idempotencyKey: "ep-persist",
    channel: "UCmockchannel0001",
    video: { driveFileId: "VIDEOFILEID123" },
    thumbnail: { driveFileId: "THUMBFILEID99" },
    uploadMode: "at",
    metadata: {
      title: "Ep 04 persist",
      description: "A description that must stay",
      tags: ["tamil kids", "cartoon"],
      categoryId: "27",
      defaultLanguage: "en",
      privacyStatus: "public",
      playlist: "Stories",
      createPlaylistIfMissing: true,
      madeForKids: false,
      containsSyntheticMedia: true,
      type: "long",
    },
  });
  expect(created?.[1].json.uploadAt).toEqual(expect.any(String));
  expect(created?.[1].json.metadata.publishAt).toEqual(expect.any(String));
});
