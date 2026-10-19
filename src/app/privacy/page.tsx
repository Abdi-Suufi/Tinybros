import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy | Tinywatch',
  description: 'Learn how Tinywatch handles your account and watchlist data.',
};

export default function PrivacyPage() {
  return (
    <article className="mx-auto max-w-3xl px-4 pb-16 pt-28 text-gray-200 sm:px-6">
      <header className="mb-10 border-b border-yellow-500/20 pb-6">
        <h1 className="bg-gradient-to-r from-yellow-300 to-orange-400 bg-clip-text text-3xl font-bold text-transparent sm:text-4xl">
          Privacy Policy
        </h1>
        <p className="mt-3 text-sm text-gray-400">Last updated: 19/10/2026</p>
      </header>

      <div className="space-y-8 leading-7">
        <p>
          Tinywatch lets you browse and keep a watchlist. You don&apos;t need an account to use the site. If you create one, we store a few details so it works across your devices.
        </p>

        <section>
          <h2 className="mb-3 text-xl font-semibold text-yellow-200">What we store</h2>
          <ul className="list-disc space-y-2 pl-6">
            <li>Your email address and a securely hashed password, to run your account.</li>
            <li>The titles on your watchlist, so it syncs between your devices.</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold text-yellow-200">Why</h2>
          <p>
            We use this only to let you sign in, sync your watchlist, and send account emails (confirming your address and resetting your password). We don&apos;t sell your data.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold text-yellow-200">Who handles it for us</h2>
          <ul className="list-disc space-y-2 pl-6">
            <li>Supabase, which stores account and watchlist data.</li>
            <li>Resend, which sends our account emails.</li>
            <li>Vercel, which hosts the website.</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold text-yellow-200">Ads</h2>
          <p>
            Tinywatch shows ads provided by third parties, which may use cookies or similar technologies. 
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold text-yellow-200">How long we keep it</h2>
          <p>Until you ask us to delete your account.</p>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold text-yellow-200">Your rights</h2>
          <p>
            You can ask to see, correct or delete your data at any time by emailing privacy@tinywatch.co.uk
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold text-yellow-200">Contact</h2>
          <p>privacy@tinywatch.co.uk</p>
        </section>
      </div>
    </article>
  );
}