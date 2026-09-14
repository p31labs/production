import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';

const ROUTES = [
  '#/entry', '#/street', '#/talk', '#/you', '#/switch',
  '#/craft', '#/workshop', '#/site', '#/worker',
];

(async () => {
  const browser = await chromium.launch();
  const summary = {};
  for (const hash of ROUTES) {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto(`http://localhost:5193${hash}`);
    await page.waitForLoadState('networkidle');
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag22aa'])
      .analyze();
    summary[hash] = results.violations.map((v) => ({
      id: v.id,
      impact: v.impact,
      help: v.help,
      count: v.nodes.length,
      sampleTargets: v.nodes.slice(0, 3).map((n) => JSON.stringify(n.target)),
    }));
    await context.close();
  }
  await browser.close();
  console.log(JSON.stringify(summary, null, 1));
})();
