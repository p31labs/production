import { useMemo, useState } from 'react';
import { SpoonDial, MetricBadge } from '@p31/design-core/compositions';
import { useQpjStore } from './store/useQpjStore';
import { useHashRoute } from './hooks/useHashRoute';
import { useModeEffects } from './hooks/useModeEffects';
import { useThemeEffects } from './hooks/useThemeEffects';
import { useSensorySync } from './hooks/useSensorySync';
import { useSBT } from './hooks/useSBT';
import { MeshBridge } from './hooks/MeshBridge';
import { getPassport, MODE_LABELS } from './lib/passports';
import { BRAND } from './lib/brand';
import { navigateTo, type QpjRoute } from './lib/routes';
import { BottomNav } from './components/BottomNav';
import { AvatarMenu } from './components/AvatarMenu';
import { VerifiedBadge } from './components/topbar/VerifiedBadge';
import { Toast } from './components/Toast';
import { NotificationStack } from './components/NotificationStack';
import { Starfield } from './components/Starfield';
import { CrisisOverlay } from './components/CrisisOverlay';
import { CommandPalette } from './components/CommandPalette';
import { ModeGuard } from './components/ModeGuard';
import { ThemeCharm } from './components/ThemeCharm';
import { StreetPage } from './pages/StreetPage';
import { TalkPage } from './pages/TalkPage';
import { YouPage } from './pages/YouPage';
import { EntryPage } from './pages/EntryPage';
import { CraftPage } from './pages/CraftPage';
import { WorkshopPage } from './pages/workshop/WorkshopPage';
import { SwitchPage } from './pages/SwitchPage';

export default function App() {
  const { route } = useHashRoute();
  const passportId = useQpjStore((s) => s.passportId);
  const mode = useQpjStore((s) => s.mode);
  const spoons = useQpjStore((s) => s.spoons);
  const setSpoons = useQpjStore((s) => s.setSpoons);
  const lovePerf = useQpjStore((s) => s.love.performance);
  const [menuOpen, setMenuOpen] = useState(false);

  useModeEffects();
  useThemeEffects();
  useSensorySync();
  useSBT();

  const passport = useMemo(() => getPassport(passportId), [passportId]);

  const onNavigate = (target: QpjRoute) => {
    setMenuOpen(false);
    navigateTo(target);
  };

  return (
    <>
      <Starfield />
      <div className="shell" data-route={route}>
      <MeshBridge passportId={passportId} />

      <header className="qpj-topbar">
        <button
          type="button"
          className="qpj-brand"
          onClick={() => navigateTo('street')}
          aria-label={`${BRAND.name} — home`}
        >
          <span className="qpj-brand__mark" aria-hidden="true">🥒</span>
          <span className="qpj-brand__name">{BRAND.name}</span>
        </button>
        <div className="qpj-topbar__right">
          <span className="qpj-mode-chip" data-mode={mode} aria-label={`Mode: ${MODE_LABELS[mode]}`}>
            <span className="qpj-mode-chip__dot" aria-hidden="true" />
            {MODE_LABELS[mode]}
          </span>
          <span className="qpj-topbar__spoons" aria-label={`${spoons} of 5 spoons`}>
            <span className="sr-only">{spoons} of 5 spoons</span>
            <SpoonDial level={spoons} onChange={(n) => setSpoons(n)} className="qpj-spoons" />
          </span>
          <span className="qpj-love" title={`LOVE balance — ${lovePerf.toFixed(1)} performance, ${useQpjStore.getState().love.sovereignty.toFixed(1)} sovereignty`}>
            <MetricBadge value={lovePerf.toFixed(1)} label="LOVE" className="qpj-love__badge" />
          </span>
          <ThemeCharm />
          <VerifiedBadge passportId={passportId} />
          <AvatarMenu
            passportId={passportId}
            open={menuOpen}
            onRequestOpen={() => setMenuOpen(true)}
            onClose={() => setMenuOpen(false)}
            onSwitchPersona={() => {
              setMenuOpen(false);
              navigateTo('switch');
            }}
            onWorkshop={() => {
              setMenuOpen(false);
              navigateTo('workshop');
            }}
            onRestartDay={() => {
              setMenuOpen(false);
              useQpjStore.getState().restartDay();
            }}
          />
        </div>
      </header>

      <Toast />
      <NotificationStack />
      <CrisisOverlay />
      <CommandPalette />

      <div className="shell__main">
        {route === 'entry' && <EntryPage />}
        {route === 'street' && <StreetPage />}
        {route === 'talk' && <TalkPage />}
        {route === 'craft' && (
          <ModeGuard
            required="maker"
            title="The craft shed is on the maker side"
            description="Little lights can wander the street and talk with everyone — but the craft shed needs a caregiver today."
            onElevated={() => undefined}
            onRedirected={() => undefined}
          >
            <CraftPage />
          </ModeGuard>
        )}
        {route === 'workshop' && (
          <ModeGuard
            required="workshop"
            title="Workshop door"
            description="The Workshop hatch opens for caregivers — tokens, recipes, and the workbench live behind it. Enter the 4-digit PIN to browse."
            onElevated={() => undefined}
            onRedirected={() => undefined}
          >
            <WorkshopPage />
          </ModeGuard>
        )}
        {route === 'you' && <YouPage />}
        {route === 'switch' && <SwitchPage />}
      </div>

      <BottomNav active={route} onNavigate={onNavigate} mode={mode} />

      <p className="shell__fineprint">
        {passport.pickledName} · {passport.role} · lane {passportId}
      </p>
      </div>
    </>
  );
}