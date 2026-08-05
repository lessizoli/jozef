import { useState } from 'react';
import type { ModuleKey, Project } from '@/lib/projectService';
import { moduleKeys, moduleLabels, moduleStatuses } from './dashboardConfig';
import type { ProjectDetailsDraft, ScheduleDraft } from './types';

export type ProjectDrawerMode = 'module' | 'details';

type Props = {
  project: Project;
  selectedModule: ModuleKey;
  initialMode: ProjectDrawerMode;
  initialConfirmClose: boolean;
  schedule: ScheduleDraft;
  details: ProjectDetailsDraft;
  saving: boolean;
  onModuleChange: (moduleKey: ModuleKey) => void;
  onScheduleChange: (schedule: ScheduleDraft) => void;
  onDetailsChange: (details: ProjectDetailsDraft) => void;
  onStatusChange: (status: string) => void;
  onSaveSchedule: (event: React.FormEvent<HTMLFormElement>) => void;
  onSaveDetails: (event: React.FormEvent<HTMLFormElement>) => void;
  onCloseProject: () => void;
  onDismiss: () => void;
};

export default function ProjectDrawer({
  project,
  selectedModule,
  initialMode,
  initialConfirmClose,
  schedule,
  details,
  saving,
  onModuleChange,
  onScheduleChange,
  onDetailsChange,
  onStatusChange,
  onSaveSchedule,
  onSaveDetails,
  onCloseProject,
  onDismiss,
}: Props) {
  const [mode, setMode] = useState<ProjectDrawerMode>(initialMode);
  const [confirmingClose, setConfirmingClose] = useState(initialConfirmClose);

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60" onClick={onDismiss}>
      <aside className="h-full w-full max-w-md overflow-y-auto border-l border-slate-700 bg-slate-900 p-6 shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-xs text-slate-500">{project.code}</p>
              {project.closed && <span className="rounded bg-slate-800 px-2 py-0.5 text-[11px] font-bold uppercase text-slate-400">Lezárt</span>}
            </div>
            <h2 className="mt-1 text-xl font-bold">{project.title}</h2>
            <p className="mt-1 text-sm text-slate-400">{project.client.name}</p>
          </div>
          <button type="button" onClick={onDismiss} className="rounded-lg bg-slate-800 px-3 py-2 text-slate-400" aria-label="Bezárás">✕</button>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-2">
          <button type="button" onClick={() => setMode('module')} className={`rounded-lg border px-3 py-2 text-left text-sm ${mode === 'module' ? 'border-sky-500 bg-sky-500/10 text-sky-300' : 'border-slate-700 text-slate-400'}`}>
            Folyamat kezelése
          </button>
          <button type="button" onClick={() => setMode('details')} className={`rounded-lg border px-3 py-2 text-left text-sm ${mode === 'details' ? 'border-sky-500 bg-sky-500/10 text-sky-300' : 'border-slate-700 text-slate-400'}`}>
            Projektadatok
          </button>
        </div>

        {mode === 'module' ? (
          <>
            <div className="mt-4 grid grid-cols-2 gap-2">
              {moduleKeys.map((key) => (
                <button
                  type="button"
                  key={key}
                  disabled={project.closed || !project.modules[key].enabled}
                  onClick={() => onModuleChange(key)}
                  className={`rounded-lg border px-3 py-2 text-left text-sm ${selectedModule === key ? 'border-sky-500 bg-sky-500/10 text-sky-300' : 'border-slate-700 text-slate-400'} disabled:cursor-not-allowed disabled:opacity-40`}
                >
                  {moduleLabels[key]}
                </button>
              ))}
            </div>
            {project.closed ? (
              <div className="mt-6 rounded-xl border border-slate-700 bg-slate-950/60 p-4 text-sm text-slate-400">
                A lezárt projekt folyamatai már nem módosíthatók.
              </div>
            ) : (
              <form onSubmit={onSaveSchedule} className="mt-6 rounded-xl border border-slate-700 bg-slate-950/60 p-4">
                <p className="text-xs uppercase tracking-wider text-slate-500">Kiválasztott modul</p>
                <h3 className="mt-1 text-lg font-bold">{moduleLabels[selectedModule]}</h3>
                <p className="mt-2 text-sm text-slate-400">Jelenlegi státusz: <span className="font-semibold text-slate-200">{project.modules[selectedModule].status}</span></p>
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-500">Dátum</label>
                    <input type="date" value={schedule.date} onChange={(event) => onScheduleChange({ ...schedule, date: event.target.value })} className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm outline-none focus:border-sky-500" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-500">Kezdési idő</label>
                    <input type="time" value={schedule.time} onChange={(event) => onScheduleChange({ ...schedule, time: event.target.value })} className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm outline-none focus:border-sky-500" />
                  </div>
                </div>
                <div className="mt-3">
                  <label className="mb-1 block text-xs font-semibold text-slate-500">Feladatot végző neve / csapat</label>
                  <input value={schedule.assignedTo} onChange={(event) => onScheduleChange({ ...schedule, assignedTo: event.target.value })} className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm outline-none focus:border-sky-500" />
                </div>
                <button disabled={saving} className="mt-3 w-full rounded-lg bg-sky-600 px-3 py-2 text-sm font-semibold hover:bg-sky-500 disabled:opacity-50">Időpont mentése</button>
                <div className="mt-5 space-y-2">
                  {moduleStatuses[selectedModule].map((status) => (
                    <button
                      type="button"
                      key={status}
                      disabled={saving || status === project.modules[selectedModule].status}
                      onClick={() => onStatusChange(status)}
                      className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-left text-sm hover:border-sky-500 disabled:opacity-40"
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </form>
            )}
          </>
        ) : (
          <form onSubmit={onSaveDetails} className="mt-6 space-y-4 rounded-xl border border-slate-700 bg-slate-950/60 p-4">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-500">Projekt megnevezése</label>
              <input required disabled={project.closed} value={details.title} onChange={(event) => onDetailsChange({ ...details, title: event.target.value })} className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm outline-none focus:border-sky-500 disabled:opacity-60" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-500">Ügyfél neve</label>
              <input required disabled={project.closed} value={details.clientName} onChange={(event) => onDetailsChange({ ...details, clientName: event.target.value })} className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm outline-none focus:border-sky-500 disabled:opacity-60" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-500">E-mail-cím</label>
              <input type="email" disabled={project.closed} value={details.email} onChange={(event) => onDetailsChange({ ...details, email: event.target.value })} className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm outline-none focus:border-sky-500 disabled:opacity-60" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-500">Telefonszám</label>
              <input disabled={project.closed} value={details.phone} onChange={(event) => onDetailsChange({ ...details, phone: event.target.value })} className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm outline-none focus:border-sky-500 disabled:opacity-60" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-500">Helyszín / cím</label>
              <input disabled={project.closed} value={details.address} onChange={(event) => onDetailsChange({ ...details, address: event.target.value })} className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm outline-none focus:border-sky-500 disabled:opacity-60" />
            </div>
            {!project.closed && (
              <button disabled={saving} className="w-full rounded-lg bg-sky-600 px-3 py-2 text-sm font-semibold hover:bg-sky-500 disabled:opacity-50">
                {saving ? 'Mentés…' : 'Projektadatok mentése'}
              </button>
            )}
          </form>
        )}

        {!project.closed && (
          <div className="mt-8 border-t border-slate-800 pt-6">
            {!confirmingClose ? (
              <button type="button" onClick={() => setConfirmingClose(true)} className="w-full rounded-lg border border-rose-500/50 px-3 py-2 text-sm font-semibold text-rose-300 hover:bg-rose-500/10">
                Projekt lezárása
              </button>
            ) : (
              <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-4">
                <p className="text-sm font-semibold text-rose-200">Biztosan lezárod ezt a projektet?</p>
                <p className="mt-1 text-xs text-rose-200/70">A projekt megmarad, de a folyamatai nem lesznek tovább módosíthatók.</p>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => setConfirmingClose(false)} className="rounded-lg border border-slate-700 px-3 py-2 text-sm">Mégsem</button>
                  <button type="button" disabled={saving} onClick={onCloseProject} className="rounded-lg bg-rose-600 px-3 py-2 text-sm font-semibold hover:bg-rose-500 disabled:opacity-50">Igen, lezárom</button>
                </div>
              </div>
            )}
          </div>
        )}
      </aside>
    </div>
  );
}
