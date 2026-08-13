'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import DashboardHeader from '@/components/dashboard/DashboardHeader';
import { moduleLabels } from '@/components/dashboard/dashboardConfig';
import { subscribeToConstructionEntries, type ConstructionEntry } from '@/lib/constructionService';
import { downloadProjectContract, downloadSignedContract, openProjectContract } from '@/lib/contractService';
import { downloadProjectInvoice } from '@/lib/financeService';
import {
  addProjectNote,
  deleteProjectAttachment,
  downloadProtectedAttachment,
  downloadProtectedStorageFile,
  getProtectedStoragePreview,
  openProtectedAttachment,
  openProtectedStorageFile,
  subscribeToProjectAttachments,
  uploadProjectDocument,
  uploadProjectImage,
  type ProjectAttachment,
} from '@/lib/projectAttachments';
import { subscribeToCompanyProjects, type ModuleKey, type Project } from '@/lib/projectService';
import { downloadProjectQuote, openProjectQuote } from '@/lib/quoteService';
import { getUserContext, subscribeToMembers, type CompanyMember } from '@/lib/teamService';
import { useI18n } from '@/lib/i18n';

type Scope = ModuleKey | 'general';
type MaterialKind = 'attachment' | 'construction' | 'quote-pdf' | 'contract-pdf' | 'signed-contract' | 'invoice';
type ProjectMaterial = {
  id: string;
  kind: MaterialKind;
  moduleKey: Scope;
  phaseId?: string | null;
  typeLabel: string;
  title: string;
  text?: string;
  fileName?: string;
  size?: number;
  createdAt?: unknown;
  createdBy?: string;
  attachment?: ProjectAttachment;
  storagePath?: string;
};

const scopes: Scope[] = ['general', 'survey', 'quote', 'contract', 'construction', 'completion', 'finance'];
function scopeLabel(scope: Scope) { return scope === 'general' ? 'Általános' : moduleLabels[scope]; }
function readableSize(size?: number) { if (!size) return ''; return size < 1024 * 1024 ? `${Math.max(1, Math.round(size / 1024))} KB` : `${(size / 1024 / 1024).toFixed(1)} MB`; }
function dateValue(value: unknown) {
  if (!value) return null;
  const timestamp = value as { toDate?: () => Date };
  const date = typeof timestamp.toDate === 'function' ? timestamp.toDate() : new Date(String(value));
  return Number.isNaN(date.valueOf()) ? null : date;
}
function readableDate(value: unknown, locale = 'hu-HU', empty = 'Nincs dátum') { return dateValue(value)?.toLocaleString(locale) ?? empty; }
function timestamp(value: unknown) { return dateValue(value)?.valueOf() ?? 0; }
function isImageMaterial(item: ProjectMaterial) {
  return (item.kind === 'attachment' && item.attachment?.type === 'image')
    || (item.kind === 'construction' && Boolean(item.storagePath));
}

function MaterialThumbnail({ item }: { item: ProjectMaterial }) {
  const { t } = useI18n();
  const [url, setUrl] = useState('');
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (!item.storagePath) return undefined;
    let active = true;
    let objectUrl = '';
    void getProtectedStoragePreview(item.storagePath).then((value) => {
      objectUrl = value;
      if (active) setUrl(value);
      else URL.revokeObjectURL(value);
    }).catch(() => { if (active) setFailed(true); });
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [item.storagePath]);

  return url
    ? <Image src={url} alt={item.title} fill unoptimized sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw" className="object-cover transition duration-200 group-hover:scale-105" />
    : <div className="flex h-full items-center justify-center bg-slate-100 px-3 text-center text-xs font-medium text-slate-500">{failed ? t('Az előnézet nem tölthető be') : t('Kép betöltése…')}</div>;
}

export default function ProjectDocumentsPage() {
  const { t } = useI18n();
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectId, setProjectId] = useState('');
  const [attachments, setAttachments] = useState<ProjectAttachment[]>([]);
  const [constructionEntries, setConstructionEntries] = useState<ConstructionEntry[]>([]);
  const [members, setMembers] = useState<CompanyMember[]>([]);
  const [scope, setScope] = useState<Scope>('general');
  const [phaseId, setPhaseId] = useState('');
  const [filter, setFilter] = useState<Scope | 'all'>('all');
  const [note, setNote] = useState('');
  const [documentTitle, setDocumentTitle] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [viewerPreview, setViewerPreview] = useState<{ storagePath: string; url: string; failed: boolean } | null>(null);

  useEffect(() => subscribeToCompanyProjects('', (value) => {
    setProjects(value);
    setProjectId((current) => {
      if (current && value.some((item) => item.id === current)) return current;
      const requested = new URLSearchParams(window.location.search).get('project');
      return requested && value.some((item) => item.id === requested) ? requested : value[0]?.id ?? '';
    });
  }), []);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    let cancelled = false;
    void getUserContext().then((context) => {
      if (!cancelled) unsubscribe = subscribeToMembers(context.companyId, setMembers);
    }).catch(() => undefined);
    return () => { cancelled = true; unsubscribe?.(); };
  }, []);

  useEffect(() => {
    if (!projectId) return undefined;
    const unsubscribeAttachments = subscribeToProjectAttachments(projectId, setAttachments);
    const unsubscribeConstruction = subscribeToConstructionEntries(projectId, setConstructionEntries);
    return () => { unsubscribeAttachments(); unsubscribeConstruction(); };
  }, [projectId]);

  const project = useMemo(() => projects.find((item) => item.id === projectId) ?? null, [projects, projectId]);
  const phases = project?.constructionData?.phases ?? [];
  const memberNames = useMemo(() => new Map(members.map((member) => [member.uid, member.fullName])), [members]);

  const materials = useMemo<ProjectMaterial[]>(() => {
    if (!project) return [];
    const result: ProjectMaterial[] = attachments.map((item) => ({
      id: `attachment-${item.id}`,
      kind: 'attachment',
      moduleKey: item.moduleKey ?? 'general',
      phaseId: item.phaseId,
      typeLabel: item.type === 'note' ? 'Jegyzet' : item.type === 'image' ? 'Kép' : 'Dokumentum',
      title: item.type === 'note' ? 'Jegyzet' : item.title || item.fileName || 'Névtelen fájl',
      text: item.text,
      fileName: item.fileName,
      size: item.size,
      createdAt: item.createdAt,
      createdBy: item.createdByName || memberNames.get(item.createdBy ?? '') || 'Ismeretlen feltöltő',
      attachment: item,
      storagePath: item.storagePath,
    }));

    constructionEntries.forEach((item) => result.push({
      id: `construction-${item.id}`,
      kind: 'construction',
      moduleKey: 'construction',
      typeLabel: item.type === 'photo' ? 'Kivitelezési kép' : 'Kivitelezési napló',
      title: item.type === 'photo' ? item.fileName || 'Helyszíni kép' : 'Naplóbejegyzés',
      text: item.text,
      fileName: item.fileName,
      createdAt: item.createdAt,
      createdBy: item.createdByName || 'Ismeretlen feltöltő',
      storagePath: item.storagePath,
    }));

    if (project.quoteData?.quoteNumber) result.push({
      id: 'quote-pdf', kind: 'quote-pdf', moduleKey: 'quote', typeLabel: 'Automatikus PDF',
      title: t('Árajánlat {number}', { number: project.quoteData.quoteNumber }), fileName: `${project.quoteData.quoteNumber}.pdf`,
      createdAt: project.quoteData.sentAt ?? project.quoteData.updatedAt, createdBy: 'Rendszer',
    });
    if (project.contractData?.contractNumber) result.push({
      id: 'contract-pdf', kind: 'contract-pdf', moduleKey: 'contract', typeLabel: 'Automatikus PDF',
      title: t('Szerződés {number}', { number: project.contractData.contractNumber }), fileName: `${project.contractData.contractNumber}.pdf`,
      createdAt: project.contractData.sentAt ?? project.contractData.updatedAt, createdBy: 'Rendszer',
    });
    const signed = project.contractData?.signedDocument;
    if (signed) result.push({
      id: 'signed-contract', kind: 'signed-contract', moduleKey: 'contract', typeLabel: 'Aláírt szerződés',
      title: signed.fileName, fileName: signed.fileName, size: signed.size, createdAt: signed.uploadedAt,
      createdBy: memberNames.get(signed.uploadedBy ?? '') || signed.uploadedBy || 'Ismeretlen feltöltő',
      storagePath: signed.storagePath,
    });
    const invoice = project.financeData?.invoiceDocument;
    if (invoice) result.push({
      id: 'invoice', kind: 'invoice', moduleKey: 'finance', typeLabel: 'Számla',
      title: invoice.fileName, fileName: invoice.fileName, size: invoice.size, createdAt: invoice.uploadedAt,
      createdBy: memberNames.get(invoice.uploadedBy ?? '') || invoice.uploadedBy || 'Ismeretlen feltöltő',
      storagePath: invoice.storagePath,
    });
    return result.sort((left, right) => timestamp(right.createdAt) - timestamp(left.createdAt));
  }, [attachments, constructionEntries, memberNames, project, t]);

  const visibleItems = materials.filter((item) => filter === 'all' || item.moduleKey === filter);
  const visibleImages = visibleItems.filter(isImageMaterial);
  const visibleDocuments = visibleItems.filter((item) => !isImageMaterial(item));
  const viewerItem = viewerIndex === null ? null : visibleImages[viewerIndex] ?? null;
  const activeViewerPreview = viewerPreview?.storagePath === viewerItem?.storagePath ? viewerPreview : null;

  useEffect(() => {
    if (!viewerItem?.storagePath) return undefined;
    let active = true;
    let objectUrl = '';
    const storagePath = viewerItem.storagePath;
    void getProtectedStoragePreview(viewerItem.storagePath).then((value) => {
      objectUrl = value;
      if (active) setViewerPreview({ storagePath, url: value, failed: false });
      else URL.revokeObjectURL(value);
    }).catch(() => { if (active) setViewerPreview({ storagePath, url: '', failed: true }); });
    return () => { active = false; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [viewerItem?.storagePath]);

  useEffect(() => {
    if (viewerIndex === null) return undefined;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setViewerIndex(null);
      if (event.key === 'ArrowLeft') setViewerIndex((current) => current === null ? null : (current === 0 ? visibleImages.length - 1 : current - 1));
      if (event.key === 'ArrowRight') setViewerIndex((current) => current === null ? null : (current === visibleImages.length - 1 ? 0 : current + 1));
    }
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKeyDown);
    return () => { document.body.style.overflow = ''; window.removeEventListener('keydown', onKeyDown); };
  }, [viewerIndex, visibleImages.length]);

  async function run(action: () => Promise<void>) {
    setSaving(true); setError('');
    try { await action(); }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'A művelet sikertelen.'); }
    finally { setSaving(false); }
  }

  function currentPhase() { return scope === 'construction' && phaseId ? phaseId : null; }
  function uploadFile(event: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'document') {
    const file = event.target.files?.[0]; event.target.value = ''; if (!file || !projectId) return;
    void run(async () => {
      if (type === 'image') await uploadProjectImage(projectId, file, scope, currentPhase());
      else await uploadProjectDocument(projectId, file, { title: documentTitle, moduleKey: scope, phaseId: currentPhase() });
      setDocumentTitle('');
    });
  }

  async function openMaterial(item: ProjectMaterial) {
    if (!project) return;
    if (item.kind === 'attachment' && item.attachment) return openProtectedAttachment(item.attachment);
    if (item.kind === 'construction' && item.storagePath) return openProtectedStorageFile(item.storagePath);
    if (item.kind === 'quote-pdf') return openProjectQuote(project.id);
    if (item.kind === 'contract-pdf') return openProjectContract(project.id);
    if ((item.kind === 'signed-contract' || item.kind === 'invoice') && item.storagePath) return openProtectedStorageFile(item.storagePath);
  }

  async function downloadMaterial(item: ProjectMaterial) {
    if (!project) return;
    if (item.kind === 'attachment' && item.attachment) return downloadProtectedAttachment(item.attachment);
    if (item.kind === 'construction' && item.storagePath) return downloadProtectedStorageFile(item.storagePath, item.fileName ?? 'helyszini-kep');
    if (item.kind === 'quote-pdf') return downloadProjectQuote(project.id);
    if (item.kind === 'contract-pdf') return downloadProjectContract(project.id);
    if (item.kind === 'signed-contract') return downloadSignedContract(project.id);
    if (item.kind === 'invoice' && item.storagePath) return downloadProjectInvoice(item.storagePath, item.fileName ?? 'szamla');
  }

  return <main className="min-h-screen bg-slate-50 text-slate-900"><DashboardHeader view="documents"/><div className="mx-auto max-w-7xl space-y-6 px-5 py-6">
    <div><h1 className="text-2xl font-bold">{t('Projektanyagok')}</h1><p className="mt-1 text-sm text-slate-500">{t('A projekt összes jegyzete, képe, dokumentuma és automatikus modulanyaga egy helyen.')}</p></div>
    <section className="grid gap-4 rounded-2xl border border-slate-800 bg-slate-900 p-5 lg:grid-cols-3">
      <label className="text-xs font-semibold uppercase text-slate-500">Projekt<select value={projectId} onChange={(event) => { setAttachments([]); setConstructionEntries([]); setProjectId(event.target.value); }} className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-3 text-sm text-slate-100">{projects.length === 0 && <option value="">Nincs projekt</option>}{projects.map((item) => <option key={item.id} value={item.id}>{item.code} · {item.title}</option>)}</select></label>
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
    <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
      <div className="flex items-center justify-between"><h2 className="text-lg font-bold">A projekt összes anyaga</h2><span className="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-600">{visibleItems.length}</span></div>
      {visibleItems.length === 0 ? <p className="mt-5 rounded-xl border border-dashed border-slate-700 p-8 text-center text-sm text-slate-500">Nincs elem ebben a nézetben.</p> : <>
        {visibleImages.length > 0 && <div className="mt-5">
          <div className="mb-3 flex items-center justify-between"><h3 className="font-bold text-slate-800">Képgaléria</h3><span className="text-xs font-semibold text-slate-500">{visibleImages.length} kép</span></div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {visibleImages.map((item, index) => <article key={item.id} className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <button type="button" disabled={saving} onClick={() => setViewerIndex(index)} className="group relative block aspect-[4/3] w-full overflow-hidden bg-slate-100 text-left disabled:opacity-50"><MaterialThumbnail item={item} /></button>
              <div className="p-3"><p className="truncate text-sm font-semibold text-slate-800">{item.title}</p><p className="mt-1 truncate text-xs text-slate-500">{scopeLabel(item.moduleKey)} · {readableDate(item.createdAt)}</p><div className="mt-3 flex gap-3"><button disabled={saving} onClick={() => setViewerIndex(index)} className="text-xs font-bold text-sky-700 disabled:opacity-40">Megnézés</button><button disabled={saving} onClick={() => void run(() => downloadMaterial(item))} className="text-xs font-bold text-slate-600 disabled:opacity-40">Letöltés</button>{item.kind === 'attachment' && item.attachment && <button disabled={saving} onClick={() => { if (window.confirm('Biztosan törlöd ezt a projektanyagot?')) void run(() => deleteProjectAttachment(projectId, item.attachment!)); }} className="ml-auto text-xs font-bold text-rose-700 disabled:opacity-40">Törlés</button>}</div></div>
            </article>)}
          </div>
        </div>}
        {visibleDocuments.length > 0 && <div className="mt-7">
          <div className="mb-3 flex items-center justify-between"><h3 className="font-bold text-slate-800">Dokumentumok és jegyzetek</h3><span className="text-xs font-semibold text-slate-500">{visibleDocuments.length} elem</span></div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{visibleDocuments.map((item) => { const phase = phases.find((entry) => entry.id === item.phaseId); return <article key={item.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4"><div className="flex flex-wrap gap-2 text-xs"><span className="rounded bg-slate-200 px-2 py-1 font-medium text-sky-800">{scopeLabel(item.moduleKey)}</span><span className="rounded bg-slate-200 px-2 py-1 text-slate-700">{item.typeLabel}</span>{phase && <span className="rounded bg-slate-200 px-2 py-1 text-slate-600">{phase.title}</span>}</div><h3 className="mt-3 truncate font-semibold text-slate-900">{item.title}</h3>{item.text ? <p className="mt-2 line-clamp-5 whitespace-pre-wrap text-sm text-slate-700">{item.text}</p> : item.fileName && <p className="mt-1 text-xs text-slate-500">{item.fileName}{item.size ? ` · ${readableSize(item.size)}` : ''}</p>}<p className="mt-3 text-xs text-slate-500">{item.createdBy} · {readableDate(item.createdAt)}</p><div className="mt-4 flex gap-4">{!item.text && <><button disabled={saving} onClick={() => void run(() => openMaterial(item))} className="text-xs font-bold text-sky-700 disabled:opacity-40">Megnézés új ablakban</button><button disabled={saving} onClick={() => void run(() => downloadMaterial(item))} className="text-xs font-bold text-slate-600 disabled:opacity-40">Letöltés</button></>}{item.kind === 'attachment' && item.attachment && <button disabled={saving} onClick={() => { if (window.confirm('Biztosan törlöd ezt a projektanyagot?')) void run(() => deleteProjectAttachment(projectId, item.attachment!)); }} className="text-xs font-bold text-rose-700 disabled:opacity-40">Törlés</button>}</div></article>; })}</div>
        </div>}
      </>}
    </section>
    {viewerIndex !== null && viewerItem && <div role="dialog" aria-modal="true" aria-label="Projektképek" onClick={() => setViewerIndex(null)} className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/70 p-3 backdrop-blur-sm sm:p-6">
      <div onClick={(event) => event.stopPropagation()} className="grid max-h-[88dvh] w-full max-w-5xl grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden rounded-2xl bg-white shadow-2xl">
        <header className="flex items-center justify-between gap-4 border-b border-slate-200 px-4 py-3"><div className="min-w-0"><h3 className="truncate font-bold text-slate-900">{viewerItem.title}</h3><p className="text-xs font-semibold text-slate-500">{viewerIndex + 1} / {visibleImages.length}</p></div><button type="button" onClick={() => setViewerIndex(null)} aria-label="Képnézegető bezárása" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-2xl font-bold text-slate-900 hover:bg-slate-200">×</button></header>
        <div className="relative flex min-h-[260px] items-center justify-center overflow-hidden bg-slate-950 p-3 sm:min-h-[420px] sm:p-5">
          {activeViewerPreview?.url ? <Image src={activeViewerPreview.url} alt={viewerItem.title} fill unoptimized sizes="90vw" className="object-contain p-3 sm:p-5" /> : <p className="text-sm font-semibold text-slate-300">{activeViewerPreview?.failed ? 'A kép nem tölthető be.' : 'Kép betöltése…'}</p>}
          {visibleImages.length > 1 && <><button type="button" onClick={() => setViewerIndex(viewerIndex === 0 ? visibleImages.length - 1 : viewerIndex - 1)} aria-label="Előző kép" className="absolute left-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/95 text-3xl font-bold text-slate-950 shadow">‹</button><button type="button" onClick={() => setViewerIndex(viewerIndex === visibleImages.length - 1 ? 0 : viewerIndex + 1)} aria-label="Következő kép" className="absolute right-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/95 text-3xl font-bold text-slate-950 shadow">›</button></>}
        </div>
        {visibleImages.length > 1 && <div className="flex gap-2 overflow-x-auto border-t border-slate-200 bg-white p-3">{visibleImages.map((item, index) => <button key={`viewer-${item.id}`} type="button" onClick={() => setViewerIndex(index)} aria-label={`${index + 1}. kép`} className={`relative h-14 w-20 shrink-0 overflow-hidden rounded-lg border-2 bg-slate-100 ${index === viewerIndex ? 'border-sky-600' : 'border-transparent opacity-70 hover:opacity-100'}`}><MaterialThumbnail item={item} /></button>)}</div>}
      </div>
    </div>}
  </div></main>;
}
