import { useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { useShellStore } from '../store/useShellStore';
import { useIdentityWallet } from '../features/identity-wallet/useIdentityWallet';
import IdentityTab, { IdentityTabHeaderControls } from '../features/identity-wallet/IdentityTab';
import WalletTab, { WalletTabHeaderControls } from '../features/identity-wallet/WalletTab';
import PassportTab from '../features/identity-wallet/PassportTab';
import CredentialsTab, { CredentialsTabHeaderControls } from '../features/identity-wallet/CredentialsTab';
import PageHeader from '../components/PageHeader';
import { getOrCreateDidKey, getEd25519PubKeyB64 } from '../lib/identity';
import { getOrCreatePqcKey, getSlhdsa128sPubKeyB64 } from '../lib/pqc';
import { getKEL, importKEL } from '../lib/keri';
import { getLoveEngine } from '../lib/loveEngine';
import { issueSdJwt, verifySdJwt, registerPqcOnChain } from '../lib/pqc';

const TABS = [
  { id: 'identity', label: 'Identity', icon: '\uD83D\uDCDD', title: 'Identity', infoText: 'Your sovereign DID, keys, KEL chain, and proof of control' },
  { id: 'wallet', label: 'Wallet', icon: '\uD83D\uDC96', title: 'Wallet', infoText: 'Your LOVE ledger — sovereignty pool, performance pool, and care score' },
  { id: 'passport', label: 'Passport', icon: '\uD83C\uDFE6', title: 'Cognitive Passport', infoText: 'Unified v4.1.0 content document + live telemetry, plus sensory preferences' },
  { id: 'credentials', label: 'Credentials', icon: '\uD83D\uDD10', title: 'Credentials', infoText: 'SBTs, SD-JWT verifiable credentials, and post-quantum care proofs' },
] as const;

type TabId = typeof TABS[number]['id'];

export default function ProfilePage() {
  const tab = useShellStore((s) => s.profileSubTab);
  const setTab = useShellStore((s) => s.setProfileSubTab);
  const showToast = useAppStore((s) => s.showToast);
  const { pqcReady, careScore } = useIdentityWallet();

  const [identityShowKeys, setIdentityShowKeys] = useState(false);
  const [identityExporting, setIdentityExporting] = useState(false);
  const [identityImporting, setIdentityImporting] = useState(false);

  const handleIdentityExport = async () => {
    setIdentityExporting(true);
    try {
      const didKey = await getOrCreateDidKey();
      const edKey = await getEd25519PubKeyB64();
      const pqcKey = await getOrCreatePqcKey();
      const slhdsaPub = await getSlhdsa128sPubKeyB64();
      const kelRecord = await getKEL();
      const data = {
        did: didKey,
        ed25519Pub: edKey,
        mldsa65Pub: pqcKey?.pubB64 || null,
        slhdsa128sPub: slhdsaPub,
        kel: kelRecord?.events || [],
        exportedAt: new Date().toISOString(),
      };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `p31-identity-${didKey.slice(0, 12)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      showToast?.('Identity exported', 'success');
    } catch {
      showToast?.('Export failed', 'error');
    }
    setIdentityExporting(false);
  };

  const handleIdentityImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    setIdentityImporting(true);
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string);
        const hasKel = Array.isArray(data.kel) && data.kel.length > 0;
        const hasKeys = !!(data.ed25519Pub) || !!(data.mldsa65Pub) || !!data.did;
        if (!hasKel && !hasKeys) throw new Error('Invalid identity file');
        localStorage.setItem('p31-imported-identity', JSON.stringify(data));
        if (hasKel) await importKEL(data.kel);
        showToast?.('Identity imported', 'success');
      } catch {
        showToast?.('Invalid identity file', 'error');
      } finally {
        setIdentityImporting(false);
        if (e.target) e.target.value = '';
      }
    };
    reader.readAsText(file);
  };

  const handleExportLedger = () => {
    try {
      const snapshot = getLoveEngine().export();
      const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `p31-love-ledger-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      showToast?.('Ledger exported', 'success');
    } catch {
      showToast?.('Export failed', 'error');
    }
  };

  const [credentialIssuing, setCredentialIssuing] = useState(false);
  const [credentialRegistering, setCredentialRegistering] = useState(false);

  const handleIssueTestCredential = async () => {
    setCredentialIssuing(true);
    try {
      const res = await issueSdJwt({
        type: 'vault-attestation',
        careScore,
        timestamp: new Date().toISOString(),
      });
      if (!res) throw new Error('issueSdJwt returned null');
      const verifyRes = await verifySdJwt(res.sdjwt);
      if (verifyRes?.valid) {
        showToast?.('Credential issued and verified', 'success');
      } else {
        showToast?.('Credential issued but verification failed', 'error');
      }
    } catch (e) {
      showToast?.(`${'❌'} ${e instanceof Error ? e.message : 'issue failed'}`, 'error');
    }
    setCredentialIssuing(false);
  };

  const handleRegisterPqc = async () => {
    setCredentialRegistering(true);
    try {
      const ok = await registerPqcOnChain();
      showToast?.(ok ? 'PQC key registered on chain' : 'Registration returned no confirmation', ok ? 'success' : 'error');
    } catch {
      showToast?.('Registration failed', 'error');
    }
    setCredentialRegistering(false);
  };

  const activeTab = TABS.find((t) => t.id === tab)!;

  const controlsMap: Record<TabId, React.ReactNode> = {
    identity: (
      <IdentityTabHeaderControls
        showKeys={identityShowKeys}
        onToggleKeys={() => setIdentityShowKeys((v) => !v)}
        exporting={identityExporting}
        importing={identityImporting}
        onExport={handleIdentityExport}
        onImport={handleIdentityImport}
      />
    ),
    wallet: <WalletTabHeaderControls onExportLedger={handleExportLedger} />,
    passport: null,
    credentials: (
      <CredentialsTabHeaderControls
        issuing={credentialIssuing}
        registering={credentialRegistering}
        pqcReady={pqcReady}
        onIssueTestCredential={handleIssueTestCredential}
        onRegisterPqc={handleRegisterPqc}
      />
    ),
  };

  return (
    <div className="profile-container p31-ambient-bg" style={{ position: 'relative', display: 'flex', flexDirection: 'column', flex: '1 1 auto', minHeight: 0 }}>
      <div aria-hidden="true" style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.12, pointerEvents: 'none', zIndex: 0 }}>
        <span style={{ fontSize: 120 }}>🪪</span>
      </div>

      <PageHeader
        title={activeTab.title}
        icon={<span style={{ fontSize: 28 }}>{activeTab.icon}</span>}
        pageKey={tab}
        controls={controlsMap[tab]}
      />

      <div className="identity-wallet-tabs" role="tablist" aria-label="Identity Wallet sections">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            id={`iw-tab-${t.id}`}
            aria-selected={tab === t.id}
            aria-controls={`iw-panel-${t.id}`}
            className={`identity-wallet-tab${tab === t.id ? ' identity-wallet-tab--active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            <span aria-hidden="true" style={{ fontSize: 'var(--p31-scale-sm)' }}>{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      {TABS.map((t) => (
        <div
          key={t.id}
          role="tabpanel"
          id={`iw-panel-${t.id}`}
          aria-labelledby={`iw-tab-${t.id}`}
          hidden={tab !== t.id}
          style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', flexDirection: 'column' }}
        >
          {tab === t.id && (
            t.id === 'identity' ? (
              <IdentityTab
                showKeys={identityShowKeys}
                onToggleKeys={() => setIdentityShowKeys((v) => !v)}
              />
            ) : t.id === 'wallet' ? (
              <WalletTab onExportLedger={handleExportLedger} />
            ) : t.id === 'passport' ? (
              <PassportTab />
            ) : (
              <CredentialsTab
                issuing={credentialIssuing}
                registering={credentialRegistering}
                pqcReady={pqcReady}
                onIssueTestCredential={handleIssueTestCredential}
                onRegisterPqc={handleRegisterPqc}
              />
            )
          )}
        </div>
      ))}
    </div>
  );
}
