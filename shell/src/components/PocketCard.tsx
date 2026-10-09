import { useCallback, useEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import { useShellStore, type PocketCardTab } from '../store/useShellStore';
import { POCKET_CARD_DATA } from '../data/pocketCardData';

const TAB_META: { id: PocketCardTab; label: string; icon: string }[] = [
  { id: 'info', label: 'Info', icon: 'ℹ️' },
  { id: 'welcome', label: 'Welcome', icon: '👋' },
  { id: 'walkthrough', label: 'Walkthrough', icon: '🗺️' },
  { id: 'troubleshooting', label: 'Fixes', icon: '🔧' },
  { id: 'dev', label: 'Dev', icon: '⚡' },
];

const CARD_WIDTH = 440;
const CARD_HEIGHT = 520;

export default function PocketCard() {
  const pageKey = useShellStore((s) => s.pocketCard.pageKey);
  const activeTab = useShellStore((s) => s.pocketCard.activeTab);
  const position = useShellStore((s) => s.pocketCard.position);
  const closePocketCard = useShellStore((s) => s.closePocketCard);
  const setPocketCardTab = useShellStore((s) => s.setPocketCardTab);
  const setPocketCardPosition = useShellStore((s) => s.setPocketCardPosition);

  const cardRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{ startX: number; startY: number; originX: number; originY: number } | null>(null);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (!pageKey) return;
    if (position) {
      setPos(position);
    } else {
      const x = Math.max(16, (window.innerWidth - CARD_WIDTH) / 2);
      const y = Math.max(16, (window.innerHeight - CARD_HEIGHT) / 2);
      setPos({ x, y });
    }
  }, [pageKey, position]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closePocketCard();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [closePocketCard]);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('.pocket-card__tab, .pocket-card__close, button, input, select, a')) return;
    const card = cardRef.current;
    if (!card || !pos) return;
    const rect = card.getBoundingClientRect();
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      originX: rect.left,
      originY: rect.top,
    };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [pos]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragRef.current) return;
    const { startX, startY, originX, originY } = dragRef.current;
    const nextX = originX + (e.clientX - startX);
    const nextY = originY + (e.clientY - startY);
    const maxX = Math.max(16, window.innerWidth - CARD_WIDTH - 16);
    const maxY = Math.max(16, window.innerHeight - CARD_HEIGHT - 16);
    const clampedX = Math.max(0, Math.min(nextX, maxX));
    const clampedY = Math.max(0, Math.min(nextY, maxY));
    setPos({ x: clampedX, y: clampedY });
  }, []);

  const handlePointerUp = useCallback(() => {
    dragRef.current = null;
    if (pos) setPocketCardPosition(pos);
  }, [pos, setPocketCardPosition]);

  if (!pageKey || !POCKET_CARD_DATA[pageKey] || !pos) return null;
  const data = POCKET_CARD_DATA[pageKey];
  const root = document.getElementById('pocket-card-root');
  if (!root) return null;

  return ReactDOM.createPortal(
    <div
      ref={cardRef}
      className="pocket-card"
      style={{ left: pos.x, top: pos.y }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onLostPointerCapture={handlePointerUp}
    >
      <div className="pocket-card__header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="pocket-card__title">{data.title}</span>
        </div>
        <div className="pocket-card__tabs">
          {TAB_META.map((tab) => (
            <button
              key={tab.id}
              className={`pocket-card__tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setPocketCardTab(tab.id)}
              aria-pressed={activeTab === tab.id}
              type="button"
            >
              {tab.icon}
            </button>
          ))}
        </div>
        <button className="pocket-card__close" onClick={closePocketCard} aria-label="Close pocket card" type="button">
          ✕
        </button>
      </div>
      <div className="pocket-card__body">
        {data.sections[activeTab]?.content || null}
      </div>
    </div>,
    root,
  );
}
