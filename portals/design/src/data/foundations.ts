/** Foundation branch configuration — the token-driven foundation pages.
 *  Each entry renders from the canonical DTCG tree (tokens.dtc.json) via
 *  FoundationsPage. Schema-driven: the branch list is data, not prose. */
export interface FoundationConfig {
  title: string;
  description: string;
  branches: string[];
}

export const FOUNDATION_BRANCHES: Record<string, FoundationConfig> = {
  color: { title: 'Color', description: 'The OKLCH palette — accent, surface, text, status, glass.', branches: ['p31.color', 'p31.accent', 'p31.neon', 'p31.quantum', 'p31.surface', 'p31.text', 'p31.status'] },
  typography: { title: 'Typography', description: 'Type scale and families — display, headings, body, caption, mono.', branches: ['p31.font', 'p31.h1', 'p31.h2', 'p31.h3', 'p31.h4', 'p31.body', 'p31.caption', 'p31.label', 'p31.type'] },
  spacing: { title: 'Spacing', description: 'The 4/8/16/24/32 scale and its semantic tokens.', branches: ['p31.layout.spacing', 'p31.space', 'p31.spacing'] },
  motion: { title: 'Motion', description: 'Duration, easing, and spring tokens.', branches: ['p31.motion', 'p31.duration', 'p31.easing', 'p31.spring'] },
  radius: { title: 'Radius', description: 'Corner rounding — sm, md, lg, full, candy.', branches: ['p31.radius'] },
  elevation: { title: 'Elevation', description: 'Shadow tiers and z-index.', branches: ['p31.elevation', 'p31.z', 'p31.glow', 'p31.shadow'] },
  glass: { title: 'Glass', description: 'Glassmorphic surface and border tokens.', branches: ['p31.glass'] },
};