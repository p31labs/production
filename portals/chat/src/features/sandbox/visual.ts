import type { ContractIssue } from './pipeline';

export interface RegionTile {
  path: string;
  tag: string;
  semantic: string;
  attrs: Record<string, string>;
  text: string;
}

const SEMANTIC_HINTS: Record<string, string> = {
  header: 'header',
  footer: 'footer',
  nav: 'nav',
  aside: 'aside',
  main: 'main',
  button: 'control',
  a: 'link',
  input: 'control',
  select: 'control',
  textarea: 'control',
  img: 'media',
  table: 'grid',
  form: 'form',
  dialog: 'dialog',
};

const ROLE_HINTS = ['banner', 'navigation', 'main', 'contentinfo', 'complementary', 'dialog', 'toolbar', 'tablist', 'status', 'log'];

function tagWithRole(el: Element): string {
  const role = el.getAttribute('role');
  return role && ROLE_HINTS.includes(role) ? `[role=${role}]` : el.tagName.toLowerCase();
}

export function tileRegions(html: string): RegionTile[] {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const regions: RegionTile[] = [];
  const walk = (el: Element, path: string[]) => {
    const children = Array.from(el.children);
    const tag = el.tagName.toLowerCase();
    const semantic = SEMANTIC_HINTS[tag] || tagWithRole(el) || tag;
    const role = el.getAttribute('role');

    const id = el.id ? `#${el.id}` : '';
    const cls = el.className && typeof el.className === 'string'
      ? `.${el.className.split(/\s+/).filter(Boolean).join('.')}`
      : '';
    const nextPath = [...path, `${tag}${id}${cls}`];

    const isHeading = /^h[1-6]$/.test(tag);
    const isSemanticTag = tag in SEMANTIC_HINTS;
    const isRoleRegion = role !== null && ROLE_HINTS.includes(role);

    if (isHeading || isSemanticTag || isRoleRegion) {
      regions.push({
        path: nextPath.join(' > '),
        tag,
        semantic,
        attrs: attrsToRecord(el),
        text: (el.textContent || '').trim().slice(0, 200),
      });
    }

    for (const child of children) walk(child, nextPath);
  };
  for (const child of Array.from(doc.body ? doc.body.children : [])) walk(child, []);
  return regions;
}

function attrsToRecord(el: Element): Record<string, string> {
  const out: Record<string, string> = {};
  for (const attr of Array.from(el.attributes)) {
    out[attr.name] = attr.value;
  }
  return out;
}

export function verifyVisual(html: string): ContractIssue[] {
  const issues: ContractIssue[] = [];
  const regions = tileRegions(html);

  const interactiveRegions = regions.filter((r) => r.semantic === 'control' || r.semantic === 'link');
  for (const region of interactiveRegions) {
    const interactive = region.semantic === 'control';
    const labelled = !!(region.attrs['aria-label'] || region.attrs['aria-labelledby'] || (region.attrs.title && interactive) || region.text.trim());
    if (!labelled) {
      issues.push({
        code: 'visual-control-unlabelled',
        severity: 'error',
        priority: 2,
        contract: 'chat-composer',
        message: `Region "${region.path}" renders a ${region.tag} control with no accessible name.`,
        found: region.path,
        suggestion: 'Add aria-label / aria-labelledby, or visible text inside the region.',
      });
    }
  }

  const imgs = regions.filter((r) => r.semantic === 'media');
  for (const img of imgs) {
    if (!(img.attrs.alt !== undefined && img.attrs.alt !== '')) {
      issues.push({
        code: 'visual-image-alt',
        severity: 'warning',
        priority: 3,
        contract: 'chat-message',
        message: `Image region "${img.path}" has no alt text.`,
        found: img.path,
        suggestion: 'Add alt="..." describing the image, or alt="" if purely decorative.',
      });
    }
  }

  const headings = regions.filter((r) => /^h[1-6]$/.test(r.tag));
  for (let i = 1; i < headings.length; i++) {
    const prev = Number(headings[i - 1].tag[1]);
    const curr = Number(headings[i].tag[1]);
    if (curr > prev + 1) {
      issues.push({
        code: 'visual-heading-skip',
        severity: 'warning',
        priority: 3,
        contract: 'chat-message',
        message: `Heading order skips levels: ${headings[i - 1].tag} → ${headings[i].tag}.`,
        found: headings[i].path,
        suggestion: `Use ${headings[i - 1].tag} or ${headings[i].tag} plus a level between, rather than jumping.`,
      });
    }
  }

  const controlCount = interactiveRegions.length;
  if (controlCount > 0 && controlCount < 4) {
    issues.push({
      code: 'visual-control-density',
      severity: 'warning',
      priority: 3,
      contract: 'glass-panel',
      message: `Only ${controlCount} interactive control${controlCount > 1 ? 's' : ''} in the viewport.`,
      found: html.slice(0, 60),
      suggestion: 'Confirm the layout actually needs that few actions, or include the intended primary/secondary pair.',
    });
  }

  return issues.sort((a, b) => (a.priority - b.priority) || (a.severity === 'error' ? -1 : 1));
}