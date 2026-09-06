import LegalLayout from '../components/LegalLayout';
import { DOCS_URL, REPO_WEB_URL, LEGAL_UPDATED } from '../utils/constants';

const TOC = [
  { id: 'overview', label: 'Overview & principles' },
  { id: 'collect', label: 'Data we collect' },
  { id: 'use', label: 'How we use data' },
  { id: 'basis', label: 'Legal basis & consent' },
  { id: 'storage', label: 'Where data lives' },
  { id: 'sharing', label: 'Sharing & disclosure' },
  { id: 'retention', label: 'Retention & deletion' },
  { id: 'security', label: 'Security' },
  { id: 'rights', label: 'Your rights' },
  { id: 'vulnerable', label: 'Vulnerable persons' },
  { id: 'cookies', label: 'Cookies & local storage' },
  { id: 'changes', label: 'Changes & contact' },
];

export default function Privacy() {
  return (
    <LegalLayout
      eyebrow="Legal · Privacy Policy · v3.0"
      title="Privacy Policy."
      titleDim="Your hardware. Your server. Your data."
      description="Tagzheimer exists so families don't have to send a loved one's live location to a random vendor server. The default architecture is self-hosted: your tracker talks to your backend, your backend talks to your Supabase project, and caregivers see it on your dashboard. This policy explains exactly what telemetry is stored, where, and how to delete it."
      meta={[
        { label: 'Selling data', value: 'Never', sub: 'no ads · no brokers' },
        { label: 'Telemetry', value: 'GPS + battery', sub: 'per-fix rows' },
        { label: 'Storage', value: 'Supabase', sub: 'Postgres + RLS' },
        { label: 'Self-host', value: 'Supported', sub: 'MIT · Docker' },
      ]}
      toc={TOC}
      updated={LEGAL_UPDATED}
    >
      <section id="overview">
        <h2><span className="sec-no">01</span> Overview &amp; principles</h2>
        <p>
          This policy covers the Tagzheimer dashboard (web), the Android tracker (Expo), the
          ESP32 firmware, and the Bun/Express backend. Our principles are: <strong>data
          minimisation</strong> (store the fix, not the life story), <strong>owner-only
          access</strong> (Postgres Row-Level Security per caregiver), and{' '}
          <strong>portability</strong> (export or wipe your rows at any time).
        </p>
        <div className="legal-callout">
          <strong>Who is the controller?</strong> Whoever operates the backend you point your
          tracker at. If you self-host, <strong>you</strong> are the controller for your
          patients&apos; data. If someone else hosts an instance for you, they are — ask them
          where their Supabase project lives before pairing a device.
        </div>
      </section>

      <section id="collect">
        <h2><span className="sec-no">02</span> Data we collect</h2>
        <div className="legal-table-wrap">
          <table>
            <thead><tr><th>Category</th><th>Fields</th><th>Source</th></tr></thead>
            <tbody>
              <tr>
                <td>Account</td>
                <td><code>email</code> · <code>display name</code> · <code>auth id</code> · optional <code>phone</code> for QR cards</td>
                <td>Signup / profile (Supabase Auth)</td>
              </tr>
              <tr>
                <td>Devices</td>
                <td><code>serialNumber</code> · <code>name</code> · <code>patientName</code> · <code>notes</code> · <code>status</code></td>
                <td>Caregiver pairing (<code>POST /pair</code>)</td>
              </tr>
              <tr>
                <td>Location fixes</td>
                <td><code>lat/lon</code> · <code>timestamp</code> · <code>battery</code> · <code>satellites</code> · <code>hdop</code> · <code>altitude</code> · <code>speed</code> · <code>source</code> (<code>esp32|mobile|web</code>)</td>
                <td>Tracker (<code>POST /update · /batch</code>)</td>
              </tr>
              <tr>
                <td>Operational</td>
                <td>Rate-limit counters · error logs · health checks (no fixes)</td>
                <td>Backend runtime</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p>
          We do <strong>not</strong> collect advertising IDs, contacts, photos, microphone or
          camera data. Reverse-geocoded addresses shown on device pages are resolved on demand
          and are not stored as separate rows.
        </p>
      </section>

      <section id="use">
        <h2><span className="sec-no">03</span> How we use data</h2>
        <ul>
          <li><strong>Safety rendering:</strong> live position, trails (<code>GET /history?limit=N</code>), battery and online state on the caregiver dashboard and map;</li>
          <li><strong>Care coordination:</strong> optional public caregiver cards (<code>/d/:id</code>) showing only what you publish (name + phone/email);</li>
          <li><strong>Reliability:</strong> offline queues (firmware NVS ×10, mobile ×50) and batch sync so a tunnel doesn&apos;t eat a walk;</li>
          <li><strong>Security &amp; abuse prevention:</strong> auth verification (Supabase JWT + device JWT), validation, and rate limiting;</li>
          <li><strong>Support:</strong> diagnosing a 401 at 11pm — with your permission, using logs you share.</li>
        </ul>
        <p>
          No profiling. No ads. No sale of location data — ever. If the project ever offered a
          hosted cloud, telemetry would still be per-tenant RLS-isolated; today there is no
          vendor cloud to send it to.
        </p>
      </section>

      <section id="basis">
        <h2><span className="sec-no">04</span> Legal basis &amp; consent</h2>
        <p>
          Tracking a vulnerable adult is sensitive processing. The caregiver (or their
          institution) must hold a valid basis — typically <strong>consent</strong> of the
          patient, or the authority of a <strong>legal guardian / family proxy / care
          provider</strong> acting in the patient&apos;s vital interests where they cannot
          consent — and must comply with applicable data-protection law (e.g. GDPR / UK GDPR,
          HIPAA-adjacent duties, or local equivalents).
        </p>
        <ul>
          <li>Tell the patient and family what is tracked, where it is stored, and who can see it;</li>
          <li>Track only for care and safety — stop and delete when caregiving ends or consent is withdrawn;</li>
          <li>Document the basis. The dashboard can&apos;t do this for you.</li>
        </ul>
      </section>

      <section id="storage">
        <h2><span className="sec-no">05</span> Where data lives</h2>
        <div className="legal-table-wrap">
          <table>
            <thead><tr><th>Mode</th><th>Where rows live</th><th>Notes</th></tr></thead>
            <tbody>
              <tr><td>Production</td><td>Your Supabase Postgres (<code>profiles · devices · locations</code>) + Auth</td><td>RLS per owner · <code>service_role</code> bypass server-side only</td></tr>
              <tr><td>Self-hosted</td><td>Your Docker host / cloud + your Supabase project</td><td>You control region, backups, TLS</td></tr>
              <tr><td>Demo (<code>DEMO_MODE=true</code>)</td><td>In-memory only — wiped on restart</td><td>Accepts <code>mock-token</code> · never use for real patients</td></tr>
              <tr><td>On-device</td><td>ESP32 NVS queue (×10) · Android queue (×50) + SecureStore tokens</td><td>Flushed on next successful sync</td></tr>
            </tbody>
          </table>
        </div>
        <p>
          Schema, policies, and indexes are versioned in <code>backend/supabase/schema.sql</code> and
          explained in the{' '}
          <a href={DOCS_URL} target="_blank" rel="noopener noreferrer">database documentation</a>.
          Choose a Supabase region close to your family for latency and jurisdictional comfort.
        </p>
      </section>

      <section id="sharing">
        <h2><span className="sec-no">06</span> Sharing &amp; disclosure</h2>
        <ul>
          <li><strong>Never sold, never advertised against.</strong> There is no ads SDK in any client;</li>
          <li><strong>Map tiles:</strong> the dashboard loads OpenStreetMap tiles to draw the map — tile servers see your IP and requested tile, as with any map;</li>
          <li><strong>Caregiver cards:</strong> anyone with a <code>/d/:id</code> link or QR photo sees that card. Share deliberately;</li>
          <li><strong>Legal &amp; safety:</strong> operators may disclose data where required by law or to prevent imminent harm, narrowly and with a record where permitted;</li>
          <li><strong>Vendors:</strong> only the infrastructure you choose (host, Supabase). No analytics vendor is bundled.</li>
        </ul>
      </section>

      <section id="retention">
        <h2><span className="sec-no">07</span> Retention &amp; deletion</h2>
        <p>
          Location history is the product — fixes accumulate until you delete them. Recommended
          hygiene: cap trails (<code>?limit=N</code>, ≤ 500), purge stale devices, and delete a
          patient&apos;s rows when care ends. Operators should define a retention window (e.g.
          90 days of fixes) and enforce it with a scheduled SQL delete.
        </p>
        <ul>
          <li><strong>Export:</strong> query your Supabase tables or <code>GET /history</code> — it&apos;s your Postgres;</li>
          <li><strong>Delete device:</strong> removing a device should cascade its fixes (verify your schema&apos;s <code>ON DELETE CASCADE</code>);</li>
          <li><strong>Delete account:</strong> request erasure from your instance operator — Auth user + profile + devices + fixes;</li>
          <li><strong>Demo mode:</strong> restart the backend — everything evaporates.</li>
        </ul>
      </section>

      <section id="security">
        <h2><span className="sec-no">08</span> Security</h2>
        <ul>
          <li>HTTPS everywhere in production; Supabase Auth JWTs verified via JWKS/HS256; device fixes signed with per-serial JWTs;</li>
          <li>Row-Level Security: caregivers read only their own rows; the <code>service_role</code> key never ships to browsers;</li>
          <li>Validation on every ingest route, JSON body cap (256&nbsp;kb), and rate limits to blunt abuse;</li>
          <li>Secrets live in <code>.env</code> / platform secret stores — never in git (<code>.env.example</code> is the template).</li>
        </ul>
        <div className="legal-callout">
          <strong>No system is unhackable.</strong> A leaked device JWT, a shared dashboard
          password, or a photographed QR code bypasses every control above. Rotate tokens on
          suspicion, use unique passwords, and treat QR prints like keys.
        </div>
      </section>

      <section id="rights">
        <h2><span className="sec-no">09</span> Your rights</h2>
        <p>
          Depending on jurisdiction you may have rights to access, rectify, erase, restrict,
          port, or object to processing of personal (and health-adjacent) data — plus the right
          to withdraw consent at any time. Because instances are independently operated,
          exercise these rights <strong>with your instance operator</strong> (the person or
          organisation that runs the backend you use).
        </p>
        <p>
          Operators: respond within statutory deadlines, verify identity without collecting
          more data than needed, and keep a simple log of erasure/export requests. A DPA with
          Supabase (as sub-processor) is available via Supabase&apos;s standard terms for
          production deployments.
        </p>
      </section>

      <section id="vulnerable">
        <h2><span className="sec-no">10</span> Vulnerable persons</h2>
        <p>
          Tagzheimer is built for Alzheimer&apos;s patients and other vulnerable people — which
          raises the bar, not lowers it. Collect the minimum (position + battery, not biography),
          show the dashboard to the fewest caregivers who need it, and pair tracking with human
          presence. If a patient expresses distress about being tracked, pause and revisit
          consent with family and clinicians before continuing.
        </p>
      </section>

      <section id="cookies">
        <h2><span className="sec-no">11</span> Cookies &amp; local storage</h2>
        <div className="legal-table-wrap">
          <table>
            <thead><tr><th>Key</th><th>Purpose</th><th>Lifetime</th></tr></thead>
            <tbody>
              <tr><td><code>Supabase auth session</code></td><td>Keep caregivers signed in</td><td>Until logout / expiry</td></tr>
              <tr><td><code>backend URL override</code></td><td>Profile → Backend Settings custom endpoint</td><td>Persisted until reset</td></tr>
              <tr><td><code>Remember me</code></td><td>Optional session persistence</td><td>Per login choice</td></tr>
            </tbody>
          </table>
        </div>
        <p>
          No third-party tracking cookies, no fingerprinting, no analytics beacons. Map tiles
          aside, the dashboard talks only to the backend URL you configured.
        </p>
      </section>

      <section id="changes">
        <h2><span className="sec-no">12</span> Changes &amp; contact</h2>
        <p>
          We will update this policy as endpoints, queues, and deployment targets evolve; the
          current version always lives at <code>/privacy</code> alongside the{' '}
          <a href="/terms">Terms of Service</a>. Material changes will be noted in the
          repository and, where feasible, in the dashboard.
        </p>
        <p>
          Privacy questions or erasure/export requests: contact your instance operator first.
          Project-level questions: open a discussion at{' '}
          <a href={REPO_WEB_URL} target="_blank" rel="noopener noreferrer">github.com/Tagzheimer/Tagzheimer</a>.
          Technical detail (tables, RLS, env vars) lives in the{' '}
          <a href={DOCS_URL} target="_blank" rel="noopener noreferrer">documentation site</a>.
        </p>
      </section>
    </LegalLayout>
  );
}
