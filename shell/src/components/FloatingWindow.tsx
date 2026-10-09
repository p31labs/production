import { useState, useRef, useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface FloatingWindowProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  initialWidth?: number;
  initialHeight?: number;
  initialX?: number;
  initialY?: number;
  minWidth?: number;
  minHeight?: number;
  zIndex?: number | string;
  persistKey?: string;
  triggerRef?: React.RefObject<HTMLButtonElement | null>;
}

const DEFAULT_PERSIST_KEY = 'p31-floating-window';

export default function FloatingWindow({
  isOpen,
  onClose,
  title,
  children,
  initialWidth = 640,
  initialHeight = 480,
  initialX = 120,
  initialY = 80,
  minWidth = 320,
  minHeight = 240,
  zIndex = 'var(--p31-z-floating)',
  persistKey = DEFAULT_PERSIST_KEY,
  triggerRef,
}: FloatingWindowProps) {
  const loadPersisted = () => {
    try {
      const raw = localStorage.getItem(persistKey);
      const maxW = window.innerWidth - 16;
      const maxH = window.innerHeight - 16;
      if (raw) {
        const parsed = JSON.parse(raw);
        const width = Math.min(parsed.width ?? initialWidth, maxW);
        const height = Math.min(parsed.height ?? initialHeight, maxH);
        const x = Math.max(0, Math.min(parsed.x ?? initialX, window.innerWidth - width));
        const y = Math.max(0, Math.min(parsed.y ?? initialY, window.innerHeight - height));
        return {
          x,
          y,
          width,
          height,
          minimized: parsed.minimized ?? false,
        };
      }
      return {
        x: Math.max(0, Math.min(initialX, window.innerWidth - Math.min(initialWidth, maxW))),
        y: Math.max(0, Math.min(initialY, window.innerHeight - Math.min(initialHeight, maxH))),
        width: Math.min(initialWidth, maxW),
        height: Math.min(initialHeight, maxH),
        minimized: false,
      };
    } catch { /* ignore */ }
    return { x: initialX, y: initialY, width: initialWidth, height: initialHeight, minimized: false };
  };

  const persisted = loadPersisted();
  const [pos, setPos] = useState({ x: persisted.x, y: persisted.y });
  const [size, setSize] = useState({ width: persisted.width, height: persisted.height });
  const [minimized, setMinimized] = useState(persisted.minimized);
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);
  const windowRef = useRef<HTMLDivElement>(null);
  const resizeHandleRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      localStorage.setItem(persistKey, JSON.stringify({ ...pos, ...size, minimized }));
    } catch { /* ignore */ }
  }, [pos, size, minimized, persistKey]);

  useEffect(() => {
    if (!isOpen) return;
    const localTrigger = triggerRef?.current ?? document.activeElement as HTMLElement | null;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        localTrigger?.focus();
        onClose();
      }
      if (e.key === 'Tab') {
        const window_ = windowRef.current;
        if (!window_) return;
        const focusable = window_.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
        if (focusable.length === 0) return;
        const first = focusable[0] as HTMLElement;
        const last = focusable[focusable.length - 1] as HTMLElement;
        if (e.shiftKey) {
          if (document.activeElement === first || !window_.contains(document.activeElement)) { e.preventDefault(); last.focus(); }
        } else {
          if (document.activeElement === last || !window_.contains(document.activeElement)) { e.preventDefault(); first.focus(); }
        }
      }
    };
    document.addEventListener('keydown', handler);
    return () => {
      document.removeEventListener('keydown', handler);
      localTrigger?.focus();
    };
  }, [isOpen, onClose, triggerRef]);

  useEffect(() => {
    if (!isOpen || minimized) return;
    const t = window.setTimeout(() => {
      const focusable = windowRef.current?.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusable && focusable.length > 0) {
        (focusable[0] as HTMLElement).focus();
      }
    }, 100);
    return () => window.clearTimeout(t);
  }, [isOpen, minimized]);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.closest('.window-controls') || target.closest('.resize-handle')) return;
    if (!target.closest('.window-titlebar')) return;
    setIsDragging(true);
    const rect = windowRef.current?.getBoundingClientRect();
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      origX: rect?.left ?? pos.x,
      origY: rect?.top ?? pos.y,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging || !dragRef.current) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    setPos({
      x: Math.max(0, Math.min(dragRef.current.origX + dx, window.innerWidth - 100)),
      y: Math.max(0, dragRef.current.origY + dy),
    });
  };

  const handlePointerUp = () => {
    setIsDragging(false);
    dragRef.current = null;
  };

  if (!isOpen) return null;

  const windowContent = (
    <div
      ref={windowRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="floating-window-title"
      aria-label={title}
      style={{
        position: 'fixed',
        left: pos.x,
        top: pos.y,
        width: minimized ? 'auto' : size.width,
        height: minimized ? 'auto' : size.height,
        minWidth: minimized ? 'auto' : minWidth,
        minHeight: minimized ? 'auto' : minHeight,
        zIndex,
        background: 'var(--p31-surface)',
        border: '1px solid var(--p31-glass-border)',
        borderRadius: 'var(--p31-radius-lg)',
        boxShadow: '0 24px 48px rgba(0,0,0,0.6)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        backdropFilter: 'var(--p31-glass-blur)',
        userSelect: isDragging ? 'none' : 'auto',
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      <div
        className="window-titlebar"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: 'var(--p31-space-tiny) var(--p31-space-xs)',
          background: 'var(--p31-surface2)',
          borderBottom: '1px solid var(--p31-glass-border)',
          cursor: 'grab',
          flexShrink: 0,
        }}
        onDoubleClick={() => setMinimized(!minimized)}
      >
        <span id="floating-window-title" style={{ fontSize: 'var(--p31-scale-sm)', fontWeight: 600, color: 'var(--p31-text)', pointerEvents: 'none' }}>
          {title}
        </span>
        <div className="window-controls" style={{ display: 'flex', gap: 6 }}>
          <button
            type="button"
            onClick={() => setMinimized(!minimized)}
            aria-label={minimized ? 'Restore' : 'Minimize'}
            style={{ background: 'none', border: 'none', color: 'var(--p31-text-secondary)', cursor: 'pointer', fontSize: 14, padding: '2px 6px' }}
          >
            {minimized ? '\u25A1' : '_'}
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{ background: 'none', border: 'none', color: 'var(--p31-accent-red)', cursor: 'pointer', fontSize: 14, padding: '2px 6px' }}
          >
            {'\u2715'}
          </button>
        </div>
      </div>
      {!minimized && (
        <>
          <div style={{ flex: 1, overflow: 'auto', padding: 'var(--p31-space-xs)', overflowWrap: 'break-word', wordBreak: 'break-word' }}>
            {children}
          </div>
          <div
            ref={resizeHandleRef}
            className="resize-handle"
            style={{
              position: 'absolute',
              bottom: 0,
              right: 0,
              width: 20,
              height: 20,
              cursor: 'nwse-resize',
              background: 'transparent',
              zIndex: 2,
            }}
            onPointerDown={(e) => {
              e.stopPropagation();
              e.preventDefault();
              const startX = e.clientX;
              const startY = e.clientY;
              const startW = size.width;
              const startH = size.height;
              const onMove = (ev: PointerEvent) => {
                setSize({
                  width: Math.max(minWidth, startW + (ev.clientX - startX)),
                  height: Math.max(minHeight, startH + (ev.clientY - startY)),
                });
              };
              const onUp = () => {
                document.removeEventListener('pointermove', onMove);
                document.removeEventListener('pointerup', onUp);
              };
              document.addEventListener('pointermove', onMove);
              document.addEventListener('pointerup', onUp);
            }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" style={{ display: 'block', opacity: 0.4 }}>
              <path d="M14 14 L10 14 L14 10 Z" fill="currentColor" />
              <path d="M14 12 L12 14" stroke="currentColor" strokeWidth="1" />
            </svg>
          </div>
        </>
      )}
    </div>
  );

  return createPortal(windowContent, document.body);
}
