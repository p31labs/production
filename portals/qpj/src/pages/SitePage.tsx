import { useQpjStore } from '../store/useQpjStore';
import { SiteShell } from '../components/SiteShell';

export function SitePage() {
  const passportId = useQpjStore((s) => s.passportId);
  return (
    <main className="page site" id="site">
      <SiteShell passportId={passportId} />
    </main>
  );
}
