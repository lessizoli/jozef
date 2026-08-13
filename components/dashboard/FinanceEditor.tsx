import { useEffect, useState } from 'react';
import type { Project } from '@/lib/projectService';
import {
  downloadProjectInvoice,
  markProjectInvoicePaid,
  reconcileFinanceStatus,
  saveProjectFinance,
  uploadProjectInvoice,
  type FinanceDraft,
} from '@/lib/financeService';
import { useI18n } from '@/lib/i18n';

type Props = { project: Project; saving: boolean; onRun: (action: () => Promise<void>, message: string) => void };

function dateValue(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function initialDraft(project: Project): FinanceDraft {
  if (project.financeData) {
    const { invoiceNumber, grossAmount, invoiceDate, dueDate, paidAt, note } = project.financeData;
    return { invoiceNumber, grossAmount, invoiceDate, dueDate, paidAt, note };
  }
  const invoiceDate = new Date();
  const dueDate = new Date(invoiceDate);
  dueDate.setDate(dueDate.getDate() + 8);
  return {
    invoiceNumber: '',
    grossAmount: project.contractData?.grossAmount ?? project.quoteData?.grossTotal ?? 0,
    invoiceDate: dateValue(invoiceDate),
    dueDate: dateValue(dueDate),
    paidAt: '',
    note: '',
  };
}

export default function FinanceEditor({ project, saving, onRun }: Props) {
  const { t, locale } = useI18n();
  const [draft, setDraft] = useState<FinanceDraft>(() => initialDraft(project));
  const paid = project.modules.finance.status === 'Fizetve' || Boolean(project.financeData?.paidAt);
  const overdue = !paid && Boolean(draft.dueDate) && draft.dueDate < dateValue(new Date());

  useEffect(() => {
    void reconcileFinanceStatus(project).catch(() => undefined);
  }, [project]);

  return <div className="mt-6 space-y-5">
    <section className={`rounded-xl border p-4 ${overdue ? 'border-rose-500/60 bg-rose-500/10' : paid ? 'border-emerald-500/50 bg-emerald-500/10' : 'border-slate-700 bg-slate-950/60'}`}>
      <p className="text-xs uppercase tracking-wider text-slate-500">{t('Pénzügyi állapot')}</p>
      <div className="mt-2 flex items-center justify-between gap-3">
        <strong className={overdue ? 'text-rose-300' : paid ? 'text-emerald-300' : 'text-amber-300'}>{t(overdue ? 'Késedelem' : project.modules.finance.status)}</strong>
        <span className="text-sm text-slate-300">{new Intl.NumberFormat(locale, { style: 'currency', currency: 'HUF', maximumFractionDigits: 0 }).format(draft.grossAmount || 0)}</span>
      </div>
      {overdue && <p className="mt-2 text-sm text-rose-200">{t('A fizetési határidő lejárt:')} {draft.dueDate}</p>}
    </section>

    <section className="space-y-4 rounded-xl border border-slate-700 bg-slate-950/60 p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-xs font-semibold text-slate-500">Számlaszám<input disabled={paid} value={draft.invoiceNumber} onChange={(event) => setDraft({ ...draft, invoiceNumber: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 disabled:opacity-60" /></label>
        <label className="text-xs font-semibold text-slate-500">Bruttó összeg (Ft)<input disabled={paid} type="number" min="0" step="1" value={draft.grossAmount} onChange={(event) => setDraft({ ...draft, grossAmount: Number(event.target.value) })} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 disabled:opacity-60" /></label>
        <label className="text-xs font-semibold text-slate-500">Kiállítás dátuma<input disabled={paid} type="date" value={draft.invoiceDate} onChange={(event) => setDraft({ ...draft, invoiceDate: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 disabled:opacity-60" /></label>
        <label className="text-xs font-semibold text-slate-500">Fizetési határidő<input disabled={paid} type="date" value={draft.dueDate} onChange={(event) => setDraft({ ...draft, dueDate: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 disabled:opacity-60" /></label>
      </div>
      <label className="block text-xs font-semibold text-slate-500">Megjegyzés<textarea disabled={paid} rows={3} value={draft.note} onChange={(event) => setDraft({ ...draft, note: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 disabled:opacity-60" /></label>
      {!paid && <button disabled={saving} onClick={() => onRun(() => saveProjectFinance(project.id, draft), 'A pénzügyi adatok mentve.')} className="w-full rounded-lg bg-sky-600 px-3 py-2 text-sm font-semibold disabled:opacity-40">Pénzügyi adatok mentése</button>}
    </section>

    <section className="rounded-xl border border-slate-700 bg-slate-950/60 p-4">
      <h3 className="font-bold">Számla dokumentum</h3>
      {project.financeData?.invoiceDocument ? <button type="button" disabled={saving} onClick={() => onRun(() => downloadProjectInvoice(project.financeData!.invoiceDocument!.storagePath, project.financeData!.invoiceDocument!.fileName), 'A számla letöltődött.')} className="mt-3 w-full rounded-lg border border-sky-500/50 px-3 py-2 text-sm font-semibold text-sky-300 disabled:opacity-40">Letöltés: {project.financeData.invoiceDocument.fileName}</button> : <label className="mt-3 block cursor-pointer rounded-lg border border-dashed border-slate-600 px-3 py-4 text-center text-sm text-sky-300">+ Számla feltöltése (PDF, XML, JPG, PNG)<input type="file" accept=".pdf,.xml,image/jpeg,image/png" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) onRun(() => uploadProjectInvoice(project, file), 'A számla feltöltve.'); event.currentTarget.value = ''; }} /></label>}
    </section>

    {!paid && <section className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4">
      <label className="text-xs font-semibold text-slate-400">Fizetés dátuma<input type="date" value={draft.paidAt} onChange={(event) => setDraft({ ...draft, paidAt: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100" /></label>
      <button disabled={saving || !draft.paidAt} onClick={() => onRun(() => markProjectInvoicePaid(project.id, draft.paidAt), 'A számla Fizetve állapotú, a projekt lezárható.')} className="mt-3 w-full rounded-lg bg-emerald-600 px-3 py-2 text-sm font-bold disabled:opacity-40">Fizetve jelölés</button>
    </section>}
  </div>;
}
