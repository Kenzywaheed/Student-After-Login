import { useMemo, useState } from 'react';
import type {
  CurriculumKey,
  StudyPlanResourceConfigUnion,
  StudyTrackKey,
  StudyTrackSpecialty,
  UndergradSpecialtyKey,
} from './newStudyPlanResourcesMockData';

interface NewStudyPlanResourcesProps {
  config: StudyPlanResourceConfigUnion;
}

const trackOrder: StudyTrackKey[] = ['msc', 'phd', 'professional'];
const undergradSpecialtyOrder: UndergradSpecialtyKey[] = ['cs', 'is', 'ai'];
const curriculumOrder: CurriculumKey[] = ['old', 'new'];

const studyTrackSpecialtyLabels: Record<StudyTrackSpecialty, string> = {
  CS: 'Computer Science',
  IS: 'Information Systems',
};

function getTrackTitleLabel(trackKey: StudyTrackKey, fallbackLabel: string): string {
  if (trackKey === 'msc') {
    return 'MSc.';
  }

  if (trackKey === 'phd') {
    return 'Ph.D';
  }

  return fallbackLabel;
}

function isSharePointVideoLink(url: string): boolean {
  return url.startsWith('https://mustedueg.sharepoint.com/');
}

function parseSharePointVideoLink(url: string): { href: string; title: string | null } {
  const titleMatch = url.match(/\(([^()]+)\)\s*$/);
  let title = titleMatch?.[1]?.trim() || null;
  const href = url
    .replace(/\([^()]+\)\s*$/, '')
    .replace(/%28.*%29\s*$/i, '');

  if (!title) {
    try {
      const decoded = decodeURIComponent(url);
      title = decoded.match(/\(([^()]+)\)\s*$/)?.[1]?.trim() || null;
    } catch {
      title = null;
    }
  }

  return { href, title };
}

export default function NewStudyPlanResources({ config }: NewStudyPlanResourcesProps) {
  const [activeTrack, setActiveTrack] = useState<StudyTrackKey | null>(null);
  const [activeSpecialty, setActiveSpecialty] = useState<StudyTrackSpecialty | null>(null);
  const [activeUndergradSpecialty, setActiveUndergradSpecialty] = useState<UndergradSpecialtyKey | null>(null);
  const [activeCurriculum, setActiveCurriculum] = useState<CurriculumKey | null>(null);

  const currentTrack = useMemo(() => {
    if (config.mode !== 'degree-tracks' || !activeTrack) {
      return null;
    }

    return config.tracks[activeTrack];
  }, [config, activeTrack]);

  const resources = useMemo(() => {
    if (config.mode === 'undergrad-specialties') {
      if (!activeUndergradSpecialty || !activeCurriculum) {
        return [];
      }

      return config.specialties[activeUndergradSpecialty].resourcesByCurriculum[activeCurriculum];
    }

    if (!currentTrack) {
      return [];
    }

    if (currentTrack.type === 'research' && activeSpecialty) {
      return currentTrack.resourcesBySpecialty[activeSpecialty];
    }

    if (currentTrack.type === 'research') {
      return [];
    }

    return currentTrack.resources;
  }, [config, currentTrack, activeSpecialty, activeUndergradSpecialty, activeCurriculum]);

  const undergradSpecialtyLabel =
    config.mode === 'undergrad-specialties' && activeUndergradSpecialty
      ? config.specialties[activeUndergradSpecialty].label
      : null;

  const curriculumLabel = activeCurriculum
    ? activeCurriculum === 'old'
      ? 'Old Curriculum'
      : 'New Curriculum'
    : null;

  const currentTitle = useMemo(() => {
    if (config.mode === 'undergrad-specialties') {
      if (undergradSpecialtyLabel && curriculumLabel) {
        return `Study Plans (${undergradSpecialtyLabel} ${curriculumLabel})`;
      }

      if (undergradSpecialtyLabel) {
        return `Study Plans (${undergradSpecialtyLabel})`;
      }

      return config.title;
    }

    if (activeTrack) {
      const parentLabel = getTrackTitleLabel(activeTrack, config.tracks[activeTrack].label);

      if (activeSpecialty) {
        return `Study Plans (${parentLabel} ${studyTrackSpecialtyLabels[activeSpecialty]})`;
      }

      return `Study Plans (${parentLabel})`;
    }

    return config.title;
  }, [config, activeTrack, activeSpecialty, undergradSpecialtyLabel, curriculumLabel]);

  const canGoBack =
    config.mode === 'undergrad-specialties'
      ? Boolean(activeUndergradSpecialty || activeCurriculum)
      : Boolean(activeTrack || activeSpecialty);

  const handleGoBack = () => {
    setActiveTrack(null);
    setActiveSpecialty(null);
    setActiveUndergradSpecialty(null);
    setActiveCurriculum(null);
  };

  const tileButtonBase = 'group flex flex-col items-center justify-center gap-4 rounded-xl border border-slate-100 bg-white p-10 text-center shadow-[0px_4px_20px_rgba(0,0,0,0.03)] transition-all duration-300 hover:shadow-[0px_8px_30px_rgba(0,0,0,0.08)] hover:-translate-y-1 hover:border-slate-200 dark:border-slate-800 dark:bg-slate-900/50 dark:shadow-[0px_4px_20px_rgba(0,0,0,0.2)] dark:hover:border-slate-700 dark:hover:bg-slate-800';

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm md:p-10 dark:border-slate-700 dark:bg-slate-900">
      <div className="flex items-center justify-between gap-4">
        <h3 className="text-3xl font-bold text-slate-900 md:text-3xl dark:text-slate-100">{currentTitle}</h3>
        {canGoBack && (
          <button
            type="button"
            onClick={handleGoBack}
            className="shrink-0 rounded-xl border border-slate-300 px-6 py-3 text-base font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Go Back
          </button>
        )}
      </div>

      {config.mode === 'degree-tracks' && (
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {!activeTrack &&
            trackOrder.map((trackKey) => {
              const track = config.tracks[trackKey];

              return (
                <button
                  key={trackKey}
                  type="button"
                  onClick={() => {
                    setActiveTrack(trackKey);
                    setActiveSpecialty(null);
                  }}
                  className={tileButtonBase}
                >
                  <i className="fa-brands fa-google-drive text-[40px] text-[#00A152] transition-transform duration-300 group-hover:scale-110 dark:text-[#00c968]"></i>
                  <p className="mt-2 text-xl font-bold text-[#0A2540] transition-colors duration-300 group-hover:text-[#00A152] dark:text-white dark:group-hover:text-[#00c968]">{track.label}</p>
                </button>
              );
            })}

          {activeTrack && currentTrack?.type === 'research' &&
            (['CS', 'IS'] as StudyTrackSpecialty[]).map((specialty) => {
              const isActive = activeSpecialty === specialty;
              const specialtyLabel = studyTrackSpecialtyLabels[specialty];

              return (
                <button
                  key={specialty}
                  type="button"
                  onClick={() => setActiveSpecialty(specialty)}
                  aria-pressed={isActive}
                  className={`${tileButtonBase} ${
                    isActive
                      ? 'ring-2 ring-[#00A152] bg-slate-50 dark:bg-slate-800/80'
                      : ''
                  }`}
                >
                  <i className="fa-brands fa-google-drive text-[40px] text-[#00A152] transition-transform duration-300 group-hover:scale-110 dark:text-[#00c968]"></i>
                  <p className="mt-2 text-xl font-bold text-[#0A2540] transition-colors duration-300 group-hover:text-[#00A152] dark:text-white dark:group-hover:text-[#00c968]">{specialtyLabel}</p>
                </button>
              );
            })}
        </div>
      )}

      {config.mode === 'undergrad-specialties' && (
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {!activeUndergradSpecialty &&
            undergradSpecialtyOrder.map((specialtyKey) => {
              const specialty = config.specialties[specialtyKey];

              return (
                <button
                  key={specialtyKey}
                  type="button"
                  onClick={() => {
                    setActiveUndergradSpecialty(specialtyKey);
                    setActiveCurriculum(null);
                  }}
                  className={tileButtonBase}
                >
                  <i className="fa-brands fa-google-drive text-[40px] text-[#00A152] transition-transform duration-300 group-hover:scale-110 dark:text-[#00c968]"></i>
                  <p className="mt-2 text-xl font-bold text-[#0A2540] transition-colors duration-300 group-hover:text-[#00A152] dark:text-white dark:group-hover:text-[#00c968]">{specialty.label}</p>
                </button>
              );
            })}

          {activeUndergradSpecialty &&
            curriculumOrder.map((curriculum) => {
              const isActive = activeCurriculum === curriculum;
              const label = curriculum === 'old' ? 'Old Curriculum' : 'New Curriculum';

              return (
                <button
                  key={curriculum}
                  type="button"
                  onClick={() => setActiveCurriculum(curriculum)}
                  aria-pressed={isActive}
                  className={`${tileButtonBase} ${
                    isActive
                      ? 'ring-2 ring-[#00A152] bg-slate-50 dark:bg-slate-800/80'
                      : ''
                  }`}
                >
                  <i className="fa-brands fa-google-drive text-[40px] text-[#00A152] transition-transform duration-300 group-hover:scale-110 dark:text-[#00c968]"></i>
                  <p className="mt-2 text-xl font-bold text-[#0A2540] transition-colors duration-300 group-hover:text-[#00A152] dark:text-white dark:group-hover:text-[#00c968]">{label}</p>
                </button>
              );
            })}
        </div>
      )}

      {resources.length > 0 && (
        <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2">
          {resources.map((resource) => {
            if (isSharePointVideoLink(resource.url)) {
              const { href, title } = parseSharePointVideoLink(resource.url);

              return (
                <a
                  key={resource.id}
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-6 text-sky-700 transition-opacity hover:opacity-80 dark:border-slate-700 dark:bg-slate-800 dark:text-sky-300"
                >
                  <span className="inline-flex h-14 w-14 items-center justify-center rounded-lg bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300">
                    <VideoIcon className="h-8 w-8" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xl font-semibold underline break-words text-slate-900 dark:text-slate-100">
                      {title || 'Video'}
                    </p>
                  </div>
                  <ExternalLinkIcon className="h-5 w-5 shrink-0 text-slate-500 dark:text-slate-300" />
                </a>
              );
            }

            return (
              <div
                key={resource.id}
                className="flex flex-col gap-4 rounded-xl border border-slate-100 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800"
              >
                <div className="flex-1 pb-4 border-b border-slate-100 dark:border-slate-700/50">
                  <h4 className="text-xl font-semibold text-[#0A2540] dark:text-white">
                    {resource.title}
                  </h4>
                </div>
                
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider -mb-1 mt-1 dark:text-slate-400">PDF</p>
                <div className="flex flex-col sm:flex-row items-center gap-3">
                  <a
                    href={resource.url}
                    download
                    className="flex w-full sm:w-auto items-center justify-center gap-2 rounded-lg bg-[#25325A] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#1A2340] dark:bg-[#34467c] dark:hover:bg-[#2c3d6c]"
                  >
                    <i className="fa-solid fa-download text-lg"></i>
                    Download PDF
                  </a>
                  <a
                    href={resource.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex w-full sm:w-auto items-center justify-center gap-2 rounded-lg border-2 border-[#25325A] bg-white px-6 py-3 text-sm font-semibold text-[#25325A] transition-colors hover:bg-slate-50 dark:border-slate-400 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                  >
                    <i className="fa-solid fa-arrow-up-right-from-square text-lg"></i>
                    Open PDF
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}


function VideoIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className={className}
      aria-hidden="true"
    >
      <rect x="3.5" y="5" width="12.5" height="14" rx="2" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M11 12 8.5 10.5v3L11 12Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="m16 10 4-2v8l-4-2" />
    </svg>
  );
}

function ExternalLinkIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className={className}
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M14 5h5v5" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M10 14 19 5" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 13v4a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h4" />
    </svg>
  );
}


