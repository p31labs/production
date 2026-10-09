import { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { useIdentityWallet } from './useIdentityWallet';
import GlassCard from '../../components/ui/GlassCard';
import ConfirmDialog from '../../components/ConfirmDialog';
import { MeshStatusDot } from '../../components/MeshStatusIndicator';

export interface IdentityTabProps {
  showKeys: boolean;
  onToggleKeys: () => void;
  onExport?: () => void;
}

export interface IdentityTabHeaderControlsProps {
  showKeys: boolean;
  onToggleKeys: () => void;
  exporting: boolean;
  importing: boolean;
  onExport: () => void;
  onImport: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function IdentityTabHeaderControls({
  showKeys,
  onToggleKeys,
  exporting,
  importing,
  onExport,
  onImport,
}: IdentityTabHeaderControlsProps) {
  return (
    <>
      <button type="button" className="btn ghost" onClick={onToggleKeys}>
        {showKeys ? 'Hide full keys' : 'Show full keys'}
      </button>
      <button type="button" className="btn primary" onClick={onExport} disabled={exporting}>
        {exporting ? 'Exporting…' : 'Export identity'}
      </button>
      <button type="button" className="btn ghost" onClick={() => document.getElementById('p31-identity-file')?.click()} disabled={importing}>
        {importing ? 'Importing…' : 'Import'}
      </button>
      <input id="p31-identity-file" type="file" accept=".json" onChange={onImport} />
    </>
  );
}

export default function IdentityTab({ showKeys, onToggleKeys, onExport }: IdentityTabProps) {
  const showToast = useAppStore((s) => s.showToast);
  const {
    loading, did, edPub, mldsaPub, slhdsaPub, pqcReady, slhdsaReady, kelEvents,
    kelValid, kelCount, trust, meshPeers, meshStatus,
    bondingRitualsCompleted, spoons, refresh, ensurePqc, ensureSlhdsa, sign,
    oauthProvider, oauthLinked, oauthLogin, oauthLogout,
  } = useIdentityWallet();

  const [confirmExport, setConfirmExport] = useState(false);
  const [confirmErase, setConfirmErase] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [signature, setSignature] = useState('');
  const [proofMsg, setProofMsg] = useState('');

  const val = (v: string | null) => showKeys ? (v || '…') : ((v?.slice(0, 12)) || '…');

  const handleEraseData = async () => {
    setConfirmErase(false);
    try {
      indexedDB.deleteDatabase('p31-shell');
      indexedDB.deleteDatabase('p31-shell-db');
      const keys = Object.keys(localStorage).filter(k => k.startsWith('p31-'));
      keys.forEach(k => localStorage.removeItem(k));
      localStorage.removeItem('p31-imported-identity');
      sessionStorage.clear();
      window.location.reload();
    } catch {
      showToast?.('Erase failed. Close all tabs and clear site data manually.', 'error');
    }
  };

  const handleSignChallenge = async () => {
    const challenge = `p31:prove:${Date.now()}:${did}`;
    const sig = await sign(challenge);
    if (sig) {
      setProofMsg(`Signed challenge ${challenge.slice(0, 28)}… ✓`);
      setSignature(sig);
    } else {
      setProofMsg('Signing failed — is a key present?');
    }
  };

  return (
    <div className="page-fill p31-ambient-bg">
      <div className="profile-grid">
        <GlassCard title="DID" variant="phos" className="dashboard-card">
          <div className="card-body">
            <div className="id-did-row">
              <div className="id-did-avatar">
                {did ? did.slice(2, 4).toUpperCase() : '—'}
              </div>
              <div className="id-did-text">
                <div className="id-did-text">{loading ? 'Loading…' : val(did)}</div>
              </div>
            </div>
            <div className="id-did-type">did:key · Ed25519</div>
            <div className="card-meta-row" style={{ marginTop: 'auto' }}>
              <span style={{ color: trust.color, fontWeight: 700 }}>Trust {trust.level}</span>
              <span>{trust.score}/100</span>
            </div>
          </div>
        </GlassCard>

        <GlassCard title="Keys" variant="default" className="dashboard-card">
          <div className="card-body">
            <div className="id-key-row">
              <span className="id-key-label">Ed25519</span>
              <span className="id-key-value">{val(edPub)}</span>
            </div>
            <div className="id-key-row">
              <span className="id-key-label">ML-DSA-65</span>
              <span className="id-key-value-violet">{val(mldsaPub)}</span>
            </div>
            <div className="id-key-row">
              <span className="id-key-label">SLH-DSA-128s</span>
              <span className="id-key-value">{val(slhdsaPub)}</span>
            </div>
            <div className="id-pqc-row">
              <span className="id-pqc-label">PQC</span>
              <span className={"id-status-badge " + (pqcReady ? "id-status-ready" : "id-status-generating")}>
                {pqcReady ? 'Ready' : 'Generating'}
              </span>
            </div>
            <div className="card-meta-row" style={{ marginTop: 'auto' }}>
              <span>{kelCount} KEL events</span>
              <span>
                <button type="button" className="btn ghost" style={{ fontSize: 'var(--p31-scale-xs)', padding: '2px 8px' }} onClick={ensurePqc} disabled={pqcReady}>
                  {pqcReady ? 'ML-DSA Active' : 'Init ML-DSA'}
                </button>
                <button type="button" className="btn ghost" style={{ fontSize: 'var(--p31-scale-xs)', padding: '2px 8px', marginLeft: 4 }} onClick={ensureSlhdsa} disabled={slhdsaReady}>
                  {slhdsaReady ? 'SLH Active' : 'Init SLH'}
                </button>
              </span>
            </div>
          </div>
        </GlassCard>

        <GlassCard title="OAuth Identity" variant="default" className="dashboard-card">
          <div className="card-body">
            {oauthLinked ? (
              <>
                <div className="id-key-row">
                  <span className="id-key-label">Provider</span>
                  <span className="id-key-value" style={{ textTransform: 'capitalize' }}>{oauthProvider}</span>
                </div>
                <div className="card-meta-row" style={{ marginTop: 'auto' }}>
                  <span style={{ color: 'var(--p31-accent-green)' }}>✓ Linked</span>
                  <button type="button" className="btn ghost" style={{ fontSize: 'var(--p31-scale-xs)', padding: '2px 8px' }} onClick={oauthLogout}>
                    Unlink
                  </button>
                </div>
              </>
            ) : (
              <>
                <span className="id-empty-text">Link a social account for easier login.</span>
                <div className="card-meta-row" style={{ marginTop: 'auto', gap: 8 }}>
                  <button type="button" className="btn primary" style={{ fontSize: 'var(--p31-scale-xs)', padding: '4px 12px' }} onClick={() => oauthLogin('google')}>
                    Google
                  </button>
                  <button type="button" className="btn ghost" style={{ fontSize: 'var(--p31-scale-xs)', padding: '4px 12px' }} onClick={() => oauthLogin('github')}>
                    GitHub
                  </button>
                </div>
              </>
            )}
          </div>
        </GlassCard>

        <GlassCard title="KEL Chain" variant="default" className="dashboard-card">
          <div className="card-body" style={{ overflow: 'hidden' }}>
            {kelEvents && kelEvents.length > 0 ? (
              <>
                {kelEvents.slice(-4).map((event, i) => (
                  <div key={i} className="id-kel-row">
                    <span className="id-kel-num">#{kelEvents.length - 4 + i}</span>
                    <span className="id-kel-type">{event.type || 'event'}</span>
                    <span className="id-kel-said">
                      {event.said?.slice(0, 10) || '—'}
                    </span>
                  </div>
                ))}
                <div className="card-meta-row" style={{ marginTop: 'auto' }}>
                  <span className="card-value-green">{kelValid ? '✓ Valid' : '⚠ Pending'}</span>
                  <span>{kelCount} events</span>
                </div>
              </>
            ) : (
              <span className="id-empty-text">No KEL events yet</span>
            )}
          </div>
        </GlassCard>

        <GlassCard title="Mesh" variant="bash" className="dashboard-card">
          <div className="card-body">
            <div className="id-stat-grid">
              <div className="id-stat-block">
                <div className="id-stat-label">Peers</div>
                <div className="id-stat-value">{meshStatus.peerCount}</div>
              </div>
              <div className="id-stat-block">
                <div className="id-stat-label">Transport</div>
                <div className="id-stat-value id-stat-value-green">{meshStatus.transportMode || 'peerjs'}</div>
              </div>
            </div>
            <div className="card-meta-row" style={{ marginTop: 'auto' }}>
              <span>
                <MeshStatusDot />
                {' '}{meshStatus.quality}
              </span>
              <span>{meshPeers} attest</span>
            </div>
          </div>
        </GlassCard>

        <GlassCard title="State" variant="willow" className="dashboard-card">
          <div className="card-body">
            <div className="id-stat-grid">
              <div className="id-stat-block">
                <div className="id-stat-label">Spoons</div>
                <div className="id-stat-value id-stat-value-gold">{spoons}</div>
              </div>
              <div className="id-stat-block">
                <div className="id-stat-label">Rituals</div>
                <div className="id-stat-value">{bondingRitualsCompleted}</div>
              </div>
            </div>
            <div className="card-meta-row" style={{ marginTop: 'auto' }}>
              <span>{trust.score >= 70 ? 'Strong trust posture' : 'Building trust'}</span>
              <button type="button" className="btn ghost" style={{ fontSize: 'var(--p31-scale-xs)', padding: '2px 8px' }} onClick={handleSignChallenge}>
                Prove control
              </button>
            </div>
          </div>
        </GlassCard>

        <GlassCard title="Proof of Control" variant="default" className="dashboard-card">
          <div className="card-body" style={{ overflow: 'hidden' }}>
            {signature ? (
              <div className="id-proof-text">{signature.slice(0, 64)}…</div>
            ) : (
              <span className="id-empty-text">Sign a fresh challenge with your DID key to prove ownership.</span>
            )}
            {proofMsg && <div className="id-proof-msg">{proofMsg}</div>}
            <div className="card-meta-row" style={{ marginTop: 'auto' }}>
              <span>Ed25519 signature</span>
              <span>{signature ? '✓ Signed' : 'idle'}</span>
            </div>
          </div>
        </GlassCard>
      </div>

      <div style={{ marginTop: 'var(--p31-space-xs)' }}>
        <button type="button" className="btn ghost wallet-btn-full" onClick={() => setShowAdvanced(!showAdvanced)}>
          {showAdvanced ? 'Hide' : 'Show'} advanced actions
        </button>
        {showAdvanced && (
          <div className="id-advanced-row">
            <button type="button" className="btn ghost id-erase-btn" onClick={() => setConfirmErase(true)} aria-description="Permanently deletes all local identity data, keys, and app state. Cannot be undone.">
              Erase all local data
            </button>
          </div>
        )}
      </div>

      {confirmExport && (
        <ConfirmDialog
          title="Export Identity"
          message="This will download a JSON file containing your DID, Ed25519, ML-DSA-65, and SLH-DSA-128s public keys, and full KEL chain. Store it somewhere safe — this is your sovereign identity backup."
          confirmLabel="Download"
          onConfirm={() => { setConfirmExport(false); onExport?.(); }}
          onCancel={() => setConfirmExport(false)}
        />
      )}
      {confirmErase && (
        <ConfirmDialog
          title="Erase All Local Data"
          message="This will permanently delete your DID, keys, KEL chain, ledger, spoon history, love balance, and all local app data. This cannot be undone. Export your identity first if you want to keep it."
          confirmLabel="Erase everything"
          danger
          onConfirm={handleEraseData}
          onCancel={() => setConfirmErase(false)}
        />
      )}
    </div>
  );
}
