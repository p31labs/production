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
              <h2 id="tourTitle">🌿 Welcome to Willow</h2>
              <p>I'm your creative companion for block coding and play!</p>
              <p>Use the tabs at the bottom: <strong>Home</strong> for your daily mood, <strong>Create</strong> for the block builder, <strong>Talk</strong> to chat with me, and <strong>Profile</strong> for your settings.</p>
            </div>
          )}
          {step === 2 && (
            <div className="tour-step" data-step="2">
              <h2>🧩 Block Creator</h2>
              <p>Drag code blocks into your program, then click <strong>Run Code</strong> to bring your creation to life!</p>
              <p>Try the <strong>Magic Recipe</strong> button for a quick start. Your star character dances to your code!</p>
            </div>
          )}
          {step === 3 && (
            <div className="tour-step" data-step="3">
              <h2>✨ Spoony Energy</h2>
              <p>The <strong>sparkle dial</strong> in the top bar lets you set your energy level.</p>
              <p>Choose 1–5 to match how you're feeling. Use 🧘 for quiet time when you need a calm space.</p>
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
