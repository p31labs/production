/**
 * Trusted Types policy for P31 Sovereign Shell.
 *
 * Enables CSP `require-trusted-types-for 'script'` by providing a
 * DOMPurify-backed policy for all `dangerouslySetInnerHTML` usage.
 *
 * Usage:
 *   import { trustedHtml } from '@/lib/trustedTypes';
 *   <div dangerouslySetInnerHTML={{ __html: trustedHtml(userInput) }} />
 */

import DOMPurify from 'dompurify';

const POLICY_NAME = 'p31-html';

function createPolicy(): { createHTML: (input: string) => string; createScriptURL: (url: string) => string } | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const tt = (window as unknown as { trustedTypes?: { createPolicy: (name: string, rules: { createHTML: (input: string) => string; createScriptURL: (url: string) => string }) => { createHTML: (input: string) => string; createScriptURL: (url: string) => string } } }).trustedTypes;
  if (!tt) {
    return null;
  }

  const policy = tt.createPolicy(POLICY_NAME, {
    createHTML: (input: string) => DOMPurify.sanitize(input, {
      USE_PROFILES: {
        html: true,
        svg: true,
        mathMl: true,
      },
      ALLOWED_TAGS: [
        'span', 'div', 'p', 'br', 'strong', 'em', 'code', 'pre',
        'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'ul', 'ol', 'li',
        'table', 'thead', 'tbody', 'tr', 'td', 'th',
        'a', 'img',
        'sup', 'sub',
        'annotation', 'annotation-xml', 'semantics', 'mrow', 'mi', 'mn', 'mo', 'msup', 'msub', 'msubsup', 'mfrac', 'mroot', 'msqrt', 'mtable', 'mtr', 'mtd', 'mtext', 'mspace',
        'svg', 'path', 'g', 'rect', 'circle', 'ellipse', 'line', 'polyline', 'polygon', 'defs', 'linearGradient', 'radialGradient', 'stop',
      ],
      ALLOWED_ATTR: [
        'class', 'id', 'style', 'title', 'aria-label', 'aria-hidden',
        'href', 'src', 'alt', 'width', 'height', 'viewBox',
        'fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin',
        'd', 'cx', 'cy', 'rx', 'ry', 'x1', 'y1', 'x2', 'y2',
        'points', 'transform',
        'xmlns', 'xml:space',
      ],
    }),
    createScriptURL: (url: string) => url,
  });

  return {
    createHTML: (input: string) => policy.createHTML(input),
    createScriptURL: (url: string) => policy.createScriptURL(url),
  };
}

let cachedPolicy: { createHTML: (input: string) => string; createScriptURL: (url: string) => string } | null | undefined;

export function getTrustedTypesPolicy(): { createHTML: (input: string) => string; createScriptURL: (url: string) => string } | null {
  if (cachedPolicy === undefined) {
    cachedPolicy = createPolicy();
  }
  return cachedPolicy;
}

export function trustedHtml(input: string): string {
  const policy = getTrustedTypesPolicy();
  if (policy) {
    return policy.createHTML(input);
  }
  return input;
}
