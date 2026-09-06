import type { LoveBalance } from '../types';
import PassportIdentitySection from './PassportIdentitySection';

interface ProfilePageProps {
  active: boolean;
  did: string;
  loveBalance: LoveBalance | null;
  sovereignEnabled: boolean;
  onRefreshLoveBalance: () => void;
  onConnectWallet: () => void;
}

export default function ProfilePage({
  active,
  did,
  loveBalance,
  sovereignEnabled,
  onRefreshLoveBalance,
  onConnectWallet,
}: ProfilePageProps) {
  return (
    <section className={`page${active ? ' active' : ''}`} id="page-profile" role="tabpanel">
      <h2>👤 Profile</h2>
      <PassportIdentitySection />
      <div className="stat-label" style={{ marginBottom: '4px' }}>DID</div>
      <div className="profile-field" id="profileDID">
        {sovereignEnabled && did ? did : '—'}
      </div>
      <div style={{ marginTop: 'var(--p31-space-md)' }}>
        <div className="stat-label" style={{ marginBottom: '4px' }}>Wallet</div>
        <div className="profile-field" id="walletConnectionStatus">
          {sovereignEnabled ? '🔗 Connected' : '🔌 Not connected'}
        </div>
        <button className="button" onClick={onConnectWallet} style={{ width: '100%', marginTop: 'var(--p31-space-sm)' }}>
          Connect Phenix
        </button>
      </div>
      <div style={{ marginTop: 'var(--p31-space-md)' }}>
        <div className="stat-label" style={{ marginBottom: '4px' }}>LOVE History</div>
        <div className="profile-field" id="loveHistory">
          {sovereignEnabled && loveBalance
            ? `Earned: ${loveBalance.totalEarned} | Balance: ${loveBalance.availableBalance}`
            : '—'}
        </div>
        {sovereignEnabled && (
          <button className="button secondary" style={{ width: '100%', marginTop: 'var(--p31-space-sm)' }} onClick={onRefreshLoveBalance}>
            🔄 Refresh
          </button>
        )}
      </div>
    </section>
  );
}
