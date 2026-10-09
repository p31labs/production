import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { MetricCard } from '../components/MetricCard';
import { StatusBanner } from '../components/StatusBanner';
import { StatusBadge } from '../components/StatusBadge';
import { useIdentityStore } from '../lib/useIdentityStore';
import { sbtListQuery, queryKeys, type SbtRecord } from '../lib/api/queries';
import { formatRelativeTime } from '../lib/formatters';
import PHENIX_WALLET from '../lib/phenixWallet';
import { KycGate } from '../components/KycGate';

const SBT_LABEL: Record<string, string> = {
  'proof-of-contribution': 'Proof of Contribution',
  'founding-contributor': 'Founding Contributor',
  'community-builder': 'Community Builder',
  'impact-amplifier': 'Impact Amplifier',
  'code-contributor': 'Code Contributor',
  'care-keeper': 'Care Keeper',
};

export default function ProfileSurface() {
  const identity = useIdentityStore((s) => s.identity);
  const connect = useIdentityStore((s) => s.connect);
  const connecting = useIdentityStore((s) => s.connecting);
  const queryClient = useQueryClient();
  const [issueError, setIssueError] = useState('');
  const [issuing, setIssuing] = useState(false);
  const [walletMsg, setWalletMsg] = useState('');
  const [ledgerHash, setLedgerHash] = useState<string | null>(null);

  const wallet = PHENIX_WALLET.status();

  const did = identity?.did ?? '';
  const { data: sbts, isPending } = useQuery(sbtListQuery(did));

  const mint = async () => {
    if (!did) return;
    setIssuing(true);
    setIssueError('');
    try {
      const res = await fetch('/api/sbt/issue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ did, type: 'founding-contributor', metadata: { origin: 'capital-machine' } }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error ?? `HTTP ${res.status}`);
      }
      await queryClient.invalidateQueries({ queryKey: queryKeys.sbt.list(did) });
    } catch (e) {
      setIssueError(e instanceof Error ? e.message : 'Issue failed');
    } finally {
      setIssuing(false);
    }
  };

  const createWallet = async () => {
    const pw = window.prompt('Create Phenix vault — choose a strong password');
    if (!pw) return;
    await PHENIX_WALLET.createVault(pw);
    setWalletMsg('Vault created');
    setLedgerHash(null);
  };

  const unlockWallet = async () => {
    const pw = window.prompt('Enter vault password');
    if (!pw) return;
    const ok = await PHENIX_WALLET.unlockVault(pw);
    setWalletMsg(ok ? 'Vault unlocked' : 'Wrong password or no vault');
  };

  const recordContribution = () => {
    if (!did) return;
    PHENIX_WALLET.logMemo({ type: 'CONTRIBUTION', memo: 'Community contribution', amount: 'verified', currency: 'LOVE', txHash: crypto.randomUUID() });
    PHENIX_WALLET.storeCredential('p31.sbt', 'did:web:p31ca.org', { did, kind: 'proof-of-contribution' });
    setWalletMsg('Contribution recorded to wallet + p31.sbt credential stored');
  };

  const exportLedger = async () => {
    const { sha256 } = await PHENIX_WALLET.exportLedger();
    setLedgerHash(sha256);
    setWalletMsg('Memo ledger exported (SHA-256 integrity hash computed)');
  };

  return (
    <div className="surface-page">
      <header className="surface-head">
        <div>
          <h2 className="surface-title">Profile</h2>
          <p className="surface-sub">Your sovereign identity, contributions, and soulbound recognition.</p>
        </div>
      </header>

      {!identity && (
        <div className="empty-state">
          <h3>No identity connected</h3>
          <p>Create your sovereign Ed25519 did:key. It is stored only on this device and is the root of your contributions and recognition.</p>
          <button className="btn btn-primary" type="button" onClick={() => void connect()} disabled={connecting}>
            {connecting ? 'Creating…' : '✦ Create sovereign identity'}
          </button>
        </div>
      )}

      {identity && (
        <>
          <div className="metric-grid">
            <MetricCard label="Identity" value={<span className="mono">{identity.did.slice(0, 16)}…</span>} sub={identity.did} accent="violet" status="live" />
            <MetricCard label="Soulbound Tokens" value={sbts?.length ?? 0} sub="anchored, non-transferable" accent="green" status={isPending ? 'loading' : 'live'} />
          </div>

          {issueError && <StatusBanner kind="error">{issueError}</StatusBanner>}

          <div className="controls-row" style={{ marginTop: 'var(--p31-space-4)' }}>
            <button className="btn btn-glass" type="button" onClick={mint} disabled={issuing || !did}>
              {issuing ? 'Minting…' : 'Mint Founding Contributor SBT'}
            </button>
          </div>

          <h3 className="surface-card-title" style={{ margin: 'var(--p31-space-5) 0 var(--p31-space-3)' }}>Trust & Access — Progressive KYC</h3>
          <KycGate requiredTier={2} />

          <h3 className="surface-card-title" style={{ margin: 'var(--p31-space-5) 0 var(--p31-space-3)' }}>Phenix Donation Wallet</h3>
          <div className="metric-grid">
            <MetricCard label="Vault" value={wallet.exists ? (wallet.unlocked ? 'Unlocked' : 'Locked') : 'None'} sub={wallet.metaAddress ? `${wallet.metaAddress.slice(0, 18)}…` : 'create a vault'} accent="violet" status={wallet.exists ? 'live' : 'empty'} />
            <MetricCard label="Credentials" value={wallet.credentialCount} sub="SD-JWT style" accent="green" status="live" />
            <MetricCard label="Ledger entries" value={PHENIX_WALLET.memos().length} sub="memo-to-file" accent="gold" status="live" />
          </div>
          <div className="controls-row" style={{ flexWrap: 'wrap' }}>
            <button className="btn btn-glass" type="button" onClick={createWallet}>Create vault</button>
            <button className="btn btn-glass" type="button" onClick={unlockWallet}>Unlock</button>
            <button className="btn btn-glass" type="button" onClick={() => { PHENIX_WALLET.lock(); setWalletMsg('Locked'); }}>Lock</button>
            <button className="btn btn-glass" type="button" onClick={recordContribution}>Record contribution + p31.sbt</button>
            <button className="btn btn-glass" type="button" onClick={exportLedger}>Export memo ledger</button>
          </div>
          {walletMsg && <div className="status-banner" style={{ marginTop: 'var(--p31-space-4)' }}>{walletMsg}</div>}
          {ledgerHash && <p className="row-card__meta mono" style={{ marginTop: 8 }}>ledger sha256: {ledgerHash}</p>}

          <h3 className="surface-card-title" style={{ margin: 'var(--p31-space-5) 0 var(--p31-space-3)' }}>SBT Gallery</h3>
          {isPending ? (
            <div className="empty-state"><h3>Loading…</h3></div>
          ) : !sbts || sbts.length === 0 ? (
            <div className="empty-state"><h3>No soulbound tokens yet</h3><p>Verified contributions mint non-transferable recognition.</p></div>
          ) : (
            <div className="row-list">
              {sbts.map((s: SbtRecord) => (
                <div key={s.id} className="row-card">
                  <div className="row-card__head">
                    <span className="row-card__title">{SBT_LABEL[s.type] ?? s.type}</span>
                    <StatusBadge status={s.anchored ? 'live' : 'stale'} />
                  </div>
                  <div className="row-card__meta mono">hash {s.hash.slice(0, 12)}…</div>
                  <div className="row-card__meta">
                    {formatRelativeTime(s.issued_at)}
                    {s.anchored ? ' · anchored' : ' · registry-anchored'}
                  </div>
                  <div className="row-card__meta" style={{ display: 'flex', gap: 8 }}>
                    <a className="integrity-badge" href={`/verify-sbt?hash=${s.hash}`} title="Verify this SBT">✓ {s.hash.slice(0, 10)}…</a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}