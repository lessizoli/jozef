import Image from 'next/image';
import { useEffect, useState } from 'react';
import { getProtectedAttachmentPreview, openProtectedAttachment, subscribeToProjectAttachments, uploadProjectImage, type ProjectAttachment } from '@/lib/projectAttachments';
import type { Project } from '@/lib/projectService';
import type { SurveyDraft } from './types';

type Props = {
  draft: SurveyDraft;
  project: Project;
  saving: boolean;
  onChange: (draft: SurveyDraft) => void;
  onSave: () => void;
  onRun: (action: () => Promise<void>, message: string) => void;
};

function SurveyPhoto({ attachment }: { attachment: ProjectAttachment }) {
  const [source, setSource] = useState('');
  useEffect(() => {
    let active = true;
    let objectUrl = '';
    void getProtectedAttachmentPreview(attachment).then((url) => {
      if (!active) { if (url.startsWith('blob:')) URL.revokeObjectURL(url); return; }
      objectUrl = url;
      setSource(url);
    });
    return () => { active = false; if (objectUrl.startsWith('blob:')) URL.revokeObjectURL(objectUrl); };
  }, [attachment]);
  return <button type="button" onClick={() => void openProtectedAttachment(attachment)} className="relative aspect-[4/3] overflow-hidden rounded-lg border border-slate-700 bg-slate-900">
    {source ? <Image src={source} alt={attachment.fileName || 'Felmérési kép'} fill unoptimized className="object-cover" /> : <span className="grid h-full place-items-center text-xs text-slate-500">Betöltés…</span>}
  </button>;
}

export default function SurveyEditor({ draft, project, saving, onChange, onSave, onRun }: Props) {
  const [attachments, setAttachments] = useState<ProjectAttachment[]>([]);
  useEffect(() => subscribeToProjectAttachments(project.id, setAttachments), [project.id]);
  const photos = attachments.filter((item) => item.type === 'image' && item.moduleKey === 'survey');
  const saved = project.surveyData;
  function upload(file: File | undefined) {
    if (file) onRun(() => uploadProjectImage(project.id, file, 'survey'), 'A felmérési kép feltöltve.');
  }
  return <section className="mt-6 space-y-4 rounded-xl border border-slate-700 bg-slate-950/60 p-4">
    <div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-400">Felmérési űrlap</p><h3 className="mt-1 text-lg font-bold">Helyszíni felmérés rögzítése</h3><p className="mt-1 text-sm text-slate-400">Az ügyféligények, adottságok és méretek egy helyen menthetők.</p></div>
    <label className="block text-xs font-semibold text-slate-400">Ügyféligény<textarea rows={4} value={draft.customerNeeds} onChange={(event) => onChange({ ...draft, customerNeeds: event.target.value })} className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-500" /></label>
    <label className="block text-xs font-semibold text-slate-400">Helyszíni adottságok<textarea rows={4} value={draft.siteConditions} onChange={(event) => onChange({ ...draft, siteConditions: event.target.value })} className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-500" /></label>
    <label className="block text-xs font-semibold text-slate-400">Méretek és mennyiségek<textarea rows={4} value={draft.measurements} onChange={(event) => onChange({ ...draft, measurements: event.target.value })} className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-500" /></label>
    <label className="block text-xs font-semibold text-slate-400">Felmérési megjegyzés<textarea rows={4} value={draft.notes} onChange={(event) => onChange({ ...draft, notes: event.target.value })} className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-500" /></label>
    <div className="rounded-xl border border-slate-700 bg-slate-900/70 p-4">
      <h4 className="text-sm font-bold text-slate-100">Felmérési képek</h4><p className="mt-1 text-xs text-slate-400">Telefonon közvetlenül a hátlapi kamerával is készíthetsz képet.</p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <label className="cursor-pointer rounded-lg border border-dashed border-sky-500/60 px-3 py-3 text-center text-xs font-semibold text-sky-300">+ Kép feltöltése<input type="file" accept="image/*" className="hidden" onChange={(event) => { upload(event.target.files?.[0]); event.currentTarget.value = ''; }} /></label>
        <label className="cursor-pointer rounded-lg bg-sky-600 px-3 py-3 text-center text-xs font-semibold text-white hover:bg-sky-500">📷 Kamera megnyitása<input type="file" accept="image/*" capture="environment" className="hidden" onChange={(event) => { upload(event.target.files?.[0]); event.currentTarget.value = ''; }} /></label>
      </div>
      {photos.length > 0 && <div className="mt-3 grid grid-cols-2 gap-2">{photos.map((photo) => <SurveyPhoto key={photo.id} attachment={photo} />)}</div>}
    </div>
    <button type="button" disabled={saving} onClick={onSave} className="w-full rounded-lg bg-sky-600 px-4 py-3 text-sm font-bold text-white hover:bg-sky-500 disabled:opacity-50">{saving ? 'Mentés…' : 'Felmérési űrlap mentése'}</button>
    {saved && <div className="rounded-xl border border-emerald-500/40 bg-emerald-950/30 p-4"><p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-300">Felmérési eredmény</p><dl className="mt-3 space-y-3 text-sm">{[['Ügyféligény', saved.customerNeeds], ['Helyszíni adottságok', saved.siteConditions], ['Méretek és mennyiségek', saved.measurements], ['Megjegyzés', saved.notes]].map(([label, value]) => <div key={label}><dt className="text-xs font-semibold text-slate-500">{label}</dt><dd className="mt-1 whitespace-pre-wrap text-slate-200">{value || 'Nincs megadva'}</dd></div>)}</dl></div>}
  </section>;
}
