import Image from 'next/image';
import { useEffect, useState } from 'react';
import { getProtectedAttachmentPreview, openProtectedAttachment, subscribeToProjectAttachments, uploadProjectImage, type ProjectAttachment } from '@/lib/projectAttachments';
import type { Project } from '@/lib/projectService';
import type { SurveyDraft } from './types';
import { useI18n } from '@/lib/i18n';
import { translateProjectText } from '@/lib/translationService';

type Props = {
  draft: SurveyDraft;
  project: Project;
  saving: boolean;
  onChange: (draft: SurveyDraft) => void;
  onSave: () => void;
  onRun: (action: () => Promise<void>, message: string) => void;
};

function SurveyPhoto({ attachment }: { attachment: ProjectAttachment }) {
  const { t } = useI18n();
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
    {source ? <Image src={source} alt={attachment.fileName || t('Felmérési kép')} fill unoptimized className="object-cover" /> : <span className="grid h-full place-items-center text-xs text-slate-500">{t('Betöltés…')}</span>}
  </button>;
}

export default function SurveyEditor({ draft, project, saving, onChange, onSave, onRun }: Props) {
  const { t, language } = useI18n();
  const [translating, setTranslating] = useState(false);
  const sourceLanguage = draft.originalLanguage ?? language;
  const targetLanguage = sourceLanguage === 'hu' ? 'de' : 'hu';
  const translated = draft.translations?.[targetLanguage] ?? { customerNeeds: '', siteConditions: '', measurements: '', notes: '' };
  async function translateAll() {
    setTranslating(true);
    try {
      const keys = ['customerNeeds', 'siteConditions', 'measurements', 'notes'] as const;
      const values = await Promise.all(keys.map((key) => translateProjectText(draft[key], sourceLanguage)));
      const translation = Object.fromEntries(keys.map((key, index) => [key, values[index].translatedText])) as typeof translated;
      onChange({ ...draft, originalLanguage: sourceLanguage, translations: { ...draft.translations, [targetLanguage]: translation } });
    } finally { setTranslating(false); }
  }
  const [attachments, setAttachments] = useState<ProjectAttachment[]>([]);
  useEffect(() => subscribeToProjectAttachments(project.id, setAttachments), [project.id]);
  const photos = attachments.filter((item) => item.type === 'image' && item.moduleKey === 'survey');
  const saved = project.surveyData;
  function upload(file: File | undefined) {
    if (file) onRun(() => uploadProjectImage(project.id, file, 'survey'), t('A felmérési kép feltöltve.'));
  }
  return <section className="mt-6 space-y-4 rounded-xl border border-slate-700 bg-slate-950/60 p-4">
    <div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-400">{t('Felmérési űrlap')}</p><h3 className="mt-1 text-lg font-bold">{t('Helyszíni felmérés rögzítése')}</h3><p className="mt-1 text-sm text-slate-400">{t('Az ügyféligények, adottságok és méretek egy helyen menthetők.')}</p></div>
    <label className="block text-xs font-semibold text-slate-400">{t('Ügyféligény')}<textarea rows={4} value={draft.customerNeeds} onChange={(event) => onChange({ ...draft, customerNeeds: event.target.value })} className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-500" /></label>
    <label className="block text-xs font-semibold text-slate-400">{t('Helyszíni adottságok')}<textarea rows={4} value={draft.siteConditions} onChange={(event) => onChange({ ...draft, siteConditions: event.target.value })} className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-500" /></label>
    <label className="block text-xs font-semibold text-slate-400">{t('Méretek és mennyiségek')}<textarea rows={4} value={draft.measurements} onChange={(event) => onChange({ ...draft, measurements: event.target.value })} className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-500" /></label>
    <label className="block text-xs font-semibold text-slate-400">{t('Felmérési megjegyzés')}<textarea rows={4} value={draft.notes} onChange={(event) => onChange({ ...draft, notes: event.target.value })} className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-500" /></label>
    <div className="rounded-xl border border-violet-500/40 bg-violet-950/20 p-4"><div className="flex flex-wrap items-end justify-between gap-3"><label className="text-xs font-semibold text-slate-400">{t('Eredeti szöveg nyelve')}<select value={sourceLanguage} onChange={(event) => onChange({ ...draft, originalLanguage: event.target.value as 'hu' | 'de' })} className="mt-1 block rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm"><option value="hu">Magyar</option><option value="de">Deutsch</option></select></label><button type="button" disabled={translating} onClick={() => void translateAll()} className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-bold disabled:opacity-50">{translating ? t('Fordítás…') : t('Automatikus fordítás')}</button></div><p className="mt-3 text-xs text-slate-400">{t('A gépi fordítás kézzel javítható, az eredeti szöveg változatlan marad.')}</p><div className="mt-4 space-y-3"><p className="text-xs font-bold uppercase text-violet-300">{targetLanguage === 'de' ? 'Deutsch' : 'Magyar'}</p>{(['customerNeeds', 'siteConditions', 'measurements', 'notes'] as const).map((key) => <textarea key={key} rows={3} value={translated[key]} onChange={(event) => onChange({ ...draft, translations: { ...draft.translations, [targetLanguage]: { ...translated, [key]: event.target.value } } })} className="w-full rounded-lg border border-violet-500/30 bg-slate-900 px-3 py-2 text-sm" />)}</div></div>
    <div className="rounded-xl border border-slate-700 bg-slate-900/70 p-4">
      <h4 className="text-sm font-bold text-slate-100">{t('Felmérési képek')}</h4><p className="mt-1 text-xs text-slate-400">{t('Telefonon közvetlenül a hátlapi kamerával is készíthetsz képet.')}</p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <label className="cursor-pointer rounded-lg border border-dashed border-sky-500/60 px-3 py-3 text-center text-xs font-semibold text-sky-300">{t('+ Kép feltöltése')}<input type="file" accept="image/*" className="hidden" onChange={(event) => { upload(event.target.files?.[0]); event.currentTarget.value = ''; }} /></label>
        <label className="cursor-pointer rounded-lg bg-sky-600 px-3 py-3 text-center text-xs font-semibold text-white hover:bg-sky-500">{t('📷 Kamera megnyitása')}<input type="file" accept="image/*" capture="environment" className="hidden" onChange={(event) => { upload(event.target.files?.[0]); event.currentTarget.value = ''; }} /></label>
      </div>
      {photos.length > 0 && <div className="mt-3 grid grid-cols-2 gap-2">{photos.map((photo) => <SurveyPhoto key={photo.id} attachment={photo} />)}</div>}
    </div>
    <button type="button" disabled={saving} onClick={onSave} className="w-full rounded-lg bg-sky-600 px-4 py-3 text-sm font-bold text-white hover:bg-sky-500 disabled:opacity-50">{saving ? t('Mentés…') : t('Felmérési űrlap mentése')}</button>
    {saved && <div className="rounded-xl border border-emerald-500/40 bg-emerald-950/30 p-4"><p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-300">{t('Felmérési eredmény')}</p><dl className="mt-3 space-y-3 text-sm">{[['Ügyféligény', saved.customerNeeds], ['Helyszíni adottságok', saved.siteConditions], ['Méretek és mennyiségek', saved.measurements], ['Megjegyzés', saved.notes]].map(([label, value]) => <div key={label}><dt className="text-xs font-semibold text-slate-500">{t(label)}</dt><dd className="mt-1 whitespace-pre-wrap text-slate-200">{value || t('Nincs megadva')}</dd></div>)}</dl></div>}
  </section>;
}
