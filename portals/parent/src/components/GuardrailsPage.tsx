import { useState, useTransition } from 'react';
import { useMeshTetraNodes } from '../hooks/useMeshTetraNodes';

const DEFAULT_POLICY = `{
  "system_id": "phos-system-01",
  "rest_protocol": {
    "auto_lock_spoons_zero": true,
    "quiet_hours": "21:00-07:00",
    "ambient_lights_fade": true
  },
  "guardrails": {
    "child_portal": {
      "ai_autonomy_level": "guided",
      "max_daily_screentime_mins": 90,
      "content_filter": "strict"
    },
    "teen_portal": {
      "ai_autonomy_level": "copilot",
      "max_daily_screentime_mins": 180,
      "allow_custom_js": true,
      "audio_synth_limit_db": 85
    }
  },
  "nodes": [
    { "id": "living_room_hub", "type": "ambient_audio", "status": "online" },
    { "id": "local_llm_gpu", "type": "compute", "status": "active" }
  ]
}`;

interface GuardrailsPageProps {
  active: boolean;
  spoons: number;
  childSpoons: number;
  teenSpoons: number;
  onSetChildSpoons: (n: number) => void;
  onSetTeenSpoons: (n: number) => void;
}

export default function GuardrailsPage({ active, spoons, childSpoons, teenSpoons, onSetChildSpoons, onSetTeenSpoons }: GuardrailsPageProps) {
  const { peers } = useMeshTetraNodes();
  const [policyJson, setPolicyJson] = useState(DEFAULT_POLICY);
  const [isValid, setIsValid] = useState(true);

  const handlePolicyChange = (text: string) => {
    setPolicyJson(text);
    try { JSON.parse(text); setIsValid(true); } catch { setIsValid(false); }
  };

  return (
    <div className={active ? 'page active' : 'page'} id="page-guardrails">
      <div className="app-grid">
        {/* Left — Quick Spoon Controls */}
        <div className="panel">
          <div className="panel-header">
            <span>⚡ QUICK SPOON CONTROLS</span>
          </div>
          <div className="panel-body">
            {peers.filter(p => p.role !== 'ghost').length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px', color: 'var(--p31-text-secondary)', fontSize: 'var(--p31-scale-xs)' }}>
                No active members. Connect a device to manage settings.
              </div>
            ) : (
              peers.filter(p => p.role !== 'ghost').map((peer) => (
                <div key={peer.did} className="member-card">
                  <div className="member-card-header">
                    <span className={`member-name ${peer.role === 'child' ? 'child' : peer.role === 'teen' ? 'teen' : ''}`}>
                      {peer.name || peer.did.slice(0, 8)}
                    </span>
                    <span className="member-status online">● Active</span>
                  </div>
                  <div className="spoon-admin-row">
                    <span className="spoon-admin-label">Spoons: {peer.spoons}/5</span>
                    <div className="spoon-admin-pills">
                      {[1,2,3,4,5].map((s) => (
                        <div key={s} className={`spoon-admin-pill${s <= peer.spoons ? ` active ${peer.role === 'child' ? 'child' : peer.role === 'teen' ? 'teen' : 'self'}` : ''}`} />
                      ))}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Center — Policies & Settings */}
        <div className="panel">
          <div className="panel-header">
            <span>🛡️ POLICIES & LIMITS</span>
          </div>
          <div className="panel-body">
            <div className="setting-group">
              <div className="setting-row">
                <span>Child — Max Screen Time</span>
                <span className="setting-val">90 mins</span>
              </div>
              <input type="range" className="range-slider" min="30" max="180" defaultValue="90" />
            </div>

            <div className="setting-group">
              <div className="setting-row">
                <span>Teen — Audio Synth Limit</span>
                <span className="setting-val">85 dB</span>
              </div>
              <input type="range" className="range-slider" min="60" max="100" defaultValue="85" />
            </div>

            <div className="setting-group">
              <div style={{ fontSize: 'var(--p31-scale-sm)', fontWeight: 600, marginBottom: '8px' }}>AI Autonomy Level (Child)</div>
              <div style={{ display: 'flex', gap: '8px' }}>
                {['Guided Only', 'Co-Creator', 'Unrestricted'].map((opt) => (
                  <button key={opt} className={`btn-autonomy${opt === 'Guided Only' ? ' active' : ''}`}>{opt}</button>
                ))}
              </div>
            </div>

            <div className="setting-group">
              <div style={{ fontSize: 'var(--p31-scale-sm)', fontWeight: 600, marginBottom: '8px' }}>AI Autonomy Level (Teen)</div>
              <div style={{ display: 'flex', gap: '8px' }}>
                {['Guided Only', 'Copilot', 'Unrestricted'].map((opt) => (
                  <button key={opt} className={`btn-autonomy${opt === 'Copilot' ? ' active' : ''}`}>{opt}</button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right — Policy Editor */}
        <div className="panel">
          <div className="panel-header">
            <span>⚙️ POLICY JSON EDITOR</span>
            <span style={{ color: isValid ? 'var(--p31-accent-green)' : 'var(--p31-accent-red)' }}>
              {isValid ? '✓ Valid' : '✕ Error'}
            </span>
          </div>
          <textarea
            className="policy-editor"
            value={policyJson}
            onChange={(e) => handlePolicyChange(e.target.value)}
            spellCheck={false}
          />
        </div>
      </div>
    </div>
  );
}
