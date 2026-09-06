import LegalLayout from '../components/LegalLayout';
import { DOCS_URL, REPO_WEB_URL, LEGAL_UPDATED } from '../utils/constants';

const TOC = [
  { id: 'agreement', label: 'Agreement & scope' },
  { id: 'service', label: 'What Tagzheimer is (and is not)' },
  { id: 'accounts', label: 'Accounts & caregiver duties' },
  { id: 'devices', label: 'Devices & pairing' },
  { id: 'use', label: 'Acceptable use' },
  { id: 'demo', label: 'Demo mode' },
  { id: 'open-source', label: 'Open source & self-hosting' },
  { id: 'availability', label: 'Availability & warranty' },
  { id: 'liability', label: 'Liability' },
  { id: 'changes', label: 'Changes & contact' },
];

export default function Terms() {
  return (
    <LegalLayout
      eyebrow="Legal · Terms of Service · v3.0"
      title="Terms of Service."
      titleDim="The rules for keeping people safe."
      description="Tagzheimer is an open-source patient-tracking platform: an ESP32 or Android tracker streams GPS fixes through a backend into a caregiver dashboard. These terms cover lawful use, caregiver responsibility, and the limits of a tracking tool. Plain language first — this is telemetry, not legal theatre."
      meta={[
        { label: 'Applies to', value: 'Dashboard', sub: 'web · mobile · firmware' },
        { label: 'License', value: 'MIT', sub: 'self-hostable' },
        { label: 'Medical device', value: 'No', sub: 'assistive tool only' },
        { label: 'Support', value: 'Community', sub: 'via GitHub' },
      ]}
      toc={TOC}
      updated={LEGAL_UPDATED}
    >
      <section id="agreement">
        <h2><span className="sec-no">01</span> Agreement &amp; scope</h2>
        <p>
          By creating an account, pairing a device, or using the Tagzheimer dashboard, mobile
          tracker, or firmware (together, the <strong>“Service”</strong>), you agree to these
          Terms of Service. If you self-host Tagzheimer for your own family or organisation,
          you are the operator of your instance — these terms still govern your use of the
          software, but <strong>your data stays on your infrastructure</strong> (see{' '}
          <a href="#open-source">§07</a>).
        </p>
        <p>
          The project is open source under the MIT license at{' '}
          <a href={REPO_WEB_URL} target="_blank" rel="noopener noreferrer">github.com/Tagzheimer/Tagzheimer</a>.
          Where these terms conflict with the MIT license for the code itself, the MIT license
          controls for redistribution of code; these terms control use of a running Service.
        </p>
        <div className="legal-table-wrap">
          <table>
            <thead><tr><th>Document</th><th>What it covers</th><th>Where</th></tr></thead>
            <tbody>
              <tr><td>Terms (this page)</td><td>Rules, duties, liability</td><td><code>/terms</code></td></tr>
              <tr><td>Privacy Policy</td><td>Location &amp; account data handling</td><td><code>/privacy</code></td></tr>
              <tr><td>Technical docs</td><td>Endpoints, wiring, deployment</td><td><code>Tagzheimer-doc</code></td></tr>
            </tbody>
          </table>
        </div>
      </section>

      <section id="service">
        <h2><span className="sec-no">02</span> What Tagzheimer is (and is not)</h2>
        <div className="legal-callout">
          <strong>Not a medical device. Not an emergency service.</strong> Tagzheimer is an
          assistive location-awareness tool for caregivers. It does not diagnose, treat, or
          prevent any condition, and it must never be your only safeguard for a vulnerable person.
        </div>
        <p>The Service provides:</p>
        <ul>
          <li>Device pairing by <code>serialNumber</code> (e.g. <code>TAG-001</code>) and signed device tokens;</li>
          <li>GPS ingestion (<code>POST /pair · /update · /batch</code>), history (<code>GET /history</code>), and a Leaflet-based caregiver dashboard;</li>
          <li>An Android foreground-service tracker with an offline queue, and ESP32 deep-sleep firmware with an NVS queue.</li>
        </ul>
        <p>
          GPS, cellular, Wi-Fi, and battery constraints mean fixes can be late, coarse, or
          missing (tunnels, buildings, dead battery, deep sleep). <strong>Always maintain
          human supervision and emergency procedures</strong> independent of the dashboard.
          Full failure modes are documented in the{' '}
          <a href={DOCS_URL} target="_blank" rel="noopener noreferrer">technical documentation</a>.
        </p>
      </section>

      <section id="accounts">
        <h2><span className="sec-no">03</span> Accounts &amp; caregiver duties</h2>
        <h3>Eligibility</h3>
        <p>
          You must be at least 18 years old (or the age of majority where you live) to hold a
          caregiver account. You are responsible for keeping credentials confidential and for
          everything done under your account.
        </p>
        <h3>Lawful tracking &amp; consent</h3>
        <p>
          You may track a person <strong>only</strong> where you have a lawful basis: the
          person&apos;s informed consent, or — for patients who cannot consent — the authority
          of a legal guardian, family proxy, or care institution acting under applicable law
          (including data-protection and health-privacy rules in your jurisdiction).
        </p>
        <ul>
          <li>Inform the patient and family that tracking is active, where data goes, and who can see it;</li>
          <li>Limit dashboard access to caregivers who genuinely need it — revoke access when caregiving ends;</li>
          <li>Never use Tagzheimer to stalk, harass, surveil employees without disclosure, or track stolen hardware you do not own.</li>
        </ul>
        <p>
          You are solely responsible for obtaining and documenting that basis. Operators of
          hosted instances may suspend accounts used for unlawful surveillance.
        </p>
      </section>

      <section id="devices">
        <h2><span className="sec-no">04</span> Devices &amp; pairing</h2>
        <p>
          Devices are identified by a human-readable <code>serialNumber</code> (3–64 chars).
          Pairing (<code>POST /api/devices/pair</code>) provisions the device and returns a
          signed device JWT bound to that serial; subsequent fixes authenticate with it.
          Treat pairing tokens and device JWTs like passwords — anyone holding one can submit
          fixes for that serial.
        </p>
        <ul>
          <li><strong>Your hardware, your responsibility:</strong> you own and maintain trackers, batteries, SIMs/data plans, and physical security;</li>
          <li><strong>Your server, your data:</strong> self-hosted backends never send fixes to us — review <code>.env</code> and Supabase RLS policies before going live;</li>
          <li><strong>QR sharing:</strong> public caregiver cards (<code>/d/:id</code>) expose only what you put on them. Do not print QR codes with data you would not hand to a stranger.</li>
        </ul>
      </section>

      <section id="use">
        <h2><span className="sec-no">05</span> Acceptable use</h2>
        <p>You agree not to:</p>
        <ul>
          <li>Break the law, infringe privacy or IP rights, or track anyone without a lawful basis;</li>
          <li>Abuse the API (credential stuffing, token replay, bypassing rate limits of <code>600/15m</code> general · <code>300/IP + 60/device</code> ingest);</li>
          <li>Upload malware, probe other tenants&apos; rows (RLS is per-owner — do not attempt to bypass it), or disrupt the Service;</li>
          <li>Misrepresent the Service as a certified medical, emergency, or child-safety product;</li>
          <li>Remove copyright, MIT, or safety notices from the software or docs.</li>
        </ul>
        <p>
          We may rate-limit, suspend, or terminate accounts or devices that threaten safety,
          security, or availability — with a notice where feasible and legally permitted.
        </p>
      </section>

      <section id="demo">
        <h2><span className="sec-no">06</span> Demo mode</h2>
        <div className="legal-callout">
          <strong><code>DEMO_MODE=true</code> is intentionally insecure.</strong> It uses an
          in-memory store and accepts <code>Bearer mock-token</code> for everything so you can
          prove the loop on localhost with zero infrastructure.
        </div>
        <p>
          Never expose demo mode to the internet, never enter real patient data into it, and
          never treat demo fixes as real telemetry. Production requires Supabase credentials,
          a strong <code>JWT_SECRET</code>, HTTPS, and RLS as described in the deployment guide.
        </p>
      </section>

      <section id="open-source">
        <h2><span className="sec-no">07</span> Open source &amp; self-hosting</h2>
        <p>
          The code (backend, frontend, mobile, firmware) is MIT-licensed. You may fork,
          modify, and run it anywhere — Docker, Fly.io, Railway, Render, Vercel, Netlify, EAS,
          or a laptop under a desk. Self-hosted instances are operated by you: you choose the
          database (Supabase project or your own Postgres), the TLS termination, backups, and
          access policy.
        </p>
        <p>
          Contributions back via GitHub are welcome and remain under the repository&apos;s
          license. The hosted documentation site (
          <a href={DOCS_URL} target="_blank" rel="noopener noreferrer">Tagzheimer-doc</a>) is
          a technical manual, not part of the Service SLA.
        </p>
      </section>

      <section id="availability">
        <h2><span className="sec-no">08</span> Availability &amp; warranty</h2>
        <p>
          The Service is provided <strong>“as is” and “as available”</strong> without warranties
          of any kind — merchantability, fitness for a particular purpose, accuracy, or
          uninterrupted operation. Specifically, we do not warrant that:
        </p>
        <ul>
          <li>GPS fixes will be real-time, continuous, or accurate to any radius;</li>
          <li>Offline queues (firmware NVS ×10 · mobile ×50) will preserve every fix;</li>
          <li>Maps (© OpenStreetMap, dark-inverted client-side) will always render;</li>
          <li>The dashboard will be reachable during outages, maintenance, or expired certs.</li>
        </ul>
        <p>
          Plan caregiving around these limits: keep devices charged, keep the mobile app&apos;s
          location permission on <em>“Allow all the time”</em>, and keep a non-digital fallback plan.
        </p>
      </section>

      <section id="liability">
        <h2><span className="sec-no">09</span> Liability</h2>
        <p>
          To the maximum extent permitted by law, the contributors and operators are not liable
          for indirect, incidental, consequential, or punitive damages — including harm arising
          from delayed, missing, or inaccurate location data, or from reliance on the Service
          in an emergency. Where liability cannot be excluded, it is limited to the amounts you
          paid for the Service in the 12 months before the claim (which is €0 for self-hosted
          MIT use).
        </p>
        <p>
          Nothing here limits liability that cannot be limited by law, nor your responsibility
          as a caregiver or operator for lawful, supervised care.
        </p>
      </section>

      <section id="changes">
        <h2><span className="sec-no">10</span> Changes &amp; contact</h2>
        <p>
          We may update these terms as the platform evolves (new endpoints, new queues, new
          deployment targets). Material changes will be noted in the repository and, where
          feasible, in the dashboard. Continued use after the effective date constitutes
          acceptance.
        </p>
        <p>
          Questions about these terms: open an issue or discussion at{' '}
          <a href={REPO_WEB_URL} target="_blank" rel="noopener noreferrer">github.com/Tagzheimer/Tagzheimer</a>{' '}
          or contact the operator of the instance you use. For how location data is handled,
          read the <a href="/privacy">Privacy Policy</a>.
        </p>
      </section>
    </LegalLayout>
  );
}
