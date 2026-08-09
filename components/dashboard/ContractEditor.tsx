import type { ChangeEvent } from 'react';
import type { ContractDraft } from '@/lib/contractService';
import type { ContractData } from '@/lib/projectService';

type Props = {
  draft: ContractDraft;
  clientName: string;
  clientAddress: string;
  clientEmail: string;
  signedDocument?: ContractData['signedDocument'];
  signed: boolean;
  signedAt?: unknown;
  signedByName?: string;
  quoteAccepted: boolean;
  hasSavedContract: boolean;
  saving: boolean;
  onChange: (draft: ContractDraft) => void;
  onSave: () => void;
  onDownload: () => void;
  onSend: () => void;
  onUploadSigned: (file: File) => void;
  onDownloadSigned: () => void;
  status: string;
  decisionAt?: unknown;
  canDecide: boolean;
  onSign: () => void;
  onReject: () => void;
};

const inputClass = 'w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-sky-500 disabled:cursor-not-allowed disabled:opacity-60';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-semibold text-slate-500">{label}</label>
      {children}
    </div>
  );
}

function readableSize(size: number) {
  if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

function readableDate(value: unknown) {
  if (!value) return '';
  const timestamp = value as { toDate?: () => Date };
  const date = typeof timestamp.toDate === 'function' ? timestamp.toDate() : new Date(String(value));
  return Number.isNaN(date.valueOf()) ? '' : date.toLocaleString('hu-HU');
}

export default function ContractEditor({
  draft,
  clientName,
  clientAddress,
  clientEmail,
  signedDocument,
  signed,
  signedAt,
  signedByName,
  quoteAccepted,
  hasSavedContract,
  saving,
  onChange,
  onSave,
  onDownload,
  onSend,
  onUploadSigned,
  onDownloadSigned,
  status,
  decisionAt,
  canDecide,
  onSign,
  onReject,
}: Props) {
  const disabled = saving || signed;

  function selectSignedFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (file) onUploadSigned(file);
  }

  return (
    <div className="mt-6 space-y-5">
      <section className={`rounded-xl border p-4 ${status === 'Aláírva' ? 'border-emerald-500/40 bg-emerald-500/10' : status === 'Elutasítva' ? 'border-rose-500/40 bg-rose-500/10' : 'border-slate-700 bg-slate-950/60'}`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wider text-slate-500">Szerződés állapota</p>
            <p className={`mt-1 font-bold ${status === 'Aláírva' ? 'text-emerald-300' : status === 'Elutasítva' ? 'text-rose-300' : 'text-amber-300'}`}>{status}</p>
            {['Aláírva', 'Elutasítva'].includes(status) && readableDate(decisionAt) && <p className="mt-1 text-xs text-slate-400">Döntés: {readableDate(decisionAt)}</p>}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" disabled={saving || !canDecide || signed || status === 'Elutasítva'} onClick={onReject} className="rounded-lg border border-rose-500 px-3 py-2 text-sm font-bold text-rose-300 hover:bg-rose-500/10 disabled:opacity-40">Elutasítva</button>
            <button type="button" disabled={saving || !canDecide || signed || !hasSavedContract} onClick={onSign} className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-bold hover:bg-emerald-500 disabled:opacity-40">Aláírva</button>
          </div>
        </div>
        {!hasSavedContract && !signed && <p className="mt-3 text-xs text-amber-300">Az Aláírva jelölés előtt mentsd el a szerződést.</p>}
        {!canDecide && <p className="mt-3 text-xs text-amber-300">A döntés rögzítéséhez projektmódosítási jogosultság szükséges.</p>}
      </section>
      {signed && (
        <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-4 text-sm text-emerald-200">
          <p className="font-bold">A szerződés aláírt állapotban van.</p>
          <p className="mt-1 text-xs text-emerald-200/70">Az adatok lezárultak, a Kivitelezés modul automatikusan elindult.</p>
          {Boolean(signedByName || signedAt) && (
            <p className="mt-2 text-xs text-emerald-100">Rögzítette: {signedByName || 'ismeretlen felhasználó'}{readableDate(signedAt) ? ` · ${readableDate(signedAt)}` : ''}</p>
          )}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Szerződésszám">
          <input required disabled={disabled} value={draft.contractNumber} onChange={(event) => onChange({ ...draft, contractNumber: event.target.value })} className={inputClass} />
        </Field>
        <Field label="Keltezés">
          <input type="date" required disabled={disabled} value={draft.issueDate} onChange={(event) => onChange({ ...draft, issueDate: event.target.value })} className={inputClass} />
        </Field>
      </div>

      <section className="rounded-xl border border-slate-700 bg-slate-950/60 p-4">
        <h3 className="font-bold">Vállalkozó</h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Field label="Név / cégnév">
            <input required disabled={disabled} value={draft.contractorName} onChange={(event) => onChange({ ...draft, contractorName: event.target.value })} className={inputClass} />
          </Field>
          <Field label="Cím / székhely">
            <input required disabled={disabled} value={draft.contractorAddress} onChange={(event) => onChange({ ...draft, contractorAddress: event.target.value })} className={inputClass} />
          </Field>
          <Field label="Adószám">
            <input disabled={disabled} value={draft.contractorTaxNumber} onChange={(event) => onChange({ ...draft, contractorTaxNumber: event.target.value })} className={inputClass} />
          </Field>
          <Field label="Képviselő">
            <input disabled={disabled} value={draft.contractorRepresentative} onChange={(event) => onChange({ ...draft, contractorRepresentative: event.target.value })} className={inputClass} />
          </Field>
        </div>
      </section>

      <section className="rounded-xl border border-slate-700 bg-slate-950/60 p-4">
        <h3 className="font-bold">Megrendelő</h3>
        <p className="mt-2 text-sm text-slate-300">{clientName}</p>
        <p className="text-xs text-slate-500">{clientAddress || 'Nincs cím megadva'}</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Field label="Adószám, ha releváns">
            <input disabled={disabled} value={draft.clientTaxNumber} onChange={(event) => onChange({ ...draft, clientTaxNumber: event.target.value })} className={inputClass} />
          </Field>
          <Field label="Képviselő, ha releváns">
            <input disabled={disabled} value={draft.clientRepresentative} onChange={(event) => onChange({ ...draft, clientRepresentative: event.target.value })} className={inputClass} />
          </Field>
        </div>
      </section>

      <Field label="A szerződés tárgya és a munka műszaki tartalma">
        <textarea required disabled={disabled} rows={5} value={draft.workDescription} onChange={(event) => onChange({ ...draft, workDescription: event.target.value })} className={inputClass} />
      </Field>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Bruttó vállalkozói díj (Ft)">
          <input type="number" min="0" step="1" required disabled={disabled} value={draft.grossAmount} onChange={(event) => onChange({ ...draft, grossAmount: Number(event.target.value) })} className={inputClass} />
        </Field>
        <Field label="Előleg (Ft)">
          <input type="number" min="0" step="1" disabled={disabled} value={draft.depositAmount} onChange={(event) => onChange({ ...draft, depositAmount: Number(event.target.value) })} className={inputClass} />
        </Field>
      </div>

      <Field label="Fizetési feltételek">
        <textarea required disabled={disabled} rows={3} value={draft.paymentTerms} onChange={(event) => onChange({ ...draft, paymentTerms: event.target.value })} className={inputClass} />
      </Field>

      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Munkakezdés">
          <input type="date" required disabled={disabled} value={draft.startDate} onChange={(event) => onChange({ ...draft, startDate: event.target.value })} className={inputClass} />
        </Field>
        <Field label="Befejezési határidő">
          <input type="date" required disabled={disabled} min={draft.startDate} value={draft.completionDate} onChange={(event) => onChange({ ...draft, completionDate: event.target.value })} className={inputClass} />
        </Field>
        <Field label="Jótállás (hónap)">
          <input type="number" min="0" step="1" required disabled={disabled} value={draft.warrantyMonths} onChange={(event) => onChange({ ...draft, warrantyMonths: Number(event.target.value) })} className={inputClass} />
        </Field>
      </div>

      <Field label="Egyéb feltételek">
        <textarea disabled={disabled} rows={5} value={draft.additionalTerms} onChange={(event) => onChange({ ...draft, additionalTerms: event.target.value })} className={inputClass} placeholder="Például munkaterület átadása, pótmunka, kapcsolattartás vagy egyedi feltételek." />
      </Field>

      <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs leading-5 text-amber-200">
        Ez szerkeszthető szerződéssablon. Éles használat előtt a saját tevékenységre és ügyféltípusra szabott jogi ellenőrzés szükséges.
      </p>

      {!signed && (
        <div className="grid gap-2 sm:grid-cols-3">
          <button type="button" disabled={saving} onClick={onSave} className="rounded-lg border border-sky-500 px-3 py-2 text-sm font-semibold text-sky-300 hover:bg-sky-500/10 disabled:opacity-50">Mentés</button>
          <button type="button" disabled={saving} onClick={onDownload} className="rounded-lg border border-emerald-500 px-3 py-2 text-sm font-semibold text-emerald-300 hover:bg-emerald-500/10 disabled:opacity-50">PDF letöltése</button>
          <button type="button" disabled={saving || !clientEmail || !quoteAccepted} onClick={onSend} className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold hover:bg-emerald-500 disabled:opacity-50">Mentés és kiküldés</button>
        </div>
      )}
      {!clientEmail && !signed && <p className="text-xs text-amber-300">Kiküldéshez előbb add meg az ügyfél e-mail-címét a Projektadatok fülön.</p>}
      {!quoteAccepted && !signed && <p className="text-xs text-amber-300">A szerződés kiküldéséhez előbb állítsd az Ajánlat státuszát Elfogadva értékre.</p>}

      <section className="rounded-xl border border-slate-700 bg-slate-950/60 p-4">
        <h3 className="font-bold">Aláírt dokumentum</h3>
        {signedDocument ? (
          <div className="mt-3 flex items-center justify-between gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-emerald-200">{signedDocument.fileName}</p>
              <p className="text-xs text-emerald-200/60">{readableSize(signedDocument.size)}</p>
            </div>
            <button type="button" disabled={saving} onClick={onDownloadSigned} className="shrink-0 rounded-lg border border-emerald-500/50 px-3 py-2 text-xs font-semibold text-emerald-200 disabled:opacity-50">Letöltés</button>
          </div>
        ) : (
          <label className={`mt-3 flex flex-col items-center rounded-lg border-2 border-dashed border-slate-700 p-5 text-center ${hasSavedContract ? 'cursor-pointer hover:border-sky-500' : 'cursor-not-allowed opacity-50'}`}>
            <span className="text-sm font-semibold">Aláírt szerződés feltöltése</span>
            <span className="mt-1 text-xs text-slate-500">{hasSavedContract ? 'PDF, JPG vagy PNG, legfeljebb 15 MB' : 'A feltöltés előtt mentsd el a szerződést.'}</span>
            <input type="file" accept="application/pdf,image/jpeg,image/png" disabled={saving || !hasSavedContract} onChange={selectSignedFile} className="hidden" />
          </label>
        )}
      </section>
    </div>
  );
}
