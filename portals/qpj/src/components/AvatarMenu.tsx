import { PASSENGERS, PASSENGER_IDS, getPassport, type PassportId } from '../lib/passports';
import { navigateTo } from '../lib/routes';
import { useQpjStore } from '../store/useQpjStore';

export interface AvatarMenuProps {
  passportId: PassportId;
  open: boolean;
  onRequestOpen: () => void;
  onClose: () => void;
  onSwitchPersona: () => void;
  onWorkshop: () => void;
  onRestartDay: () => void;
}

export function AvatarMenu({
  passportId,
  open,
  onRequestOpen,
  onClose,
  onSwitchPersona,
  onWorkshop,
  onRestartDay,
}: AvatarMenuProps) {
  const setPassport = useQpjStore((s) => s.setPassport);
  const showToast = useQpjStore((s) => s.showToast);
  const passport = getPassport(passportId);

  const switchTo = (id: PassportId) => {
    setPassport(id);
    showToast(`${PASSENGERS[id].pickledName} picked up the jar`, 'success');
    onClose();
    navigateTo('street');
  };

  return (
    <div className={`avatar-menu${open ? ' avatar-menu--open' : ''}`}>
      <button
        type="button"
        className="avatar-menu__trigger"
        onClick={open ? onClose : onRequestOpen}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Open ${passport.pickledName}'s menu`}
      >
        <span className="avatar-menu__face" aria-hidden="true">
          {passport.emoji}
        </span>
        <span className="avatar-menu__name">{passport.pickledName}</span>
      </button>

      {open && (
        <div className="avatar-menu__popover" role="menu" aria-label={`${passport.pickledName} menu`}>
          <div className="avatar-menu__passengers" role="group" aria-label="Passengers">
            {PASSENGER_IDS.map((id) => {
              const person = getPassport(id);
              const active = id === passportId;
              return (
                <button
                  key={id}
                  type="button"
                  className={`avatar-passenger${active ? ' avatar-passenger--active' : ''}`}
                  onClick={() => switchTo(id)}
                  aria-current={active ? 'page' : undefined}
                  aria-label={`Switch to ${person.pickledName}`}
                  title={person.pickledName}
                >
                  <span className="avatar-passenger__emoji" aria-hidden="true">
                    {person.emoji}
                  </span>
                  <span className="avatar-passenger__name">{person.pickledName}</span>
                </button>
              );
            })}
          </div>
          <button type="button" role="menuitem" onClick={onSwitchPersona}>
            <span aria-hidden="true">🔁</span> Switch persona
          </button>
          <button type="button" role="menuitem" onClick={onWorkshop}>
            <span aria-hidden="true">⚙️</span> Workshop hatch
          </button>
          <button type="button" role="menuitem" onClick={onRestartDay}>
            <span aria-hidden="true">🌅</span> Restart the day
          </button>
          <div className="avatar-menu__readout">
            <span aria-hidden="true">🥒</span>
            <span>pickle salt · jar #7</span>
          </div>
        </div>
      )}
    </div>
  );
}