import { Link } from 'react-router-dom';
import { Section } from '../../components/settings/SettingsControls';
import { DOCS_URL, REPO_WEB_URL, APP_VERSION } from '../../utils/constants';

function ExtRow({ href, title, sub, icon }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-3 px-5 py-4 hover:bg-surface-2 transition-colors tap-highlight group"
    >
      <div className="w-9 h-9 border border-hairline-2 flex items-center justify-center flex-shrink-0">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[14px] font-semibold text-ink">{title}</p>
        <p className="text-[12px] text-ink-3 truncate">{sub}</p>
      </div>
      <svg className="w-4 h-4 text-ink-3 group-hover:text-ink group-hover:translate-x-0.5 transition-all flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M7 17L17 7M7 7h10v10" />
      </svg>
    </a>
  );
}

function LegalRow({ to, title, sub }) {
  return (
    <Link
      to={to}
      className="flex items-center gap-3 px-5 py-4 hover:bg-surface-2 transition-colors tap-highlight group"
    >
      <div className="flex-1 min-w-0">
        <p className="text-[14px] font-semibold text-ink">{title}</p>
        <p className="text-[12px] text-ink-3">{sub}</p>
      </div>
      <svg className="w-4 h-4 text-ink-3 group-hover:text-ink group-hover:translate-x-0.5 transition-all flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
      </svg>
    </Link>
  );
}

export default function AboutSettings() {
  return (
    <>
      <Section index="08" title="Resources" desc={`Tagzheimer ${APP_VERSION} · open source, self-hostable.`}>
        <ExtRow
          href={DOCS_URL}
          title="Documentation"
          sub="Endpoints · wiring · deployment · failure modes"
          icon={
            <svg className="w-4 h-4 text-ink" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
            </svg>
          }
        />
        <ExtRow
          href={REPO_WEB_URL}
          title="GitHub repository"
          sub="Source · issues · MIT license"
          icon={
            <svg className="w-4 h-4 text-ink" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
            </svg>
          }
        />
      </Section>

      <Section index="—" title="Legal" desc="The rules for keeping people safe.">
        <LegalRow to="/terms" title="Terms of Service" sub="Duties · acceptable use · liability" />
        <LegalRow to="/privacy" title="Privacy Policy" sub="Location data · retention · your rights" />
      </Section>
    </>
  );
}
