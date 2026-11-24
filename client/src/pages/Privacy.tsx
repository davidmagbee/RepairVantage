import { Link } from 'react-router-dom';

/** Public notice states implemented data flows and the owner-approved contact without inventing retention promises. */
export default function Privacy() {
  return (
    <main className="mx-auto max-w-3xl space-y-6 px-6 py-12 leading-relaxed">
      <Link to="/" className="link">RepairVantage</Link>
      <h1 className="text-3xl font-bold">Privacy and data requests</h1>
      <p>Updated November 24, 2026. RepairVantage is an independently operated repair-project side project, currently intended for the United States market. Accounts are for people aged 18 or older.</p>
      <section className="space-y-2" aria-labelledby="privacy-information"><h2 id="privacy-information" className="text-xl font-bold">Information we use</h2>
        <p>We store your email, account name and optional profile image; sign-in, session and linked-account information; and the project content you provide, including tasks, inventory, schedules, expenses and comments. Sessions can include an IP address and browser information.</p>
        <p>We record the eligibility statement you acknowledge, its version and the time. An under-age declaration made while signed in can restrict the account pending review. We do not retain the exact age entered in the eligibility form or collect a birth date through that form. These declarations do not verify your age.</p>
      </section>
      <section className="space-y-2" aria-labelledby="privacy-purposes"><h2 id="privacy-purposes" className="text-xl font-bold">How information is used</h2>
        <p>Information supports your repair workspace, collaboration, project reports and summary calculations, sign-in delivery, access controls and service security. Session and eligibility cookies support sign-in and account access. We do not sell project data or use it for advertising.</p>
      </section>
      <section className="space-y-2" aria-labelledby="privacy-sharing"><h2 id="privacy-sharing" className="text-xl font-bold">Providers and sharing</h2>
        <p>Vercel hosts the service, Neon hosts the database, and Resend delivers requested sign-in codes. Google processes Google sign-in when you choose that method. These providers process information needed to supply their services.</p>
        <p>Projects are private by default. Inviting people gives them permitted access to project information. Publishing a Showcase makes its selected public title, summary and status accessible to anyone with its link. You can revoke sharing and unpublish a Showcase.</p>
      </section>
      <section className="space-y-2" aria-labelledby="privacy-deletion"><h2 id="privacy-deletion" className="text-xl font-bold">Retention and deletion requests</h2>
        <p>Project and account records remain stored while the service maintains them. Available project controls let owners delete projects. For account-data deletion or other privacy requests, email the contact below. We may need to verify account ownership and clarify which information you want removed before processing a request.</p>
        <p>Deleting active records does not promise immediate erasure from provider backups or security records. We will explain applicable retention limits when handling your request. Do not email passwords or one-time sign-in codes.</p>
      </section>
      <section className="space-y-2" aria-labelledby="privacy-contact"><h2 id="privacy-contact" className="text-xl font-bold">Contact RepairVantage</h2>
        <p>Send privacy, deletion or under-age account reports to <a className="link break-all" href="mailto:repairvantageadmin@gmail.com">repairvantageadmin@gmail.com</a>.</p>
      </section>
    </main>
  );
}
