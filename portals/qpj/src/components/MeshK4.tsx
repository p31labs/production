import { useMemo } from 'react';
import { useQpjStore } from '../store/useQpjStore';
import { PASSENGERS, PASSENGER_IDS, type PassportId } from '../lib/passports';
import { PicklePlaceholder } from './PicklePlaceholder';

// Geometry constants — mathematical, not data.
const VERTICES = [
  { x: 140, y:  52 },  // 0: top
  { x:  52, y: 212 },  // 1: bottom-left
  { x: 228, y: 212 },  // 2: bottom-right
  { x: 140, y: 148 },  // 3: center
] as const;

const EDGES: ReadonlyArray<readonly [number, number]> = [
  [0, 1], [1, 2], [2, 0],  // outer triangle
  [0, 3], [1, 3], [2, 3],  // spokes
];

// Pickle names for each vertex position (not tied to passport names).
const PICKLE_NAMES: ReadonlyArray<string> = [
  'Dillpickle',
  'Bread & Butter',
  'Cornichon',
  'Gherkin',
];

const NODE_R = 22;

export function MeshK4() {
  const presence = useQpjStore((s) => s.presence);
  const meshStatus = useQpjStore((s) => s.meshStatus);

  const nodes = useMemo(() => {
    const ids = PASSENGER_IDS.slice(0, 4) as PassportId[];
    if (ids.length < 4) return null;
    return ids.map((id, i) => ({
      id,
      vertex: VERTICES[i],
      passenger: PASSENGERS[id],
      pickleName: PICKLE_NAMES[i],
      online: presence?.[id]?.online ?? false,
    }));
  }, [presence]);

  if (meshStatus === 'idle') {
    return <PicklePlaceholder kind="mesh" reason="mesh connecting…" />;
  }

  if (!nodes) {
    return <PicklePlaceholder kind="mesh" reason="fewer than 4 passengers configured" />;
  }

  const onlineCount = nodes.filter((n) => n.online).length;

  return (
    <svg
      className="mesh"
      viewBox="0 0 280 280"
      role="img"
      aria-labelledby="mesh-title mesh-desc"
    >
      <title id="mesh-title">Pickle mesh topology</title>
      <desc id="mesh-desc">
        {onlineCount} of 4 pickles present.
        {meshStatus === 'online' ? ' Relay connected.' : ' Relay offline.'}
      </desc>

      {/* Edges: weight encoded by stroke-dash + opacity */}
      <g className="mesh__edges">
        {EDGES.map(([a, b]) => {
          const na = nodes[a];
          const nb = nodes[b];
          const both = na.online && nb.online;
          const one = na.online || nb.online;
          const weight = both ? 1 : one ? 0.5 : 0.15;
          return (
            <line
              key={`${na.id}-${nb.id}`}
              className={`mesh__edge mesh__edge--w${both ? '2' : one ? '1' : '0'}`}
              x1={na.vertex.x} y1={na.vertex.y}
              x2={nb.vertex.x} y2={nb.vertex.y}
              style={{ opacity: 0.25 + weight * 0.55 }}
            />
          );
        })}
      </g>

      {/* Nodes: pickle name + emoji + presence */}
      <g className="mesh__nodes">
        {nodes.map((n) => (
          <g
            key={n.id}
            className={`mesh__node${n.online ? ' is-online' : ''}`}
            tabIndex={0}
            role="img"
            aria-label={`${n.pickleName}, ${n.online ? 'present' : 'away'}`}
          >
            <circle
              className="mesh__node-ring"
              cx={n.vertex.x} cy={n.vertex.y} r={NODE_R}
            />
            <text
              className="mesh__node-emoji"
              x={n.vertex.x} y={n.vertex.y + 1}
              aria-hidden="true"
            >
              {n.passenger.emoji}
            </text>
            <text
              className="mesh__node-name"
              x={n.vertex.x} y={n.vertex.y + NODE_R + 14}
            >
              {n.pickleName}
            </text>
          </g>
        ))}
      </g>
    </svg>
  );
}
