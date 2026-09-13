import type { AgentId } from './types';
import type { ThemeTokens } from './remote';
import { BRAND } from '../../lib/brand';

const ESC = (s: string) =>
  s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

function titleCase(prompt: string): string {
  const words = prompt.trim().split(/\s+/).slice(0, 5).join(' ');
  return words ? words.charAt(0).toUpperCase() + words.slice(1) : 'Artifact';
}

function frame(headline: string, note: string, tokens: ThemeTokens, body: string): string {
  return `<!DOCTYPE html><html lang="en"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width">
<style>
  :root { --bg: ${tokens.bg}; --text: ${tokens.text}; --accent: ${tokens.accent}; }
  * { box-sizing: border-box; }
  body { margin: 0; min-height: 100vh; display: grid; place-items: center; padding: 4vmin;
    background: var(--bg); color: var(--text); font-family: system-ui, -apple-system, sans-serif; }
  .panel { width: min(92vw, 22rem); padding: 1.5rem; border-radius: 1rem;
    background: color-mix(in oklch, var(--bg) 82%, var(--accent) 18%);
    border: 1px solid color-mix(in oklch, var(--accent) 38%, transparent); }
  h1 { font-size: 1.25rem; margin: 0 0 0.25rem; }
  .note { font-size: 0.8rem; opacity: 0.72; margin: 0 0 1.25rem; }
  ${body}
  .chip { font-size: 0.72rem; opacity: 0.6; display: block; margin-top: 1.5rem; }
</style>
</head><body>
<div class="panel">
  <h1>${ESC(headline)}</h1>
  <p class="note">${ESC(note)}</p>
  ${body}
  <span class="chip">Built locally in the ${BRAND.sub} studio (offline composer)</span>
</div>
</body></html>`;
}

function archetype(prompt: string): { headline: string; note: string; body: string } {
  const p = prompt.toLowerCase();

  const spoonDash = /spoon|dashboard|energy|calm|meter|battery/.test(p);
  if (spoonDash) {
    return {
      headline: 'Spoon meter',
      note: 'Live overview of energy for the day',
      body: `<div style="position:relative;height:14px;border-radius:999px;background:color-mix(in oklch, var(--accent) 16%, transparent);overflow:hidden">
        <div style="width:62%;height:100%;border-radius:999px;background:var(--accent)"></div>
      </div>
      <div style="display:flex;gap:0.5rem;margin-top:1rem;flex-wrap:wrap">
        <span class="chip" style="margin:0;padding:0.4rem 0.75rem;border-radius:999px;border:1px solid color-mix(in oklch, var(--accent) 38%, transparent)">Spoons: 4 / 10</span>
        <span class="chip" style="margin:0;padding:0.4rem 0.75rem;border-radius:999px;border:1px solid color-mix(in oklch, var(--accent) 38%, transparent)">Rest recommended</span>
      </div>`,
    };
  }

  const login = /login|sign ?in|form|validate|auth|password/.test(p);
  if (login) {
    return {
      headline: 'Login',
      note: 'Email + password with inline validation',
      body: `<label style="font-size:0.75rem;opacity:0.7">Email</label>
      <input style="width:100%;margin:0.25rem 0 0.75rem;padding:0.6rem 0.75rem;border-radius:0.5rem;border:1px solid color-mix(in oklch, var(--accent) 38%, transparent);background:color-mix(in oklch, var(--bg) 70%, transparent);color:var(--text)" placeholder="you@family">
      <label style="font-size:0.75rem;opacity:0.7">Password</label>
      <input type="password" style="width:100%;margin:0.25rem 0 1rem;padding:0.6rem 0.75rem;border-radius:0.5rem;border:1px solid color-mix(in oklch, var(--accent) 38%, transparent);background:color-mix(in oklch, var(--bg) 70%, transparent);color:var(--text)" placeholder="••••••••">
      <button style="width:100%;padding:0.7rem;border:none;border-radius:0.6rem;background:var(--accent);color:var(--bg);font-weight:700;cursor:pointer">Continue</button>`,
    };
  }

  const grid = /grid|card|cards|tiles|gallery/.test(p);
  if (grid) {
    const cards = ['Sunrise', 'Garden', 'Workbench']
      .map(
        (c) =>
          `<div style="padding:1rem;border-radius:0.75rem;border:1px solid color-mix(in oklch, var(--accent) 30%, transparent);background:color-mix(in oklch, var(--accent) 8%, transparent)">
            <div style="height:2.5rem;width:2.5rem;border-radius:0.6rem;background:var(--accent);opacity:0.85"></div>
            <strong style="display:block;margin-top:0.6rem;font-size:0.9rem">${c}</strong>
            <span style="font-size:0.72rem;opacity:0.66">A quiet card for the jar.</span>
          </div>`,
      )
      .join('');
    return {
      headline: 'Card grid',
      note: 'Glass borders with hover lift',
      body: `<div style="display:grid;grid-template-columns:repeat(3, 1fr);gap:0.6rem">${cards}</div>`,
    };
  }

  const settings = /settings|profile|account|preferences|toggles?/.test(p);
  if (settings) {
    return {
      headline: 'Settings',
      note: 'Profile, theme, and toggles layout',
      body: `<div style="display:flex;align-items:center;gap:0.75rem;margin-bottom:1rem">
        <div style="width:2.6rem;height:2.6rem;border-radius:999px;background:var(--accent)"></div>
        <div><strong style="display:block">${BRAND.sub} family</strong><span style="font-size:0.72rem;opacity:0.66">Home profile</span></div>
      </div>
      ${['Reduce motion', 'Sound effects', 'Dark mode']
        .map(
          (t) => `<div style="display:flex;justify-content:space-between;align-items:center;padding:0.7rem 0;border-top:1px solid color-mix(in oklch, var(--accent) 22%, transparent)">
            <span style="font-size:0.85rem">${t}</span>
            <span style="width:2.2rem;height:1.25rem;border-radius:999px;background:var(--accent);position:relative">
              <span style="position:absolute;top:0.15rem;right:0.15rem;width:0.95rem;height:0.95rem;border-radius:999px;background:var(--bg)"></span>
            </span>
          </div>`,
        )
        .join('')}`,
    };
  }

  const nav = /nav|street|menu|menu|dock|topbar/.test(p);
  if (nav) {
    return {
      headline: 'Street nav',
      note: 'A calm way to move through the jar',
      body: `<div style="display:flex;gap:0.35rem;flex-wrap:wrap">${['Home', 'Talk', 'Craft', 'Workshop', 'Garden']
        .map((n, i) => `<span style="padding:0.4rem 0.8rem;border-radius:999px;${i === 0 ? `background:var(--accent);color:var(--bg)` : 'border:1px solid color-mix(in oklch, var(--accent) 32%, transparent)'};font-size:0.8rem">${n}</span>`)
        .join('')}</div>`,
    };
  }

  const chat = /chat|message|bubble|talk|note/.test(p);
  if (chat) {
    return {
      headline: 'Message',
      note: 'A gentle note from the family',
      body: `<div style="display:flex;flex-direction:column;gap:0.5rem">
        <span style="align-self:flex-start;max-width:85%;padding:0.6rem 0.85rem;border-radius:1rem;border:1px solid color-mix(in oklch, var(--accent) 32%, transparent)">Lunch is ready when you are 🍲</span>
        <span style="align-self:flex-end;max-width:85%;padding:0.6rem 0.85rem;border-radius:1rem;background:var(--accent);color:var(--bg)">Be right there — two more spoons worth of this ❤️</span>
      </div>`,
    };
  }

  const hero = /hero|landing|welcome|splash|intro/.test(p);
  if (hero) {
    return {
      headline: titleCase(prompt.split(/[,;]/)[0] || 'Welcome'),
      note: `A quiet landing for the ${BRAND.sub} portal`,
      body: `<div style="display:flex;align-items:center;gap:0.75rem">
        <div style="width:3rem;height:3rem;border-radius:1rem;background:var(--accent)"></div>
        <span style="font-size:0.85rem;opacity:0.75">Everything in one jar. Nothing required.</span>
      </div>
      <div style="display:flex;gap:0.5rem;margin-top:1.25rem;flex-wrap:wrap">
        <span style="padding:0.5rem 1rem;border-radius:999px;background:var(--accent);color:var(--bg);font-weight:700;font-size:0.85rem">Start</span>
        <span style="padding:0.5rem 1rem;border-radius:999px;border:1px solid color-mix(in oklch, var(--accent) 38%, transparent);font-size:0.85rem">See the workshop</span>
      </div>`,
    };
  }

  return {
    headline: titleCase(prompt),
    note: 'A small, token-faithful component. Ask for a dashboard, login, card grid, settings, nav, message, or hero.',
    body: `<div style="display:flex;flex-wrap:wrap;gap:0.5rem">
      <span style="padding:0.55rem 1.1rem;border-radius:999px;background:var(--accent);color:var(--bg);font-weight:700">Primary</span>
      <span style="padding:0.55rem 1.1rem;border-radius:999px;border:1px solid color-mix(in oklch, var(--accent) 40%, transparent)">Secondary</span>
      <span style="padding:0.55rem 1.1rem;border-radius:999px">Ghost action</span>
    </div>
    <div style="margin-top:1rem;padding:0.8rem;border-radius:0.75rem;border:1px dashed color-mix(in oklch, var(--accent) 34%, transparent);font-size:0.85rem;opacity:0.8">This is where the generated piece will live.</div>`,
  };
}

export function localCompose(prompt: string, agent: AgentId, tokens: ThemeTokens): string {
  const { headline, note, body } = archetype(prompt);
  return frame(headline, note, tokens, body);
}