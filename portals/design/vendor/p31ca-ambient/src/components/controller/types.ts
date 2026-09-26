/**
 * @p31/controls — types.ts
 *
 * The shared contract every control primitive implements.
 */

/** The gesture lifecycle. Reported by the control; the PARENT decides what a
 *  gesture means. This is the MIDI-learn seam: `onGestureStart` arms the
 *  learn, `onGestureEnd` disarms it if no CC arrived. The control stays
 *  mechanical — it never knows what a learn is. */
export interface GestureHandlers {
  onGestureStart?: () => void;
  onGestureEnd?: () => void;
}

/** The learn affordance a control renders when its parent has armed it. */
export type LearnState = 'idle' | 'learning' | 'bound' | 'error';

export interface ControlBaseProps extends GestureHandlers {
  /** Accessible name. Required — every control must announce itself. */
  label: string;
  /** Disables interaction; still focusable so the value is announced. */
  disabled?: boolean;
  /** The learn state, rendered as an amber/green/red ring. The parent owns
   *  the state; the control only paints it. */
  learnState?: LearnState;
  /** Optional id for aria-labelledby wiring. */
  id?: string;
  /** Formats the value for aria-valuetext and the readout. */
  formatValue?: (value: number) => string;
  className?: string;
  style?: React.CSSProperties;
}