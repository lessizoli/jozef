'use client';

import { signOut } from 'firebase/auth';
import { useEffect, useMemo, useState } from 'react';
import { auth } from '../lib/firebase';
import {
  createNewInquiry,
  type ModuleKey,
  type Project,
  subscribeToCompanyProjects,
  updateProjectModuleStatus,
} from '../lib/projectService';

const moduleLabels: Record<ModuleKey, string> = {
  survey: 'Felmérés',
  quote: 'Ajánlat',
  contract: 'Szerződés',
  construction: 'Kivitelezés',
  finance: 'Pénzügy',
};

const moduleStatuses: Record<ModuleKey, string[]> = {
  survey: ['Folyamatban', 'Kész', 'Csúszás'],
  quote: ['Intézendő', 'Kiküldve', 'Elutasítva', 'Elfogadva', 'Csúszás'],
  contract: ['Intézendő', 'Kiküldve', 'Aláírva', 'Csúszás'],
  construction: ['Intézendő', 'Folyamatban', 'Befejezve', 'Csúszás'],
  finance: ['Intézendő', 'Számlázva', 'Fizetve', 'Késedelem'],
};

const completedStatuses = ['Kész', 'Elfogadva', 'Aláírva', 'Befejezve', 'Fizetve'];
const delayedStatuses = ['Csúszás', 'Késedelem'];

function moduleClass(project: Project, key: ModuleKey) {
  const module = project.modules[key];
  if (!module.enabled) return 'border-slate-700 bg-slate-800 text-slate-600 cursor-not-allowed';
  if (completedStatuses.includes(module.status)) return 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300';
  if (delayedStatuses.includes(module.status)) return 'border-rose-500/40 bg-rose-500/15 text-rose-300';
  if (module.status === 'Folyamatban' || module.status === 'Kiküldve' || module.status === 'Számlázva') {
    return 'border-amber-500/40 bg-amber-500/15 text-amber-300';
  }
  return 'border-slate-700 bg-slate-800/80 text-slate-500';
}

export default function Dashboard() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [selectedModule, setSelectedModule] = useState<ModuleKey>('survey');
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: '', clientName: '', address: '', phone: '' });

  useEffect(() => {
    return subscribeToCompanyProjects('', (items) => {
      setProjects(items);
      setSelectedProject((current) =>
        current ? items.find((item) => item.id === current.id) ?? null : null,
      );
    });
  }, []);

  const delayedCount = useMemo(
    () => projects.filter((project) => project.status === 'Csúszás').length,
    [projects],
  );

  async function createProject(event: React.FormEvent) {
    event.preventDefault();
    if (!form.title.trim() || !form.clientName.trim()) return;

    setSaving(true);
    try {
      await createNewInquiry('', form.title, form.clientName, form.address, form.phone);
      setForm({ title: '', clientName: '', address: '', phone: '' });
      setShowCreate(false);
    } finally {
      setSaving(false);
    }
  }

  async function changeModuleStatus(status: string) {
    if (!selectedProject) return;
    setSaving(true);
    try {
      await updateProjectModuleStatus(selectedProject.id, selectedModule, status);
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-950/95">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-sky-400">Envision CRM</p>
            <h1 className="mt-1 text-xl font-bold">Projektkezelő</h1>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowCreate(true)} className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold hover:bg-sky-500">
              Új projekt
            </button>
            <button onClick={() => signOut(auth)} className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800">
              Kilépés
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl space-y-6 px-5 py-6">
        <section className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
            <p className="text-xs uppercase tracking-wider text-slate-500">Aktív projektek</p>
            <p className="mt-2 text-3xl font-bold">{projects.length}</p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
            <p className="text-xs uppercase tracking-wider text-slate-500">Csúszásban</p>
            <p className="mt-2 text-3xl font-bold text-rose-400">{delayedCount}</p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
            <p className="text-xs uppercase tracking-wider text-slate-500">Modulok</p>
            <p className="mt-2 text-3xl font-bold text-sky-400">5</p>
          </div>
        </section>

        <section className="space-y-4">
          {projects.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-700 bg-slate-900/50 p-10 text-center text-slate-500">
              Még nincs projekt. Hozd létre az elsőt az „Új projekt” gombbal.
            </div>
          ) : (
            projects.map((project) => (
              <article key={project.id} className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded bg-slate-800 px-2 py-1 text-xs font-semibold text-slate-300">{project.code}</span>
                      <span className={project.status === 'Csúszás' ? 'text-xs font-semibold text-rose-400' : 'text-xs font-semibold text-amber-400'}>
                        {project.lastAction ?? project.status}
                      </span>
                    </div>
                    <h2 className="mt-3 text-lg font-bold">{project.title}</h2>
                    <p className="mt-1 text-sm text-slate-400">{project.client.name} · {project.client.address || 'Nincs cím megadva'}</p>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedProject(project);
                      setSelectedModule('survey');
                    }}
                    className="rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-300 hover:border-sky-500 hover:text-sky-300"
                  >
                    Részletek és státuszok
                  </button>
                </div>

                <div className="mt-5 grid gap-2 sm:grid-cols-5">
                  {(Object.keys(moduleLabels) as ModuleKey[]).map((key) => (
                    <button
                      key={key}
                      disabled={!project.modules[key].enabled}
                      onClick={() => {
                        setSelectedProject(project);
                        setSelectedModule(key);
                      }}
                      className={`rounded-xl border p-3 text-left transition ${moduleClass(project, key)}`}
                    >
                      <span className="block text-xs font-bold uppercase tracking-wide">{moduleLabels[key]}</span>
                      <span className="mt-2 block text-sm">{project.modules[key].status}</span>
                    </button>
                  ))}
                </div>
              </article>
            ))
          )}
        </section>
      </div>

      {selectedProject && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60" onClick={() => setSelectedProject(null)}>
          <aside className="h-full w-full max-w-md overflow-y-auto border-l border-slate-700 bg-slate-900 p-6" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-slate-500">{selectedProject.code}</p>
                <h2 className="mt-1 text-xl font-bold">{selectedProject.title}</h2>
              </div>
              <button onClick={() => setSelectedProject(null)} className="rounded-lg bg-slate-800 px-3 py-2 text-slate-400">✕</button>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-2">
              {(Object.keys(moduleLabels) as ModuleKey[]).map((key) => (
                <button
                  key={key}
                  disabled={!selectedProject.modules[key].enabled}
                  onClick={() => setSelectedModule(key)}
                  className={`rounded-lg border px-3 py-2 text-left text-sm ${selectedModule === key ? 'border-sky-500 bg-sky-500/10 text-sky-300' : 'border-slate-700 text-slate-400'} disabled:opacity-40`}
                >
                  {moduleLabels[key]}
                </button>
              ))}
            </div>

            <div className="mt-6 rounded-xl border border-slate-700 bg-slate-950/60 p-4">
              <p className="text-xs uppercase tracking-wider text-slate-500">Kiválasztott modul</p>
              <h3 className="mt-1 text-lg font-bold">{moduleLabels[selectedModule]}</h3>
              <p className="mt-2 text-sm text-slate-400">Jelenlegi státusz: <span className="font-semibold text-slate-200">{selectedProject.modules[selectedModule].status}</span></p>

              <div className="mt-4 space-y-2">
                {moduleStatuses[selectedModule].map((status) => (
                  <button
                    key={status}
                    disabled={saving || status === selectedProject.modules[selectedModule].status}
                    onClick={() => changeModuleStatus(status)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-left text-sm hover:border-sky-500 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>
          </aside>
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4" onClick={() => setShowCreate(false)}>
          <form onSubmit={createProject} onClick={(event) => event.stopPropagation()} className="w-full max-w-lg space-y-4 rounded-2xl border border-slate-700 bg-slate-900 p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">Új projekt</h2>
              <button type="button" onClick={() => setShowCreate(false)} className="text-slate-400">✕</button>
            </div>
            <input required value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="Projekt megnevezése" className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-3 outline-none focus:border-sky-500" />
            <input required value={form.clientName} onChange={(event) => setForm({ ...form, clientName: event.target.value })} placeholder="Ügyfél neve" className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-3 outline-none focus:border-sky-500" />
            <input value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} placeholder="Helyszín / cím" className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-3 outline-none focus:border-sky-500" />
            <input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} placeholder="Telefonszám" className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-3 outline-none focus:border-sky-500" />
            <button disabled={saving} className="w-full rounded-lg bg-sky-600 px-4 py-3 font-semibold hover:bg-sky-500 disabled:opacity-50">
              {saving ? 'Mentés…' : 'Projekt létrehozása'}
            </button>
          </form>
        </div>
      )}
    </main>
  );
}
