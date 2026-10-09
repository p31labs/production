/**
 * markdown.ts — the playground's markdown pipeline.
 *
 * marked (already in the forge report pipeline) parses markdown to HTML; the
 * preview iframe renders it with the report's design vocabulary (from the
 * forge booklet report.css). This mirrors the report-renderer so the
 * playground preview looks like the actual output.
 *
 * Colors are OKLCH only — the canon token-audit fails on raw hex/rgba.
 */
import { marked } from 'marked';

marked.setOptions({ gfm: true, breaks: true });

/** Render markdown to a self-contained HTML string for a sandboxed iframe. */
export function renderPreview(md: string, theme: string): string {
  const body = marked.parse(md ?? '', { gfm: true });
  const escaped = String(body ?? '');
  return `<!doctype html><html data-theme="${theme}"><head>
<meta charset="utf-8">
<style>
  :root { color-scheme: light dark; }
  body { font-family: system-ui, sans-serif; padding: 1.5rem 2rem; max-width: 42rem; margin: 0 auto; line-height: 1.6;
         background: oklch(14% 0.014 75); color: oklch(93% 0.012 80); }
  h1 { font-size: 1.9rem; border-bottom: 2px solid oklch(73% 0.18 195); padding-bottom: 0.5rem; }
  h2 { font-size: 1.3rem; margin-top: 1.8rem; color: oklch(73% 0.18 195); }
  h3 { font-size: 1.1rem; }
  ul, ol { padding-left: 1.3rem; } li::marker { color: oklch(73% 0.18 195); }
  blockquote { border-left: 3px solid oklch(73% 0.18 195); margin-left: 0; padding-left: 1rem; color: oklch(76% 0.01 240); font-style: italic; }
  table { border-collapse: collapse; width: 100%; }
  th, td { border: 1px solid oklch(100% 0.01 240 / 0.16); padding: 6px 10px; text-align: left; }
  th { background: oklch(15% 0.017 74); }
  code { font-family: ui-monospace, monospace; font-size: 0.85em; }
  pre { background: oklch(15% 0.017 74); padding: 0.75rem; overflow-x: auto; }
  strong { color: oklch(96% 0.005 240); }
</style></head><body>${escaped}</body></html>`;
}

/** Count words in a markdown source (for the live readability score). */
export function wordCount(md: string): number {
  const stripped = String(md ?? '').replace(/[#>*`-]/g, ' ').replace(/\s+/g, ' ').trim();
  return stripped ? stripped.split(' ').length : 0;
}

/** Approximate Flesch-Kincaid grade (matches the report gate's formula). */
export function fkGrade(text: string): number {
  const countSyllables = (w: string) => (w.toLowerCase().match(/[aeiouy]{1,2}/g) ?? []).length || 1;
  const words = String(text).trim().split(/\s+/).filter(Boolean);
  if (words.length < 5) return 0;
  const sentences = (String(text).match(/[.!?](?=\s|$)/g) ?? []).length || 1;
  const syllables = words.reduce((n, w) => n + countSyllables(w), 0);
  return 0.39 * (words.length / sentences) + 11.8 * (syllables / words.length) - 15.59;
}