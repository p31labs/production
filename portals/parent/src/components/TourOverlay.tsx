import { useState, useEffect } from 'react';

interface TourOverlayProps {
  onClose: () => void;
}

export default function TourOverlay({ onClose }: TourOverlayProps) {
  const [step, setStep] = useState(1);

  useEffect(() => {
    if (localStorage.getItem('p31:tourComplete') !== 'true') {
      localStorage.setItem('p31:tourComplete', 'false');
    }
  }, []);

  const next = () => {
    if (step < 3) setStep(step + 1);
    else { localStorage.setItem('p31:tourComplete', 'true'); onClose(); }
  };
  const prev = () => { if (step > 1) setStep(step - 1); };

  return (
    <div id="tourOverlay" className="modal-overlay active" role="dialog" aria-modal="true" aria-labelledby="tourTitle">
      <div className="tour-card">
        <button className="tour-close" onClick={onClose} aria-label="Close tour">✕</button>
        <div className="tour-content">
          {step === 1 && (
            <div className="tour-step" data-step="1">
              <h2 id="tourTitle">🛡️ Welcome to PHOS</h2>
              <p>Monitor family energy and manage policies from one dashboard.</p>
              <p>Use the tabs: <strong>Dashboard</strong> for spoon telemetry, <strong>Policies</strong> for settings, <strong>Sandbox</strong> for the WebMCP IDE, <strong>Talk</strong> for companion chat, and <strong>Profile</strong> for your identity.</p>
            </div>
          )}
          {step === 2 && (
            <div className="tour-step" data-step="2">
              <h2>📊 Dashboard & Spoon Tracking</h2>
              <p>Member cards show real-time spoon levels for each family member.</p>
              <p>Click the pill dots to adjust energy levels. The policy editor lets you set screen time limits and audio restrictions.</p>
            </div>
          )}
          {step === 3 && (
            <div className="tour-step" data-step="3">
              <h2>🧪 Sandbox IDE</h2>
              <p>The Sandbox is a WebMCP playground with a code editor, starfield canvas, and terminal.</p>
              <p>Test burst notifications, adjust voltage states, and run commands. The background responds to every interaction.</p>
            </div>
          )}
        </div>
        <div className="tour-footer">
          <div className="tour-dots">
            <span className={`tour-dot${step === 1 ? ' active' : ''}`} />
            <span className={`tour-dot${step === 2 ? ' active' : ''}`} />
            <span className={`tour-dot${step === 3 ? ' active' : ''}`} />
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn secondary" onClick={prev} style={{ display: step > 1 ? 'inline-flex' : 'none' }}>Back</button>
            <button className="btn" onClick={next}>{step < 3 ? 'Next' : 'Done'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
