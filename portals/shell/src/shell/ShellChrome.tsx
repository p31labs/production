/**
 * shell/ShellChrome.tsx — the heavy-hitter chrome the shell was missing.
 *
 * Mounts the ambient + notification + theme + spoon layers, canon-first:
 *   - Starfield (canon): fullscreen seeded night sky, spoon/voltage-aware.
 *   - NotificationStack (canon): stacked severity-tinted toasts (bottom-right).
 *   - Chameleon (canon): the theme picker — owns its trigger + panel + tokens.
 *   - SpoonDial (canon): the 0–5 cognitive-load meter wired to the shell store.
 *   - CrisisOverlay (canon): the rest-stop at spoons 0.
 *
 * The shell owns GEOMETRY only. Appearance is canon-owned (var(--p31-*) tokens).
 * No QPJ copies, no fork, no styled divs in the shell.
 */
import { Starfield } from '@p31ca/design-core/compositions';
import { SpoonDial } from '@p31ca/design-core/compositions';
import { NotificationStack } from '@p31ca/design-core/compositions';
import { Chameleon } from '@p31ca/design-core/compositions';
import { CrisisOverlay } from '@p31ca/design-core/compositions';
import { useShellStore } from './store';
import { useNotifStore } from '../store/useNotifStore';

/** The theme picker — the canon Chameleon as designed (owns its own trigger,
 *  panel, and token application). No shell wrapper, no ad-hoc positioning. */
export function ThemeCharmButton() {
  return <Chameleon />;
}

/** The ambient chrome: starfield + notifications + crisis overlay. */
export function ShellChrome() {
  const spoons = useShellStore((s) => s.spoons);
  const setSpoons = useShellStore((s) => s.setSpoons);
  const notifItems = useNotifStore((s) => s.items);
  const dismiss = useNotifStore((s) => s.dismiss);

  return (
    <>
      {/* The living background — fullscreen, behind everything. The canon
          Starfield renders its own .starfield-bg (fixed fullscreen). */}
      <Starfield spoons={spoons} />

      {/* The notification layer — canon positions the stack bottom-right. */}
      <NotificationStack items={notifItems} onDismiss={dismiss} ariaLabel="Shell notifications" />

      {/* The rest-stop at spoons 0 — the crisis floor. */}
      <CrisisOverlay
        visible={spoons === 0}
        message="No spoons left — time to rest, not push through."
        buttonLabel="Rest the day"
        onReady={() => setSpoons(2)}
      />
    </>
  );
}

/** The spoon dial — the cognitive-load meter (0–5), wired to the store. */
export function ShellSpoonDial() {
  const spoons = useShellStore((s) => s.spoons);
  const setSpoons = useShellStore((s) => s.setSpoons);
  return (
    <span className="shell-spoons" role="status" aria-label={`${spoons} of 5 spoons`}>
      <SpoonDial level={spoons} onChange={setSpoons} className="shell-spoon-dial" />
    </span>
  );
}