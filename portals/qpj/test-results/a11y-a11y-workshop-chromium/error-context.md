# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: a11y.spec.ts >> a11y: workshop
- Location: e2e/a11y.spec.ts:17:3

# Error details

```
Error: expect(received).toEqual(expected) // deep equality

- Expected  -   1
+ Received  + 192

- Array []
+ Array [
+   Object {
+     "description": "Ensure an element's role supports its ARIA attributes",
+     "help": "Elements must only use supported ARIA attributes",
+     "helpUrl": "https://dequeuniversity.com/rules/axe/4.13/aria-allowed-attr?application=playwright",
+     "id": "aria-allowed-attr",
+     "impact": "critical",
+     "nodes": Array [
+       Object {
+         "all": Array [
+           Object {
+             "data": Array [
+               "aria-checked=\"false\"",
+             ],
+             "id": "aria-allowed-attr",
+             "impact": "critical",
+             "message": "ARIA attribute is not allowed: aria-checked=\"false\"",
+             "relatedNodes": Array [],
+           },
+         ],
+         "any": Array [],
+         "failureSummary": "Fix all of the following:
+   ARIA attribute is not allowed: aria-checked=\"false\"",
+         "html": "<button type=\"button\" class=\"spoon-btn\" aria-checked=\"false\" aria-label=\"Spoons = 0\" title=\"Cognitive load level 0\">",
+         "impact": "critical",
+         "none": Array [],
+         "target": Array [
+           "button[aria-label=\"Spoons = 0\"]",
+         ],
+       },
+       Object {
+         "all": Array [
+           Object {
+             "data": Array [
+               "aria-checked=\"false\"",
+             ],
+             "id": "aria-allowed-attr",
+             "impact": "critical",
+             "message": "ARIA attribute is not allowed: aria-checked=\"false\"",
+             "relatedNodes": Array [],
+           },
+         ],
+         "any": Array [],
+         "failureSummary": "Fix all of the following:
+   ARIA attribute is not allowed: aria-checked=\"false\"",
+         "html": "<button type=\"button\" class=\"spoon-btn\" aria-checked=\"false\" aria-label=\"Spoons = 1\" title=\"Cognitive load level 1\">",
+         "impact": "critical",
+         "none": Array [],
+         "target": Array [
+           "button[aria-label=\"Spoons = 1\"]",
+         ],
+       },
+       Object {
+         "all": Array [
+           Object {
+             "data": Array [
+               "aria-checked=\"false\"",
+             ],
+             "id": "aria-allowed-attr",
+             "impact": "critical",
+             "message": "ARIA attribute is not allowed: aria-checked=\"false\"",
+             "relatedNodes": Array [],
+           },
+         ],
+         "any": Array [],
+         "failureSummary": "Fix all of the following:
+   ARIA attribute is not allowed: aria-checked=\"false\"",
+         "html": "<button type=\"button\" class=\"spoon-btn\" aria-checked=\"false\" aria-label=\"Spoons = 2\" title=\"Cognitive load level 2\">",
+         "impact": "critical",
+         "none": Array [],
+         "target": Array [
+           "button[aria-label=\"Spoons = 2\"]",
+         ],
+       },
+       Object {
+         "all": Array [
+           Object {
+             "data": Array [
+               "aria-checked=\"true\"",
+             ],
+             "id": "aria-allowed-attr",
+             "impact": "critical",
+             "message": "ARIA attribute is not allowed: aria-checked=\"true\"",
+             "relatedNodes": Array [],
+           },
+         ],
+         "any": Array [],
+         "failureSummary": "Fix all of the following:
+   ARIA attribute is not allowed: aria-checked=\"true\"",
+         "html": "<button type=\"button\" class=\"spoon-btn active\" aria-checked=\"true\" aria-label=\"Spoons = 3\" title=\"Cognitive load level 3\">",
+         "impact": "critical",
+         "none": Array [],
+         "target": Array [
+           ".active",
+         ],
+       },
+       Object {
+         "all": Array [
+           Object {
+             "data": Array [
+               "aria-checked=\"false\"",
+             ],
+             "id": "aria-allowed-attr",
+             "impact": "critical",
+             "message": "ARIA attribute is not allowed: aria-checked=\"false\"",
+             "relatedNodes": Array [],
+           },
+         ],
+         "any": Array [],
+         "failureSummary": "Fix all of the following:
+   ARIA attribute is not allowed: aria-checked=\"false\"",
+         "html": "<button type=\"button\" class=\"spoon-btn\" aria-checked=\"false\" aria-label=\"Spoons = 4\" title=\"Cognitive load level 4\">",
+         "impact": "critical",
+         "none": Array [],
+         "target": Array [
+           "button[aria-label=\"Spoons = 4\"]",
+         ],
+       },
+       Object {
+         "all": Array [
+           Object {
+             "data": Array [
+               "aria-checked=\"false\"",
+             ],
+             "id": "aria-allowed-attr",
+             "impact": "critical",
+             "message": "ARIA attribute is not allowed: aria-checked=\"false\"",
+             "relatedNodes": Array [],
+           },
+         ],
+         "any": Array [],
+         "failureSummary": "Fix all of the following:
+   ARIA attribute is not allowed: aria-checked=\"false\"",
+         "html": "<button type=\"button\" class=\"spoon-btn\" aria-checked=\"false\" aria-label=\"Spoons = 5\" title=\"Cognitive load level 5\">",
+         "impact": "critical",
+         "none": Array [],
+         "target": Array [
+           "button[aria-label=\"Spoons = 5\"]",
+         ],
+       },
+     ],
+     "tags": Array [
+       "cat.aria",
+       "wcag2a",
+       "wcag412",
+       "EN-301-549",
+       "EN-9.4.1.2",
+       "RGAAv4",
+       "RGAA-7.1.1",
+     ],
+   },
+   Object {
+     "description": "Ensure all elements with a role attribute use a valid value",
+     "help": "ARIA roles used must conform to valid values",
+     "helpUrl": "https://dequeuniversity.com/rules/axe/4.13/aria-roles?application=playwright",
+     "id": "aria-roles",
+     "impact": "critical",
+     "nodes": Array [
+       Object {
+         "all": Array [],
+         "any": Array [],
+         "failureSummary": "Fix all of the following:
+   Role must be one of the valid ARIA roles: skip-link",
+         "html": "<a href=\"#street\" class=\"skip-link\" role=\"skip-link\" aria-label=\"Skip to main content\">Skip to main content</a>",
+         "impact": "critical",
+         "none": Array [
+           Object {
+             "data": Array [
+               "skip-link",
+             ],
+             "id": "invalidrole",
+             "impact": "critical",
+             "message": "Role must be one of the valid ARIA roles: skip-link",
+             "relatedNodes": Array [],
+           },
+         ],
+         "target": Array [
+           "a",
+         ],
+       },
+     ],
+     "tags": Array [
+       "cat.aria",
+       "wcag2a",
+       "wcag412",
+       "EN-301-549",
+       "EN-9.4.1.2",
+       "RGAAv4",
+       "RGAA-7.1.1",
+     ],
+   },
+ ]
```

# Page snapshot

```yaml
- generic [ref=e1]:
  - link "Skip to main content" [ref=e2] [cursor=pointer]:
    - /url: "#street"
  - status
  - generic [ref=e4]:
    - banner [ref=e5]:
      - button "Quantum Pickle Jar — home" [ref=e6] [cursor=pointer]:
        - generic [aria-hidden] [ref=e7]: 🥒
        - generic [ref=e8]: Quantum Pickle Jar
      - generic [ref=e9]:
        - 'generic "Mode: Spark" [ref=e10]': Spark
        - generic "3 of 5 spoons" [ref=e12]:
          - radiogroup "Cognitive load" [ref=e14]:
            - button "Spoons = 0" [ref=e15] [cursor=pointer]
            - button "Spoons = 1" [ref=e20] [cursor=pointer]
            - button "Spoons = 2" [ref=e25] [cursor=pointer]
            - button "Spoons = 3" [ref=e30] [cursor=pointer]
            - button "Spoons = 4" [ref=e35] [cursor=pointer]
            - button "Spoons = 5" [ref=e40] [cursor=pointer]
        - generic "LOVE balance — 0.0 performance, 0.0 sovereignty" [ref=e45]:
          - generic [ref=e46]:
            - generic [ref=e47]: "0.0"
            - generic [ref=e48]: LOVE
        - button "Theme pack and adaptive appearance" [ref=e50] [cursor=pointer]
        - button "Open Dillpickle's menu" [ref=e55] [cursor=pointer]:
          - generic [aria-hidden] [ref=e56]: 🧸
          - generic [ref=e57]: Dillpickle
    - dialog "Workshop door" [ref=e59]:
      - generic [ref=e60]:
        - heading "Workshop door" [level=2] [ref=e61]
        - paragraph [ref=e62]: The Workshop hatch opens for caregivers — tokens, recipes, and the workbench live behind it. Enter the 4-digit PIN to browse.
        - textbox "4-digit caregiver PIN" [active] [ref=e63]
        - generic [ref=e64]:
          - button "Back to the street" [ref=e65] [cursor=pointer]
          - button "Unlock" [disabled] [ref=e66]
    - paragraph [ref=e67]: Dillpickle · child · lane dillpickle
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | import AxeBuilder from '@axe-core/playwright';
  3  | 
  4  | const ROUTES = [
  5  |   { hash: '#/entry', name: 'entry' },
  6  |   { hash: '#/street', name: 'street' },
  7  |   { hash: '#/talk', name: 'talk' },
  8  |   { hash: '#/you', name: 'you' },
  9  |   { hash: '#/switch', name: 'switch' },
  10 |   { hash: '#/craft', name: 'craft' },
  11 |   { hash: '#/workshop', name: 'workshop' },
  12 |   { hash: '#/site', name: 'site' },
  13 |   { hash: '#/worker', name: 'worker' },
  14 | ];
  15 | 
  16 | for (const route of ROUTES) {
  17 |   test(`a11y: ${route.name}`, async ({ page }) => {
  18 |     await page.goto(route.hash);
  19 |     await page.waitForLoadState('networkidle');
  20 |     const results = await new AxeBuilder({ page })
  21 |       .withTags(['wcag2a', 'wcag2aa', 'wcag22aa'])
  22 |       .analyze();
> 23 |     expect(results.violations).toEqual([]);
     |                                ^ Error: expect(received).toEqual(expected) // deep equality
  24 |   });
  25 | }
  26 | 
```