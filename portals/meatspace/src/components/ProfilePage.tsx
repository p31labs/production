import { ZONE_EMOJI, ZONE_NAME, type Atom, type Bond, type Activity } from '../lib/game';
import BondItem from './BondItem';
import ActivityItem from './ActivityItem';
import PassportIdentitySection from './PassportIdentitySection';

interface ProfilePageProps {
  active: boolean;
  atoms: Atom[];
  bonds: Bond[];
  activities: Activity[];
  onEdit: () => void;
}

export default function ProfilePage({ active, atoms, bonds, activities, onEdit }: ProfilePageProps) {
  const me = atoms[0];
  const valence = (bonds.length / 10).toFixed(1);

  return (
    <section id="page-profile" className={`page ${active ? 'active' : ''}`} role="tabpanel" aria-labelledby="tab-profile">
      <PassportIdentitySection />
      {me ? (
        <>
          <div className="profile-header">
            <div className="profile-avatar" id="profileAvatar">{me.av}</div>
            <div className="profile-name" id="profileName">{me.name}</div>
            <div className="profile-zone" id="profileZone">{ZONE_EMOJI[me.zone]} {ZONE_NAME[me.zone]}</div>
          </div>
          <div className="stat-grid">
            <div className="stat-card">
              <div className="stat-val" id="statBonds">{bonds.length}</div>
              <div className="stat-lbl">Bonds</div>
            </div>
            <div className="stat-card">
              <div className="stat-val" id="statZone">{ZONE_EMOJI[me.zone]}</div>
              <div className="stat-lbl">Zone</div>
            </div>
            <div className="stat-card">
              <div className="stat-val" id="statValence">{valence}</div>
              <div className="stat-lbl">Valence</div>
              <div className="val-bar">
                <div className="val-fill" id="valenceFill" style={{ width: Math.min(100, parseFloat(valence) * 50) + '%' }} />
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-val" id="statActivity">{activities.length}</div>
              <div className="stat-lbl">Check-ins</div>
            </div>
          </div>
        </>
      ) : (
        <div className="profile-header">
          <div className="profile-avatar" id="profileAvatar">?</div>
          <div className="profile-name" id="profileName">No peers yet</div>
          <div className="profile-zone" id="profileZone">Connect to mesh to see peers</div>
        </div>
      )}
      <div className="sec-title">🔗 Bonds</div>
      <div id="bondList">
        {bonds.map((bond) => (
          <BondItem key={bond.id} bond={bond} />
        ))}
      </div>
      <div className="sec-title" style={{ marginTop: 'var(--p31-space-lg)' }}>
        📜 Activity Log
      </div>
      <div id="activityList">
        {activities.slice(0, 8).map((activity) => (
          <ActivityItem key={activity.id} activity={activity} />
        ))}
      </div>
      <button className="btn secondary" style={{ width: '100%', marginTop: 'var(--p31-space-lg)' }} onClick={onEdit}>
        ✏️ Edit Profile
      </button>
    </section>
  );
}
