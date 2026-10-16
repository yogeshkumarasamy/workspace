import React from "react";

export function BootScreen({ onDone }: { onDone(): void }): React.ReactElement {
  return (
    <div data-testid="boot-screen">
      <p>YK-OS BIOS v2026</p>
      <button type="button" onClick={onDone}>
        Skip Boot
      </button>
    </div>
  );
}
