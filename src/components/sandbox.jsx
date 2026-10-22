import { useCallback, useEffect, useRef, useState } from "react";
import CodeMirror, { keymap } from "@uiw/react-codemirror";
import { indentWithTab } from "@codemirror/commands";
import { javascript } from "@codemirror/lang-javascript";
import { python } from "@codemirror/lang-python";
import { java } from "@codemirror/lang-java";
import { cpp } from "@codemirror/lang-cpp";

// Module-level so the extension arrays keep the same identity between renders.
const TAB = keymap.of([indentWithTab]);
const EXTENSIONS = {
  javascript: [javascript(), TAB],
  python: [python(), TAB],
  java: [java(), TAB],
  cpp: [cpp(), TAB],
};


/**
 * Minimal code editor built on a plain <textarea>.
 * Accepts `value`, `onChange(newValue)`, and `language` (display-only label).
 * Features: line numbers, tab-key support (inserts 2 spaces), dark theme.
 */
export default function CodeEditor({ value = "", onChange, language }) {
  const textareaRef = useRef(null);
  const lineNumbersRef = useRef(null);
  const lineCount = Math.max(1, (value.match(/\n/g) || []).length + 1);

  // Sync line-number scroll position with the textarea.
  const handleScroll = useCallback(() => {
    if (lineNumbersRef.current && textareaRef.current) {
      lineNumbersRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  }, []);

  function handleKeyDown(e) {
    if (e.key === "Tab") {
      e.preventDefault();
      const ta = textareaRef.current;
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const newVal = value.substring(0, start) + "  " + value.substring(end);
      onChange(newVal);
      // Restore cursor after React re-renders.
      requestAnimationFrame(() => {
        ta.selectionStart = ta.selectionEnd = start + 2;
      });
    }
  }

  return (
    <div className="flex h-full w-full overflow-hidden" style={{ background: "#1a1814" }}>
      {/* Line numbers */}
      <div
        ref={lineNumbersRef}
        className="shrink-0 overflow-hidden select-none"
        style={{
          width: "3rem",
          padding: "0.75rem 0",
          fontFamily: "var(--font-mono)",
          fontSize: "13px",
          lineHeight: "1.5",
          color: "rgba(255,255,255,0.25)",
          textAlign: "right",
          background: "#161410",
          borderRight: "1px solid rgba(255,255,255,0.08)",
          whiteSpace: "pre",
        }}
        aria-hidden
      >
        {Array.from({ length: lineCount }, (_, i) => (
          <div key={i} style={{ paddingRight: "0.5rem" }}>
            {i + 1}
          </div>
        ))}
      </div>

      {/* Textarea editor */}
      <textarea
        ref={textareaRef}
        className="min-w-0 flex-1 resize-none outline-none"
        style={{
          background: "transparent",
          color: "#f3eee2",
          fontFamily: "var(--font-mono)",
          fontSize: "13px",
          lineHeight: "1.5",
          padding: "0.75rem",
          tabSize: 2,
          caretColor: "#f5b700",
          whiteSpace: "pre",
          overflowWrap: "normal",
          overflowX: "auto",
        }}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onScroll={handleScroll}
        onKeyDown={handleKeyDown}
        spellCheck={false}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        data-language={language}
        placeholder={`// Start typing your ${language || "code"} here...`}
      />
    </div>
  );
}