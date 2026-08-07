import type { ModuleKey, Project } from '@/lib/projectService';
import { moduleClass, moduleKeys, moduleLabels } from './dashboardConfig';

type Props = {
  projects: Project[];
  onCreate: () => void;
  onOpenModule: (project: Project, moduleKey: ModuleKey) => void;
  onEditProject: (project: Project) => void;
  onCloseProject: (project: Project) => void;
};

function ProjectCard({
  project,
  onOpenModule,
  onEditProject,
  onCloseProject,
}: Omit<Props, 'projects' | 'onCreate'> & { project: Project }) {
  return (
    <article className={`relative rounded-2xl border bg-slate-900 p-5 shadow-lg ${project.closed ? 'border-slate-800 opacity-75' : 'border-slate-800'}`}>
      <details className="absolute right-4 top-4 z-10">
        <summary
          className="grid h-9 w-9 cursor-pointer list-none place-items-center rounded-lg border border-slate-700 bg-slate-950 text-slate-300 transition hover:border-sky-500 hover:text-sky-300 [&::-webkit-details-marker]:hidden"
          aria-label={`${project.code} műveletei`}
        >
          ↓
        </summary>
        <div className="absolute right-0 mt-2 w-64 rounded-xl border border-slate-700 bg-slate-950 p-2 shadow-2xl">
          <p className="px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-500">Projektfolyamat kezelése</p>
          {!project.closed && moduleKeys.map((key) => (
            <button
              type="button"
              key={key}
              disabled={!project.modules[key].enabled}
              onClick={() => onOpenModule(project, key)}
              className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm text-slate-300 hover:bg-slate-800 disabled:cursor-not-allowed disabled:text-slate-600"
            >
              <span>{moduleLabels[key]}</span>
              <span className="text-xs text-slate-500">{project.modules[key].status}</span>
            </button>
          ))}
          <div className="my-2 border-t border-slate-800" />
          <button
            type="button"
            onClick={() => onEditProject(project)}
            className="w-full rounded-lg px-3 py-2 text-left text-sm text-sky-300 hover:bg-slate-800"
          >
            {project.closed ? 'Projektadatok megtekintése' : 'Projektadatok módosítása'}
          </button>
          {!project.closed && (
            <button
              type="button"
              onClick={() => onCloseProject(project)}
              className="w-full rounded-lg px-3 py-2 text-left text-sm text-rose-300 hover:bg-rose-500/10"
            >
              Projekt lezárása
            </button>
          )}
        </div>
      </details>

      <div className="flex flex-wrap items-center gap-2 pr-12">
        <span className="rounded bg-slate-800 px-2 py-1 text-xs font-semibold text-slate-300">{project.code}</span>
        <span className={project.closed ? 'text-xs font-semibold text-slate-400' : project.status === 'Csúszás' ? 'text-xs font-semibold text-rose-400' : 'text-xs font-semibold text-amber-400'}>
          {project.lastAction ?? project.status}
        </span>
      </div>
      <h2 className="mt-3 text-lg font-bold">{project.title}</h2>
      <p className="mt-1 text-sm text-slate-400">{project.client.name} · {project.client.address || 'Nincs cím megadva'}</p>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
        {moduleKeys.map((key, index) => {
          const projectModule = project.modules[key];
          return (
            <button
              type="button"
              key={key}
              disabled={project.closed || !projectModule.enabled}
              onClick={() => onOpenModule(project, key)}
              className={`min-h-28 rounded-xl border-2 p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg disabled:hover:translate-y-0 ${moduleClass(project, key)}`}
            >
              <span className="block text-[11px] font-bold uppercase tracking-[0.16em] opacity-70">{index + 1}. szakasz</span>
              <span className="mt-2 block text-base font-bold">{moduleLabels[key]}</span>
              <span className="mt-2 block text-sm font-medium">{projectModule.status}</span>
              {projectModule.scheduledAt && (
                <span className="mt-2 block text-xs opacity-80">{projectModule.scheduledAt}{projectModule.scheduledTime ? ` · ${projectModule.scheduledTime}` : ''}</span>
              )}
              {projectModule.assignedTo && <span className="mt-1 block truncate text-xs opacity-80">{projectModule.assignedTo}</span>}
            </button>
          );
        })}
      </div>
    </article>
  );
}

export default function ProjectList({ projects, onCreate, onOpenModule, onEditProject, onCloseProject }: Props) {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-bold">Projektek</h2>
        <p className="text-sm text-slate-500">Minden projekt teljes folyamata egy kártyán.</p>
      </div>
      {projects.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/50 p-10 text-center">
          <p className="font-semibold text-slate-300">Még nincs projekt ebben a cégben.</p>
          <button type="button" onClick={onCreate} className="mt-5 rounded-lg bg-sky-600 px-5 py-2.5 text-sm font-semibold hover:bg-sky-500">
            Első érdeklődés rögzítése
          </button>
        </div>
      ) : projects.map((project) => (
        <ProjectCard
          key={project.id}
          project={project}
          onOpenModule={onOpenModule}
          onEditProject={onEditProject}
          onCloseProject={onCloseProject}
        />
      ))}
    </section>
  );
}
