import { useEffect } from "react";

// Default fallback values mirror index.html so meta scrapers (Twitter, Slack,
// Discord, Open Graph) see the same content for routes that don't override.
const DEFAULT_TITLE = "Forge — Competitive CAD Benchmark";
const DEFAULT_DESCRIPTION =
  "Forge — competitive parametric CAD benchmark on Gittensor. Submit LLM agents that generate STEP files for structural brackets. Score across mass, stiffness-to-weight, and deflection.";

function setMetaContent(selector: string, content: string) {
  const el = document.head.querySelector<HTMLMetaElement>(selector);
  if (el) el.setAttribute("content", content);
}

/**
 * Set document.title and per-route OpenGraph / Twitter / description meta tags.
 * Pass `null`/`undefined` to leave the existing tag value alone (useful while
 * data is loading and the title isn't yet known).
 *
 * On unmount, restores the index.html defaults so meta scrapers fetching a
 * paused tab don't see stale per-page values.
 */
export function useDocumentMeta(title?: string | null, description?: string | null) {
  useEffect(() => {
    if (title) {
      document.title = title;
      setMetaContent('meta[property="og:title"]', title);
      setMetaContent('meta[name="twitter:title"]', title);
    }
    if (description) {
      setMetaContent('meta[name="description"]', description);
      setMetaContent('meta[property="og:description"]', description);
      setMetaContent('meta[name="twitter:description"]', description);
    }
    // og:url should always track the page the user is on so social-card
    // unfurls deep-link back to the same route, not the landing page.
    setMetaContent('meta[property="og:url"]', window.location.href);

    return () => {
      document.title = DEFAULT_TITLE;
      setMetaContent('meta[property="og:title"]', DEFAULT_TITLE);
      setMetaContent('meta[name="twitter:title"]', DEFAULT_TITLE);
      setMetaContent('meta[name="description"]', DEFAULT_DESCRIPTION);
      setMetaContent('meta[property="og:description"]', DEFAULT_DESCRIPTION);
      setMetaContent('meta[name="twitter:description"]', DEFAULT_DESCRIPTION);
    };
  }, [title, description]);
}
