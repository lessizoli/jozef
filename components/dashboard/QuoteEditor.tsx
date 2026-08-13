import { useEffect, useMemo, useState } from 'react';
import type { Project, QuoteItem, QuoteItemCategory } from '@/lib/projectService';
import { formatCurrency, getCurrencyPreview, type ExchangeRateSnapshot } from '@/lib/currencyService';
import { calculateQuoteTotals, type QuoteDraft } from '@/lib/quoteService';
import { useI18n } from '@/lib/i18n';
import { translateProjectText } from '@/lib/translationService';

type Props = {
  draft: QuoteDraft;
  project: Project;
  clientEmail: string;
  saving: boolean;
  onChange: (draft: QuoteDraft) => void;
  onSave: () => void;
  onDownload: () => void;
  onSend: () => void;
  status: string;
  decisionAt?: unknown;
  canDecide: boolean;
  onAccept: () => void;
  onReject: () => void;
};

const categoryLabels: Record<QuoteItemCategory, string> = {
  material: 'Anyag',
  labor: 'Munkadíj',
  other: 'Egyéb',
};

function newItem(): QuoteItem {
  return {
    id: `item-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    category: 'material',
    description: '',
    quantity: 1,
    unit: 'db',
    unitPrice: 0,
    vatRate: 27,
  };
}

function readableDate(value: unknown) {
  if (!value) return '';
  const timestamp = value as { toDate?: () => Date };
  const date = typeof timestamp.toDate === 'function' ? timestamp.toDate() : new Date(String(value));
  return Number.isNaN(date.valueOf()) ? '' : date.toLocaleString('hu-HU');
}

export default function QuoteEditor({ draft, project, clientEmail, saving, onChange, onSave, onDownload, onSend, status, decisionAt, canDecide, onAccept, onReject }: Props) {
  const { t, locale, language } = useI18n();
  const totals = useMemo(() => calculateQuoteTotals(draft.items), [draft.items]);
  const [preview, setPreview] = useState<ExchangeRateSnapshot | null>(project.quoteData?.exchangeRate ?? null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [translating, setTranslating] = useState(false);
  const sourceLanguage = draft.originalLanguage ?? language;
  const targetLanguage = sourceLanguage === 'hu' ? 'de' : 'hu';
  useEffect(() => {
    if (!draft.issueDate || totals.grossTotal < 0) return;
    const timer = window.setTimeout(() => {
      setPreviewLoading(true);
      void getCurrencyPreview(draft.issueDate, project.currency, totals.grossTotal, project.country === 'DE' ? 'ECB' : 'MNB').then(setPreview).finally(() => setPreviewLoading(false));
    }, 400);
    return () => window.clearTimeout(timer);
  }, [draft.issueDate, project.country, project.currency, totals.grossTotal]);

  function updateItem(id: string, update: Partial<QuoteItem>) {
    onChange({
      ...draft,
      items: draft.items.map((item) => item.id === id ? { ...item, ...update } : item),
    });
  }

  function removeItem(id: string) {
    onChange({ ...draft, items: draft.items.filter((item) => item.id !== id) });
  }

  async function translateQuote() {
    setTranslating(true);
    try {
      const translatedItems = await Promise.all(draft.items.map((item) => translateProjectText(item.description, sourceLanguage)));
      const translatedNote = await translateProjectText(draft.note, sourceLanguage);
      onChange({
        ...draft,
        originalLanguage: sourceLanguage,
        items: draft.items.map((item, index) => ({ ...item, descriptionTranslations: { ...item.descriptionTranslations, [targetLanguage]: translatedItems[index].translatedText } })),
        noteTranslations: { ...draft.noteTranslations, [targetLanguage]: translatedNote.translatedText },
      });
    } finally { setTranslating(false); }
  }

  return (
    <div className="mt-6 space-y-5">
      <section className={`rounded-xl border p-4 ${status === 'Elfogadva' ? 'border-emerald-500/40 bg-emerald-500/10' : status === 'Elutasítva' ? 'border-rose-500/40 bg-rose-500/10' : 'border-slate-700 bg-slate-950/60'}`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wider text-slate-500">{t('Ajánlat állapota')}</p>
            <p className={`mt-1 font-bold ${status === 'Elfogadva' ? 'text-emerald-300' : status === 'Elutasítva' ? 'text-rose-300' : 'text-amber-300'}`}>{t(status)}</p>
            {['Elfogadva', 'Elutasítva'].includes(status) && readableDate(decisionAt) && <p className="mt-1 text-xs text-slate-400">{t('Döntés: {date}', { date: readableDate(decisionAt) })}</p>}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" disabled={saving || !canDecide || status === 'Elutasítva'} onClick={onReject} className="rounded-lg border border-rose-500 px-3 py-2 text-sm font-bold text-rose-300 hover:bg-rose-500/10 disabled:opacity-40">{t('Elutasítva')}</button>
            <button type="button" disabled={saving || !canDecide || status === 'Elfogadva'} onClick={onAccept} className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-bold hover:bg-emerald-500 disabled:opacity-40">{t('Elfogadva')}</button>
          </div>
        </div>
        {!canDecide && <p className="mt-3 text-xs text-amber-300">{t('A döntés rögzítéséhez projektmódosítási jogosultság szükséges.')}</p>}
      </section>
      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-500">{t('Ajánlatszám')}</label>
          <input required value={draft.quoteNumber} onChange={(event) => onChange({ ...draft, quoteNumber: event.target.value })} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-sky-500" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-500">{t('Kiállítás')}</label>
          <input type="date" required value={draft.issueDate} onChange={(event) => onChange({ ...draft, issueDate: event.target.value })} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-sky-500" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-500">{t('Érvényes eddig')}</label>
          <input type="date" required value={draft.validUntil} min={draft.issueDate} onChange={(event) => onChange({ ...draft, validUntil: event.target.value })} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-sky-500" />
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <div>
            <h3 className="font-bold">{t('Ajánlati tételek')}</h3>
            <p className="text-xs text-slate-500">{t('A végösszeg és az ÁFA automatikusan számolódik.')}</p>
          </div>
        </div>

        {draft.items.length === 0 ? (
          <button type="button" onClick={() => onChange({ ...draft, items: [newItem()] })} className="w-full rounded-xl border border-dashed border-slate-700 p-6 text-sm text-slate-400 hover:border-sky-500">{t('Első tétel hozzáadása')}</button>
        ) : draft.items.map((item, index) => (
          <div key={item.id} className="rounded-xl border border-slate-300 bg-slate-100 p-4 text-slate-900">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700">{t('{index}. tétel', { index: index + 1 })}</span>
              <button type="button" onClick={() => removeItem(item.id)} className="text-xs font-semibold text-rose-700 hover:text-rose-900">{t('Törlés')}</button>
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">{t('Típus')}</label>
                <select value={item.category} onChange={(event) => updateItem(item.id, { category: event.target.value as QuoteItemCategory })} className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm outline-none focus:border-sky-500">
                  {Object.entries(categoryLabels).map(([value, label]) => <option key={value} value={value}>{t(label)}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">{t('Megnevezés')}</label>
                <input required value={item.description} onChange={(event) => updateItem(item.id, { description: event.target.value })} className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm outline-none focus:border-sky-500" />
              </div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">{t('Mennyiség')}</label>
                <input type="number" min="0.01" step="0.01" value={item.quantity} onChange={(event) => updateItem(item.id, { quantity: Number(event.target.value) })} className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm outline-none focus:border-sky-500" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">{t('Egység')}</label>
                <input value={item.unit} onChange={(event) => updateItem(item.id, { unit: event.target.value })} className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm outline-none focus:border-sky-500" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">{t('Nettó egységár')}</label>
                <input type="number" min="0" step="1" value={item.unitPrice} onChange={(event) => updateItem(item.id, { unitPrice: Number(event.target.value) })} className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm outline-none focus:border-sky-500" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">{t('ÁFA')}</label>
                <select value={item.vatRate} onChange={(event) => updateItem(item.id, { vatRate: Number(event.target.value) })} className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm outline-none focus:border-sky-500">
                  {[0, 5, 18, 27].map((rate) => <option key={rate} value={rate}>{rate}%</option>)}
                </select>
              </div>
            </div>
            <p className="mt-3 text-right text-sm font-medium text-slate-700">{t('Nettó:')} <span className="font-bold text-slate-950">{formatCurrency(Math.round(item.quantity * item.unitPrice), project.currency, locale)}</span></p>
          </div>
        ))}
        {draft.items.length > 0 && <div className="flex justify-end"><button type="button" onClick={() => onChange({ ...draft, items: [...draft.items, newItem()] })} className="rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-sky-700">{t('+ Új tétel')}</button></div>}
      </div>

      <div>
        <label className="mb-1 block text-xs font-semibold text-slate-500">{t('Megjegyzés / fizetési feltétel')}</label>
        <textarea rows={4} value={draft.note} onChange={(event) => onChange({ ...draft, note: event.target.value })} className="w-full resize-y rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-sky-500" placeholder={t('Például: 50% előleg, fennmaradó összeg átadáskor.')} />
      </div>

      <section className="rounded-xl border border-violet-500/40 bg-violet-950/20 p-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <label className="text-xs font-semibold text-slate-400">{t('Eredeti szöveg nyelve')}<select value={sourceLanguage} onChange={(event) => onChange({ ...draft, originalLanguage: event.target.value as 'hu' | 'de' })} className="mt-1 block rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm"><option value="hu">Magyar</option><option value="de">Deutsch</option></select></label>
          <button type="button" disabled={translating} onClick={() => void translateQuote()} className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">{translating ? t('Fordítás…') : t('Ajánlat szövegeinek fordítása')}</button>
        </div>
        <p className="mt-3 text-xs text-slate-400">{t('A gépi fordítás kézzel javítható, az eredeti szöveg változatlan marad.')}</p>
        <div className="mt-4 space-y-3">
          <p className="text-xs font-bold uppercase text-violet-300">{targetLanguage === 'de' ? 'Deutsch' : 'Magyar'}</p>
          {draft.items.map((item, index) => <label key={item.id} className="block text-xs text-slate-400">{t('{index}. tétel', { index: index + 1 })}<input value={item.descriptionTranslations?.[targetLanguage] ?? ''} onChange={(event) => updateItem(item.id, { descriptionTranslations: { ...item.descriptionTranslations, [targetLanguage]: event.target.value } })} className="mt-1 w-full rounded-lg border border-violet-500/30 bg-slate-900 px-3 py-2 text-sm text-slate-100" /></label>)}
          <label className="block text-xs text-slate-400">{t('Megjegyzés / fizetési feltétel')}<textarea rows={3} value={draft.noteTranslations?.[targetLanguage] ?? ''} onChange={(event) => onChange({ ...draft, noteTranslations: { ...draft.noteTranslations, [targetLanguage]: event.target.value } })} className="mt-1 w-full rounded-lg border border-violet-500/30 bg-slate-900 px-3 py-2 text-sm text-slate-100" /></label>
        </div>
      </section>

      <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-slate-900">
        <div className="flex justify-between text-sm text-slate-800"><span>{t('Nettó összesen')}</span><strong>{formatCurrency(totals.netTotal, project.currency, locale)}</strong></div>
        <div className="mt-2 flex justify-between text-sm text-slate-800"><span>{t('ÁFA összesen')}</span><strong>{formatCurrency(totals.vatTotal, project.currency, locale)}</strong></div>
        <div className="mt-3 flex justify-between border-t border-emerald-300 pt-3 text-lg font-semibold text-emerald-900"><span>{t('Bruttó végösszeg')}</span><strong>{formatCurrency(totals.grossTotal, project.currency, locale)}</strong></div>
        {preview && <div className="mt-3 border-t border-emerald-200 pt-3 text-sm"><div className="flex justify-between"><span>{t('Másik pénznemben')}</span><strong>{formatCurrency(preview.convertedAmount, preview.targetCurrency, locale)}</strong></div><p className="mt-1 text-xs text-slate-600">{preview.source} · {preview.rateDate} · 1 EUR = {preview.hufPerEur} HUF</p></div>}
        {previewLoading && <p className="mt-2 text-xs text-slate-500">{t('Hivatalos árfolyam betöltése…')}</p>}
      </div>

      {!clientEmail && <p className="rounded-lg border border-amber-400 bg-amber-50 p-3 text-xs font-medium text-amber-900">{t('Kiküldéshez előbb add meg az ügyfél e-mail-címét a Projektadatok fülön.')}</p>}
      <div className="grid gap-2 sm:grid-cols-3">
        <button type="button" disabled={saving} onClick={onSave} className="rounded-lg border border-sky-600 px-3 py-2 text-sm font-semibold text-sky-700 hover:bg-sky-50 disabled:cursor-not-allowed disabled:border-slate-300 disabled:text-slate-500">{t('Mentés')}</button>
        <button type="button" disabled={saving} onClick={onDownload} className="rounded-lg border border-emerald-600 px-3 py-2 text-sm font-semibold text-emerald-800 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:border-slate-300 disabled:text-slate-500">{t('PDF letöltése')}</button>
        <button type="button" disabled={saving || !clientEmail} onClick={onSend} className="rounded-lg bg-emerald-700 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500 disabled:opacity-100">{t('Mentés és kiküldés')}</button>
      </div>
    </div>
  );
}
