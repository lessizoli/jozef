import { useState } from 'react';
import { getProjectModuleDisplayStatus, type Project } from '@/lib/projectService';
import { completeProjectHandover, saveProjectCompletion, type CompletionData } from '@/lib/completionService';
import { useI18n } from '@/lib/i18n';

type Props = { project: Project; saving: boolean; onRun: (action: () => Promise<void>, message: string) => void };
const defaultChecklist = [
  'A kivitelezési munkák elkészültek',
  'A helyszín rendezett és átadásra kész',
  'A szükséges képek és dokumentumok feltöltve',
  'Az esetleges hibák és utómunkák rögzítve',
].map((label, index) => ({ id: `default-${index + 1}`, label, completed: false }));

export default function CompletionEditor({ project, saving, onRun }: Props) {
  const { t } = useI18n();
  const [data, setData] = useState<CompletionData>(project.completionData ?? {
    checklist: defaultChecklist, handoverDate: '', responsibleName: project.modules.completion.assignedTo ?? '', handoverNotes: '', customerConfirmed: false, defectNotes: '',
  });
  const completed = project.modules.completion.status === 'Befejezve';
  return <div className="mt-6 space-y-5">
    <section className="rounded-xl border border-slate-700 bg-slate-950/60 p-4">
      <p className="text-xs uppercase tracking-wider text-slate-500">{t('Befejezés és átadás')}</p>
      <p className="mt-2 text-sm text-slate-300">{t('Státusz:')} <strong>{t(getProjectModuleDisplayStatus(project, 'completion'))}</strong></p>
      <div className="mt-4 space-y-2">{data.checklist.map((item, index) => <label key={item.id} className="flex items-start gap-3 rounded-lg border border-slate-800 p-3 text-sm"><input disabled={completed} type="checkbox" checked={item.completed} onChange={(event) => setData((current) => ({ ...current, checklist: current.checklist.map((entry, i) => i === index ? { ...entry, completed: event.target.checked } : entry) }))} className="mt-0.5" /><span>{t(item.label)}</span></label>)}</div>
    </section>
    <section className="space-y-4 rounded-xl border border-slate-700 bg-slate-950/60 p-4">
      <div className="grid gap-3 sm:grid-cols-2"><label className="text-xs font-semibold text-slate-500">{t('Átadás dátuma')}<input disabled={completed} type="date" value={data.handoverDate} onChange={(event) => setData({ ...data, handoverDate: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100" /></label><label className="text-xs font-semibold text-slate-500">{t('Átadás felelőse')}<input disabled={completed} value={data.responsibleName} onChange={(event) => setData({ ...data, responsibleName: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100" /></label></div>
      <label className="block text-xs font-semibold text-slate-500">{t('Átadási jegyzet')}<textarea disabled={completed} rows={3} value={data.handoverNotes} onChange={(event) => setData({ ...data, handoverNotes: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100" /></label>
      <label className="block text-xs font-semibold text-slate-500">{t('Hibák és utómunkák')}<textarea disabled={completed} rows={3} value={data.defectNotes} onChange={(event) => setData({ ...data, defectNotes: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100" /></label>
      <label className="flex items-center gap-3 text-sm text-slate-300"><input disabled={completed} type="checkbox" checked={data.customerConfirmed} onChange={(event) => setData({ ...data, customerConfirmed: event.target.checked })} /> {t('Az ügyfél az átadást visszaigazolta')}</label>
      {!completed && <div className="grid grid-cols-2 gap-2"><button disabled={saving} onClick={() => onRun(() => saveProjectCompletion(project.id, data), t('Az átadási adatok mentve.'))} className="rounded-lg bg-slate-700 px-3 py-2 text-sm font-semibold disabled:opacity-40">{t('Mentés')}</button><button disabled={saving} onClick={() => onRun(() => completeProjectHandover(project.id, data, project.modules.finance.enabled), t('Az átadás befejeződött.'))} className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold disabled:opacity-40">{t('Átadás befejezése')}</button></div>}
    </section>
  </div>;
}
