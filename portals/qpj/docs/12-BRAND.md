# 12 — Brand scrub

Status: shipped (chunk 2 of the outstanding-directive batch)

## Single source of brand copy

Brand strings are never written into components. `src/lib/brand.ts` is the only
place `Quantum Pickle Jar` / `QPJ` / `Lantern` may appear:

```ts
export const BRAND = {
  name: 'Quantum Pickle Jar',
  short: 'QPJ',
  sub: 'Lantern',
} as const;
```

Consumers import `BRAND` (topbar in `App.tsx`, sandbox `localCompose.ts`
compositions, workshop `Brands` lede, `ApcaChecker` preset labels).

## Guard

`src/__tests__/brand-scrub.test.ts` walks every `.ts`/`.tsx` under `src`
(excluding `lib/brand.ts` and `__tests__`), strips comments, and asserts no
`Quantum Pickle Jar | Lantern | QPJ` remains. If a component hardcodes a brand
string, the gate fails and the file is named.

## Scope

- Scrubbed: `App.tsx` (brand + home aria-label), `localCompose.ts` (3 strings),
  `workshop/Brands.tsx` lede, `workshop/ApcaChecker.tsx` preset.
- Out of scope (intentional): `index.html` title/meta (static document shell) —
  the HTML entry cannot import the TS module; CSS identifiers (`--p31-lantern`,
  `.lantern-dot`) are namespacing, not copy.