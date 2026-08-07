'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { loginWithEmail, registerNewCompany } from '@/lib/authService';

function message(error: unknown) {
  if (typeof error === 'object' && error && 'code' in error) {
    const code = String(error.code);
    if (code.includes('email-already-exists')) return 'Ehhez az e-mail-címhez már tartozik felhasználó.';
    if (code.includes('invalid-email')) return 'Az e-mail-cím formátuma hibás.';
    if (code.includes('weak-password')) return 'A jelszó nem elég erős.';
  }
  return error instanceof Error ? error.message : 'A cég létrehozása nem sikerült.';
}

export default function RegisterPage() {
  const [companyName, setCompanyName] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordAgain, setPasswordAgain] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    if (password.length < 8) { setError('A jelszó legalább 8 karakter hosszú legyen.'); return; }
    if (password !== passwordAgain) { setError('A két jelszó nem egyezik.'); return; }
    setSubmitting(true);
    try {
      const cleanEmail = email.trim().toLowerCase();
      await registerNewCompany({ companyName: companyName.trim(), fullName: fullName.trim(), email: cleanEmail, password });
      await loginWithEmail(cleanEmail, password);
    } catch (registrationError) {
      setError(message(registrationError));
    } finally {
      setSubmitting(false);
    }
  }

  return <main className="grid min-h-screen place-items-center bg-slate-950 px-4 py-10 text-slate-100">
    <section className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-7 shadow-2xl">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-400">Envision PMS</p>
      <h1 className="mt-2 text-2xl font-bold">Új cég létrehozása</h1>
      <p className="mt-2 text-sm text-slate-400">Az első felhasználó automatikusan a cég adminisztrátora lesz. SuperAdmin jóváhagyása nem szükséges.</p>
      <form onSubmit={submit} className="mt-7 space-y-4">
        <label className="block text-sm text-slate-300">Cég neve<input required value={companyName} onChange={(event) => setCompanyName(event.target.value)} className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 outline-none focus:border-sky-500" /></label>
        <label className="block text-sm text-slate-300">Adminisztrátor neve<input required value={fullName} onChange={(event) => setFullName(event.target.value)} className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 outline-none focus:border-sky-500" /></label>
        <label className="block text-sm text-slate-300">E-mail-cím<input required type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 outline-none focus:border-sky-500" /></label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm text-slate-300">Jelszó<input required minLength={8} type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 outline-none focus:border-sky-500" /></label>
          <label className="block text-sm text-slate-300">Jelszó ismét<input required minLength={8} type="password" autoComplete="new-password" value={passwordAgain} onChange={(event) => setPasswordAgain(event.target.value)} className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 outline-none focus:border-sky-500" /></label>
        </div>
        {error && <div role="alert" className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-300">{error}</div>}
        <button disabled={submitting} className="w-full rounded-lg bg-sky-600 px-4 py-2.5 font-semibold transition hover:bg-sky-500 disabled:bg-slate-700">{submitting ? 'Cég létrehozása…' : 'Cég és admin létrehozása'}</button>
      </form>
      <p className="mt-5 text-center text-sm text-slate-400">Már van hozzáférésed? <Link href="/login" className="font-semibold text-sky-400 hover:text-sky-300">Belépés</Link></p>
    </section>
  </main>;
}
