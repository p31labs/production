import { useEffect, useState, useMemo } from 'react';
import { Button } from '@p31/design-core/compositions';
import { useQpjStore } from '../../store/useQpjStore';
import { getPassport } from '../../lib/passports';
import { getVisibleTabs, getUnlockHint, getLevelName, type WorkshopLevel } from '../../lib/workshopLevels';
import { TokenExplorer } from './TokenExplorer';
import { RecipeBrowser } from './RecipeBrowser';
import { ComponentCatalog } from './ComponentCatalog';
import { Playground } from './Playground';
import { Brands } from './Brands';
import { ApcaChecker } from './ApcaChecker';
import Studio from './Studio';
import { PinChangeCard } from '../../components/PinChangeCard';
import './workshop.css';

const VALID_TABS = [
  'hub',
  'studio',
  'tokens',
  'recipes',
  'components',
  'playground',
  'brands',
  'contrast',
] as const;
type TabId = (typeof VALID_TABS)[number];

const TAB_LABELS: Record<TabId, string> = {
  hub: 'Workbench',
  studio: 'Studio',
  tokens: 'Tokens',
  recipes: 'Recipes',
  components: 'Components',
  playground: 'Intent',
  brands: 'Brands',
  contrast: 'Contrast',
};

const POWERS: Array<{ id: TabId; title: string; blurb: string }> = [
  { id: 'studio', title: 'Studio', blurb: 'Describe a piece — generate, prove, and ship it live.' },
  { id: 'tokens', title: 'Tokens', blurb: 'Every color, size, and motion the system knows.' },
  { id: 'recipes', title: 'Recipes', blurb: 'Prebuilt layouts an agent can compose.' },
  { id: 'components', title: 'Components', blurb: 'The parts the house is made of, live.' },
  { id: 'playground', title: 'Intent', blurb: 'Describe a piece in plain words — check it against the rules.' },
  { id: 'brands', title: 'Brands', blurb: 'Swap the paint without touching the walls.' },
  { id: 'contrast', title: 'Contrast', blurb: 'Does this text read against that background?' },
];

function readTabFromHash(): TabId {
  if (typeof window === 'undefined') return 'hub';
  const raw = window.location.hash.replace(/^#\/workshop\/?/, '').trim();
  return (VALID_TABS as readonly string[]).includes(raw) ? (raw as TabId) : 'hub';
}

export function WorkshopPage() {
  const [tab, setTab] = useState<TabId>(readTabFromHash);
  const passportId = useQpjStore((s) => s.passportId);
  const meshStatus = useQpjStore((s) => s.meshStatus);
  const presence = useQpjStore((s) => s.presence);
  const person = getPassport(passportId);
  const workshopLevel = useQpjStore((s) => s.workshopLevel);
  const advanceWorkshopLevel = useQpjStore((s) => s.advanceWorkshopLevel);

  const visibleTabs = useMemo(() => getVisibleTabs(workshopLevel), [workshopLevel]);
  const unlockHint = useMemo(() => getUnlockHint(workshopLevel), [workshopLevel]);
  const levelLabel = useMemo(() => getLevelName(workshopLevel as WorkshopLevel), [workshopLevel]);

  useEffect(() => {
    const onHash = () => {
      const next = readTabFromHash();
      if (next === 'hub' || visibleTabs.includes(next)) setTab(next);
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, [visibleTabs]);

  const onlineCount = Object.values(presence).filter((p) => p.online).length;

  const selectTab = (next: TabId) => {
    window.location.hash = next === 'hub' ? '#/workshop' : `#/workshop/${next}`;
  };

  const handleAdvance = () => {
    advanceWorkshopLevel();
  };

  const powers = POWERS.filter((p) => p.id !== 'hub' && visibleTabs.includes(p.id)) as Array<{ id: Exclude<TabId, 'hub'>; title: string; blurb: string }>;

  return (
    <main className="wbench" id="workshop">
      <header className="wbench__header">
        <div>
          <h1 id="workshop-title" className="wbench__title">
            {person.pickledName}'s workshop
          </h1>
          <p className="wbench__lede">
            {levelLabel}. {unlockHint ? `Next: ${unlockHint}.` : 'You have the full bench.'}
          </p>
        </div>
        <div className="wbench__mesh" aria-live="polite">
          <span
            className={`wbench__mesh-dot wbench__mesh-dot--${meshStatus}`}
            aria-hidden="true"
          />
          <span className="wbench__mesh-label">
            {meshStatus === 'online'
              ? `${onlineCount} in the mesh`
              : meshStatus === 'connecting'
                ? 'Connecting…'
                : 'Offline'}
          </span>
        </div>
      </header>

      <nav className="wbench__tabs" aria-label="Workshop sections">
        {visibleTabs.map((id) => (
          <Button
            variant="ghost"
            type="button"
            className={`wbench__tab${tab === id ? ' is-active' : ''}`}
            onClick={() => selectTab(id)}
            aria-current={tab === id ? 'page' : undefined}
          >
            {TAB_LABELS[id]}
          </Button>
        ))}
      </nav>

      <div className="wbench__body">
        {tab === 'hub' && (
          <>
            <div className="wbench__powers">
              {powers.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className="wbench__power"
                  onClick={() => selectTab(p.id)}
                >
                  <span className="wbench__power-title">{p.title}</span>
                  <span className="wbench__power-blurb">{p.blurb}</span>
                </button>
              ))}
            </div>
            {unlockHint && (
              <div className="wbench__advance">
                <Button size="sm" onClick={handleAdvance}>
                  Advance — {unlockHint}
                </Button>
              </div>
            )}
            <div className="wbench__hatch">
              <p>
                Looking for the full design portal — MCP console, live worker calls, every
                route the system exposes?
              </p>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  const identity = useQpjStore.getState().identity.identity;
                  const params = new URLSearchParams(identity ? {
                    did: identity.did,
                    name: identity.name,
                    emoji: identity.avatar,
                  } : {});
                  window.open(`https://design.p31ca.org?${params.toString()}`, '_blank', 'noopener');
                }}
              >
                Open design.p31ca.org →
              </Button>
            </div>
            <PinChangeCard />
          </>
        )}

        {tab === 'studio' && <Studio />}
        {tab === 'tokens' && <TokenExplorer />}
        {tab === 'recipes' && <RecipeBrowser />}
        {tab === 'components' && <ComponentCatalog />}
        {tab === 'playground' && <Playground />}
        {tab === 'brands' && <Brands />}
        {tab === 'contrast' && <ApcaChecker />}
      </div>
    </main>
  );
}