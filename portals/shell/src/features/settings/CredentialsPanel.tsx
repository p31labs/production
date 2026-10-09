/**
 * features/settings/CredentialsPanel.tsx — BYOK credential management.
 *
 * A minimal connect/list/disconnect surface for provider keys. Keys are sent
 * once on connect and never returned; the list shows metadata (provider,
 * fingerprint, revoked state) only.
 */
import { useCallback, useEffect, useState } from 'react';

interface CredentialMeta {
  did: string;
  provider: string;
  fingerprint: string;
  created_at: number;
  revoked_at: number | null;
}

export function CredentialsPanel() {
  const [did, setDid] = useState('');
  const [provider, setProvider] = useState('');
  const [key, setKey] = useState('');
  const [credentials, setCredentials] = useState<CredentialMeta[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/credentials');
      const data = (await res.json()) as { credentials: CredentialMeta[] };
      setCredentials(data.credentials ?? []);
    } catch {
      setError('failed to load credentials');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const connect = async () => {
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/credentials', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ did, provider, key }),
      });
      if (!res.ok) throw new Error('connect failed');
      setKey('');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'connect failed');
    } finally {
      setBusy(false);
    }
  };

  const disconnect = async (cred: CredentialMeta) => {
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/credentials', {
        method: 'DELETE',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ did: cred.did, provider: cred.provider }),
      });
      if (!res.ok) throw new Error('disconnect failed');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'disconnect failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="credentials-panel">
      <h2>Credentials</h2>
      <form
        className="credentials-panel__form"
        onSubmit={(e) => {
          e.preventDefault();
          void connect();
        }}
      >
        <input value={did} onChange={(e) => setDid(e.target.value)} placeholder="did" />
        <input value={provider} onChange={(e) => setProvider(e.target.value)} placeholder="provider" />
        <input value={key} onChange={(e) => setKey(e.target.value)} placeholder="key" type="password" />
        <button type="submit" disabled={busy || !did || !provider || !key}>
          Connect
        </button>
      </form>

      {error && <p className="credentials-panel__error">{error}</p>}

      <ul className="credentials-panel__list">
        {credentials.map((c) => (
          <li key={`${c.did}:${c.provider}`}>
            <span className="credentials-panel__provider">{c.provider}</span>
            <span className="credentials-panel__fingerprint">{c.fingerprint}</span>
            {c.revoked_at ? (
              <span className="credentials-panel__revoked">revoked</span>
            ) : (
              <button type="button" onClick={() => void disconnect(c)} disabled={busy}>
                Disconnect
              </button>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}