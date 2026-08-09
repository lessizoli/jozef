'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { moduleKeys, moduleLabels } from '@/components/dashboard/dashboardConfig';
import { openConstructionPhoto, subscribeToConstructionEntries, type ConstructionEntry } from '@/lib/constructionService';
import { openProtectedAttachment, subscribeToProjectAttachments, type ProjectAttachment } from '@/lib/projectAttachments';
import { isProjectFinanceOverdue, subscribeToCompanyProjects, type Project } from '@/lib/projectService';

const completedStatuses = ['Kész', 'Elfogadva', 'Aláírva', 'Befejezve', 'Fizetve'];
const currency = new Intl.NumberFormat('hu-HU', { style: 'currency', currency: 'HUF', maximumFractionDigits: 0 });

function dateValue(value: unknown) {
  if (!value) return null;
  const source = value as { toDate?: () => Date };
  const date = typeof source.toDate === 'function' ? source.toDate() : new Date(String(value));
  return Number.isNaN(date.valueOf()) ? null : date;
}

function readableDate(value: unknown) { return dateValue(value)?.toLocaleString('hu-HU') ?? 'Nincs rögzítve'; }

function Info({ label, value }: { label: string; value?: React.ReactNode }) {
  return <div><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</p><div className="mt-1.5 text-sm font-semibold text-slate-700">{value || 'Nincs rögzítve'}</div></div>;
}

function Section({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="mb-5"><h2 className="text-lg font-bold text-slate-900">{title}</h2>{note && <p className="mt-1 text-sm text-slate-500">{note}</p>}</div>{children}</section>;
}

export default function FullProjectPage() {
  const params = useParams<{ id: string }>();
  const projectId = decodeURIComponent(params.id);
  const [projects, setProjects] = useState<Project[]>([]);
  const [attachments, setAttachments] = useState<ProjectAttachment[]>([]);
  const [entries, setEntries] = useState<ConstructionEntry[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => subscribeToCompanyProjects('', (items) => { setProjects(items); setLoaded(true); }), []);
  useEffect(() => {
    const stopAttachments = subscribeToProjectAttachments(projectId, setAttachments);
    const stopEntries = subscribeToConstructionEntries(projectId, setEntries);
    return () => { stopAttachments(); stopEntries(); };
  }, [projectId]);

  const project = useMemo(() => projects.find((item) => item.id === projectId) ?? null, [projectId, projects]);
  const notes = attachments.filter((item) => item.type === 'note');
  const images = attachments.filter((item) => item.type === 'image');
  const documents = attachments.filter((item) => item.type === 'document');
  const constructionLogs = entries.filter((item) => item.type === 'log');
  const constructionPhotos = entries.filter((item) => item.type === 'photo');

  if (!loaded) return <main className="grid min-h-screen place-items-center bg-slate-50 text-sm text-slate-500">Projekt betöltése…</main>;
  if (!project) return <main className="grid min-h-screen place-items-center bg-slate-50 p-6"><div className="text-center"><h1 className="text-xl font-bold text-slate-900">A projekt nem található</h1><Link href="/" className="mt-4 inline-block text-sm font-semibold text-sky-700">← Vissza a projektekhez</Link></div></main>;

  const overdue = isProjectFinanceOverdue(project);
  const completion = project.completionData;
  const phases = project.constructionData?.phases ?? [];

  return <main className="min-h-screen bg-slate-50 px-4 py-6 text-slate-900 sm:px-6"><div className="mx-auto max-w-7xl space-y-5">
    <header className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div><Link href="/" className="text-sm font-semibold text-sky-700 hover:text-sky-500">← Vissza a projektekhez</Link><div className="mt-4 flex flex-wrap items-center gap-2"><span className="rounded-md bg-sky-50 px-2.5 py-1 text-xs font-bold text-sky-700">{project.code}</span><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${project.closed ? 'bg-slate-100 text-slate-600' : overdue ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'}`}>{overdue ? 'Csúszásban' : project.status}</span></div><h1 className="mt-3 text-2xl font-bold sm:text-3xl">{project.title}</h1><p className="mt-2 text-sm text-slate-500">{project.lastAction || 'Nincs korábbi művelet'}</p></div>
        <div className="flex flex-wrap gap-2"><Link href={`/dokumentumok?project=${encodeURIComponent(project.id)}`} className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-sky-700 hover:border-sky-300">Anyagok kezelése</Link><a href="#folyamat" className="rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-sky-500">Projektfolyamat</a></div>
      </div>
    </header>

    <Section title="Alapadatok" note="Az ügyfél és a projekt legfontosabb adatai."><div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4"><Info label="Ügyfél" value={project.client.name}/><Info label="Telefonszám" value={project.client.phone ? <a className="text-sky-700" href={`tel:${project.client.phone}`}>{project.client.phone}</a> : undefined}/><Info label="E-mail" value={project.client.email ? <a className="text-sky-700" href={`mailto:${project.client.email}`}>{project.client.email}</a> : undefined}/><Info label="Cím" value={project.client.address}/><Info label="Létrehozva" value={readableDate(project.createdAt)}/><Info label="Utoljára frissítve" value={readableDate(project.updatedAt)}/><Info label="Csomag a létrehozáskor" value={project.moduleAccessSnapshot?.plan}/><Info label="Projektállapot" value={project.closed ? 'Lezárt' : project.status}/></div></Section>

    <Section title="Projektfolyamat" note="Az összes munkaszakasz, időpont és felelős egyetlen áttekintésben."><div id="folyamat" className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{moduleKeys.map((key, index) => { const item = project.modules[key]; const status = key === 'finance' && overdue ? 'Késedelem' : item.status; const complete = completedStatuses.includes(status); const delayed = ['Csúszás', 'Késedelem', 'Elutasítva'].includes(status); return <article key={key} className={`rounded-xl border p-4 ${!item.enabled ? 'border-slate-200 bg-slate-100 text-slate-400' : delayed ? 'border-rose-200 bg-rose-50' : complete ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'}`}><p className="text-[10px] font-bold uppercase tracking-wider opacity-60">{index + 1}. szakasz</p><div className="mt-2 flex items-center justify-between gap-3"><h3 className="font-bold">{moduleLabels[key]}</h3><span className="text-xs font-bold">{item.enabled ? status : 'Nem elérhető'}</span></div>{item.scheduledAt && <p className="mt-3 text-xs">Időpont: {item.scheduledAt}{item.scheduledTime ? ` · ${item.scheduledTime}` : ''}</p>}{item.assignedTo && <p className="mt-1 text-xs">Felelős: {item.assignedTo}</p>}{Boolean(item.completedAt) && <p className="mt-1 text-xs">Elkészült: {readableDate(item.completedAt)}</p>}</article>; })}</div></Section>

    <div className="grid gap-5 xl:grid-cols-2">
      <Section title="Ajánlat és szerződés"><div className="grid gap-5 sm:grid-cols-2"><div className="space-y-4"><h3 className="font-bold text-slate-800">Árajánlat</h3><Info label="Ajánlatszám" value={project.quoteData?.quoteNumber}/><Info label="Érvényes" value={project.quoteData?.validUntil}/><Info label="Bruttó összeg" value={project.quoteData ? currency.format(project.quoteData.grossTotal) : undefined}/><Info label="Megjegyzés" value={project.quoteData?.note}/></div><div className="space-y-4"><h3 className="font-bold text-slate-800">Szerződés</h3><Info label="Szerződésszám" value={project.contractData?.contractNumber}/><Info label="Munkaleírás" value={project.contractData?.workDescription}/><Info label="Bruttó összeg" value={project.contractData ? currency.format(project.contractData.grossAmount) : undefined}/><Info label="Aláírt dokumentum" value={project.contractData?.signedDocument?.fileName}/></div></div></Section>
      <Section title="Kivitelezés és átadás"><div className="space-y-5"><div><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Munkafázisok</p><div className="mt-2 flex flex-wrap gap-2">{phases.length ? phases.map((phase) => <span key={phase.id} className={`rounded-full px-3 py-1 text-xs font-semibold ${phase.completed ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{phase.completed ? '✓ ' : ''}{phase.title}</span>) : <span className="text-sm text-slate-500">Nincs munkafázis rögzítve.</span>}</div></div><div className="grid gap-4 sm:grid-cols-2"><Info label="Átadás dátuma" value={completion?.handoverDate}/><Info label="Átadás felelőse" value={completion?.responsibleName}/><Info label="Ügyfél visszaigazolta" value={completion ? (completion.customerConfirmed ? 'Igen' : 'Nem') : undefined}/><Info label="Hibák / utómunkák" value={completion?.defectNotes}/></div></div></Section>
    </div>

    {project.modules.finance.enabled && <Section title="Pénzügyi összefoglaló"><div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-5"><Info label="Számlaszám" value={project.financeData?.invoiceNumber}/><Info label="Bruttó összeg" value={project.financeData ? currency.format(project.financeData.grossAmount) : undefined}/><Info label="Számla dátuma" value={project.financeData?.invoiceDate}/><Info label="Fizetési határidő" value={project.financeData?.dueDate}/><Info label="Fizetve" value={project.financeData?.paidAt}/></div>{project.financeData?.note && <p className="mt-5 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">{project.financeData.note}</p>}</Section>}

    <Section title="Képek, feljegyzések és dokumentumok" note={`${images.length + constructionPhotos.length} kép · ${notes.length + constructionLogs.length} feljegyzés · ${documents.length} dokumentum`}>
      <div className="grid gap-5 lg:grid-cols-3">
        <div><h3 className="font-bold text-slate-800">Képek</h3><div className="mt-3 space-y-2">{images.map((item) => <button key={item.id} onClick={() => void openProtectedAttachment(item)} className="flex w-full items-center justify-between rounded-lg border border-slate-200 p-3 text-left text-sm hover:border-sky-300"><span className="truncate">{item.fileName || 'Projektkép'}</span><span className="text-xs font-bold text-sky-700">Megnyitás</span></button>)}{constructionPhotos.map((item) => <button key={item.id} disabled={!item.storagePath} onClick={() => item.storagePath && void openConstructionPhoto(item.storagePath)} className="flex w-full items-center justify-between rounded-lg border border-slate-200 p-3 text-left text-sm hover:border-sky-300 disabled:opacity-50"><span className="truncate">{item.fileName || 'Helyszíni kép'}</span><span className="text-xs font-bold text-sky-700">Megnyitás</span></button>)}{images.length + constructionPhotos.length === 0 && <p className="text-sm text-slate-400">Nincs feltöltött kép.</p>}</div></div>
        <div><h3 className="font-bold text-slate-800">Feljegyzések</h3><div className="mt-3 space-y-2">{[...notes.map((item) => ({ id: item.id, text: item.text, date: item.createdAt })), ...constructionLogs.map((item) => ({ id: item.id, text: item.text, date: item.createdAt }))].map((item) => <article key={item.id} className="rounded-lg border border-slate-200 p-3"><p className="whitespace-pre-wrap text-sm text-slate-700">{item.text}</p><p className="mt-2 text-[11px] text-slate-400">{readableDate(item.date)}</p></article>)}{notes.length + constructionLogs.length === 0 && <p className="text-sm text-slate-400">Nincs feljegyzés.</p>}</div></div>
        <div><h3 className="font-bold text-slate-800">Dokumentumok</h3><div className="mt-3 space-y-2">{documents.map((item) => <button key={item.id} onClick={() => void openProtectedAttachment(item)} className="flex w-full items-center justify-between rounded-lg border border-slate-200 p-3 text-left text-sm hover:border-sky-300"><span className="min-w-0"><span className="block truncate font-semibold">{item.title || item.fileName}</span><span className="text-xs text-slate-400">{item.moduleKey ? (item.moduleKey === 'general' ? 'Általános' : moduleLabels[item.moduleKey]) : 'Általános'}</span></span><span className="ml-3 text-xs font-bold text-sky-700">Megnyitás</span></button>)}{project.contractData?.signedDocument && <div className="rounded-lg border border-slate-200 p-3 text-sm"><p className="font-semibold">{project.contractData.signedDocument.fileName}</p><p className="mt-1 text-xs text-slate-400">Aláírt szerződés</p></div>}{documents.length === 0 && !project.contractData?.signedDocument && <p className="text-sm text-slate-400">Nincs feltöltött dokumentum.</p>}</div></div>
      </div>
      <Link href={`/dokumentumok?project=${encodeURIComponent(project.id)}`} className="mt-5 inline-flex rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-sky-500">Összes projektanyag kezelése</Link>
    </Section>
  </div></main>;
}
