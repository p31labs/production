/**
 * @file CanonFooter — p31ca wrapper around the shared canonical chrome Footer.
 *
 * The canon footer for the marketing surfaces is the static
 * @p31ca/ui/chrome <Footer> (src/chrome/Footer.tsx, exported from
 * src/chrome/index.ts) — one fixed look across phosphorus31, p31ca, PHOS,
 * and WILLOW. It takes NO props; its columns and links live inside the
 * composition itself.
 *
 * NOTE (fix 2026-10-13): this file previously imported a data-driven
 * `Footer`/`FooterColumn`/`FooterLink` API from '@p31ca/ui/chrome' and passed
 * `blurb`/`links`/`products`/`organization` props. That API does not exist in
 * the chrome package — chrome's Footer is prop-less and static, so the props
 * were silently ignored. The data-driven composition does exist at
 * `@p31ca/design-core/compositions/Footer` (columns/tagline/copyright), but
 * its `site-footer` markup has no CSS shipped in this app, so swapping to it
 * would change the deployed look. The chrome composition is what renders
 * live today and stays — see docs/fix-plans/p31ca-content-wave-2026-10-13.md.
 */

import { Footer } from '@p31ca/ui/chrome';

export default function CanonFooter() {
  return <Footer />;
}