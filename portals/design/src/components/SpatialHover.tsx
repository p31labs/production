import { useRef, useState, useCallback } from 'react';

interface SpatialHoverProps {
  children: React.ReactNode;
  maxTilt?: number;
  scale?: number;
  disabled?: boolean;
  className?: string;
}

export function SpatialHover({
  children,
  maxTilt = 8,
  scale = 1.02,
  disabled = false,
  className,
}: SpatialHoverProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [style, setStyle] = useState<React.CSSProperties>({});

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (disabled || !ref.current) return;
      const rect = ref.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const cx = rect.width / 2;
      const cy = rect.height / 2;
      const rotateX = ((y - cy) / cy) * -maxTilt;
      const rotateY = ((x - cx) / cx) * maxTilt;
      setStyle({
        transform: `perspective(1200px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(${scale}, ${scale}, ${scale})`,
        transition: 'none',
      });
    },
    [disabled, maxTilt, scale],
  );

  const handleMouseLeave = useCallback(() => {
    setStyle({
      transform: 'perspective(1200px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)',
      transition: 'transform 0.25s ease',
    });
  }, []);

  return (
    <div
      ref={ref}
      className={className}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ perspective: 600, transformStyle: 'preserve-3d', ...style }}
    >
      {children}
    </div>
  );
}