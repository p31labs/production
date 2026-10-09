import { EvidenceBlock } from './EvidenceBlock';

export type PackBodyItem =
  | { type: 'h1' | 'h2' | 'para'; text: string }
  | { type: 'evidence'; claim: string; value: string; source: string; verified: string };

export interface GovernanceOverviewBlockProps {
  /** The governance pack title. */
  title: string;
  /** Ordered body items — headings, paragraphs, and evidence blocks. */
  body: PackBodyItem[];
  className?: string;
}

/** GovernanceOverviewBlock — a page block: a titled governance panel composed
 *  of headings, paragraphs, and EvidenceBlocks. The first COMPOSED registry
 *  block — it composes the canon EvidenceBlock, proving block-nesting. Promoted
 *  from the forge's /compose surface. */
export function GovernanceOverviewBlock({ title, body, className = '' }: GovernanceOverviewBlockProps) {
  return (
    <section className={`governance-overview ${className}`.trim()}>
      <h2 className="governance-overview__title">{title}</h2>
      {body.map((item, i) => {
        if (item.type === 'evidence') {
          return (
            <EvidenceBlock
              key={i}
              claim={item.claim}
              value={item.value}
              source={item.source}
              verified={item.verified}
            />
          );
        }
        if (item.type === 'h1') return <h3 key={i}>{item.text}</h3>;
        if (item.type === 'h2') return <h4 key={i}>{item.text}</h4>;
        return <p className="governance-overview__para" key={i}>{item.text}</p>;
      })}
    </section>
  );
}

export default GovernanceOverviewBlock;