'use client';

import { signOut } from 'firebase/auth';
import { useEffect, useMemo, useState } from 'react';
import { auth } from '../lib/firebase';
import {
  createNewInquiry,
  type ModuleKey,
  type Project,
  subscribeToCompanyProjects,
  updateProjectModuleDate,
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
const activeStatuses = ['Folyamatban', 'Kiküldve', 'Számlázva'];
const moduleKeys = Object.keys(moduleLabels) as ModuleKey[];
const weekdayLabels = ['H', 'K', 'Sze', 'Cs', 'P', 'Szo', 'V'];

function moduleClass(project: Project, key: ModuleKey) {
  const module = project.modules[key];
  if (!module.enabled) return 'border-slate-700 bg-slate-900 text-slate-600 cursor-not-allowed';
  if (completedStatuses.includes(module.status)) return 'border-emerald-500 bg-emerald-500/20 text-emerald-200';
  if (delayedStatuses.includes(module.status)) return 'border-rose-500 bg-rose-500/20 text-rose-200';
  if (activeStatuses.includes(module.status)) return 'border-amber-500 bg-amber-500/20 text-amber-100';
  return 'border-slate-600 bg-slate-800 text-slate-300';
}

function isoDate(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function getCalendarDays(month: Date) {
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const firstDay = new Date(year, monthIndex, 1);
  const lastDay = new Date(year, monthIndex + 1, 0);
  const mondayOffset = (firstDay.getDay() + 6) % 7;
  const days: Array<{ date: string; day: number; currentMonth: boolean }> = [];

  const previousMonthLastDay = new Date(year, monthIndex, 0).getDate();
  for (let index = mondayOffset - 1; index >= 0; index -= 1) {
    const day = previousMonthLastDay - index;
    const previous = new Date(year, monthIndex - 1, day);
    days.push({
      date: isoDate(previous.getFullYear(), previous.getMonth(), previous.getDate()),
      day,
      currentMonth: false,
    });
  }

  for (let day = 1; day <= lastDay.getDate(); day += 1) {
    days.push({ date: isoDate(year, monthIndex, day), day, currentMonth: true });
  }

  let nextDay = 1;
  while (days.length < 42) {
    const next = new Date(year, monthIndex + 1, nextDay);
    days.push({
      date: isoDate(next.getFullYear(), next.getMonth(), next.getDate()),
      day: nextDay,
      currentMonth: false,
    });
    nextDay += 1;
  }

  return days;
}

export default function Dashboard() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [selectedModule, setSelectedModule] = useState<ModuleKey>('survey');
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [view, setView] = useState<'projects' | 'calendar'>('projects');
  const [calendarMonth, setCalendarMonth] = useState(() => new Date());
  const [form, setForm] = useState({ title: '', clientName: '', address: '', phone: '' });

  useEffect(() => subscribeToCompanyProjects('', (items) => {
    setProjects(items);
    setSelectedProject((current) => current ? items.find((item) => item.id === current.id) ?? null : null);
  }), []);

  const delayedCount = useMemo(
    () => projects.filter((project) => project.status === 'Csúszás').length,
    [projects],
  );

  const calendarDays = useMemo(() => getCalendarDays(calendarMonth), [calendarMonth]);

  const calendarEvents = useMemo(() => {
    return projects.flatMap((project) => moduleKeys.flatMap((moduleKey) => {
      const date = project.modules[moduleKey].scheduledAt;
      if (!date) return [];
      return [{ project, moduleKey, date }];
    }));
  }, [projects]);

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

  async function changeModuleDate(date: string) {
    if (!selectedProject) return;
    setSaving(true);
    try {
      await updateProjectModuleDate(selectedProject.id, selectedModule, date || null);
    } finally {
      setSaving(false);
    }
  }

  function openModule(project: Project, key: ModuleKey) {
    setSelectedProject(project);
    setSelectedModule(key);
  }

  function moveMonth(offset: number) {
    setCalendarMonth((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1));
  }

  const monthTitle = calendarMonth.toLocaleDateString('hu-HU', {
    year: 'numeric',
    month: 'long',
  });

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <header className="sticky top-0 z-30 border-b border-slate-800 bg-slate-950/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-sky-400">Envision CRM</p>
            <h1 className="mt-1 text-xl font-bold">Projektkezelő</h1>
          </div>

          <nav className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setView('projects')}
              className={`rounded-lg px-4 py-2 text-sm font-semibold ${view === 'projects' ? 'bg-sky-600 text-white' : 'border border-slate-700 text-slate-300 hover:bg-slate-800'}`}
            >
              Projektek
            </button>
            <button
              onClick={() => setView('calendar')}
              className={`rounded-lg px-4 py-2 text-sm font-semibold ${view === 'calendar' ? 'bg-sky-600 text-white' : 'border border-slate-700 text-slate-300 hover:bg-slate-800'}`}
            >
              Naptár
            </button>
            <button onClick={() => setShowCreate(true)} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold hover:bg-emerald-500">
              + Új érdeklődés
            </button>
            <button onClick={() => signOut(auth)} className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800">
              Kilépés
            </button>
          </nav>
        </div>
      </header>

      <div className="mx-auto max-w-7xl space-y-7 px-5 py-6">
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
            <p className="text-xs uppercase tracking-wider text-slate-500">Naptárbejegyzések</p>
            <p className="mt-2 text-3xl font-bold text-sky-400">{calendarEvents.length}</p>
          </div>
        </section>

        {view === 'projects' ? (
          <section className="space-y-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-bold">Projektek</h2>
                <p className="text-sm text-slate-500">Minden projekt teljes folyamata egy kártyán.</p>
              </div>
              <span className="text-xs text-slate-500">Zöld: kész · Sárga: folyamatban · Piros: csúszás · Szürke: még nem aktív</span>
            </div>

            {projects.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/50 p-10 text-center">
                <p className="font-semibold text-slate-300">Még nincs projekt ebben a cégben.</p>
                <button onClick={() => setShowCreate(true)} className="mt-5 rounded-lg bg-sky-600 px-5 py-2.5 text-sm font-semibold hover:bg-sky-500">
                  Első érdeklődés rögzítése
                </button>
              </div>
            ) : projects.map((project) => (
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
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                  {moduleKeys.map((key, index) => (
                    <button
                      key={key}
                      disabled={!project.modules[key].enabled}
                      onClick={() => openModule(project, key)}
                      className={`min-h-28 rounded-xl border-2 p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg ${moduleClass(project, key)}`}
                    >
                      <span className="block text-[11px] font-bold uppercase tracking-[0.16em] opacity-70">{index + 1}. szakasz</span>
                      <span className="mt-2 block text-base font-bold">{moduleLabels[key]}</span>
                      <span className="mt-2 block text-sm font-medium">{project.modules[key].status}</span>
                      {project.modules[key].scheduledAt && (
                        <span className="mt-2 block text-xs opacity-80">{project.modules[key].scheduledAt}</span>
                      )}
                    </button>
                  ))}
                </div>
              </article>
            ))}
          </section>
        ) : (
          <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-xl">
            <div className="flex flex-col gap-4 border-b border-slate-800 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-bold capitalize">{monthTitle}</h2>
                <p className="mt-1 text-sm text-slate-500">Felmérések, kivitelezések és minden ütemezett projektfeladat egy helyen.</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => moveMonth(-1)} className="rounded-lg border border-slate-700 px-3 py-2 hover:bg-slate-800">←</button>
                <button onClick={() => setCalendarMonth(new Date())} className="rounded-lg border border-slate-700 px-4 py-2 text-sm hover:bg-slate-800">Ma</button>
                <button onClick={() => moveMonth(1)} className="rounded-lg border border-slate-700 px-3 py-2 hover:bg-slate-800">→</button>
              </div>
            </div>

            <div className="grid grid-cols-7 border-b border-slate-800 bg-slate-950/40">
              {weekdayLabels.map((label) => (
                <div key={label} className="p-3 text-center text-xs font-bold uppercase text-slate-500">{label}</div>
              ))}
            </div>

            <div className="grid grid-cols-7">
              {calendarDays.map((day) => {
                const events = calendarEvents.filter((event) => event.date === day.date);
                const isToday = day.date === isoDate(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());
                return (
                  <div key={day.date} className={`min-h-32 border-b border-r border-slate-800 p-2 ${day.currentMonth ? 'bg-slate-900' : 'bg-slate-950/50 text-slate-600'}`}>
                    <div className={`mb-2 grid h-7 w-7 place-items-center rounded-full text-xs font-semibold ${isToday ? 'bg-sky-600 text-white' : ''}`}>
                      {day.day}
                    </div>
                    <div className="space-y-1.5">
                      {events.slice(0, 3).map((event) => (
                        <button
                          key={`${event.project.id}-${event.moduleKey}`}
                          onClick={() => openModule(event.project, event.moduleKey)}
                          className="block w-full rounded-md border border-sky-500/30 bg-sky-500/10 px-2 py-1.5 text-left text-[11px] text-sky-200 hover:bg-sky-500/20"
                        >
                          <span className="block truncate font-bold">{moduleLabels[event.moduleKey]}</span>
                          <span className="block truncate opacity-80">{event.project.code} · {event.project.client.name}</span>
                        </button>
                      ))}
                      {events.length > 3 && <p className="text-[10px] text-slate-500">+{events.length - 3} további</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </div>

      {selectedProject && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60" onClick={() => setSelectedProject(null)}>
          <aside className="h-full w-full max-w-md overflow-y-auto border-l border-slate-700 bg-slate-900 p-6 shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-slate-500">{selectedProject.code}</p>
                <h2 className="mt-1 text-xl font-bold">{selectedProject.title}</h2>
                <p className="mt-1 text-sm text-slate-400">{selectedProject.client.name}</p>
              </div>
              <button onClick={() => setSelectedProject(null)} className="rounded-lg bg-slate-800 px-3 py-2 text-slate-400">✕</button>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-2">
              {moduleKeys.map((key) => (
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

              <label className="mt-5 block text-xs font-semibold uppercase tracking-wider text-slate-500">Időpont</label>
              <input
                type="date"
                value={selectedProject.modules[selectedModule].scheduledAt ?? ''}
                onChange={(event) => changeModuleDate(event.target.value)}
                disabled={saving}
                className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm outline-none focus:border-sky-500"
              />

              <div className="mt-5 space-y-2">
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

      <div
        className={`fixed inset-0 z-50 bg-black/60 transition-opacity duration-300 ${showCreate ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'}`}
        onClick={() => setShowCreate(false)}
      >
        <aside
          className={`ml-auto h-full w-full max-w-md overflow-y-auto border-l border-slate-700 bg-slate-900 p-6 shadow-2xl transition-transform duration-300 ease-out ${showCreate ? 'translate-x-0' : 'translate-x-full'}`}
          onClick={(event) => event.stopPropagation()}
        >
          <form onSubmit={createProject} className="space-y-5">
            <div className="flex items-start justify-between border-b border-slate-800 pb-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-400">Új érdeklődés</p>
                <h2 className="mt-2 text-xl font-bold">Gyors projektindítás</h2>
                <p className="mt-1 text-sm text-slate-500">Az érdeklődésből automatikusan létrejön a projekt Felmérés státuszban.</p>
              </div>
              <button type="button" onClick={() => setShowCreate(false)} className="rounded-lg bg-slate-800 px-3 py-2 text-slate-400">✕</button>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-400">Projekt megnevezése *</label>
              <input required value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="pl. Családi ház szigetelése" className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-3 outline-none focus:border-sky-500" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-400">Ügyfél neve *</label>
              <input required value={form.clientName} onChange={(event) => setForm({ ...form, clientName: event.target.value })} placeholder="pl. Kovács Péter" className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-3 outline-none focus:border-sky-500" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-400">Helyszín / cím</label>
              <input value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} placeholder="pl. 1112 Budapest, Példa utca 12." className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-3 outline-none focus:border-sky-500" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-400">Telefonszám</label>
              <input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} placeholder="pl. +36 30 123 4567" className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-3 outline-none focus:border-sky-500" />
            </div>

            <button disabled={saving} className="w-full rounded-lg bg-emerald-600 px-4 py-3 font-semibold hover:bg-emerald-500 disabled:opacity-50">
              {saving ? 'Mentés…' : 'Érdeklődés rögzítése'}
            </button>
          </form>
        </aside>
      </div>
    </main>
  );
}
