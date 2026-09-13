import { GlassPanel } from '@p31/design-core/compositions';
import TokenExplorer from '../../components/TokenExplorer';
import { PageHeader } from '@p31/design-core/compositions';

export default function Tokens() {
  return (
    <>
      <PageHeader
        eyebrow="W3C DTCG · 2025.10"
        title="Design Tokens"
        lede="W3C DTCG compliant token exchange format. All colors in OKLCH for perceptual uniformity."
      />
      <GlassPanel strong>
        <TokenExplorer />
      </GlassPanel>
    </>
  );
}