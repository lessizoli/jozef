import type { SurveyDraft } from './types';

type Props = {
  draft: SurveyDraft;
  saving: boolean;
  onChange: (draft: SurveyDraft) => void;
  onSave: () => void;
};

export default function SurveyEditor({ draft, saving, onChange, onSave }: Props) {
  return <section className="mt-6 space-y-4 rounded-xl border border-slate-700 bg-slate-950/60 p-4">
    <div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-400">Felmérési űrlap</p><h3 className="mt-1 text-lg font-bold">Helyszíni felmérés rögzítése</h3><p className="mt-1 text-sm text-slate-400">Az ügyféligények, adottságok és méretek egy helyen menthetők.</p></div>
    <label className="block text-xs font-semibold text-slate-400">Ügyféligény<textarea rows={4} value={draft.customerNeeds} onChange={(event) => onChange({ ...draft, customerNeeds: event.target.value })} className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-500" /></label>
    <label className="block text-xs font-semibold text-slate-400">Helyszíni adottságok<textarea rows={4} value={draft.siteConditions} onChange={(event) => onChange({ ...draft, siteConditions: event.target.value })} className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-500" /></label>
    <label className="block text-xs font-semibold text-slate-400">Méretek és mennyiségek<textarea rows={4} value={draft.measurements} onChange={(event) => onChange({ ...draft, measurements: event.target.value })} className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-500" /></label>
    <label className="block text-xs font-semibold text-slate-400">Felmérési megjegyzés<textarea rows={4} value={draft.notes} onChange={(event) => onChange({ ...draft, notes: event.target.value })} className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-500" /></label>
    <button type="button" disabled={saving} onClick={onSave} className="w-full rounded-lg bg-sky-600 px-4 py-3 text-sm font-bold text-white hover:bg-sky-500 disabled:opacity-50">{saving ? 'Mentés…' : 'Felmérési űrlap mentése'}</button>
  </section>;
}
