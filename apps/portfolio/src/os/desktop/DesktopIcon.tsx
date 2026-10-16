import React, { useRef, useEffect } from "react";
import type { DesktopItem } from "./types";

export interface DesktopIconProps {
  item: DesktopItem;
  isSelected: boolean;
  tabIndex: number;
  onSelect: () => void;
  onOpen: () => void;
  buttonRef?: React.RefObject<HTMLButtonElement>;
}

export const DesktopIcon: React.FC<DesktopIconProps> = ({
  item,
  isSelected,
  tabIndex,
  onSelect,
  onOpen,
  buttonRef,
}) => {
  const localRef = useRef<HTMLButtonElement>(null);
  const ref = buttonRef || localRef;

  // When tabIndex becomes 0 due to keyboard navigation, keep element focused if needed
  useEffect(() => {
    if (
      isSelected &&
      tabIndex === 0 &&
      ref.current &&
      document.activeElement !== ref.current
    ) {
      // Only focus if something in desktop grid is already active
      const grid = ref.current.closest("[data-role='desktop-grid']");
      if (grid && grid.contains(document.activeElement)) {
        ref.current.focus();
      }
    }
  }, [isSelected, tabIndex, ref]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onOpen();
    }
  };

  const handleDoubleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    onOpen();
  };

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    const isMobile =
      typeof window !== "undefined" &&
      (window.innerWidth < 768 ||
        (typeof window.matchMedia === "function" &&
          window.matchMedia("(max-width: 767px)").matches));

    if (isMobile || isSelected) {
      onOpen();
    } else {
      onSelect();
    }
  };

  return (
    <button
      type="button"
      ref={ref}
      tabIndex={tabIndex}
      className={`yk-desktop-icon ${isSelected ? "yk-desktop-icon--selected" : ""}`}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onKeyDown={handleKeyDown}
      aria-label={`${item.title}${item.isClassic ? " (opens accessible classic résumé)" : " (press Enter or double-click to open)"}`}
      data-testid={`desktop-icon-${item.id}`}
      data-id={item.id}
    >
      <span className="yk-desktop-icon__graphic" aria-hidden="true">
        {item.icon}
      </span>
      <span className="yk-desktop-icon__label">{item.title}</span>
    </button>
  );
};
