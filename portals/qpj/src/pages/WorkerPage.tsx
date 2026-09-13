import { useQpjStore } from '../store/useQpjStore';
import { getPassport } from '../lib/passports';
import { WorkerChat } from '../features/worker/WorkerChat';

export function WorkerPage() {
  const passportId = useQpjStore((s) => s.passportId);
  const me = getPassport(passportId);
  return (
    <main className="page worker" id="worker">
      <h1 className="section-eyebrow">{me.pickledName}'s worker</h1>
      <WorkerChat passportId={passportId} />
    </main>
  );
}
