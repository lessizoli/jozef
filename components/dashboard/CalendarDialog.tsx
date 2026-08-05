import type { ModuleKey, Project } from '@/lib/projectService';
import { moduleKeys, moduleLabels } from './dashboardConfig';
import type { CalendarDraft } from './types';

type Props = {
  draft: CalendarDraft;
  projects: Project[];
  selectedProject: Project | null;
  saving: boolean;
  onChange: (draft: CalendarDraft) => void;
  onProjectChange: (projectId: string) => void;
  onClose: () => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
};

export default function CalendarDialog({
  draft,
  projects,
  selectedProject,
  saving,
  onChange,
  onProjectChange,
  onClose,
  onSubmit,
}: Props) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4" onClick={onClose}>
      <form onSubmit={onSubmit} onClick={(event) => event.stopPropagation()} className="w-full max-w-lg space-y-5 rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-800 pb-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-400">Naptár</p>
            <h2 className="mt-2 text-xl font-bold">Projektfolyamat hozzáadása</h2>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg bg-slate-800 px-3 py-2 text-slate-400" aria-label="Bezárás">✕</button>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-400">Dátum</label>
            <input type="date" required value={draft.date} onChange={(event) => onChange({ ...draft, date: event.target.value })} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-3 outline-none focus:border-sky-500" />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-400">Kezdési idő</label>
            <input type="time" required value={draft.time} onChange={(event) => onChange({ ...draft, time: event.target.value })} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-3 outline-none focus:border-sky-500" />
          </div>
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-slate-400">Projekt</label>
          <select required value={draft.projectId} onChange={(event) => onProjectChange(event.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-3 outline-none focus:border-sky-500">
            <option value="" disabled>Válassz projektet</option>
            {projects.filter((project) => !project.closed).map((project) => (
              <option key={project.id} value={project.id}>{project.code} · {project.title} · {project.client.address || project.client.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-slate-400">Projektfolyamat</label>
          <select required value={draft.moduleKey} onChange={(event) => onChange({ ...draft, moduleKey: event.target.value as ModuleKey })} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-3 outline-none focus:border-sky-500">
            {moduleKeys.filter((key) => selectedProject?.modules[key].enabled).map((key) => (
              <option key={key} value={key}>{moduleLabels[key]} · {selectedProject?.modules[key].status}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-slate-400">Feladatot végző neve / csapat</label>
          <input value={draft.assignedTo} onChange={(event) => onChange({ ...draft, assignedTo: event.target.value })} placeholder="pl. Nagy Péter vagy 2-es kivitelező csapat" className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-3 outline-none focus:border-sky-500" />
        </div>
        {selectedProject && (
          <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3 text-sm text-slate-400">
            <span className="font-semibold text-slate-200">Cím:</span> {selectedProject.client.address || 'Nincs cím megadva'}
          </div>
        )}
        <button disabled={saving || !draft.projectId} className="w-full rounded-lg bg-sky-600 px-4 py-3 font-semibold hover:bg-sky-500 disabled:opacity-50">
          {saving ? 'Mentés…' : 'Folyamat hozzáadása a naptárhoz'}
        </button>
      </form>
    </div>
  );
}
