'use client';

import { FormEvent, useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../lib/firebase';

function getLoginError(code?: string) {
  if (code === 'auth/invalid-credential') return 'Hibás e-mail-cím vagy jelszó.';
  if (code === 'auth/too-many-requests') return 'Túl sok sikertelen próbálkozás. Próbáld újra később.';
  return 'A bejelentkezés nem sikerült.';
}

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
    } catch (loginError) {
      const code = typeof loginError === 'object' && loginError && 'code' in loginError
        ? String(loginError.code)
        : undefined;
      setError(getLoginError(code));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen grid place-items-center bg-slate-950 px-4 text-slate-100">
      <section className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-7 shadow-2xl">
        <div className="mb-7">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-400">Envision PMS</p>
          <h1 className="mt-2 text-2xl font-bold">Bejelentkezés</h1>
          <p className="mt-2 text-sm text-slate-400">A projektkezelő használatához jelentkezz be.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="email" className="text-sm text-slate-300">E-mail-cím</label>
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
            <label htmlFor="password" className="text-sm text-slate-300">Jelszó</label>
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
            {submitting ? 'Bejelentkezés…' : 'Belépés'}
          </button>
        </form>
      </section>
    </main>
  );
}
