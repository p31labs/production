import { A2UI_COMPONENTS } from '../components/ui/catalog';

const COMPONENT_HINTS: Record<string, string> = {
  Button: 'props {label, variant?, action?, payload?, disabled?}',
  Card: 'props {title?, content?, actions?[]} — may have children',
  Form: 'props {title?, fields:[{name,label?,type?,required?,placeholder?}], submitAction?, submitLabel?}',
  List: 'props {items:[{icon?,label,desc?,action?,payload?}]}',
  Badge: 'props {text, variant?("success"|"error"|"warning"|"default")}',
  ProgressBar: 'props {value, min?, max?, label?}',
  Modal: 'props {title?, content?, actions?[], visible?} — may have children',
  Table: 'props {caption?, headers:string[], rows:string[][]}',
  Tabs: 'props {tabs:[{id,label,content?}]}',
  Toast: 'props {message, variant?}',
  Meter: 'props {icon?, value, min?, max?, color?, label?}',
  Grid: 'props {columns?, items?[]}',
};

export function a2uiToPrompt(components: readonly string[] = A2UI_COMPONENTS): string {
  const lines = components.map((c) => `- ${c}: ${COMPONENT_HINTS[c] ?? 'props: any'}`);
  return [
    'You may render agent UI using declarative A2UI JSON.',
    'Emit a JSON array of elements: [{"id":"<unique>","component":"<name>","props":{...},"children":["<child id>"]}]',
    'Children reference sibling ids. Only these components exist (unknown components are rejected):',
    ...lines,
    'Render nothing else — return only the array.',
  ].join('\n');
}
