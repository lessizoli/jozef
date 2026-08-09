import { useMemo } from 'react';
import type { QuoteItem, QuoteItemCategory } from '@/lib/projectService';
import { calculateQuoteTotals, type QuoteDraft } from '@/lib/quoteService';

type Props = {
  draft: QuoteDraft;
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

const money = new Intl.NumberFormat('hu-HU', { maximumFractionDigits: 0 });

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

export default function QuoteEditor({ draft, clientEmail, saving, onChange, onSave, onDownload, onSend, status, decisionAt, canDecide, onAccept, onReject }: Props) {
  const totals = useMemo(() => calculateQuoteTotals(draft.items), [draft.items]);

  function updateItem(id: string, update: Partial<QuoteItem>) {
    onChange({
      ...draft,
      items: draft.items.map((item) => item.id === id ? { ...item, ...update } : item),
    });
  }

  function removeItem(id: string) {
    onChange({ ...draft, items: draft.items.filter((item) => item.id !== id) });
  }

  return (
    <div className="mt-6 space-y-5">
      <section className={`rounded-xl border p-4 ${status === 'Elfogadva' ? 'border-emerald-500/40 bg-emerald-500/10' : status === 'Elutasítva' ? 'border-rose-500/40 bg-rose-500/10' : 'border-slate-700 bg-slate-950/60'}`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wider text-slate-500">Ajánlat állapota</p>
            <p className={`mt-1 font-bold ${status === 'Elfogadva' ? 'text-emerald-300' : status === 'Elutasítva' ? 'text-rose-300' : 'text-amber-300'}`}>{status}</p>
            {['Elfogadva', 'Elutasítva'].includes(status) && readableDate(decisionAt) && <p className="mt-1 text-xs text-slate-400">Döntés: {readableDate(decisionAt)}</p>}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" disabled={saving || !canDecide || status === 'Elutasítva'} onClick={onReject} className="rounded-lg border border-rose-500 px-3 py-2 text-sm font-bold text-rose-300 hover:bg-rose-500/10 disabled:opacity-40">Elutasítva</button>
            <button type="button" disabled={saving || !canDecide || status === 'Elfogadva'} onClick={onAccept} className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-bold hover:bg-emerald-500 disabled:opacity-40">Elfogadva</button>
          </div>
        </div>
        {!canDecide && <p className="mt-3 text-xs text-amber-300">A döntés rögzítéséhez projektmódosítási jogosultság szükséges.</p>}
      </section>
      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-500">Ajánlatszám</label>
          <input required value={draft.quoteNumber} onChange={(event) => onChange({ ...draft, quoteNumber: event.target.value })} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-sky-500" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-500">Kiállítás</label>
          <input type="date" required value={draft.issueDate} onChange={(event) => onChange({ ...draft, issueDate: event.target.value })} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-sky-500" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-500">Érvényes eddig</label>
          <input type="date" required value={draft.validUntil} min={draft.issueDate} onChange={(event) => onChange({ ...draft, validUntil: event.target.value })} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-sky-500" />
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="font-bold">Ajánlati tételek</h3>
            <p className="text-xs text-slate-500">A végösszeg és az ÁFA automatikusan számolódik.</p>
          </div>
          <button type="button" onClick={() => onChange({ ...draft, items: [...draft.items, newItem()] })} className="rounded-lg border border-sky-500/50 px-3 py-2 text-xs font-semibold text-sky-300 hover:bg-sky-500/10">+ Tétel</button>
        </div>

        {draft.items.length === 0 ? (
          <button type="button" onClick={() => onChange({ ...draft, items: [newItem()] })} className="w-full rounded-xl border border-dashed border-slate-700 p-6 text-sm text-slate-400 hover:border-sky-500">Első tétel hozzáadása</button>
        ) : draft.items.map((item, index) => (
          <div key={item.id} className="rounded-xl border border-slate-700 bg-slate-950/70 p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">{index + 1}. tétel</span>
              <button type="button" onClick={() => removeItem(item.id)} className="text-xs font-semibold text-rose-300 hover:text-rose-200">Törlés</button>
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-500">Típus</label>
                <select value={item.category} onChange={(event) => updateItem(item.id, { category: event.target.value as QuoteItemCategory })} className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm outline-none focus:border-sky-500">
                  {Object.entries(categoryLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-500">Megnevezés</label>
                <input required value={item.description} onChange={(event) => updateItem(item.id, { description: event.target.value })} className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm outline-none focus:border-sky-500" />
              </div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-500">Mennyiség</label>
                <input type="number" min="0.01" step="0.01" value={item.quantity} onChange={(event) => updateItem(item.id, { quantity: Number(event.target.value) })} className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm outline-none focus:border-sky-500" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-500">Egység</label>
                <input value={item.unit} onChange={(event) => updateItem(item.id, { unit: event.target.value })} className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm outline-none focus:border-sky-500" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-500">Nettó egységár</label>
                <input type="number" min="0" step="1" value={item.unitPrice} onChange={(event) => updateItem(item.id, { unitPrice: Number(event.target.value) })} className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm outline-none focus:border-sky-500" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-500">ÁFA</label>
                <select value={item.vatRate} onChange={(event) => updateItem(item.id, { vatRate: Number(event.target.value) })} className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm outline-none focus:border-sky-500">
                  {[0, 5, 18, 27].map((rate) => <option key={rate} value={rate}>{rate}%</option>)}
                </select>
              </div>
            </div>
            <p className="mt-3 text-right text-sm text-slate-400">Nettó: <span className="font-semibold text-slate-200">{money.format(Math.round(item.quantity * item.unitPrice))} Ft</span></p>
          </div>
        ))}
      </div>

      <div>
        <label className="mb-1 block text-xs font-semibold text-slate-500">Megjegyzés / fizetési feltétel</label>
        <textarea rows={4} value={draft.note} onChange={(event) => onChange({ ...draft, note: event.target.value })} className="w-full resize-y rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-sky-500" placeholder="Például: 50% előleg, fennmaradó összeg átadáskor." />
      </div>

      <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
        <div className="flex justify-between text-sm text-slate-300"><span>Nettó összesen</span><strong>{money.format(totals.netTotal)} Ft</strong></div>
        <div className="mt-2 flex justify-between text-sm text-slate-300"><span>ÁFA összesen</span><strong>{money.format(totals.vatTotal)} Ft</strong></div>
        <div className="mt-3 flex justify-between border-t border-emerald-500/20 pt-3 text-lg text-emerald-200"><span>Bruttó végösszeg</span><strong>{money.format(totals.grossTotal)} Ft</strong></div>
      </div>

      {!clientEmail && <p className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-200">Kiküldéshez előbb add meg az ügyfél e-mail-címét a Projektadatok fülön.</p>}
      <div className="grid gap-2 sm:grid-cols-3">
        <button type="button" disabled={saving} onClick={onSave} className="rounded-lg border border-sky-500 px-3 py-2 text-sm font-semibold text-sky-300 hover:bg-sky-500/10 disabled:opacity-50">Mentés</button>
        <button type="button" disabled={saving} onClick={onDownload} className="rounded-lg border border-emerald-500 px-3 py-2 text-sm font-semibold text-emerald-300 hover:bg-emerald-500/10 disabled:opacity-50">PDF letöltése</button>
        <button type="button" disabled={saving || !clientEmail} onClick={onSend} className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold hover:bg-emerald-500 disabled:opacity-50">Mentés és kiküldés</button>
      </div>
    </div>
  );
}
