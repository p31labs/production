/**
 * The music maker — NoticeStack.
 *
 * The in-instrument pop-ups: named presence ("Cornichon played the sun") and
 * action confirmations ("you placed a sound"). Token-styled glass cards,
 * bottom-right, aria-live-polite (announced without interrupting). Distinct
 * from the tour card (bottom-center) and the readout (bottom-left).
 */
import type { Notice } from '../hooks/useNotices';

interface NoticeStackProps {
  notices: Notice[];
}

export function NoticeStack({ notices }: NoticeStackProps) {
  if (notices.length === 0) return null;
  return (
    <div className="mm-notices" role="status" aria-live="polite">
      {notices.map((n) => (
        <div key={n.id} className="mm-notice">
          {n.text}
        </div>
      ))}
    </div>
  );
}