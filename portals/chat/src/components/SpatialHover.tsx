import { useRef, useState, useCallback, useMemo } from 'react';

interface SpatialHoverProps {
  children: React.ReactNode;
  maxTilt?: number;
  scale?: number;
  className?: string;
}

/**
 * 3D spatial hover — translateX/rotateY on mouse move.
 * From P31 Spatial Catalog design (Gemini HTML).
 * Uses container-relative coordinates so the tilt responds to
 * the card width, not the viewport.
 *
 * Reduced-motion: under `prefers-reduced-motion`, the transform is disabled
 * entirely (no tilt, no scale) so the interaction never triggers vestibular
 * sensitivity. Matches the LOOM reduced-motion discipline.
 */
export function SpatialHover({
  children,
  maxTilt = 8,
  scale = 1.02,
  className = '',
}: SpatialHoverProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [style, setStyle] = useState<React.CSSProperties>({});

  const reducedMotion = useMemo(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    [],
  );

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!ref.current || reducedMotion) return;
    const rect = ref.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    const rotateX = ((y - cy) / cy) * -maxTilt;
    const rotateY = ((x - cx) / cx) * maxTilt;
    setStyle({
      transform: `rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(${scale}, ${scale}, ${scale})`,
      transformOrigin: 'center center',
    });
  }, [maxTilt, scale, reducedMotion]);

  const handleMouseLeave = useCallback(() => {
    setStyle({
      transform: `rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)`,
      transition: 'transform 0.2s ease',
    });
  }, []);

  const handleMouseEnter = useCallback(() => {
    setStyle({});
  }, []);

  return (
    <div
      ref={ref}
      className={`spatial-hover${reducedMotion ? ' spatial-hover--reduced-motion' : ''} ${className}`}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onMouseEnter={handleMouseEnter}
    >
      {children}
    </div>
  );
}
