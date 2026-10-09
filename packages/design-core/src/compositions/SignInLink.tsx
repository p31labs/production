export interface SignInLinkProps {
  /** The auth route. */
  to: string;
  /** Portal auth context — the shell stays auth-agnostic. */
  label?: string;
  className?: string;
}

/**
 * SignInLink — the unauthenticated identity fill: a button that routes to the
 * portal's auth surface. The shell does not know about auth — the portal
 * supplies the route and decides the transition. The signed-in counterpart is
 * the AccountMenu (spec'd, not shipped — no portal produces that state yet).
 */
export function SignInLink({ to, label = 'Sign in', className = '' }: SignInLinkProps) {
  return (
    <a href={to} className={`sign-in-link ${className}`.trim()}>
      {label}
    </a>
  );
}

export default SignInLink;