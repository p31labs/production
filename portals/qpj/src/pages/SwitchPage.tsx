import { useQpjStore } from '../store/useQpjStore';
import { PASSENGERS, PASSENGER_IDS, ROLE_DEFAULT_MODE } from '../lib/passports';
import { navigateTo } from '../lib/routes';

export function SwitchPage() {
  const passportId = useQpjStore((s) => s.passportId);
  const setPassport = useQpjStore((s) => s.setPassport);
  const showToast = useQpjStore((s) => s.showToast);

  const switchTo = (id: string) => {
    setPassport(id);
    showToast(`${PASSENGERS[id].pickledName} picked up the jar`, 'success');
    navigateTo('street');
  };

  return (
    <main className="page switch" id="switch">
      <h1 className="switch__title">Who’s using the jar?</h1>
      <p className="switch__sub">Tap a passport. The lane and lamps follow you to your own mode.</p>

      <div className="switch__grid">
        {PASSENGER_IDS.map((id) => {
          const person = PASSENGERS[id];
          const isActive = passportId === id;
          return (
            <button
              key={id}
              type="button"
              className={`switch-card${isActive ? ' switch-card--active' : ''}`}
              onClick={() => switchTo(id)}
              aria-pressed={isActive}
            >
              <span className="switch-card__avatar" aria-hidden="true">{person.emoji}</span>
              <span className="switch-card__name">{person.pickledName}</span>
              <span className="switch-card__role">{person.role}</span>
              <span className="switch-card__mode">
                opens in <strong>{ROLE_DEFAULT_MODE[person.role]}</strong>
              </span>
            </button>
          );
        })}
      </div>

      <p className="switch__hint">
        Caregivers hold the PIN custodian role — their passport starts in <strong>workshop</strong> and can
        raise any session.
      </p>
    </main>
  );
}