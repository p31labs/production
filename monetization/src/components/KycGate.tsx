import { useState } from 'react';
import { getKycState, stepUpToTier2, requireTier, TIER_META, type KycTier } from '../lib/kyc';
import { useIdentityStore } from '../lib/useIdentityStore';

/**
 * KycGate — progressive KYC gate for operator-gated actions.
 *
 * Renders the current tier ladder (0 → 1 → 2) with step-up affordances:
 * connect the sovereign identity (→ Tier 1), then create the Phenix vault and
 * self-attest a `p31.identity` credential (→ Tier 2). Deferring keeps the user
 * at Tier 0 with full read access — nothing is demanded up front.
 */
export function KycGate({ requiredTier = 2, compact = false }: { requiredTier?: KycTier; compact?: boolean }) {
  const state = getKycState();
  const connect = useIdentityStore((s) => s.connect);
  const connecting = useIdentityStore((s) => s.connecting);
  const [pw, setPw] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const allowed = requireTier(state, requiredTier);
  if (allowed) {
    return (
      <div className="kyc-gate kyc-gate--ok" data-mcp-tool="kyc" data-mcp-type="status" data-mcp-target={`tier-${state.tier}`}>
        <span aria-hidden="true">🛡️</span>
        <span>{TIER_META[state.tier].label} — access granted</span>
      </div>
    );
  }

  return (
    <div className="kyc-gate" data-mcp-tool="kyc" data-mcp-type="gate" data-mcp-target={`requires-tier-${requiredTier}`}>
      <h4 className="kyc-gate__title">This action needs {TIER_META[requiredTier].label}</h4>
      {!compact && <p className="kyc-gate__blurb">{TIER_META[requiredTier].blurb}</p>}

      {state.tier === 0 && (
        <button
          type="button"
          className="btn btn-primary btn-sm"
          disabled={connecting}
          onClick={async () => {
            await connect();
            setMsg('Identity connected — Tier 1. Step up to Tier 2 for capital actions.');
          }}
        >
          {connecting ? 'Creating…' : '✦ Connect sovereign identity → Tier 1'}
        </button>
      )}

      {state.tier === 1 && (
        <div className="kyc-gate__step">
          <p className="kyc-gate__sub">Create the Phenix vault + self-attest your identity credential.</p>
          <input
            type="password"
            className="input"
            placeholder="Vault password"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            aria-label="Vault password"
          />
          <button
            type="button"
            className="btn btn-primary btn-sm"
            disabled={!pw || busy}
            onClick={async () => {
              setBusy(true);
              try {
                const cred = await stepUpToTier2(pw);
                setMsg(cred ? 'Verified — Tier 2 unlocked.' : 'Connect an identity first.');
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? 'Verifying…' : 'Self-attest p31.identity → Tier 2'}
          </button>
        </div>
      )}

      {msg && <p className="kyc-gate__msg">{msg}</p>}
      <button type="button" className="kyc-gate__defer" onClick={() => setMsg('Staying at Tier 0 — full read access remains.')}>
        Defer (browse only)
      </button>
    </div>
  );
}

export default KycGate;