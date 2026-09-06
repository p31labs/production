import { useState } from 'react';
import SettingsToggle from './SettingsToggle';
import MeshStatus from './MeshStatus';
import PassportIdentitySection from './PassportIdentitySection';
import type { SBT, LoveBalance } from '../types';

interface ProfilePageProps {
  active: boolean;
  starCount: number;
  gamesCompleted: number;
  did: string;
  avatar: string;
  userName: string;
  darkMode: boolean;
  reduceMotion: boolean;
  soundEffects: boolean;
  caregiverPanelVisible: boolean;
  loveBalance: LoveBalance | null;
  sbts: SBT[];
  onToggleSetting: (setting: 'darkMode' | 'reduceMotion' | 'soundEffects') => void;
  onCaregiverOpen: () => void;
  onCaregiverExtend: () => void;
  onChangePin: () => void;
  onResetData: () => void;
  onCloseCaregiverPanel: () => void;
  onUpdateProfile: (updates: { name?: string; avatar?: string }) => void;
  onRefreshLoveBalance: () => void;
}

export default function ProfilePage({
  active,
  starCount,
  gamesCompleted,
  did,
  avatar,
  userName,
  darkMode,
  reduceMotion,
  soundEffects,
  caregiverPanelVisible,
  loveBalance,
  sbts,
  onToggleSetting,
  onCaregiverOpen,
  onCaregiverExtend,
  onChangePin,
  onResetData,
  onCloseCaregiverPanel,
  onUpdateProfile,
  onRefreshLoveBalance,
}: ProfilePageProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(userName);
  const [editAvatar, setEditAvatar] = useState(avatar);

  const level = Math.floor(starCount / 14) + 1;

  const handleSave = () => {
    onUpdateProfile({ name: editName, avatar: editAvatar });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditName(userName);
    setEditAvatar(avatar);
    setIsEditing(false);
  };

  return (
    <section className={`page${active ? ' active' : ''}`} id="page-profile" role="tabpanel">
      <h2>👤 My Space</h2>
      <p className="subtitle">You're in control here</p>

      <div style={{ textAlign: 'center', marginBottom: 'var(--p31-space-lg)' }}>
        <div
          style={{
            width: 'var(--p31-scale-3xl)',
            height: 'var(--p31-scale-3xl)',
            borderRadius: '50%',
            background: 'var(--p31-accent)',
            margin: '0 auto var(--p31-space-md)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 'var(--p31-scale-3xl)',
            boxShadow: '0 4px 16px rgba(200,120,60,0.2)',
          }}
        >
          {isEditing ? (
            <input
              type="text"
              value={editAvatar}
              onChange={(e) => setEditAvatar(e.target.value)}
              style={{
                width: '60%',
                textAlign: 'center',
                fontSize: 'var(--p31-scale-3xl)',
                background: 'rgba(255,255,255,0.5)',
                border: '2px solid var(--p31-glass-border)',
                borderRadius: 'var(--p31-radius-md)',
              }}
              maxLength={2}
            />
          ) : (
            avatar
          )}
        </div>

        {isEditing ? (
          <input
            type="text"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            style={{
              fontSize: 'var(--p31-type-h2)',
              fontWeight: 700,
              fontFamily: 'var(--p31-font-display)',
              textAlign: 'center',
              background: 'rgba(255,255,255,0.5)',
              border: '2px solid var(--p31-glass-border)',
              borderRadius: 'var(--p31-radius-md)',
              padding: 'var(--p31-space-xs) var(--p31-space-md)',
            }}
          />
        ) : (
          <div style={{ fontSize: 'var(--p31-type-h2)', fontWeight: 700, fontFamily: 'var(--p31-font-display)' }}>
            {userName && userName !== 'Willow' && userName !== 'Guest' ? userName : 'Set up your profile'}
          </div>
        )}

        <div style={{ fontSize: 'var(--p31-type-body)', color: 'var(--p31-text-secondary)' }}>
          {starCount} stars • Level {level}
        </div>

        {isEditing ? (
          <div style={{ marginTop: 'var(--p31-space-sm)', display: 'flex', gap: 'var(--p31-space-sm)', justifyContent: 'center' }}>
            <button className="button" style={{ minHeight: '44px' }} onClick={handleSave}>Save</button>
            <button className="button secondary" style={{ minHeight: '44px' }} onClick={handleCancel}>Cancel</button>
          </div>
        ) : (
          <button className="button secondary" style={{ marginTop: 'var(--p31-space-sm)', minHeight: '44px' }} onClick={() => setIsEditing(true)}>
            ✏️ Edit Profile
          </button>
        )}
      </div>

      {/* DID hidden pending real identity setup */}
      {false && did && (
        <div className="companion-card" style={{ marginBottom: 'var(--p31-space-md)' }}>
          <h3 style={{ fontFamily: 'var(--p31-font-display)', fontSize: 'var(--p31-type-h3)', marginBottom: 'var(--p31-space-sm)' }}>🔑 Your DID</h3>
          <div className="profile-field" style={{ fontSize: 'var(--p31-type-caption)', wordBreak: 'break-all' }}>{did}</div>
        </div>
      )}

      <div style={{ marginBottom: 'var(--p31-space-md)' }}>
        <PassportIdentitySection />
      </div>

      {loveBalance && (
        <div className="companion-card" style={{ marginBottom: 'var(--p31-space-md)' }}>
          <h3 style={{ fontFamily: 'var(--p31-font-display)', fontSize: 'var(--p31-type-h3)', marginBottom: 'var(--p31-space-sm)' }}>💎 LOVE Balance</h3>
          <div style={{ display: 'flex', justifyContent: 'space-around', textAlign: 'center' }}>
            <div>
              <div style={{ fontSize: 'var(--p31-type-h2)', fontWeight: 700, color: 'var(--p31-accent)' }}>
                {loveBalance.availableBalance.toFixed(1)}
              </div>
              <div style={{ fontSize: 'var(--p31-type-caption)', color: 'var(--p31-text-secondary)' }}>Available</div>
            </div>
            <div>
              <div style={{ fontSize: 'var(--p31-type-h2)', fontWeight: 700, color: 'var(--p31-text-secondary)' }}>
                {loveBalance.sovereigntyPool.toFixed(1)}
              </div>
              <div style={{ fontSize: 'var(--p31-type-caption)', color: 'var(--p31-text-secondary)' }}>Reserve</div>
            </div>
            <div>
              <div style={{ fontSize: 'var(--p31-type-h2)', fontWeight: 700, color: 'var(--p31-accent-green)' }}>
                {(loveBalance.careScore * 100).toFixed(0)}%
              </div>
              <div style={{ fontSize: 'var(--p31-type-caption)', color: 'var(--p31-text-secondary)' }}>Care Score</div>
            </div>
          </div>
          <button className="button secondary" style={{ width: '100%', marginTop: 'var(--p31-space-sm)' }} onClick={onRefreshLoveBalance}>
            🔄 Refresh Balance
          </button>
        </div>
      )}

      {sbts.length > 0 && (
        <div className="companion-card" style={{ marginBottom: 'var(--p31-space-md)' }}>
          <h3 style={{ fontFamily: 'var(--p31-font-display)', fontSize: 'var(--p31-type-h3)', marginBottom: 'var(--p31-space-sm)' }}>🏆 SBT Badges</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--p31-space-sm)' }}>
            {sbts.map((sbt) => (
              <div
                key={sbt.id}
                style={{
                  background: 'var(--p31-glass-bg)',
                  border: `1px solid ${sbt.onChainTokenId ? 'var(--p31-accent-green)' : 'var(--p31-glass-border)'}`,
                  borderRadius: 'var(--p31-radius-md)',
                  padding: 'var(--p31-space-xs) var(--p31-space-sm)',
                  fontSize: 'var(--p31-type-caption)',
                }}
              >
                <div>{typeof sbt.metadata.name === 'string' ? sbt.metadata.name : 'SBT'}</div>
                <div style={{ fontSize: '10px', opacity: 0.7 }}>
                  {sbt.onChainTokenId ? (
                    <span style={{ color: 'var(--p31-accent-green)' }}>
                      ✅ #{sbt.onChainTokenId}
                    </span>
                  ) : (
                    <span style={{ color: 'var(--p31-accent-gold)' }}>⏳ Local only</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <MeshStatus />

      <div className="companion-card" style={{ marginBottom: 'var(--p31-space-md)' }}>
        <h3 style={{ fontFamily: 'var(--p31-font-display)', fontSize: 'var(--p31-type-h3)', marginBottom: 'var(--p31-space-sm)' }}>⚙️ Settings</h3>
        <SettingsToggle label="Reduce Motion" desc="Gentler animations" active={reduceMotion} onToggle={() => onToggleSetting('reduceMotion')} />
        <SettingsToggle label="Sound Effects" desc="Playful sounds" active={soundEffects} onToggle={() => onToggleSetting('soundEffects')} />
        <SettingsToggle label="Dark Mode" desc="Easier on the eyes" active={darkMode} onToggle={() => onToggleSetting('darkMode')} />
        <div className="setting-row">
          <div>
            <div className="setting-label">🔒 Caregiver Settings</div>
            <div className="setting-desc">Parent PIN required</div>
          </div>
          <button
            className="button secondary"
            style={{ fontSize: 'var(--p31-type-caption)', padding: 'var(--p31-space-xs) var(--p31-space-md)', minHeight: '44px', minWidth: 'auto' }}
            onClick={onCaregiverOpen}
          >
            Open
          </button>
        </div>
      </div>

      {caregiverPanelVisible && (
        <div id="caregiver-panel" className="visible">
          <div className="companion-card" style={{ marginBottom: 'var(--p31-space-md)', borderColor: 'var(--p31-accent)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--p31-space-sm)' }}>
              <h3 style={{ fontFamily: 'var(--p31-font-display)', fontSize: 'var(--p31-type-h3)', margin: 0 }}>🔐 Caregiver Controls</h3>
              <button className="button secondary" style={{ fontSize: 'var(--p31-type-caption)', padding: 'var(--p31-space-xs) var(--p31-space-md)', minHeight: '44px', minWidth: 'auto' }} onClick={onCloseCaregiverPanel}>
                Close
              </button>
            </div>
            <div className="setting-row">
              <div>
                <div className="setting-label">⏱️ Extend Session</div>
                <div className="setting-desc">Add 30 more minutes</div>
              </div>
              <button className="button green" style={{ fontSize: 'var(--p31-type-caption)', padding: 'var(--p31-space-xs) var(--p31-space-md)', minHeight: '44px', minWidth: 'auto' }} onClick={onCaregiverExtend}>
                Extend
              </button>
            </div>
            <div className="setting-row" style={{ borderBottom: 'none' }}>
              <div>
                <div className="setting-label">🔄 Change PIN</div>
                <div className="setting-desc">Set a new caregiver PIN</div>
              </div>
              <button className="button secondary" style={{ fontSize: 'var(--p31-type-caption)', padding: 'var(--p31-space-xs) var(--p31-space-md)', minHeight: '44px', minWidth: 'auto' }} onClick={onChangePin}>
                Change
              </button>
            </div>
          </div>
        </div>
      )}

      <button className="button secondary" style={{ width: '100%' }} onClick={onResetData}>
        🔄 Reset Local Data
      </button>
    </section>
  );
}
