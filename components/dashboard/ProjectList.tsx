import Link from 'next/link';
import { useMemo, useState } from 'react';
import { getProjectModuleDisplayStatus, isProjectDelayed, isProjectFinanceOverdue, type ModuleKey, type Project } from '@/lib/projectService';
import { moduleKeys, moduleLabels } from './dashboardConfig';

type Props = { projects: Project[]; onCreate: () => void; onOpenModule: (project: Project, moduleKey: ModuleKey) => void; onEditProject: (project: Project) => void; onCloseProject: (project: Project) => void };
const completedStatuses = ['Kész', 'Elfogadva', 'Aláírva', 'Befejezve', 'Fizetve'];
const groups: Array<{ key: 'delayed' | 'closed' | ModuleKey; label: string; note: string }> = [
  { key: 'delayed', label: 'Csúszásban', note: 'Minden késésben lévő projekt, munkaszakasztól függetlenül' },
  { key: 'survey', label: 'Felmérés', note: 'Időpontok, helyszíni adatok és felmérési dokumentáció' },
  { key: 'quote', label: 'Árajánlat', note: 'Ajánlatkészítés, kiküldés és elfogadás' },
  { key: 'contract', label: 'Szerződés', note: 'Szerződéskészítés, kiküldés és aláírás' },
  { key: 'construction', label: 'Kivitelezés', note: 'Munkafázisok, csapatok, napló és helyszíni anyagok' },
  { key: 'completion', label: 'Befejezés és átadás', note: 'Ellenőrzőlista, ügyfél-visszaigazolás és projektlezárás' },
  { key: 'finance', label: 'Pénzügy', note: 'Külön rendelhető pénzügyi folyamat' },
  { key: 'closed', label: 'Lezárt projektek', note: 'Korábbi, már lezárt munkák' },
];

function currentStage(project: Project): ModuleKey {
  return moduleKeys.find((key) => project.modules[key].enabled && !completedStatuses.includes(project.modules[key].status) && project.modules[key].status !== 'Intézendő')
    ?? moduleKeys.find((key) => project.modules[key].enabled && !completedStatuses.includes(project.modules[key].status))
    ?? [...moduleKeys].reverse().find((key) => project.modules[key].enabled)
    ?? 'survey';
}

function ProjectRow({ project, stage, onOpenModule, onEditProject, onCloseProject }: { project: Project; stage: ModuleKey; onOpenModule: Props['onOpenModule']; onEditProject: Props['onEditProject']; onCloseProject: Props['onCloseProject'] }) {
  const [quickMenuOpen, setQuickMenuOpen] = useState(false);
  const projectModule = project.modules[stage];
  const financeOverdue = isProjectFinanceOverdue(project);
  const stageStatus = getProjectModuleDisplayStatus(project, stage);
  return <div className="border-t border-slate-200 transition hover:bg-slate-50/70">
    <div className="grid gap-4 px-5 py-4 lg:grid-cols-[minmax(220px,1.4fr)_minmax(150px,.8fr)_minmax(140px,.7fr)_auto] lg:items-center">
      <div className="min-w-0"><span className="rounded-md bg-sky-50 px-2 py-1 text-[10px] font-bold text-sky-700">{project.code}</span><h3 className="mt-2 truncate text-sm font-bold text-slate-800">{project.title}</h3><p className="mt-1 truncate text-xs text-slate-500">{project.client.name} · {project.client.address || 'Nincs cím megadva'}</p></div>
      <div><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Aktuális szakasz</p><p className={`mt-1.5 text-xs font-bold ${isProjectDelayed(project) ? 'text-rose-600' : completedStatuses.includes(projectModule.status) ? 'text-emerald-600' : 'text-amber-600'}`}>{moduleLabels[stage]} · {stageStatus}</p>{projectModule.scheduledAt && <p className="mt-1 text-xs text-slate-500">{projectModule.scheduledAt}{projectModule.scheduledTime ? ` · ${projectModule.scheduledTime}` : ''}</p>}<button type="button" onClick={() => onOpenModule(project, stage)} className="mt-2 rounded-md bg-sky-50 px-2.5 py-1.5 text-[11px] font-bold text-sky-700 hover:bg-sky-100">{moduleLabels[stage]} megnyitása</button></div>
      <div><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Felelős</p><p className="mt-1.5 text-xs font-semibold text-slate-600">{projectModule.assignedTo || 'Nincs hozzárendelve'}</p><p className="mt-1 truncate text-[11px] text-slate-400">{financeOverdue ? 'A számla fizetési határideje lejárt' : project.lastAction}</p></div>
      <div className="flex flex-wrap gap-2 lg:justify-end">
        <Link href={`/projektek/${encodeURIComponent(project.id)}`} className="rounded-lg bg-sky-600 px-3 py-2 text-xs font-bold text-white shadow-sm hover:bg-sky-500">Teljes projekt</Link>
        <button type="button" onClick={() => setQuickMenuOpen((open) => !open)} aria-expanded={quickMenuOpen} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-sky-700 hover:border-sky-300">Gyorsmenü {quickMenuOpen ? '▴' : '▾'}</button>
      </div>
    </div>
    {quickMenuOpen && <div className="border-t border-sky-100 bg-sky-50/70 px-5 py-4">
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {!project.closed && moduleKeys.map((key) => <button type="button" key={key} disabled={!project.modules[key].enabled} onClick={() => onOpenModule(project, key)} className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-left text-xs text-slate-600 shadow-sm hover:border-sky-300 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-300"><span className="font-semibold">{moduleLabels[key]}</span><span className="ml-2 truncate">{getProjectModuleDisplayStatus(project, key)}</span></button>)}
      </div>
      <div className="mt-3 flex flex-wrap gap-2 border-t border-sky-100 pt-3">
        <button type="button" onClick={() => onEditProject(project)} className="rounded-lg bg-white px-3 py-2 text-xs font-semibold text-sky-700 shadow-sm hover:bg-sky-100">{project.closed ? 'Projektadatok megtekintése' : 'Projektadatok módosítása'}</button>
        <Link href={`/dokumentumok?project=${encodeURIComponent(project.id)}`} className="rounded-lg bg-white px-3 py-2 text-xs font-semibold text-sky-700 shadow-sm hover:bg-sky-100">Projektanyagok kezelése</Link>
        {!project.closed && <button type="button" onClick={() => onCloseProject(project)} className="rounded-lg bg-white px-3 py-2 text-xs font-semibold text-rose-600 shadow-sm hover:bg-rose-50">Projekt lezárása</button>}
      </div>
    </div>}
  </div>;
}

export default function ProjectList({ projects, onCreate, onOpenModule, onEditProject, onCloseProject }: Props) {
  const [openGroups, setOpenGroups] = useState<Set<string> | null>(null);
  const grouped = useMemo(() => groups.map((group) => ({ ...group, projects: projects.filter((project) => {
    if (group.key === 'closed') return project.closed;
    if (project.closed) return false;
    if (group.key === 'delayed') return isProjectDelayed(project);
    return currentStage(project) === group.key;
  }) })), [projects]);
  const hasDelayedProjects = (grouped.find((group) => group.key === 'delayed')?.projects.length ?? 0) > 0;
  function toggle(key: string) { setOpenGroups((current) => { const next = new Set(current ?? (hasDelayedProjects ? ['delayed'] : [])); if (next.has(key)) next.delete(key); else next.add(key); return next; }); }
  if (projects.length === 0) return <section className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center"><p className="font-semibold text-slate-600">Még nincs projekt ebben a cégben.</p><button type="button" onClick={onCreate} className="mt-5 rounded-lg bg-sky-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-sky-500">Első érdeklődés rögzítése</button></section>;
  return <section className="space-y-3">{grouped.map((group) => { const isDelayed = group.key === 'delayed'; const open = openGroups ? openGroups.has(group.key) : isDelayed && group.projects.length > 0; const optional = ['quote', 'contract', 'finance'].includes(group.key); return <article key={group.key} className={`overflow-hidden rounded-2xl border bg-white shadow-sm ${isDelayed ? 'border-rose-200 bg-rose-50/60' : 'border-slate-200'} ${optional ? 'opacity-90' : ''}`}><button type="button" onClick={() => toggle(group.key)} aria-expanded={open} className={`flex w-full items-center gap-3 px-5 py-4 text-left ${isDelayed ? 'hover:bg-rose-50' : 'hover:bg-slate-50'}`}><span className={`text-xs text-slate-400 transition ${open ? 'rotate-90' : ''}`}>▶</span><span className="text-sm font-bold text-slate-800">{group.label}</span><span className="hidden text-xs text-slate-400 md:inline">{group.note}</span><span className={`ml-auto rounded-full px-2.5 py-1 text-xs font-bold ${isDelayed ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-600'}`}>{group.projects.length}</span></button>{open && <div>{group.projects.length === 0 ? <p className="border-t border-slate-200 px-5 py-5 text-xs text-slate-400">Jelenleg nincs projekt ebben a csoportban.</p> : group.projects.map((project) => <ProjectRow key={project.id} project={project} stage={currentStage(project)} onOpenModule={onOpenModule} onEditProject={onEditProject} onCloseProject={onCloseProject}/>)}</div>}</article>; })}</section>;
}
