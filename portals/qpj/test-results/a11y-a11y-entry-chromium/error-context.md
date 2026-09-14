# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: a11y.spec.ts >> a11y: entry
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
+               "bgColor": "#9e6c11",
+               "contrastRatio": 4.36,
+               "expectedContrastRatio": "4.5:1",
+               "fgColor": "#0e0802",
+               "fontSize": "12.0pt (16px)",
+               "fontWeight": "normal",
+               "messageKey": null,
+             },
+             "id": "color-contrast",
+             "impact": "serious",
+             "message": "Element has insufficient color contrast of 4.36 (foreground color: #0e0802, background color: #9e6c11, font size: 12.0pt (16px), font weight: normal). Expected contrast ratio of 4.5:1",
+             "relatedNodes": Array [
+               Object {
+                 "html": "<button type=\"button\" class=\"btn btn-primary btn-sm\">Next</button>",
+                 "target": Array [
+                   ".btn",
+                 ],
+               },
+             ],
+           },
+         ],
+         "failureSummary": "Fix any of the following:
+   Element has insufficient color contrast of 4.36 (foreground color: #0e0802, background color: #9e6c11, font size: 12.0pt (16px), font weight: normal). Expected contrast ratio of 4.5:1",
+         "html": "<button type=\"button\" class=\"btn btn-primary btn-sm\">Next</button>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           ".btn",
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
      - generic [ref=e60]:
        - heading "Welcome to the jar" [level=1] [ref=e61]
        - paragraph [ref=e62]: The jar is your family’s corner of the street. No accounts, no email — the key is made here and stays on this device. If it ever gets lost, the family mesh can help you back in.
      - region "Set up your identity" [ref=e63]:
        - generic [ref=e69]:
          - heading "Who is using this?" [level=2] [ref=e70]
          - generic [ref=e71]:
            - button "Dillpickle child" [pressed] [ref=e72]:
              - generic [aria-hidden] [ref=e73]: 🧸
              - generic [ref=e74]: Dillpickle
              - generic [ref=e75]: child
            - button "Bread & Butter teen" [ref=e76]:
              - generic [aria-hidden] [ref=e77]: 🛰️
              - generic [ref=e78]: Bread & Butter
              - generic [ref=e79]: teen
            - button "Cornichon senior" [ref=e80]:
              - generic [aria-hidden] [ref=e81]: 🌿
              - generic [ref=e82]: Cornichon
              - generic [ref=e83]: senior
            - button "Gherkin caregiver" [ref=e84]:
              - generic [aria-hidden] [ref=e85]: 🌸
              - generic [ref=e86]: Gherkin
              - generic [ref=e87]: caregiver
            - button "Half-Sour adult" [ref=e88]:
              - generic [aria-hidden] [ref=e89]: 🚀
              - generic [ref=e90]: Half-Sour
              - generic [ref=e91]: adult
          - button "Next" [ref=e93] [cursor=pointer]
          - paragraph [ref=e94]: This device now speaks for one shelf. You can switch shelves any time from the top menu.
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