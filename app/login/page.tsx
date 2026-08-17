'use client';

import { FormEvent, useState } from 'react';
import { loginWithEmail } from '@/lib/authService';
import Link from 'next/link';
import { useI18n } from '@/lib/i18n';

export default function LoginPage() {
  const { t, language, setLanguage } = useI18n();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      await loginWithEmail(email.trim(), password);
    } catch (loginError) {
      const code = typeof loginError === 'object' && loginError && 'code' in loginError
        ? String(loginError.code)
        : undefined;
      setError(t(code === 'auth/invalid-credential' ? 'Hibás e-mail-cím vagy jelszó.' : code === 'auth/too-many-requests' ? 'Túl sok sikertelen próbálkozás. Próbáld újra később.' : 'A bejelentkezés nem sikerült.'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen grid place-items-center bg-slate-950 px-4 text-slate-100">
      <section className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-7 shadow-2xl">
        <div className="mb-4 flex justify-end gap-1"><button type="button" onClick={() => setLanguage('hu')} className={`rounded px-2 py-1 text-xs font-bold ${language === 'hu' ? 'bg-sky-600' : 'bg-slate-800 text-slate-400'}`}>HU</button><button type="button" onClick={() => setLanguage('de')} className={`rounded px-2 py-1 text-xs font-bold ${language === 'de' ? 'bg-sky-600' : 'bg-slate-800 text-slate-400'}`}>DE</button></div>
        <div className="mb-7">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-400">Envision PMS</p>
          <h1 className="mt-2 text-2xl font-bold">{t('Bejelentkezés')}</h1>
          <p className="mt-2 text-sm text-slate-400">{t('A projektkezelő használatához jelentkezz be.')}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="email" className="text-sm text-slate-300">{t('E-mail-cím')}</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 outline-none focus:border-sky-500"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="password" className="text-sm text-slate-300">{t('Jelszó')}</label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 outline-none focus:border-sky-500"
            />
          </div>

          {error && (
            <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-300">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-sky-600 px-4 py-2.5 font-semibold text-white transition hover:bg-sky-500 disabled:cursor-not-allowed disabled:bg-slate-700"
          >
            {submitting ? t('Bejelentkezés…') : t('Belépés')}
          </button>
        </form>
        <div className="mt-6 border-t border-slate-800 pt-5 text-center">
          <p className="text-sm text-slate-400">{t('Új cégként szeretnéd használni a rendszert?')}</p>
          <Link href="/register" className="mt-2 inline-block text-sm font-semibold text-sky-400 hover:text-sky-300">
            {t('Új cég és céges admin létrehozása')}
          </Link>
        </div>
      </section>
    </main>
  );
}
