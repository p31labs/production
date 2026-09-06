import { useState, useTransition } from 'react';

const DEFAULT_POLICY = `{
  "system_id": "willow-sovereign-home-01",
  "rest_protocol": {
    "auto_lock_spoons_zero": true,
    "quiet_hours": "21:00-07:00"
  },
  "guardrails": {
    "child_portal": { "max_screentime_mins": 90 },
    "teen_portal": { "audio_synth_limit_db": 85 }
  }
}`;

export default function AdminPortal({ childSpoons, setChildSpoons, teenSpoons, setTeenSpoons }) {
  const [activeTab, setActiveTab] = useState('overview');
  const [policyJson, setPolicyJson] = useState(DEFAULT_POLICY);
  const [isConfigValid, setIsConfigValid] = useState(true);

  const handlePolicyChange = (text) => {
    setPolicyJson(text);
    try {
      JSON.parse(text);
      setIsConfigValid(true);
    } catch {
      setIsConfigValid(false);
    }
  };

  return (
    <div className="admin-container">
      <div className="admin-header">
        <div className="admin-header-left">
          <span className="admin-brand">WILLOW SOVEREIGN</span>
          <span className="admin-badge">PARENT ADMIN EDE</span>
        </div>

        <div className="admin-tabs">
          {[
            { key: 'overview', label: 'OVERVIEW' },
            { key: 'guardrails', label: 'GUARDRAILS' },
            { key: 'config', label: 'CONFIG' },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`admin-tab ${activeTab === t.key ? 'active' : ''}`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="admin-grid">
        <div className="admin-panel">
          <div className="admin-panel-header">👨‍👩‍👧‍👦 FAMILY SPOON TELEMETRY</div>

          <div className="member-cards">
            <div className="member-card">
              <div className="member-card-header">
                <span className="member-name child-name">Leo (Child)</span>
                <span className="member-status online">● Active</span>
              </div>
              <div className="member-app">App: Block Builder EDE</div>
              <div className="spoon-admin-row">
                <span className="spoon-admin-label">Spoons: {childSpoons}/5</span>
                <div className="spoon-admin-pills">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <div
                      key={s}
                      onClick={() => setChildSpoons(s)}
                      className={`spoon-admin-pill ${s <= childSpoons ? 'active child' : ''}`}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="member-card">
              <div className="member-card-header">
                <span className="member-name teen-name">Maya (Teen)</span>
                <span className="member-status online">● In Flow</span>
              </div>
              <div className="member-app">App: Particle Canvas & Synth</div>
              <div className="spoon-admin-row">
                <span className="spoon-admin-label">Spoons: {teenSpoons}/5</span>
                <div className="spoon-admin-pills">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <div
                      key={s}
                      onClick={() => setTeenSpoons(s)}
                      className={`spoon-admin-pill ${s <= teenSpoons ? 'active teen' : ''}`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="admin-panel">
          <div className="admin-panel-header">⚙️ GOVERNANCE & POLICY SYSTEM</div>

          {activeTab === 'config' ? (
            <textarea
              value={policyJson}
              onChange={(e) => handlePolicyChange(e.target.value)}
              className="policy-editor"
              spellCheck="false"
            />
          ) : (
            <div className="admin-dashboard">
              <div className="admin-status-card">
                <h4 className="status-title">🛡️ Guardrail Status</h4>
                <p className="status-text">
                  Child and Teen environments are running inside local sovereign sandbox instances
                  with hardware-enforced energy pacing.
                </p>
              </div>

              <div className="admin-stats-row">
                <div className="admin-stat">
                  <div className="stat-label">System Uptime</div>
                  <div className="stat-value green">99.9%</div>
                </div>
                <div className="admin-stat">
                  <div className="stat-label">Local Compute</div>
                  <div className="stat-value cyan">12% GPU</div>
                </div>
              </div>

              {activeTab === 'guardrails' && (
                <div className="guardrails">
                  <div className="setting-group">
                    <div className="setting-row">
                      <span>Leo (Child Portal) — Max Screen Time</span>
                      <span className="setting-val">90 mins</span>
                    </div>
                    <input type="range" className="range-slider" min="30" max="180" defaultValue="90" />
                  </div>

                  <div className="setting-group">
                    <div className="setting-row">
                      <span>Maya (Teen Portal) — Audio Synth Limit</span>
                      <span className="setting-val">85 dB</span>
                    </div>
                    <input type="range" className="range-slider" min="60" max="100" defaultValue="85" />
                  </div>

                  <div className="setting-group">
                    <div className="setting-title">AI Autonomy Level (Child)</div>
                    <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                      <button className="btn-autonomy active">Guided Only</button>
                      <button className="btn-autonomy">Co-Creator</button>
                      <button className="btn-autonomy">Unrestricted</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="admin-panel">
          <div className="admin-panel-header">🤖 WILLOW ADMIN AI COPILOT</div>

          <div className="copilot-chat">
            <div className="copilot-bubble ai">
              Willow Sovereign Admin online. Both child and teen portals are pacing within normal
              sensory parameters.
            </div>
            <div className="copilot-bubble ai">
              Leo has {childSpoons}/5 spoons remaining. Maya has {teenSpoons}/5. 
              {childSpoons <= 1 || teenSpoons <= 1
                ? ' Consider activating Quiet Mode for low-energy members.'
                : ' Energy levels are optimal.'}
            </div>
          </div>

          <div className="copilot-input-bar">
            <input
              type="text"
              className="copilot-input"
              placeholder="Ask Co-Pilot or type command..."
            />
            <button className="copilot-send">Send</button>
          </div>
        </div>
      </div>
    </div>
  );
}
