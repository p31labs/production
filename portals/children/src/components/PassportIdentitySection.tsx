import { useState, useEffect, useRef } from 'react';
import { usePassport, passportFace } from '@p31/ui/passport';
import { exportBackup, importBackup } from '@p31/ui/passport/backup';
import { generateMLDSA65Identity, loadMLDSA65Identity } from '@p31/ui/passport/pqc';
import { generateDIDDocument, exportDIDDocumentJSON } from '@p31/ui/passport/did-document';
import { exportEUDIWallet, serializeEUDIWallet } from '@p31/ui/passport/eudi';

const btnStyle: React.CSSProperties = {
  width: '100%',
  padding: 'var(--p31-space-sm) var(--p31-space-md)',
  border: '1px solid var(--p31-glass-border, rgba(255,255,255,0.1))',
  borderRadius: 'var(--p31-radius-md, 8px)',
  background: 'var(--p31-glass-bg, rgba(255,255,255,0.04))',
  color: 'var(--p31-text-primary, #f0f2f5)',
  fontSize: 'var(--p31-type-caption, 12px)',
  cursor: 'pointer',
  fontFamily: 'var(--p31-font-mono, monospace)',
  minHeight: '44px',
};

const sectionCard: React.CSSProperties = {
  background: 'var(--p31-glass-bg, rgba(255,255,255,0.04))',
  border: '1px solid var(--p31-glass-border, rgba(255,255,255,0.08))',
  borderRadius: 'var(--p31-radius-lg, 16px)',
  padding: 'var(--p31-space-md, 16px)',
  marginBottom: 'var(--p31-space-md, 16px)',
};

const labelStyle: React.CSSProperties = {
  fontSize: 'var(--p31-type-caption, 12px)',
  color: 'var(--p31-text-secondary, rgba(240,242,245,0.5))',
  marginBottom: '4px',
  fontFamily: 'var(--p31-font-mono, monospace)',
};

export default function PassportIdentitySection() {
  const { status, passport, identity, exportJson, importJson, reset } = usePassport();
  const [importText, setImportText] = useState('');
  const [importShow, setImportShow] = useState(false);
  const restoreRef = useRef<HTMLInputElement>(null);

  if (status === 'loading') {
    return (
      <div style={sectionCard}>
        <div style={{ textAlign: 'center', color: 'var(--p31-text-secondary, rgba(240,242,245,0.5))', fontSize: 'var(--p31-type-caption, 12px)' }}>
          Loading passport…
        </div>
      </div>
    );
  }

  if (status === 'empty' || !passport) {
    return (
      <div style={sectionCard}>
        <h3 style={{ fontFamily: 'var(--p31-font-display)', fontSize: 'var(--p31-type-h3, 16px)', margin: '0 0 var(--p31-space-sm, 8px)' }}>
          🆔 Identity
        </h3>
        <p style={{ fontSize: 'var(--p31-type-caption, 12px)', color: 'var(--p31-text-secondary, rgba(240,242,245,0.5))', marginBottom: 'var(--p31-space-sm, 8px)' }}>
          No passport created yet.
        </p>
      </div>
    );
  }

  const face = passport.face || passportFace(passport.did);
  const name = passport.identity?.displayName || 'Operator';

  const handleExportJson = async () => {
    const json = await exportJson();
    if (!json) return;
    navigator.clipboard?.writeText(json).catch(() => {});
  };

  const handleImportJson = async () => {
    try {
      await importJson(importText);
      setImportText('');
      setImportShow(false);
    } catch {
      alert('Invalid passport bundle');
    }
  };

  const handleReset = async () => {
    if (!confirm('Wipe your local passport and keys? This cannot be undone.')) return;
    await reset();
  };

  const handleBackup = async () => {
    if (!passport || !identity) return;
    const passphrase = prompt('Enter a passphrase to encrypt your backup:');
    if (!passphrase) return;
    try {
      const pqId = await loadMLDSA65Identity();
      const blob = await exportBackup(passport, identity, pqId, passphrase);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `p31-passport-${Date.now()}.p31`;
      a.click(); URL.revokeObjectURL(url);
    } catch {
      alert('Backup failed');
    }
  };

  const handleRestore = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const passphrase = prompt('Enter your backup passphrase:');
    if (!passphrase) return;
    try {
      const bundle = await importBackup(file, passphrase);
      await importJson(JSON.stringify(bundle.passport));
      alert('Passport restored');
    } catch {
      alert('Restore failed — wrong passphrase or corrupt file');
    }
  };

  const handleGenPQC = async () => {
    try {
      const pqId = await generateMLDSA65Identity();
      alert(`PQC Identity generated: ${pqId.did.slice(0, 24)}...`);
    } catch {
      alert('PQC generation failed');
    }
  };

  const handleExportDID = async () => {
    if (!identity) return;
    const pqId = await loadMLDSA65Identity();
    const doc = generateDIDDocument(identity.did, identity.publicKey, pqId?.did, pqId?.publicKey as any);
    const json = exportDIDDocumentJSON(doc);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'did-document.json'; a.click(); URL.revokeObjectURL(url);
  };

  const handleExportEUDI = async () => {
    if (!passport || !identity) return;
    try {
      const wallet = await exportEUDIWallet(passport, identity);
      const json = serializeEUDIWallet(wallet);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `eudi-wallet-${Date.now()}.json`; a.click(); URL.revokeObjectURL(url);
    } catch {
      alert('EUDI export failed');
    }
  };

  return (
    <div>
      <div style={sectionCard}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--p31-space-md, 16px)' }}>
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: '50%',
              overflow: 'hidden',
              border: '1px solid var(--p31-glass-border, rgba(255,255,255,0.1))',
              flexShrink: 0,
            }}
            aria-hidden="true"
            dangerouslySetInnerHTML={{ __html: face }}
          />
          <div>
            <div style={{ fontSize: 'var(--p31-type-h2, 20px)', fontWeight: 700, fontFamily: 'var(--p31-font-display)' }}>
              {name}
            </div>
            {passport.identity?.pronouns && (
              <div style={{ fontSize: 'var(--p31-type-caption, 12px)', color: 'var(--p31-text-secondary, rgba(240,242,245,0.5))' }}>
                {passport.identity.pronouns}
              </div>
            )}
            {passport.identity?.oneLiner && (
              <div style={{ fontSize: 'var(--p31-type-body, 14px)', color: 'var(--p31-text-secondary, rgba(240,242,245,0.7))', marginTop: 'var(--p31-space-xs, 4px)' }}>
                {passport.identity.oneLiner}
              </div>
            )}
          </div>
        </div>
      </div>

      <div style={sectionCard}>
        <h3 style={{ fontFamily: 'var(--p31-font-display)', fontSize: 'var(--p31-type-h3, 16px)', margin: '0 0 var(--p31-space-sm, 8px)' }}>
          🔑 Your DID
        </h3>
        <div style={labelStyle}>DID</div>
        <div className="profile-field" style={{ wordBreak: 'break-all', fontSize: 'var(--p31-type-caption, 12px)', fontFamily: 'var(--p31-font-mono, monospace)', marginBottom: 'var(--p31-space-sm, 8px)' }}>
          {passport.did}
        </div>
        {passport.publicKey && (
          <>
            <div style={labelStyle}>Public Key (Ed25519)</div>
            <div className="profile-field" style={{ wordBreak: 'break-all', fontSize: '10px', fontFamily: 'var(--p31-font-mono, monospace)', color: 'var(--p31-text-secondary, rgba(240,242,245,0.5))' }}>
              {passport.publicKey}
            </div>
          </>
        )}
        {identity && (
          <div style={{ fontSize: '10px', color: 'var(--p31-accent-green, #00ff88)', fontFamily: 'var(--p31-font-mono, monospace)', marginTop: 'var(--p31-space-sm, 8px)' }}>
            🔒 Private key stored locally
          </div>
        )}
      </div>

      <div style={sectionCard}>
        <h3 style={{ fontFamily: 'var(--p31-font-display)', fontSize: 'var(--p31-type-h3, 16px)', margin: '0 0 var(--p31-space-sm, 8px)' }}>
          🛠️ Manage Identity
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--p31-space-sm, 8px)' }}>
          <button style={btnStyle} onClick={handleBackup}>
            💾 Download Backup (.p31)
          </button>

          <input type="file" accept=".p31" ref={restoreRef} style={{ display: 'none' }} onChange={handleRestore} />
          <button style={btnStyle} onClick={() => restoreRef.current?.click()}>
            📂 Restore from Backup
          </button>

          <button style={{ ...btnStyle, borderColor: 'var(--p31-accent-violet, #bf5fff)' }} onClick={handleGenPQC}>
            🔐 Generate PQC Identity (ML-DSA-65)
          </button>

          <button style={{ ...btnStyle, borderColor: 'var(--p31-accent-gold, #ffd700)' }} onClick={handleExportDID}>
            📄 Export DID Document
          </button>

          <button style={{ ...btnStyle, borderColor: 'var(--p31-accent-gold, #ffd700)' }} onClick={handleExportEUDI}>
            🌍 Export EUDI Wallet
          </button>

          <button style={btnStyle} onClick={handleExportJson}>
            📋 Copy Passport JSON
          </button>

          {!importShow ? (
            <button style={btnStyle} onClick={() => setImportShow(true)}>
              📥 Import Passport
            </button>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--p31-space-xs, 4px)' }}>
              <textarea
                rows={3}
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                placeholder="Paste passport JSON bundle…"
                style={{
                  width: '100%',
                  padding: 'var(--p31-space-sm, 8px)',
                  borderRadius: 'var(--p31-radius-md, 8px)',
                  background: 'var(--p31-glass-bg, rgba(255,255,255,0.04))',
                  border: '1px solid var(--p31-glass-border, rgba(255,255,255,0.1))',
                  color: 'var(--p31-text-primary, #f0f2f5)',
                  fontSize: 'var(--p31-type-caption, 12px)',
                  fontFamily: 'var(--p31-font-mono, monospace)',
                  resize: 'vertical',
                }}
              />
              <div style={{ display: 'flex', gap: 'var(--p31-space-xs, 4px)' }}>
                <button style={{ ...btnStyle, flex: 1 }} onClick={handleImportJson} disabled={!importText.trim()}>
                  Import
                </button>
                <button style={{ ...btnStyle, flex: 1 }} onClick={() => { setImportShow(false); setImportText(''); }}>
                  Cancel
                </button>
              </div>
            </div>
          )}

          <button style={{ ...btnStyle, borderColor: 'var(--p31-accent-rose, #ff6b6b)', color: 'var(--p31-accent-rose, #ff6b6b)' }} onClick={handleReset}>
            🗑️ Reset Passport
          </button>
        </div>
      </div>
    </div>
  );
}
