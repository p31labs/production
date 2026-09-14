import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto('http://localhost:5193/#/site');
  await page.waitForLoadState('networkidle');
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag22aa'])
    .analyze();
  for (const v of results.violations) {
    console.log(`${v.impact}: ${v.id} (${v.nodes.length}) — ${v.help}`);
    for (const n of v.nodes.slice(0, 2)) {
      console.log(`  - ${n.html}`);
    }
  }
  if (results.violations.length === 0) console.log('CLEAN');
  await browser.close();
})();
