import React, { useState, useRef, useCallback, useMemo } from "react";
import type { AppDefinition, OSApi, DesktopItem } from "./types";
import { DesktopIcon } from "./DesktopIcon";

export interface DesktopGridProps {
  apps: AppDefinition[];
  os: OSApi;
  onNavigate?: (path: string) => void;
  initialSelectedId?: string;
}

export const CLASSIC_VIEW_ITEM: DesktopItem = {
  id: "classic",
  title: "Classic View",
  icon: "📄",
  isClassic: true,
};

export const DesktopGrid: React.FC<DesktopGridProps> = ({
  apps,
  os,
  onNavigate,
  initialSelectedId,
}) => {
  // Combine sorted apps + Classic View icon
  const items: DesktopItem[] = useMemo(() => {
    const sortedApps = [...apps].sort((a, b) => a.order - b.order);
    const appItems: DesktopItem[] = sortedApps.map((app) => ({
      id: app.id,
      title: app.title,
      icon: app.icon,
      appId: app.id,
    }));
    return [...appItems, CLASSIC_VIEW_ITEM];
  }, [apps]);

  const [selectedIndex, setSelectedIndex] = useState<number>(() => {
    if (initialSelectedId) {
      const idx = items.findIndex((it) => it.id === initialSelectedId);
      if (idx !== -1) return idx;
    }
    return 0;
  });

  const buttonRefs = useRef<Array<HTMLButtonElement | null>>([]);

  // Adjust buttonRefs array size
  buttonRefs.current = items.map((_, i) => buttonRefs.current[i] || null);

  const handleOpenItem = useCallback(
    (item: DesktopItem) => {
      if (item.isClassic) {
        if (onNavigate) {
          onNavigate("#/classic");
        } else if (typeof window !== "undefined") {
          window.location.hash = "#/classic";
        }
      } else if (item.appId) {
        os.open(item.appId);
      }
    },
    [os, onNavigate],
  );

  const focusItemAtIndex = useCallback((index: number) => {
    setSelectedIndex(index);
    const targetBtn = buttonRefs.current[index];
    if (targetBtn) {
      targetBtn.focus();
    }
  }, []);

  const handleGridKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const total = items.length;
    if (total === 0) return;

    let nextIndex = -1;

    switch (e.key) {
      case "ArrowRight":
      case "ArrowDown":
        e.preventDefault();
        nextIndex = (selectedIndex + 1) % total;
        break;
      case "ArrowLeft":
      case "ArrowUp":
        e.preventDefault();
        nextIndex = (selectedIndex - 1 + total) % total;
        break;
      case "Home":
        e.preventDefault();
        nextIndex = 0;
        break;
      case "End":
        e.preventDefault();
        nextIndex = total - 1;
        break;
      default:
        break;
    }

    if (nextIndex !== -1) {
      focusItemAtIndex(nextIndex);
    }
  };

  return (
    <div
      className="yk-desktop-grid"
      data-role="desktop-grid"
      role="region"
      aria-label="Desktop icons"
      onKeyDown={handleGridKeyDown}
    >
      {items.map((item, index) => {
        const isSelected = index === selectedIndex;
        const tabIndex = isSelected ? 0 : -1;

        return (
          <DesktopIcon
            key={item.id}
            item={item}
            isSelected={isSelected}
            tabIndex={tabIndex}
            buttonRef={{ current: buttonRefs.current[index] } as React.RefObject<HTMLButtonElement>}
            onSelect={() => setSelectedIndex(index)}
            onOpen={() => handleOpenItem(item)}
          />
        );
      })}
    </div>
  );
};
