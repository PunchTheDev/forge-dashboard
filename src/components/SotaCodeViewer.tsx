import { useEffect, useMemo, useState } from "react";
import { SotaRecord, sotaCodeUrl } from "../lib/api";

/**
 * Inline viewer for the SOTA agent's source code.
 *
 * Why this exists: the flywheel is "fork the winning agent, beat it by a decaying margin."
 * A link-out to GitHub bounces the user off the page and adds friction at the exact moment
 * we want them reading the code. Pulling the file inline keeps the loop tight: see the spec,
 * see the part, see the code that made it.
 *
 * Fetch path: `raw.githubusercontent.com/<owner>/<repo>/<commit>/<path>` — commit-pinned so
 * the code shown matches the score shown (no drift from a later main). Public repos serve
 * raw content with `Access-Control-Allow-Origin: *`, so this works from the browser.
 */
export function SotaCodeViewer({ sota, label }: { sota: SotaRecord; label: string }) {
  const rawUrl = useMemo(
    () => `https://raw.githubusercontent.com/PunchTheDev/forge/${sota.commit_hash}/${sota.agent}`,
    [sota.commit_hash, sota.agent],
  );
  const blobUrl = useMemo(() => sotaCodeUrl(sota), [sota]);

  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");
  const [source, setSource] = useState<string>("");
  const [expanded, setExpanded] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    let cancelled = false;
    setStatus("loading");
    setSource("");
    fetch(rawUrl)
      .then((res) => {
        if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
        return res.text();
      })
      .then((text) => {
        if (cancelled) return;
        setSource(text);
        setStatus("ok");
      })
      .catch(() => {
        if (cancelled) return;
        setStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, [rawUrl]);

  const lineCount = source ? source.split("\n").length : 0;
  // Show ~28 lines collapsed (≈560px @ 20px line-height) — enough to read the agent's
  // generate() signature + first few lines of logic without scrolling, expand for the rest.
  const COLLAPSED_LINES = 28;
  const isLong = lineCount > COLLAPSED_LINES;

  function copyCode() {
    if (!source) return;
    const w: any = typeof window !== "undefined" ? window : null;
    const nav: any = w?.navigator;
    if (nav?.clipboard?.writeText) {
      nav.clipboard.writeText(source).then(
        () => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1400);
        },
        () => {
          setCopied(false);
        },
      );
    }
  }

  // ─── Header (always shown) ────────────────────────────────────────────────
  const header = (
    <div className="px-4 py-3 border-b border-forge-border flex flex-wrap items-center gap-3">
      <div className="flex-1 min-w-0">
        <div className="text-xs font-semibold text-white">{label}</div>
        <div className="text-xs text-forge-muted mt-0.5 truncate font-mono">
          {sota.agent}{" "}
          <span className="text-forge-border">·</span>{" "}
          <span title="Commit-pinned: the score and the code you see come from the same revision.">
            @ {sota.commit_hash.slice(0, 7)}
          </span>
          {status === "ok" && lineCount > 0 ? (
            <>
              {" "}
              <span className="text-forge-border">·</span> {lineCount} lines
            </>
          ) : null}
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={copyCode}
          disabled={status !== "ok"}
          className="text-xs px-2.5 py-1 rounded-md border border-forge-border text-forge-muted hover:text-white hover:border-forge-accent/40 transition-colors disabled:opacity-40 disabled:cursor-not-allowed font-mono"
          title="Copy the full file to clipboard"
        >
          {copied ? "✓ Copied" : "Copy"}
        </button>
        <a
          href={blobUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs px-2.5 py-1 rounded-md border border-forge-border text-forge-muted hover:text-white hover:border-forge-accent/40 transition-colors font-mono"
          title="Open this file on GitHub at the same commit"
        >
          GitHub ↗
        </a>
      </div>
    </div>
  );

  // ─── Body ─────────────────────────────────────────────────────────────────
  let body: React.ReactNode;
  if (status === "loading") {
    body = (
      <div className="px-4 py-6 text-xs text-forge-muted">Fetching agent source from GitHub…</div>
    );
  } else if (status === "error") {
    body = (
      <div className="px-4 py-4 text-xs text-amber-300/90 bg-amber-400/5">
        Couldn't load the source inline (GitHub may be rate-limiting, or the file moved). Open it
        directly on{" "}
        <a href={blobUrl} target="_blank" rel="noopener noreferrer" className="underline text-amber-200">
          GitHub
        </a>
        .
      </div>
    );
  } else {
    const shown = expanded ? source : source.split("\n").slice(0, COLLAPSED_LINES).join("\n");
    body = (
      <>
        <div className="relative">
          <pre
            className="font-mono text-[11.5px] leading-[1.55] text-forge-text overflow-x-auto bg-forge-bg/40 p-4 m-0"
            style={{ maxHeight: expanded ? "70vh" : undefined, overflowY: expanded ? "auto" : "hidden" }}
          >
            <code className="block">
              <CodeBlock text={shown} />
            </code>
          </pre>
          {/* Subtle fade-out hint at bottom of collapsed view */}
          {isLong && !expanded && (
            <div
              className="pointer-events-none absolute bottom-0 left-0 right-0 h-12"
              style={{
                background:
                  "linear-gradient(to bottom, rgba(13,17,23,0) 0%, rgba(13,17,23,0.85) 100%)",
              }}
            />
          )}
        </div>
        {isLong && (
          <div className="px-4 py-2 border-t border-forge-border flex items-center justify-between text-xs">
            <span className="text-forge-muted">
              {expanded
                ? `Showing all ${lineCount} lines`
                : `Showing first ${COLLAPSED_LINES} of ${lineCount} lines`}
            </span>
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="text-forge-accent hover:text-white transition-colors font-mono"
            >
              {expanded ? "Collapse ↑" : "Expand full file ↓"}
            </button>
          </div>
        )}
      </>
    );
  }

  return (
    <div className="mt-4 bg-forge-surface border border-forge-border rounded-xl overflow-hidden">
      {header}
      {body}
    </div>
  );
}

/**
 * Lightweight Python syntax highlight — keywords, strings, comments, numbers, decorators.
 * Done without a dependency to keep the bundle small. Renders line numbers in a fixed gutter.
 *
 * This isn't a full lexer; it's a 5-pass regex tokenizer good enough that `def generate(spec, llm)`
 * reads as code and not as wall-of-text. Edge cases (triple-quoted strings spanning lines,
 * f-string interpolations, nested escapes) fall back to "looks like a string" — acceptable
 * trade-off for zero deps.
 */
function CodeBlock({ text }: { text: string }) {
  const lines = text.split("\n");
  // Compute gutter width from total line count so 3-digit files don't wobble.
  const gutterChars = String(lines.length).length;
  return (
    <>
      {lines.map((line, i) => (
        <div key={i} className="flex">
          <span
            className="select-none text-forge-border pr-3 text-right shrink-0"
            style={{ width: `${gutterChars + 1}ch` }}
            aria-hidden="true"
          >
            {i + 1}
          </span>
          <span className="flex-1 whitespace-pre">{highlightPython(line)}</span>
        </div>
      ))}
    </>
  );
}

const PY_KEYWORDS = new Set([
  "False", "None", "True", "and", "as", "assert", "async", "await", "break", "class",
  "continue", "def", "del", "elif", "else", "except", "finally", "for", "from", "global",
  "if", "import", "in", "is", "lambda", "nonlocal", "not", "or", "pass", "raise", "return",
  "try", "while", "with", "yield",
]);
const PY_BUILTINS = new Set([
  "print", "len", "range", "list", "dict", "tuple", "set", "str", "int", "float", "bool",
  "isinstance", "type", "open", "enumerate", "zip", "map", "filter", "sum", "min", "max",
  "abs", "round", "sorted", "reversed", "any", "all", "self", "cls",
]);

function highlightPython(line: string): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  let i = 0;
  let key = 0;
  // Comment splits the line — once we hit '#' outside a string, the rest is a comment.
  // We do a 2-step: scan for first un-quoted '#', then tokenize the prefix.
  const commentIdx = findCommentStart(line);
  const codePart = commentIdx === -1 ? line : line.slice(0, commentIdx);
  const commentPart = commentIdx === -1 ? "" : line.slice(commentIdx);

  while (i < codePart.length) {
    const c = codePart[i];
    // String literal (single or double quote, no triple-quote handling — line-bounded)
    if (c === '"' || c === "'") {
      const quote = c;
      let j = i + 1;
      while (j < codePart.length) {
        if (codePart[j] === "\\" && j + 1 < codePart.length) {
          j += 2;
          continue;
        }
        if (codePart[j] === quote) {
          j += 1;
          break;
        }
        j += 1;
      }
      out.push(
        <span key={key++} className="text-emerald-300">
          {codePart.slice(i, j)}
        </span>,
      );
      i = j;
      continue;
    }
    // Decorator: leading @ followed by identifier
    if (c === "@" && /[A-Za-z_]/.test(codePart[i + 1] ?? "")) {
      let j = i + 1;
      while (j < codePart.length && /[A-Za-z0-9_.]/.test(codePart[j])) j += 1;
      out.push(
        <span key={key++} className="text-amber-300">
          {codePart.slice(i, j)}
        </span>,
      );
      i = j;
      continue;
    }
    // Number
    if (/[0-9]/.test(c) && !/[A-Za-z_]/.test(codePart[i - 1] ?? "")) {
      let j = i;
      while (j < codePart.length && /[0-9_.xXeE+\-]/.test(codePart[j])) {
        // crude: allow e+/- as part of exponent only if previous was digit
        if ((codePart[j] === "+" || codePart[j] === "-") && !/[eE]/.test(codePart[j - 1] ?? "")) break;
        j += 1;
      }
      out.push(
        <span key={key++} className="text-orange-300">
          {codePart.slice(i, j)}
        </span>,
      );
      i = j;
      continue;
    }
    // Identifier — could be keyword or builtin
    if (/[A-Za-z_]/.test(c)) {
      let j = i;
      while (j < codePart.length && /[A-Za-z0-9_]/.test(codePart[j])) j += 1;
      const word = codePart.slice(i, j);
      if (PY_KEYWORDS.has(word)) {
        out.push(
          <span key={key++} className="text-violet-300">
            {word}
          </span>,
        );
      } else if (PY_BUILTINS.has(word)) {
        out.push(
          <span key={key++} className="text-sky-300">
            {word}
          </span>,
        );
      } else {
        out.push(<span key={key++}>{word}</span>);
      }
      i = j;
      continue;
    }
    // Everything else — raw char
    out.push(<span key={key++}>{c}</span>);
    i += 1;
  }
  if (commentPart) {
    out.push(
      <span key={key++} className="text-forge-muted italic">
        {commentPart}
      </span>,
    );
  }
  return out;
}

/** Find first '#' not inside a quoted string. Returns -1 if no comment. */
function findCommentStart(line: string): number {
  let inStr: string | null = null;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inStr) {
      if (c === "\\") {
        i += 1;
        continue;
      }
      if (c === inStr) inStr = null;
      continue;
    }
    if (c === '"' || c === "'") {
      inStr = c;
      continue;
    }
    if (c === "#") return i;
  }
  return -1;
}
