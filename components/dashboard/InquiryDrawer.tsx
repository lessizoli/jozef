import type { InquiryForm } from './types';

type Props = {
  open: boolean;
  form: InquiryForm;
  saving: boolean;
  onChange: (form: InquiryForm) => void;
  onClose: () => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
};

export default function InquiryDrawer({ open, form, saving, onChange, onClose, onSubmit }: Props) {
  return (
    <div className={`fixed inset-0 z-50 bg-black/60 transition-opacity duration-300 ${open ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'}`} onClick={onClose}>
      <aside className={`ml-auto h-full w-full max-w-md overflow-y-auto border-l border-slate-700 bg-slate-900 p-6 shadow-2xl transition-transform duration-300 ease-out ${open ? 'translate-x-0' : 'translate-x-full'}`} onClick={(event) => event.stopPropagation()}>
        <form onSubmit={onSubmit} className="space-y-5">
          <div className="flex items-start justify-between border-b border-slate-800 pb-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-400">Új érdeklődés</p>
              <h2 className="mt-2 text-xl font-bold">Gyors projektindítás</h2>
            </div>
            <button type="button" onClick={onClose} className="rounded-lg bg-slate-800 px-3 py-2 text-slate-400" aria-label="Bezárás">✕</button>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-400">Projekt megnevezése *</label>
            <input required value={form.title} onChange={(event) => onChange({ ...form, title: event.target.value })} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-3 outline-none focus:border-sky-500" />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-400">Ügyfél neve *</label>
            <input required value={form.clientName} onChange={(event) => onChange({ ...form, clientName: event.target.value })} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-3 outline-none focus:border-sky-500" />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-400">Helyszín / cím</label>
            <input value={form.address} onChange={(event) => onChange({ ...form, address: event.target.value })} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-3 outline-none focus:border-sky-500" />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-400">Telefonszám</label>
            <input value={form.phone} onChange={(event) => onChange({ ...form, phone: event.target.value })} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-3 outline-none focus:border-sky-500" />
          </div>
          <button disabled={saving} className="w-full rounded-lg bg-emerald-600 px-4 py-3 font-semibold hover:bg-emerald-500 disabled:opacity-50">
            {saving ? 'Mentés…' : 'Érdeklődés rögzítése'}
          </button>
        </form>
      </aside>
    </div>
  );
}
