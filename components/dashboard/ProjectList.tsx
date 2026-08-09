import Link from 'next/link';
import { useMemo, useState } from 'react';
import { isProjectFinanceOverdue, type ModuleKey, type Project } from '@/lib/projectService';
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

function delayed(project: Project) { return project.status === 'Csúszás' || isProjectFinanceOverdue(project) || moduleKeys.some((key) => project.modules[key].delayed || ['Csúszás', 'Késedelem'].includes(project.modules[key].status)); }
function currentStage(project: Project): ModuleKey {
  return moduleKeys.find((key) => project.modules[key].enabled && !completedStatuses.includes(project.modules[key].status) && project.modules[key].status !== 'Intézendő')
    ?? moduleKeys.find((key) => project.modules[key].enabled && !completedStatuses.includes(project.modules[key].status))
    ?? [...moduleKeys].reverse().find((key) => project.modules[key].enabled)
    ?? 'survey';
}

function ProjectRow({ project, stage, onOpenModule, onEditProject, onCloseProject }: { project: Project; stage: ModuleKey; onOpenModule: Props['onOpenModule']; onEditProject: Props['onEditProject']; onCloseProject: Props['onCloseProject'] }) {
  const projectModule = project.modules[stage];
  const financeOverdue = isProjectFinanceOverdue(project);
  const stageStatus = stage === 'finance' && financeOverdue ? 'Késedelem' : projectModule.status;
  return <div className="grid gap-4 border-t border-slate-200 px-5 py-4 transition hover:bg-slate-50 lg:grid-cols-[minmax(220px,1.4fr)_minmax(150px,.8fr)_minmax(140px,.7fr)_auto] lg:items-center">
    <div className="min-w-0"><span className="rounded-md bg-sky-50 px-2 py-1 text-[10px] font-bold text-sky-700">{project.code}</span><h3 className="mt-2 truncate text-sm font-bold text-slate-800">{project.title}</h3><p className="mt-1 truncate text-xs text-slate-500">{project.client.name} · {project.client.address || 'Nincs cím megadva'}</p></div>
    <div><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Aktuális szakasz</p><p className={`mt-1.5 text-xs font-bold ${delayed(project) ? 'text-rose-600' : completedStatuses.includes(projectModule.status) ? 'text-emerald-600' : 'text-amber-600'}`}>{moduleLabels[stage]} · {stageStatus}</p>{projectModule.scheduledAt && <p className="mt-1 text-xs text-slate-500">{projectModule.scheduledAt}{projectModule.scheduledTime ? ` · ${projectModule.scheduledTime}` : ''}</p>}</div>
    <div><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Felelős</p><p className="mt-1.5 text-xs font-semibold text-slate-600">{projectModule.assignedTo || 'Nincs hozzárendelve'}</p><p className="mt-1 truncate text-[11px] text-slate-400">{financeOverdue ? 'A számla fizetési határideje lejárt' : project.lastAction}</p></div>
    <details className="relative justify-self-start lg:justify-self-end"><summary className="cursor-pointer list-none rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-sky-700 hover:border-sky-300 [&::-webkit-details-marker]:hidden">Megnyitás ▾</summary><div className="absolute right-0 z-20 mt-2 w-60 rounded-xl border border-slate-200 bg-white p-2 shadow-xl">{!project.closed && moduleKeys.map((key) => <button type="button" key={key} disabled={!project.modules[key].enabled} onClick={() => onOpenModule(project, key)} className="flex w-full justify-between rounded-lg px-3 py-2 text-left text-xs text-slate-600 hover:bg-slate-50 disabled:text-slate-300"><span>{moduleLabels[key]}</span><span>{key === 'finance' && financeOverdue ? 'Késedelem' : project.modules[key].status}</span></button>)}<div className="my-1 border-t border-slate-100"/><button type="button" onClick={() => onEditProject(project)} className="w-full rounded-lg px-3 py-2 text-left text-xs font-semibold text-sky-700 hover:bg-sky-50">{project.closed ? 'Projektadatok megtekintése' : 'Projektadatok módosítása'}</button><Link href={`/dokumentumok?project=${encodeURIComponent(project.id)}`} className="block w-full rounded-lg px-3 py-2 text-left text-xs font-semibold text-sky-700 hover:bg-sky-50">Projektanyagok</Link>{!project.closed && <button type="button" onClick={() => onCloseProject(project)} className="w-full rounded-lg px-3 py-2 text-left text-xs font-semibold text-rose-600 hover:bg-rose-50">Projekt lezárása</button>}</div></details>
  </div>;
}

export default function ProjectList({ projects, onCreate, onOpenModule, onEditProject, onCloseProject }: Props) {
  const [openGroups, setOpenGroups] = useState<Set<string>>(() => new Set(['delayed', 'survey', 'construction', 'completion']));
  const grouped = useMemo(() => groups.map((group) => ({ ...group, projects: projects.filter((project) => {
    if (group.key === 'closed') return project.closed;
    if (project.closed) return false;
    if (group.key === 'delayed') return delayed(project);
    if (delayed(project)) return false;
    return currentStage(project) === group.key;
  }) })), [projects]);
  function toggle(key: string) { setOpenGroups((current) => { const next = new Set(current); if (next.has(key)) next.delete(key); else next.add(key); return next; }); }
  if (projects.length === 0) return <section className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center"><p className="font-semibold text-slate-600">Még nincs projekt ebben a cégben.</p><button type="button" onClick={onCreate} className="mt-5 rounded-lg bg-sky-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-sky-500">Első érdeklődés rögzítése</button></section>;
  return <section className="space-y-3">{grouped.map((group) => { const open = openGroups.has(group.key); const isDelayed = group.key === 'delayed'; const optional = ['quote', 'contract', 'finance'].includes(group.key); return <article key={group.key} className={`overflow-hidden rounded-2xl border bg-white shadow-sm ${isDelayed ? 'border-rose-200 bg-rose-50/60' : 'border-slate-200'} ${optional ? 'opacity-90' : ''}`}><button type="button" onClick={() => toggle(group.key)} aria-expanded={open} className={`flex w-full items-center gap-3 px-5 py-4 text-left ${isDelayed ? 'hover:bg-rose-50' : 'hover:bg-slate-50'}`}><span className={`text-xs text-slate-400 transition ${open ? 'rotate-90' : ''}`}>▶</span><span className="text-sm font-bold text-slate-800">{group.label}</span><span className="hidden text-xs text-slate-400 md:inline">{group.note}</span><span className={`ml-auto rounded-full px-2.5 py-1 text-xs font-bold ${isDelayed ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-600'}`}>{group.projects.length}</span></button>{open && <div>{group.projects.length === 0 ? <p className="border-t border-slate-200 px-5 py-5 text-xs text-slate-400">Jelenleg nincs projekt ebben a csoportban.</p> : group.projects.map((project) => <ProjectRow key={project.id} project={project} stage={currentStage(project)} onOpenModule={onOpenModule} onEditProject={onEditProject} onCloseProject={onCloseProject}/>)}</div>}</article>; })}</section>;
}
