import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — Smart Energy Load Calculator",
};

const EFFECTIVE_DATE = "August 30, 2026";
const CONTACT_EMAIL = "kmoinjamal786@gmail.com";

export default function PrivacyPolicyPage() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-16 text-sm leading-relaxed text-black/80 dark:text-white/80">
      <h1 className="mb-1 text-2xl font-semibold text-black dark:text-white">Privacy Policy</h1>
      <p className="mb-8 text-black/50 dark:text-white/50">Effective {EFFECTIVE_DATE}</p>

      <p className="mb-6">
        Smart Energy Load Calculator (&ldquo;the app&rdquo;, &ldquo;we&rdquo;) is a home/property energy-management
        tool: appliance inventory, load/peak/bill calculators, and inverter/battery/solar/generator sizing. This
        policy explains what data the app collects, why, and how it&apos;s handled.
      </p>

      <Section title="1. Information we collect">
        <p className="mb-2">
          <strong>Account information.</strong> Name, email address, and an optional phone number, provided when
          you register. Your password is never stored in plain text — it&apos;s hashed with bcrypt before being
          saved.
        </p>
        <p className="mb-2">
          <strong>Property and appliance data you enter.</strong> Project/property names, locations (if you provide
          one), appliance inventories, calculated loads, tariffs, bills, and system-sizing results — this is the
          core data the app exists to store on your behalf.
        </p>
        <p className="mb-2">
          <strong>Company branding (optional).</strong> If you use the installer/quotation features, a company
          name, brand color, and logo you upload are stored against your account to appear on generated quotation
          PDFs.
        </p>
        <p>
          <strong>Technical/security data.</strong> IP address and browser user-agent are recorded on login
          sessions and in audit logs (e.g. login, project creation, calculation runs) for account security and
          abuse prevention. We do not use analytics or advertising trackers.
        </p>
      </Section>

      <Section title="2. How we use your information">
        <ul className="list-disc space-y-1 pl-5">
          <li>To operate your account and the features you use (calculations, sizing, reports, sharing).</li>
          <li>To generate PDF reports and quotations you request.</li>
          <li>To secure your account (session management, suspicious-activity detection).</li>
          <li>To send account-related notifications you trigger within the app (e.g. &ldquo;your report is ready&rdquo;).</li>
        </ul>
        <p className="mt-2">We do not sell your data, and we do not use it for advertising.</p>
      </Section>

      <Section title="3. Third-party services">
        <p className="mb-2">Your data is processed by the infrastructure providers hosting the app:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Railway (API server, database, background jobs)</li>
          <li>Vercel (web app hosting)</li>
          <li>Cloudflare R2 (storage for generated PDF reports)</li>
        </ul>
        <p className="mt-2">
          For solar-sizing estimates, your project&apos;s general location (latitude/longitude only — never your
          name or account details) may be sent to Open-Meteo and NREL PVWatts, both public
          weather/solar-data APIs, to improve accuracy. No other third-party sharing occurs.
        </p>
      </Section>

      <Section title="4. Data retention & deletion">
        <p>
          Your data is retained while your account is active. You can delete your account at any time from the
          app; this deactivates the account and its authentication. To request full erasure of your data, contact
          us at the email below.
        </p>
      </Section>

      <Section title="5. Children's privacy">
        <p>This app is not directed at children under 13, and we do not knowingly collect their data.</p>
      </Section>

      <Section title="6. Changes to this policy">
        <p>
          If this policy changes materially, the effective date above will be updated. Continued use of the app
          after a change constitutes acceptance of the revised policy.
        </p>
      </Section>

      <Section title="7. Contact">
        <p>
          Questions about this policy or your data: <a className="text-brand-600 underline" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
        </p>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-6">
      <h2 className="mb-2 text-base font-semibold text-black dark:text-white">{title}</h2>
      {children}
    </section>
  );
}
