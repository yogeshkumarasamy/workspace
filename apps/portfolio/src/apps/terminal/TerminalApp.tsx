import React, { useState, useRef, useEffect, useCallback } from "react";
import type { AppProps, TerminalContext, TerminalOutputEntry } from "./types";
import { commands, executeCommand, getTabCompletions } from "./commands";
import { profile as verifiedProfile } from "../../content/profile";
import "./terminal.css";

export const PROMPT_STRING = "yogesh@yk-os:~$";

export const CHIP_COMMANDS: string[] = [
  "help",
  "whoami",
  "about",
  "experience",
  "projects",
  "writing",
  "skills",
  "contact",
  "clear",
  "sudo hire-me",
];

export interface TerminalAppProps extends AppProps {
  context?: Partial<TerminalContext>;
  initialInput?: string;
}

export const TerminalApp: React.FC<TerminalAppProps> = ({
  context: customContext,
  initialInput = "",
}) => {
  const [currentTheme, setCurrentTheme] = useState<"green" | "amber" | "light">("green");

  // Fallback context if not supplied by parent OS container
  const defaultContext: TerminalContext = {
    profile: verifiedProfile,
    os: {
      open: (appId) => {
        window.dispatchEvent(new CustomEvent("yk-os-open", { detail: { appId } }));
      },
      close: () => {},
      focus: () => {},
      windows: [],
    },
    prefs: {
      theme: currentTheme,
      setTheme: (t) => {
        setCurrentTheme(t);
        if (typeof document !== "undefined") {
          document.documentElement.dataset.theme = t;
        }
      },
      crt: true,
      setCrt: () => {},
      reducedMotion: false,
    },
    navigate: (to) => {
      if (typeof window !== "undefined") {
        window.location.hash = to === "classic" ? "#/classic" : "#/";
      }
    },
  };

  const activeContext: TerminalContext = {
    ...defaultContext,
    ...customContext,
    prefs: {
      ...defaultContext.prefs,
      ...(customContext?.prefs || {}),
    },
  };

  const [inputVal, setInputVal] = useState<string>(initialInput);
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const [draftInput, setDraftInput] = useState<string>("");
  const [entries, setEntries] = useState<TerminalOutputEntry[]>([
    {
      id: "init-banner",
      output: [
        "YK-OS Terminal v2026. Type 'help' to see available commands.",
        "Mobile users: tap the quick-command chips below.",
      ],
    },
  ]);

  const terminalOutputRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = useCallback(() => {
    if (terminalOutputRef.current) {
      terminalOutputRef.current.scrollTop = terminalOutputRef.current.scrollHeight;
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [entries, scrollToBottom]);

  const runInput = useCallback(
    (rawCmd: string) => {
      const trimmed = rawCmd.trim();
      if (!trimmed) {
        setEntries((prev) => [
          ...prev,
          { id: `empty-${Date.now()}-${Math.random()}`, command: "" },
        ]);
        setInputVal("");
        return;
      }

      const updatedHistory = [...history, trimmed];
      setHistory(updatedHistory);
      setHistoryIndex(-1);
      setDraftInput("");

      const result = executeCommand(trimmed, activeContext, updatedHistory);

      if (result.clear) {
        setEntries([]);
      } else {
        setEntries((prev) => [
          ...prev,
          {
            id: `entry-${Date.now()}-${Math.random()}`,
            command: trimmed,
            output: result.output,
          },
        ]);
      }

      setInputVal("");
    },
    [history, activeContext],
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      runInput(inputVal);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (history.length === 0) return;

      if (historyIndex === -1) {
        // Stash current input as draft before navigating history
        setDraftInput(inputVal);
        const newIdx = history.length - 1;
        setHistoryIndex(newIdx);
        setInputVal(history[newIdx]);
      } else if (historyIndex > 0) {
        const newIdx = historyIndex - 1;
        setHistoryIndex(newIdx);
        setInputVal(history[newIdx]);
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (historyIndex === -1) return;

      if (historyIndex < history.length - 1) {
        const newIdx = historyIndex + 1;
        setHistoryIndex(newIdx);
        setInputVal(history[newIdx]);
      } else {
        // Reached end of history; restore draft
        setHistoryIndex(-1);
        setInputVal(draftInput);
      }
    } else if (e.key === "Tab") {
      e.preventDefault();
      const completion = getTabCompletions(inputVal, commands);
      if (completion.match) {
        setInputVal(completion.match);
      } else if (completion.matches && completion.matches.length > 0) {
        setEntries((prev) => [
          ...prev,
          {
            id: `tab-${Date.now()}-${Math.random()}`,
            command: inputVal,
            output: [completion.matches!.join("   ")],
          },
        ]);
      }
    }
  };

  const handleContainerClick = () => {
    inputRef.current?.focus();
  };

  return (
    <div
      className="yk-terminal-container"
      onClick={handleContainerClick}
      data-testid="terminal-container"
    >
      {/* Scrollable output region with ARIA live region */}
      <div
        className="yk-terminal-output"
        ref={terminalOutputRef}
        role="log"
        aria-live="polite"
        aria-atomic="false"
        tabIndex={0}
      >
        {entries.map((entry) => (
          <div key={entry.id} className="yk-terminal-entry">
            {entry.command !== undefined && (
              <div className="yk-terminal-entry-command">
                <span className="yk-terminal-prompt-label">{PROMPT_STRING}</span>
                <span className="yk-terminal-entry-text">{entry.command}</span>
              </div>
            )}
            {entry.output && entry.output.length > 0 && (
              <div className="yk-terminal-entry-output">
                {entry.output.map((line, lIdx) => (
                  <div key={lIdx} className="yk-terminal-line">
                    {line}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Input line */}
      <div className="yk-terminal-input-row">
        <label htmlFor="yk-terminal-cmd-input" className="yk-terminal-sr-only">
          Terminal command input
        </label>
        <span className="yk-terminal-active-prompt" aria-hidden="true">
          {PROMPT_STRING}
        </span>
        <div className="yk-terminal-input-wrapper">
          <input
            id="yk-terminal-cmd-input"
            ref={inputRef}
            type="text"
            className="yk-terminal-input"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            onKeyDown={handleKeyDown}
            aria-label="Terminal command input"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck="false"
          />
        </div>
      </div>

      {/* Mobile / touch command chips per PRD §6 */}
      <div
        className="yk-terminal-chips"
        role="toolbar"
        aria-label="Quick command chips"
      >
        {CHIP_COMMANDS.map((cmd) => (
          <button
            key={cmd}
            type="button"
            className="yk-terminal-chip-btn"
            onClick={(e) => {
              e.stopPropagation();
              runInput(cmd);
              inputRef.current?.focus();
            }}
          >
            {cmd}
          </button>
        ))}
      </div>
    </div>
  );
};

export default TerminalApp;
