import React, { createContext, useContext, useState } from "react";
import type { AppId } from "../../contracts/apps";
import type { OSApi, WindowState } from "../../contracts/os";

const OSContext = createContext<OSApi>({
  open: () => {},
  close: () => {},
  focus: () => {},
  windows: [],
});

export function WindowManagerProvider({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  const [windows, setWindows] = useState<WindowState[]>([]);

  const api: OSApi = {
    open: (appId: AppId) => {
      setWindows((prev) => [
        ...prev,
        {
          id: `${appId}-${Date.now()}`,
          appId,
          x: 20,
          y: 20,
          w: 400,
          h: 300,
          z: prev.length + 1,
          minimized: false,
          maximized: false,
        },
      ]);
    },
    close: (id: string) => {
      setWindows((prev) => prev.filter((w) => w.id !== id));
    },
    focus: (id: string) => {
      setWindows((prev) => {
        const maxZ = Math.max(0, ...prev.map((w) => w.z));
        return prev.map((w) => (w.id === id ? { ...w, z: maxZ + 1 } : w));
      });
    },
    windows,
  };

  return <OSContext.Provider value={api}>{children}</OSContext.Provider>;
}

export function useOS(): OSApi {
  return useContext(OSContext);
}

export function Window({
  title,
  children,
}: {
  state: WindowState;
  title: string;
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <div role="dialog" aria-label={title}>
      <h2>{title}</h2>
      {children}
    </div>
  );
}

export function WindowLayer(): React.ReactElement {
  return <div data-testid="window-layer" />;
}
