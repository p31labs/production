# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: a11y.spec.ts >> a11y: switch
- Location: e2e/a11y.spec.ts:17:3

# Error details

```
Error: expect(received).toEqual(expected) // deep equality

- Expected  -   1
+ Received  + 248

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
+   Object {
+     "description": "Ensure the contrast between foreground and background colors meets WCAG 2 AA minimum contrast ratio thresholds",
+     "help": "Elements must meet minimum color contrast ratio thresholds",
+     "helpUrl": "https://dequeuniversity.com/rules/axe/4.13/color-contrast?application=playwright",
+     "id": "color-contrast",
+     "impact": "serious",
+     "nodes": Array [
+       Object {
+         "all": Array [],
+         "any": Array [
+           Object {
+             "data": Object {
+               "bgColor": "#35260c",
+               "contrastRatio": 3.7,
+               "expectedContrastRatio": "4.5:1",
+               "fgColor": "#877f73",
+               "fontSize": "9.4pt (12.48px)",
+               "fontWeight": "normal",
+               "messageKey": null,
+             },
+             "id": "color-contrast",
+             "impact": "serious",
+             "message": "Element has insufficient color contrast of 3.7 (foreground color: #877f73, background color: #35260c, font size: 9.4pt (12.48px), font weight: normal). Expected contrast ratio of 4.5:1",
+             "relatedNodes": Array [
+               Object {
+                 "html": "<button type=\"button\" class=\"switch-card switch-card--active\" aria-pressed=\"true\">",
+                 "target": Array [
+                   ".switch-card--active",
+                 ],
+               },
+             ],
+           },
+         ],
+         "failureSummary": "Fix any of the following:
+   Element has insufficient color contrast of 3.7 (foreground color: #877f73, background color: #35260c, font size: 9.4pt (12.48px), font weight: normal). Expected contrast ratio of 4.5:1",
+         "html": "<span class=\"switch-card__role\">child</span>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           ".switch-card--active > .switch-card__role",
+         ],
+       },
+     ],
+     "tags": Array [
+       "cat.color",
+       "wcag2aa",
+       "wcag143",
+       "TTv5",
+       "TT13.c",
+       "EN-301-549",
+       "EN-9.1.4.3",
+       "ACT",
+       "RGAAv4",
+       "RGAA-3.2.1",
+     ],
+   },
+ ]
```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
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
    - main [ref=e59]:
      - heading "Who’s using the jar?" [level=1] [ref=e60]
      - paragraph [ref=e61]: Tap a passport. The lane and lamps follow you to your own mode.
      - generic [ref=e62]:
        - button "Dillpickle child opens in spark" [pressed] [ref=e63] [cursor=pointer]:
          - generic [aria-hidden] [ref=e64]: 🧸
          - generic [ref=e65]: Dillpickle
          - generic [ref=e66]: child
          - generic [ref=e67]:
            - text: opens in
            - strong [ref=e68]: spark
        - button "Bread & Butter teen opens in maker" [ref=e69] [cursor=pointer]:
          - generic [aria-hidden] [ref=e70]: 🛰️
          - generic [ref=e71]: Bread & Butter
          - generic [ref=e72]: teen
          - generic [ref=e73]:
            - text: opens in
            - strong [ref=e74]: maker
        - button "Cornichon senior opens in spark" [ref=e75] [cursor=pointer]:
          - generic [aria-hidden] [ref=e76]: 🌿
          - generic [ref=e77]: Cornichon
          - generic [ref=e78]: senior
          - generic [ref=e79]:
            - text: opens in
            - strong [ref=e80]: spark
        - button "Gherkin caregiver opens in workshop" [ref=e81] [cursor=pointer]:
          - generic [aria-hidden] [ref=e82]: 🌸
          - generic [ref=e83]: Gherkin
          - generic [ref=e84]: caregiver
          - generic [ref=e85]:
            - text: opens in
            - strong [ref=e86]: workshop
        - button "Half-Sour adult opens in workshop" [ref=e87] [cursor=pointer]:
          - generic [aria-hidden] [ref=e88]: 🚀
          - generic [ref=e89]: Half-Sour
          - generic [ref=e90]: adult
          - generic [ref=e91]:
            - text: opens in
            - strong [ref=e92]: workshop
      - paragraph [ref=e93]:
        - text: Caregivers hold the PIN custodian role — their passport starts in
        - strong [ref=e94]: workshop
        - text: and can raise any session.
    - paragraph [ref=e95]: Dillpickle · child · lane dillpickle
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