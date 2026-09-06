import { useState, useEffect } from 'react';

interface TourOverlayProps {
  onClose: () => void;
}

export default function TourOverlay({ onClose }: TourOverlayProps) {
  const [step, setStep] = useState(1);

  useEffect(() => {
    localStorage.setItem('p31:tourComplete', 'false');
  }, []);

  const next = () => {
    if (step < 3) {
      setStep(step + 1);
    } else {
      onClose();
    }
  };

  const prev = () => {
    if (step > 1) setStep(step - 1);
  };

  return (
    <div id="tourOverlay" className="modal-overlay active" role="dialog" aria-modal="true" aria-labelledby="tourTitle">
      <div className="tour-card">
        <button className="tour-close" onClick={onClose} aria-label="Close tour">✕</button>
        <div className="tour-content">
          {step === 1 && (
            <div className="tour-step" data-step="1">
              <h2 id="tourTitle">Welcome to BASH Portal</h2>
              <p>Your creative coding and synth workspace.</p>
              <p>Use the tabs at the bottom to navigate: <strong>Home</strong> for your overview, <strong>Code</strong> for the editor and canvas, <strong>Talk</strong> for chat, and <strong>Profile</strong> for your identity and settings.</p>
            </div>
          )}
          {step === 2 && (
            <div className="tour-step" data-step="2" style={{ display: 'block' }}>
              <h2>Your LOVE Balance</h2>
              <p>LOVE is the ecosystem currency — earned through contribution, bonding, and creative work.</p>
              <p>Your balance is displayed at the top bar. Earn more by building molecules in BONDING and creating in the Code workspace.</p>
            </div>
          )}
          {step === 3 && (
            <div className="tour-step" data-step="3" style={{ display: 'block' }}>
              <h2>Spoon Dial</h2>
              <p>The <strong>Spoon Dial</strong> in the top bar lets you control your cognitive load.</p>
              <p>Use 🧘 for quiet mode — a breathing space when you need to step back.</p>
            </div>
          )}
        </div>
        <div className="tour-footer">
          <div className="tour-dots" id="tourDots">
            <span className={`tour-dot${step === 1 ? ' active' : ''}`} data-step="1"></span>
            <span className={`tour-dot${step === 2 ? ' active' : ''}`} data-step="2"></span>
            <span className={`tour-dot${step === 3 ? ' active' : ''}`} data-step="3"></span>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="button secondary" data-action="tour-prev" onClick={prev} style={{ display: step > 1 ? 'inline-flex' : 'none' }}>Back</button>
            <button className="button" data-action="tour-next" onClick={next}>{step < 3 ? 'Next' : 'Done'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
