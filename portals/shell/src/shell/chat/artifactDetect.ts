/**
 * shell/chat/artifactDetect.ts — pure artifact detection.
 *
 * Promotes substantial generated blocks out of the transcript. Thresholds are
 * PINNED: HTML documents (a <!DOCTYPE> or <html>), standalone SVGs ≥ 2048 chars,
 * and code fences ≥ 48 lines or ≥ 3000 chars. Prose, terminal, markdown, and
 * small snippets never promote. A reasoning scratchpad fence (a `__scratch`
 * language tag) is excluded.
 */

export type ArtifactKind = 'html' | 'svg' | 'code';

export interface DetectedArtifact {
  kind: ArtifactKind;
  title: string;
  language: string;
  content: string;
}

/** Title derivation: <title>, <h1>, a filename comment (# server.py), or the
 *  first top-level declaration. */
function deriveTitle(content: string): string | null {
  const title = /<title>([^<]*)<\/title>/i.exec(content);
  if (title) return title[1].trim();
  const h1 = /<h1[^>]*>([^<]*)<\/h1>/i.exec(content);
  if (h1) return h1[1].trim();
  const fn = /^#\s+([\w./_-]+)/m.exec(content);
  if (fn) return fn[1].trim();
  const decl = /^(?:const|let|function|class|interface|import|export)\s+([\w$]+)/m.exec(content);
  if (decl) return decl[1];
  return null;
}

export function detectArtifacts(text: string): DetectedArtifact[] {
  const out: DetectedArtifact[] = [];
  const fence = /```([a-zA-Z0-9_+-]*)\n([\s\S]*?)```/g;
  let m: RegExpExecArray | null;
  while ((m = fence.exec(text)) !== null) {
    const lang = m[1] || 'code';
    const content = m[2] ?? '';
    if (lang === '__scratch') continue; // reasoning scratchpad — never promote

    const lines = content.split('\n').length;
    if (lang === 'html' || /<!DOCTYPE html|<html/i.test(content)) {
      out.push({ kind: 'html', title: deriveTitle(content) ?? 'HTML', language: 'html', content });
    } else if (lang === 'svg' || (/^<svg/i.test(content.trim()) && content.length >= 2048)) {
      out.push({ kind: 'svg', title: deriveTitle(content) ?? 'SVG', language: 'svg', content });
    } else if (lines >= 48 || content.length >= 3000) {
      out.push({ kind: 'code', title: deriveTitle(content) ?? 'Code', language: lang, content });
    }
  }
  return out;
}