# Primitives API

Import: `import { Button, Input, … } from '@p31/design-core/primitives'`
Styles: `recipes/forms.css` (shipped in design-system.css bundle).

All primitives: compose via `className`, pass through data-*/aria-*, meet WCAG 2.2 AA (AAA targets), crisis-safe.

| Primitive | Key props | Notes |
|---|---|---|
| `Button` | variant primary\|secondary\|danger\|ghost · size sm\|md\|lg · isLoading | md=44px lg=48px touch; spinner + aria-busy |
| `Input` | label · error · hint · hideLabel | wires aria-invalid/describedby automatically |
| `Select` | options {value,label}[] · label · error | native select under the hood |
| `Checkbox` | label · indeterminate | native input; mixed state supported |
| `RadioGroup` | options w/ description · value/onChange | role=radiogroup, roving tab index |
| `Card` | padding none..xl · interactive | glass-card surface |
| `Badge` | tone success\|warning\|error\|info\|neutral | |
| `ToastProvider` + `useToast()` | toast(msg, {tone, duration}) | 0ms = sticky with dismiss; region is aria-live=polite |
| `Modal` | open · onClose · title · actions | Escape + overlay close, focus restore |
| `Tooltip` | content · placement top\|bottom | hover+focus; sr fallback keeps wiring stable |
| `Dropdown` | trigger(open) render-prop · items · onSelect · align | click-outside + Escape |
| `Spinner` | size sm\|md\|lg · label | animation dies in reduced-motion/crisis |

Compositions (higher level): GlassPanel GlassCard Topbar BottomNav SpoonDial StatusBadge MetricBadge Starfield CrisisOverlay.
