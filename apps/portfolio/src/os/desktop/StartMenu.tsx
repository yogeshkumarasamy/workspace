import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import type { AppDefinition, OSApi, DesktopItem } from "./types";
import { CLASSIC_VIEW_ITEM } from "./DesktopGrid";

export interface StartMenuProps {
  isOpen: boolean;
  onClose: () => void;
  apps: AppDefinition[];
  os: OSApi;
  onNavigate?: (path: string) => void;
  triggerRef?: React.RefObject<HTMLButtonElement | null>;
}

export const StartMenu: React.FC<StartMenuProps> = ({
  isOpen,
  onClose,
  apps,
  os,
  onNavigate,
  triggerRef,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [focusedIndex, setFocusedIndex] = useState<number>(0);

  const menuItems: DesktopItem[] = useMemo(() => {
    const sortedApps = [...apps].sort((a, b) => a.order - b.order);
    const items: DesktopItem[] = sortedApps.map((app) => ({
      id: app.id,
      title: app.title,
      icon: app.icon,
      appId: app.id,
    }));
    return [...items, CLASSIC_VIEW_ITEM];
  }, [apps]);

  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);
  itemRefs.current = menuItems.map((_, i) => itemRefs.current[i] || null);

  // Focus the active item when menu opens
  useEffect(() => {
    if (isOpen) {
      setFocusedIndex(0);
      const timer = setTimeout(() => {
        itemRefs.current[0]?.focus();
      }, 20);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [isOpen]);

  // Handle click outside to close
  useEffect(() => {
    if (!isOpen) return undefined;

    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node | null;
      if (
        menuRef.current &&
        !menuRef.current.contains(target) &&
        triggerRef?.current &&
        !triggerRef.current.contains(target)
      ) {
        onClose();
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
    };
  }, [isOpen, onClose, triggerRef]);

  const handleSelect = useCallback(
    (item: DesktopItem) => {
      onClose();
      // Restore focus to trigger button
      triggerRef?.current?.focus();

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
    [onClose, triggerRef, onNavigate, os],
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      onClose();
      triggerRef?.current?.focus();
      return;
    }

    const total = menuItems.length;
    if (total === 0) return;

    let nextIndex = -1;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        nextIndex = (focusedIndex + 1) % total;
        break;
      case "ArrowUp":
        e.preventDefault();
        nextIndex = (focusedIndex - 1 + total) % total;
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
      setFocusedIndex(nextIndex);
      itemRefs.current[nextIndex]?.focus();
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div
      ref={menuRef}
      className="yk-start-menu"
      role="menu"
      id="yk-start-menu"
      aria-label="Start menu"
      onKeyDown={handleKeyDown}
      data-testid="start-menu"
    >
      <div className="yk-start-menu__sidebar" aria-hidden="true">
        <span className="yk-start-menu__sidebar-title">YK-OS</span>
      </div>

      <div className="yk-start-menu__content">
        <div className="yk-start-menu__header">
          <span className="yk-start-menu__user-name">Yogesh Kumarasamy</span>
          <span className="yk-start-menu__user-role">Senior Software Engineer</span>
        </div>

        <div className="yk-start-menu__divider" role="separator" />

        <ul className="yk-start-menu__list" role="none">
          {menuItems.map((item, index) => {
            const isFocused = index === focusedIndex;

            return (
              <li key={item.id} role="none" className="yk-start-menu__item-wrapper">
                <button
                  type="button"
                  ref={(el) => {
                    itemRefs.current[index] = el;
                  }}
                  role="menuitem"
                  tabIndex={isFocused ? 0 : -1}
                  className={`yk-start-menu__item ${isFocused ? "yk-start-menu__item--focused" : ""}`}
                  onClick={() => handleSelect(item)}
                  data-testid={`start-menu-item-${item.id}`}
                  data-id={item.id}
                >
                  <span className="yk-start-menu__item-icon" aria-hidden="true">
                    {item.icon}
                  </span>
                  <span className="yk-start-menu__item-text">{item.title}</span>
                  {item.isClassic && (
                    <span className="yk-start-menu__item-badge" aria-hidden="true">
                      HTML
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
};
