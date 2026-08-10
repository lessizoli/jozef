import { useEffect, useState } from 'react';
import { getProjectModuleDisplayStatus, type Project } from '@/lib/projectService';
import { addConstructionLog, finishConstruction, openConstructionPhoto, saveConstructionPhases, setConstructionRunning, subscribeToConstructionEntries, uploadConstructionPhoto, type ConstructionEntry, type ConstructionPhase } from '@/lib/constructionService';

type Props = { project: Project; saving: boolean; onRun: (action: () => Promise<void>, message: string) => void };
function timestamp(value: unknown) { return value && typeof value === 'object' && 'toDate' in value ? (value as { toDate: () => Date }).toDate().toLocaleString('hu-HU') : ''; }

export default function ConstructionEditor({ project, saving, onRun }: Props) {
  const [entries, setEntries] = useState<ConstructionEntry[]>([]); const [log, setLog] = useState('');
  const [phases, setPhases] = useState<ConstructionPhase[]>(project.constructionData?.phases ?? []); const constructionModule = project.modules.construction;
  useEffect(() => subscribeToConstructionEntries(project.id, setEntries), [project.id]);
  return <div className="mt-6 space-y-5">
    <section className="rounded-xl border border-slate-700 bg-slate-950/60 p-4">
      <p className="text-xs uppercase tracking-wider text-slate-500">Ütemezés és csapat</p>
      <p className="mt-2 text-sm text-slate-200">{constructionModule.scheduledAt || 'Nincs dátum'} {constructionModule.scheduledTime || ''}</p>
      <p className="mt-1 text-sm text-slate-400">{constructionModule.assignedTo || 'Nincs csapat vagy felelős hozzárendelve'}</p><p className="mt-3 text-sm">Státusz: <strong>{getProjectModuleDisplayStatus(project, 'construction')}</strong></p>
      <div className="mt-4 grid grid-cols-2 gap-2"><button disabled={saving || constructionModule.status === 'Folyamatban'} onClick={() => onRun(() => setConstructionRunning(project.id), 'A kivitelezés elindult.')} className="rounded-lg bg-amber-500 px-3 py-2 text-sm font-bold text-slate-950 disabled:opacity-40">Indítás</button><button disabled={saving || constructionModule.status === 'Befejezve'} onClick={() => onRun(() => finishConstruction(project.id, project.modules.completion.enabled), 'A kivitelezés befejeződött.')} className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-bold disabled:opacity-40">Befejezés</button></div>
    </section>
    <section className="rounded-xl border border-slate-700 bg-slate-950/60 p-4">
      <div className="flex items-center justify-between"><h3 className="font-bold">Munkafázisok</h3><button type="button" onClick={() => setPhases((items) => [...items, { id: crypto.randomUUID(), title: '', completed: false }])} className="text-sm text-sky-300">+ Fázis</button></div>
      <div className="mt-3 space-y-2">{phases.map((phase, index) => <div key={phase.id} className="flex gap-2"><input type="checkbox" checked={phase.completed} onChange={(event) => setPhases((items) => items.map((item, i) => i === index ? { ...item, completed: event.target.checked } : item))} /><input value={phase.title} placeholder="Munkafázis megnevezése" onChange={(event) => setPhases((items) => items.map((item, i) => i === index ? { ...item, title: event.target.value } : item))} className="min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm" /></div>)}</div>
      <button disabled={saving} onClick={() => onRun(() => saveConstructionPhases(project.id, phases.filter((phase) => phase.title.trim())), 'A munkafázisok mentve.')} className="mt-3 w-full rounded-lg bg-sky-600 px-3 py-2 text-sm font-semibold disabled:opacity-40">Munkafázisok mentése</button>
    </section>
    <section className="rounded-xl border border-slate-700 bg-slate-950/60 p-4"><h3 className="font-bold">Kivitelezési napló</h3><textarea value={log} onChange={(event) => setLog(event.target.value)} rows={3} placeholder="Mai munka, eltérés, egyeztetés…" className="mt-3 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm" /><button disabled={saving || !log.trim()} onClick={() => onRun(async () => { await addConstructionLog(project.id, log); setLog(''); }, 'Naplóbejegyzés hozzáadva.')} className="mt-2 w-full rounded-lg bg-slate-700 px-3 py-2 text-sm font-semibold disabled:opacity-40">Bejegyzés hozzáadása</button></section>
    <section className="rounded-xl border border-slate-700 bg-slate-950/60 p-4"><h3 className="font-bold">Helyszíni képek</h3><label className="mt-3 block cursor-pointer rounded-lg border border-dashed border-slate-600 px-3 py-4 text-center text-sm text-sky-300">+ Kép feltöltése<input type="file" accept="image/*" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) onRun(() => uploadConstructionPhoto(project.id, file), 'A helyszíni kép feltöltve.'); event.currentTarget.value = ''; }} /></label></section>
    <section className="space-y-2">{entries.map((entry) => <article key={entry.id} className="rounded-lg border border-slate-700 bg-slate-950/60 p-3 text-sm">{entry.type === 'photo' && entry.storagePath ? <button className="font-semibold text-sky-300" onClick={() => onRun(() => openConstructionPhoto(entry.storagePath as string), 'A kép új lapon megnyílt.')}>📷 {entry.fileName}</button> : <p className="whitespace-pre-wrap">{entry.text}</p>}<p className="mt-2 text-xs text-slate-500">{entry.createdByName} · {timestamp(entry.createdAt)}</p></article>)}</section>
  </div>;
}
