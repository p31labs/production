import { useState } from 'react';

interface WalletModalProps {
  onClose: () => void;
}

export default function WalletModal({ onClose }: WalletModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [connected, setConnected] = useState(false);

  const selectWallet = (wallet: string) => {
    setLoading(true);
    setError('');
    setTimeout(() => {
      const ok = Math.random() > 0.2;
      setLoading(false);
      if (ok) {
        setConnected(true);
        onClose();
      } else {
        setError('Connection failed. Please try again.');
      }
    }, 1500);
  };

  if (connected) return null;

  return (
    <div id="walletModal" className="modal-overlay active" role="dialog" aria-modal="true" aria-labelledby="walletModalTitle">
      <div className="glass-card modal-card">
        <button className="modal-close" onClick={onClose} aria-label="Close">✕</button>
        <h3 id="walletModalTitle" style={{ fontSize: '15px', fontWeight: 600, marginBottom: 'var(--p31-space-md)', paddingRight: '24px' }}>Connect Wallet</h3>
        <div id="walletOptions">
          <button className="button secondary wallet-option" onClick={() => selectWallet('phenix')}>
            <span style={{ fontSize: '18px' }}>🔗</span> Phenix Wallet
          </button>
          <button className="button secondary wallet-option" onClick={() => selectWallet('browser')} style={{ marginTop: '8px' }}>
            <span style={{ fontSize: '18px' }}>🌐</span> Browser Wallet
          </button>
          <button className="button secondary wallet-option" onClick={() => selectWallet('ledger')} style={{ marginTop: '8px' }}>
            <span style={{ fontSize: '18px' }}>📒</span> Hardware Wallet
          </button>
        </div>
        {loading && (
          <div style={{ display: 'none', textAlign: 'center', padding: '16px 0' }}>
            <div style={{ width: '32px', height: '32px', border: '3px solid var(--p31-glass-border)', borderTopColor: 'var(--p31-accent)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto' }}></div>
            <p style={{ marginTop: '12px', fontSize: '12px', color: 'var(--p31-text-secondary)' }}>Connecting...</p>
          </div>
        )}
        {error && (
          <div id="walletError" style={{ display: 'none', textAlign: 'center', padding: '12px', fontSize: '12px', color: 'var(--p31-accent-red)' }}></div>
        )}
      </div>
    </div>
  );
}
