import { useEffect, useState } from 'react';
import { resolveChatIdentity, type ChatIdentity } from '../../lib/identity';

export default function SidebarUserChip() {
  const [identity, setIdentity] = useState<ChatIdentity | null>(null);
  const [minting, setMinting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void resolveChatIdentity().then((id) => {
      if (!cancelled) setIdentity(id);
    }).catch(() => {
      if (!cancelled) setMinting(true);
    });
    return () => { cancelled = true; };
  }, []);

  const activate = () => {
    if (identity) return;
    setMinting(true);
    void resolveChatIdentity().then((id) => setIdentity(id)).catch(() => setMinting(false));
  };

  return (
    <button
      type="button"
      className="sidebar-user-chip"
      onClick={activate}
      aria-label={identity ? `Identity ${identity.did}` : 'Mint sovereign identity'}
      title={identity ? identity.did : 'Mint did:key (Ed25519)'}
    >
      <span className="sidebar-user-chip__emoji" aria-hidden="true">{identity?.emoji ?? '🌱'}</span>
      <span className="sidebar-user-chip__name">
        {identity?.name ?? (minting ? 'Minting…' : 'Claim did:key')}
      </span>
      <span className="sidebar-user-chip__did">
        {identity?.shortDid ?? 'did:key'}
      </span>
    </button>
  );
}