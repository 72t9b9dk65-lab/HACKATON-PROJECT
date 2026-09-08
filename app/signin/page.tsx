import { pageAccess } from '@/lib/platform/page-access';
import { enabledProviders } from '@/lib/platform/auth';
export const dynamic = 'force-dynamic';
export default async function SignIn() {
  const access = await pageAccess(),
    providers = enabledProviders();
  return (
    <main className="care-platform cp-auth-page">
      <section className="cp-auth-card">
        <img
          src="/shelters/pixel-shelter.png"
          alt="Hundstallet"
          width="80"
          height="80"
        />
        <h1>
          {access.site === 'staff' ? 'Care workspace' : 'Your little shelter'}
        </h1>
        <p>
          {access.site === 'staff'
            ? 'Sign in with an authorized employee account.'
            : 'Sign in to keep your companions and follow your donations.'}
        </p>
        <div className="cp-auth-providers">
          {(['google', 'apple'] as const).map((provider) =>
            providers[provider] ? (
              <a
                className="cp-button"
                key={provider}
                href={`/api/auth/${provider}/start`}
              >
                Continue with {provider === 'google' ? 'Google' : 'Apple'}
              </a>
            ) : (
              <button className="cp-button" key={provider} disabled>
                Continue with {provider === 'google' ? 'Google' : 'Apple'}
              </button>
            ),
          )}
        </div>
        {!providers.google && !providers.apple && (
          <p className="cp-fine-print">
            Google and Apple sign-in will be available when the organization
            connects its accounts.
          </p>
        )}
        {access.demo && (
          <form action="/api/auth/demo" method="post" className="cp-auth-demo">
            <h2>
              {access.site === 'staff'
                ? 'Open the staff workspace'
                : 'Create your donor account'}
            </h2>
            <p>Access your shelter workspace with a local account.</p>
            {access.site === 'donor' && (
              <>
                <label className="cp-field">
                  Name
                  <input name="name" required maxLength={60} />
                </label>
                <label className="cp-field">
                  Email
                  <input name="email" type="email" required maxLength={200} />
                </label>
              </>
            )}
            <button className="cp-button" type="submit">
              {access.site === 'staff'
                ? 'Open staff workspace'
                : 'Create donor account'}
            </button>
          </form>
        )}
      </section>
    </main>
  );
}
