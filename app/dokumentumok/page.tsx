'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { moduleLabels } from '@/components/dashboard/dashboardConfig';
import { addProjectNote, deleteProjectAttachment, openProtectedAttachment, subscribeToProjectAttachments, uploadProjectDocument, uploadProjectImage, type ProjectAttachment } from '@/lib/projectAttachments';
import { subscribeToCompanyProjects, type ModuleKey, type Project } from '@/lib/projectService';

type Scope = ModuleKey | 'general';
const scopes: Scope[] = ['general', 'survey', 'quote', 'contract', 'construction', 'completion', 'finance'];
function scopeLabel(scope: Scope) { return scope === 'general' ? 'Általános' : moduleLabels[scope]; }
function readableSize(size?: number) { if (!size) return ''; return size < 1024 * 1024 ? `${Math.round(size / 1024)} KB` : `${(size / 1024 / 1024).toFixed(1)} MB`; }

export default function ProjectDocumentsPage() {
  const [projects, setProjects] = useState<Project[]>([]); const [projectId, setProjectId] = useState('');
  const [items, setItems] = useState<ProjectAttachment[]>([]); const [scope, setScope] = useState<Scope>('general');
  const [phaseId, setPhaseId] = useState(''); const [filter, setFilter] = useState<Scope | 'all'>('all');
  const [note, setNote] = useState(''); const [documentTitle, setDocumentTitle] = useState('');
  const [saving, setSaving] = useState(false); const [error, setError] = useState('');
  useEffect(() => subscribeToCompanyProjects('', (value) => { setProjects(value); setProjectId((current) => current || value[0]?.id || ''); }), []);
  useEffect(() => projectId ? subscribeToProjectAttachments(projectId, setItems) : undefined, [projectId]);
  const project = useMemo(() => projects.find((item) => item.id === projectId) ?? null, [projects, projectId]);
  const phases = project?.constructionData?.phases ?? [];
  const visibleItems = items.filter((item) => filter === 'all' || (item.moduleKey ?? 'general') === filter);

  async function run(action: () => Promise<void>) { setSaving(true); setError(''); try { await action(); } catch (caught) { setError(caught instanceof Error ? caught.message : 'A művelet sikertelen.'); } finally { setSaving(false); } }
  function currentPhase() { return scope === 'construction' && phaseId ? phaseId : null; }
  function uploadFile(event: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'document') {
    const file = event.target.files?.[0]; event.target.value = ''; if (!file || !projectId) return;
    void run(async () => {
      if (type === 'image') await uploadProjectImage(projectId, file, scope, currentPhase());
      else await uploadProjectDocument(projectId, file, { title: documentTitle, moduleKey: scope, phaseId: currentPhase() });
      setDocumentTitle('');
    });
  }

  return <main className="min-h-screen bg-slate-950 px-5 py-6 text-slate-100"><div className="mx-auto max-w-7xl space-y-6">
    <header className="flex flex-col gap-4 rounded-2xl border border-slate-800 bg-slate-900 p-5 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-xs font-semibold uppercase tracking-[.22em] text-sky-400">Envision CRM</p><h1 className="mt-1 text-2xl font-bold">Projekt dokumentumtár</h1><p className="mt-1 text-sm text-slate-500">Jegyzetek, képek és dokumentumok modul és munkafázis szerint.</p></div><Link href="/" className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-semibold">← Projektek</Link></header>
    <section className="grid gap-4 rounded-2xl border border-slate-800 bg-slate-900 p-5 lg:grid-cols-3">
      <label className="text-xs font-semibold uppercase text-slate-500">Projekt<select value={projectId} onChange={(event) => setProjectId(event.target.value)} className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-3 text-sm text-slate-100">{projects.length === 0 && <option value="">Nincs projekt</option>}{projects.map((item) => <option key={item.id} value={item.id}>{item.code} · {item.title}</option>)}</select></label>
      <label className="text-xs font-semibold uppercase text-slate-500">Új elem helye<select value={scope} onChange={(event) => { setScope(event.target.value as Scope); setPhaseId(''); }} className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-3 text-sm text-slate-100">{scopes.map((item) => <option key={item} value={item}>{scopeLabel(item)}</option>)}</select></label>
      <label className="text-xs font-semibold uppercase text-slate-500">Lista szűrése<select value={filter} onChange={(event) => setFilter(event.target.value as Scope | 'all')} className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-3 text-sm text-slate-100"><option value="all">Minden modul</option>{scopes.map((item) => <option key={item} value={item}>{scopeLabel(item)}</option>)}</select></label>
      {scope === 'construction' && phases.length > 0 && <label className="text-xs font-semibold uppercase text-slate-500 lg:col-start-2">Kivitelezési munkafázis<select value={phaseId} onChange={(event) => setPhaseId(event.target.value)} className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-3 text-sm text-slate-100"><option value="">Teljes kivitelezés</option>{phases.map((phase) => <option key={phase.id} value={phase.id}>{phase.title}</option>)}</select></label>}
    </section>
    {error && <div role="alert" className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-4 text-sm text-rose-200">{error}</div>}
    <section className="grid gap-5 lg:grid-cols-3">
      <form onSubmit={(event) => { event.preventDefault(); if (note.trim()) void run(async () => { await addProjectNote(projectId, note, scope, currentPhase()); setNote(''); }); }} className="rounded-2xl border border-slate-800 bg-slate-900 p-5"><h2 className="font-bold">Szöveges jegyzet</h2><textarea rows={5} value={note} onChange={(event) => setNote(event.target.value)} className="mt-4 w-full rounded-xl border border-slate-700 bg-slate-950 p-3" placeholder="Jegyzet…"/><button disabled={saving || !projectId || !note.trim()} className="mt-3 w-full rounded-lg bg-sky-600 px-4 py-2.5 font-semibold disabled:opacity-40">Hozzáadás</button></form>
      <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5"><h2 className="font-bold">Kép</h2><p className="mt-1 text-sm text-slate-500">JPG, PNG, WEBP · legfeljebb 15 MB</p><label className="mt-5 block cursor-pointer rounded-xl border-2 border-dashed border-slate-700 p-8 text-center font-semibold hover:border-sky-500">+ Kép feltöltése<input type="file" accept="image/*" className="hidden" disabled={saving || !projectId} onChange={(event) => uploadFile(event, 'image')} /></label></section>
      <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5"><h2 className="font-bold">Dokumentum</h2><input value={documentTitle} onChange={(event) => setDocumentTitle(event.target.value)} placeholder="Dokumentum megnevezése (opcionális)" className="mt-4 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5"/><label className="mt-3 block cursor-pointer rounded-xl border-2 border-dashed border-slate-700 p-5 text-center font-semibold hover:border-sky-500">+ Dokumentum feltöltése<input type="file" className="hidden" disabled={saving || !projectId} onChange={(event) => uploadFile(event, 'document')} /></label><p className="mt-2 text-xs text-slate-500">PDF, Word, Excel és más fájlok · legfeljebb 25 MB</p></section>
    </section>
    <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5"><div className="flex items-center justify-between"><h2 className="text-lg font-bold">Projektanyagok</h2><span className="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-400">{visibleItems.length}</span></div><div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">{visibleItems.length === 0 ? <p className="col-span-full rounded-xl border border-dashed border-slate-700 p-8 text-center text-sm text-slate-500">Nincs elem ebben a nézetben.</p> : visibleItems.map((item) => { const itemScope = item.moduleKey ?? 'general'; const phase = phases.find((entry) => entry.id === item.phaseId); return <article key={item.id} className="rounded-xl border border-slate-700 bg-slate-950/60 p-4"><div className="flex gap-2 text-xs"><span className="rounded bg-slate-800 px-2 py-1 text-sky-300">{scopeLabel(itemScope)}</span>{phase && <span className="rounded bg-slate-800 px-2 py-1 text-slate-400">{phase.title}</span>}</div><h3 className="mt-3 truncate font-semibold">{item.type === 'note' ? 'Jegyzet' : item.title || item.fileName}</h3>{item.type === 'note' ? <p className="mt-2 line-clamp-5 whitespace-pre-wrap text-sm text-slate-300">{item.text}</p> : <p className="mt-1 text-xs text-slate-500">{item.fileName} · {readableSize(item.size)}</p>}<div className="mt-4 flex gap-4">{item.type !== 'note' && <button onClick={() => void run(() => openProtectedAttachment(item))} className="text-xs font-semibold text-sky-300">Megnyitás</button>}<button disabled={saving} onClick={() => { if (window.confirm('Biztosan törlöd?')) void run(() => deleteProjectAttachment(projectId, item)); }} className="text-xs font-semibold text-rose-400">Törlés</button></div></article>; })}</div></section>
  </div></main>;
}
