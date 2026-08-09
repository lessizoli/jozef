import { useEffect, useState } from 'react';
import { subscribeToCompanyDetails, updateCompanyDetails, type CompanyDetails } from '@/lib/companyService';

const emptyDetails: CompanyDetails = { name: '', taxNumber: '', address: '', email: '', phone: '', website: '', representative: '', bankAccount: '' };

export default function CompanyDetailsEditor({ canEdit }: { canEdit: boolean }) {
  const [details, setDetails] = useState<CompanyDetails>(emptyDetails);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => subscribeToCompanyDetails(setDetails), []);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setMessage(''); setError('');
    try { await updateCompanyDetails(details); setMessage('A céges adatok mentése sikerült.'); }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'A céges adatok mentése sikertelen.'); }
    finally { setSaving(false); }
  }

  const field = (key: keyof CompanyDetails, label: string, options?: { type?: string; placeholder?: string; required?: boolean }) => <label className="text-sm font-semibold text-slate-600">{label}<input type={options?.type ?? 'text'} required={options?.required} disabled={!canEdit || saving} value={String(details[key] ?? '')} placeholder={options?.placeholder} onChange={(event) => setDetails({ ...details, [key]: event.target.value })} className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-sky-500 disabled:bg-slate-100 disabled:text-slate-500"/></label>;

  return <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between"><div><h2 className="text-lg font-bold text-slate-900">Céges adatok</h2><p className="mt-1 text-sm text-slate-500">A vállalkozás hivatalos és kapcsolattartási adatai.</p></div>{details.plan && <span className="w-fit rounded-full bg-sky-50 px-3 py-1 text-xs font-bold text-sky-700">Csomag: {details.plan}</span>}</div>
    <form onSubmit={submit} className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {field('name', 'Vállalkozás neve', { required: true })}
      {field('taxNumber', 'Adószám', { placeholder: '12345678-1-42' })}
      {field('representative', 'Képviselő / kapcsolattartó')}
      {field('bankAccount', 'Bankszámlaszám')}
      <div className="sm:col-span-2">{field('address', 'Székhely / levelezési cím')}</div>
      {field('email', 'Központi e-mail', { type: 'email' })}
      {field('phone', 'Telefonszám', { type: 'tel' })}
      <div className="sm:col-span-2">{field('website', 'Weboldal', { type: 'url', placeholder: 'https://…' })}</div>
      <div className="flex items-center gap-3 sm:col-span-2 lg:col-span-4">{canEdit ? <button disabled={saving || !details.name.trim()} className="rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-sky-500 disabled:opacity-40">{saving ? 'Mentés…' : 'Céges adatok mentése'}</button> : <p className="text-xs text-slate-500">Az adatokat csak céges adminisztrátor módosíthatja.</p>}{message && <p role="status" className="text-sm font-semibold text-emerald-600">{message}</p>}{error && <p role="alert" className="text-sm font-semibold text-rose-600">{error}</p>}</div>
    </form>
  </section>;
}
