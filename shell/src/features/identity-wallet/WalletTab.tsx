import { useMemo, useRef, useState } from 'react';
import { useSyncExternalStore } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { useIdentityWallet } from './useIdentityWallet';
import GlassCard from '../../components/ui/GlassCard';
import { getLoveEngine } from '../../lib/loveEngine';
import {
  sendLove,
  buildReceiveLink,
  enqueuePaymentRequest,
  getPaymentRequests,
  subscribePaymentRequests,
  fulfillPaymentRequest,
  clearPaymentRequests,
  type PaymentRequest,
} from '../../lib/lovePayments';
import QRCode from 'qrcode';
import { emitNotification } from '../../hooks/useNotificationHub';

type Action = 'none' | 'send' | 'receive';

function usePaymentRequests(): PaymentRequest[] {
  return useSyncExternalStore(subscribePaymentRequests, getPaymentRequests, getPaymentRequests);
}

export interface WalletTabHeaderControlsProps {
  onExportLedger: () => void;
}

export function WalletTabHeaderControls({ onExportLedger }: WalletTabHeaderControlsProps) {
  return (
    <button type="button" className="btn primary" onClick={onExportLedger}>
      Export Ledger
    </button>
  );
}

export default function WalletTab({ onExportLedger }: { onExportLedger?: () => void }) {
  const showToast = useAppStore((s) => s.showToast);
  const {
    loveWallet, loveTransactions, careScore,
    r, phase, mode, did,
  } = useIdentityWallet();

  const paymentRequests = usePaymentRequests();
  const [action, setAction] = useState<Action>('none');
  const [sendDID, setSendDID] = useState('');
  const [sendAmount, setSendAmount] = useState('');
  const [sendNote, setSendNote] = useState('');
  const [sending, setSending] = useState(false);
  const [receiveAmount, setReceiveAmount] = useState('');
  const [receiveNote, setReceiveNote] = useState('');
  const [requested, setRequested] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const qrTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const recentTx = useMemo(
    () => [...loveTransactions].slice(-10).reverse(),
    [loveTransactions],
  );

  const pendingRequests = useMemo(() => paymentRequests.filter((r) => r.status === 'pending'), [paymentRequests]);
  const fulfilledCount = useMemo(() => paymentRequests.filter((r) => r.status === 'fulfilled').length, [paymentRequests]);

  const handleSend = () => {
    const amount = Number(sendAmount);
    const recipient = sendDID.trim();
    if (!recipient) {
      showToast?.('Enter a recipient DID', 'error');
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      showToast?.('Enter a valid amount', 'error');
      return;
    }
    setSending(true);
    const res = sendLove(recipient, amount, sendNote.trim() || undefined);
    setSending(false);
    if (res.ok) {
      showToast?.(`${'✓'} ${amount} LOVE sent to ${recipient.slice(0, 14)}…`, 'success');
      emitNotification({
        source: 'love',
        title: 'LOVE sent',
        body: `${amount} LOVE to ${recipient.slice(0, 14)}…`,
        icon: '💚',
        priority: 'medium',
      });
      setAction('none');
      setSendDID('');
      setSendAmount('');
      setSendNote('');
    } else {
      showToast?.(res.error ?? 'Send failed', 'error');
    }
  };

  const handleReceive = () => {
    const amount = Number(receiveAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      showToast?.('Enter a valid amount to request', 'error');
      return;
    }
    const link = buildReceiveLink(did, amount, receiveNote.trim() || undefined);
    enqueuePaymentRequest({ fromDid: did, amount, note: receiveNote.trim() || undefined });
    setRequested(link);
    setQrDataUrl(null);
    if (qrTimer.current) clearTimeout(qrTimer.current);
    QRCode.toDataURL(link, { width: 180, margin: 1, color: { dark: '#0a0e17', light: '#ffffff' } })
      .then((url) => setQrDataUrl(url))
      .catch(() => setQrDataUrl(null));
    showToast?.('Payment request created', 'success');
  };

  const copyRequest = async () => {
    if (!requested) return;
    try {
      await navigator.clipboard.writeText(requested);
      showToast?.('Request link copied', 'success');
    } catch {
      showToast?.('Copy failed — select the link manually', 'error');
    }
  };

  const handleFulfill = (id: string) => {
    fulfillPaymentRequest(id);
    showToast?.('Request marked fulfilled', 'success');
  };

  return (
    <div className="page-fill p31-ambient-bg">
      <div className="profile-grid">
        <GlassCard title="Sovereignty Pool" variant="phos" className="dashboard-card">
          <div className="card-body">
            <div className="card-value wallet-amount-accent">
              {loveWallet.sovereigntyPool.toFixed(1)}
              <span className="wallet-amount-unit">LOVE</span>
            </div>
            <div className="card-sub">
              Intrinsic care value. Immutable — vests on schedule.
            </div>
            <div className="card-meta-row" style={{ marginTop: 'auto' }}>
              <span>{loveWallet.totalEarned.toFixed(1)} earned all-time</span>
              <span>{loveWallet.transactionCount} tx</span>
            </div>
          </div>
        </GlassCard>

        <GlassCard title="Performance Pool" variant="willow" className="dashboard-card">
          <div className="card-body">
            <div className="card-value wallet-amount-gold">
              {loveWallet.availableBalance.toFixed(1)}
              <span className="wallet-amount-unit">LOVE</span>
            </div>
            <div className="card-sub">
              Spendable balance. Earned through care rituals.
            </div>
            <div className="card-meta-row" style={{ marginTop: 'auto' }}>
              <span>{loveWallet.availableBalance.toFixed(1)} available</span>
              <span style={{ color: 'var(--p31-accent-gold)' }}>spendable</span>
            </div>
          </div>
        </GlassCard>

        <GlassCard title="Recent Transactions" variant="default" className="dashboard-card">
          <div className="card-body" style={{ overflow: 'hidden' }}>
            {recentTx.length === 0 ? (
              <span className="id-empty-text">No transactions yet</span>
            ) : (
              recentTx.slice(-4).map((tx, i) => (
                <div key={i} className="id-kel-row">
                  <span className="id-kel-type">{tx.type}</span>
                  <span className="id-kel-said">{tx.amount.toFixed(1)} LOVE</span>
                  <span style={{ marginLeft: 'auto', fontSize: 'var(--p31-scale-xs)', color: 'var(--p31-text-tertiary)' }}>
                    {new Date(tx.timestamp).toLocaleDateString()}
                  </span>
                </div>
              ))
            )}
            <div className="card-meta-row" style={{ marginTop: 'auto' }}>
              <span>{loveTransactions.length} total</span>
              <span style={{ color: 'var(--p31-accent-green)' }}>ledger</span>
            </div>
          </div>
        </GlassCard>
      </div>

      <GlassCard title="Send LOVE" variant="willow" style={{ marginTop: 'var(--p31-space-sm)' }}>
        {action === 'none' ? (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button type="button" className="btn primary" onClick={() => setAction('send')}>Send</button>
            <button type="button" className="btn ghost" onClick={() => setAction('receive')}>Request</button>
          </div>
        ) : action === 'send' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <input
              style={{ padding: 'var(--p31-space-tiny)', background: 'var(--p31-glass-bg)', border: '1px solid var(--p31-glass-border)', borderRadius: 'var(--p31-radius-sm)', color: 'var(--p31-text)', fontSize: 'var(--p31-scale-xs)' }}
              placeholder="Recipient DID"
              value={sendDID}
              onChange={(e) => setSendDID(e.target.value)}
            />
            <input
              style={{ padding: 'var(--p31-space-tiny)', background: 'var(--p31-glass-bg)', border: '1px solid var(--p31-glass-border)', borderRadius: 'var(--p31-radius-sm)', color: 'var(--p31-text)', fontSize: 'var(--p31-scale-xs)' }}
              placeholder="Amount"
              type="number"
              value={sendAmount}
              onChange={(e) => setSendAmount(e.target.value)}
            />
            <input
              style={{ padding: 'var(--p31-space-tiny)', background: 'var(--p31-glass-bg)', border: '1px solid var(--p31-glass-border)', borderRadius: 'var(--p31-radius-sm)', color: 'var(--p31-text)', fontSize: 'var(--p31-scale-xs)' }}
              placeholder="Note (optional)"
              value={sendNote}
              onChange={(e) => setSendNote(e.target.value)}
            />
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" className="btn primary" onClick={handleSend} disabled={sending}>{sending ? 'Sending…' : 'Confirm'}</button>
              <button type="button" className="btn ghost" onClick={() => setAction('none')}>Cancel</button>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center' }}>
            <input
              style={{ padding: 'var(--p31-space-tiny)', background: 'var(--p31-glass-bg)', border: '1px solid var(--p31-glass-border)', borderRadius: 'var(--p31-radius-sm)', color: 'var(--p31-text)', fontSize: 'var(--p31-scale-xs)', width: '100%', maxWidth: 320 }}
              placeholder="Amount"
              type="number"
              value={receiveAmount}
              onChange={(e) => setReceiveAmount(e.target.value)}
            />
            <input
              style={{ padding: 'var(--p31-space-tiny)', background: 'var(--p31-glass-bg)', border: '1px solid var(--p31-glass-border)', borderRadius: 'var(--p31-radius-sm)', color: 'var(--p31-text)', fontSize: 'var(--p31-scale-xs)', width: '100%', maxWidth: 320 }}
              placeholder="Note (optional)"
              value={receiveNote}
              onChange={(e) => setReceiveNote(e.target.value)}
            />
            <button type="button" className="btn primary" onClick={handleReceive} disabled={!receiveAmount}>Create request</button>
            {qrDataUrl && (
              <div style={{ marginTop: 'var(--p31-space-xs)', textAlign: 'center' }}>
                <img src={qrDataUrl} alt="Payment request QR" style={{ width: 180, height: 180, borderRadius: 'var(--p31-radius-sm)' }} />
                <div style={{ marginTop: 4, fontSize: 'var(--p31-scale-xs)', color: 'var(--p31-text-tertiary)' }}>{requested?.slice(0, 40)}…</div>
                <button type="button" className="btn ghost" onClick={copyRequest} style={{ marginTop: 4 }}>Copy link</button>
              </div>
            )}
            <button type="button" className="btn ghost" onClick={() => { setAction('none'); setRequested(null); setQrDataUrl(null); }}>Cancel</button>
          </div>
        )}
      </GlassCard>

      {pendingRequests.length > 0 && (
        <GlassCard title="Pending Requests" variant="default" style={{ marginTop: 'var(--p31-space-sm)' }}>
          {pendingRequests.slice(-4).map((req) => (
            <div key={req.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0', borderBottom: '1px solid var(--p31-glass-border)', fontSize: 'var(--p31-scale-xs)' }}>
              <span>{req.amount} LOVE · {req.fromDid?.slice(0, 14)}…</span>
              <button type="button" className="btn ghost" style={{ fontSize: 'var(--p31-scale-xs)', padding: '2px 8px' }} onClick={() => handleFulfill(req.id)}>Fulfill</button>
            </div>
          ))}
        </GlassCard>
      )}
    </div>
  );
}
