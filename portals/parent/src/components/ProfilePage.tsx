import PassportIdentitySection from './PassportIdentitySection';

interface ProfilePageProps {
  active: boolean;
}

export default function ProfilePage({ active }: ProfilePageProps) {
  return (
    <section className={`page${active ? ' active' : ''}`} id="page-profile" role="tabpanel">
      <h2>🆔 Profile</h2>
      <p className="subtitle">Your identity</p>
      <PassportIdentitySection />
    </section>
  );
}
