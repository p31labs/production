import { useQpjStore } from '../../store/useQpjStore';
import { getPassport } from '../../lib/passports';
import type { PassportId } from '../../lib/passports';

export function VerifiedBadge({ passportId }: { passportId: PassportId }) {
  const identity = useQpjStore((s) => s.identity);
  const passport = getPassport(passportId);
  if (!identity.identity || identity.status !== 'ready') return null;
  return (
    <span className="verified-badge" title={`Verified · ${identity.identity.did}`}>
      <span aria-hidden="true">✓</span>
      <span className="verified-badge__label">{passport.pickledName}</span>
    </span>
  );
}
