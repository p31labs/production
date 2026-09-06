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
              <h2 id="tourTitle">🔗 Welcome to BONDING</h2>
              <p>You're an atom in a social molecule. Every person you bond with adds to your chemistry.</p>
              <p>Use the tabs: <strong>Map</strong> to explore nearby atoms, <strong>Talk</strong> to chat, and <strong>Profile</strong> to track your bonds and stats.</p>
            </div>
          )}
          {step === 2 && (
            <div className="tour-step" data-step="2">
              <h2>🗺️ Zone Map & Check-In</h2>
              <p>The map shows different zones — Calm, Lab, Kitchen, Deep, Wild — each with nearby atoms.</p>
              <p>Tap the <strong>Check In</strong> button to broadcast your presence. Ping other atoms to connect.</p>
            </div>
          )}
          {step === 3 && (
            <div className="tour-step" data-step="3">
              <h2>🧬 Profile & Stats</h2>
              <p>Your profile tracks your bonds, recent activities, and atom stats.</p>
              <p>Edit your profile anytime. Your spoon dial in the top bar controls your energy visibility to the mesh.</p>
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
            <button className="button secondary" onClick={prev} style={{ display: step > 1 ? 'inline-flex' : 'none' }}>Back</button>
            <button className="button" onClick={next}>{step < 3 ? 'Next' : 'Done'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
