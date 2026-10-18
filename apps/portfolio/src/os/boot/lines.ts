/**
 * BIOS/POST copy from PRD §6. Timing stays at or under 2.5s.
 * Character counts: 16 + 14 + 21.
 */
export const BOOT_LINES = [
  "YK-OS BIOS v2026",
  "Memory test OK",
  "Loading portfolio.sys",
] as const;

export const BOOT_CHAR_MS = 32;
export const BOOT_LINE_GAP_MS = 80;
export const BOOT_DONE_HOLD_MS = 200;
export const BOOT_MAX_MS = 2500;

export interface BootCue {
  at: number;
  text: string;
  done: boolean;
}

export function buildBootCues(lines: readonly string[] = BOOT_LINES): BootCue[] {
  const cues: BootCue[] = [];
  const shown: string[] = [];
  let at = 0;

  lines.forEach((line, index) => {
    let partial = "";
    for (const character of line) {
      partial += character;
      at += BOOT_CHAR_MS;
      cues.push({
        at,
        text: [...shown, partial].join("\n"),
        done: false,
      });
    }
    shown.push(line);
    if (index < lines.length - 1) {
      at += BOOT_LINE_GAP_MS;
    }
  });

  at += BOOT_DONE_HOLD_MS;
  cues.push({
    at,
    text: lines.join("\n"),
    done: true,
  });
  return cues;
}

export function bootDurationMs(lines: readonly string[] = BOOT_LINES): number {
  const cues = buildBootCues(lines);
  const last = cues[cues.length - 1];
  return last ? last.at : 0;
}
