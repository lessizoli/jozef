'use client';

import { useEffect, useState } from 'react';
import { onAuthStateChanged, signOut, type User } from 'firebase/auth';
import { usePathname, useRouter } from 'next/navigation';
import { auth } from '../lib/firebase';

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (loading) return;

    if (!user && pathname !== '/login') {
      router.replace('/login');
      return;
    }

    if (user && pathname === '/login') {
      router.replace('/');
    }
  }, [loading, pathname, router, user]);

  if (loading) {
    return (
      <main className="min-h-screen grid place-items-center bg-slate-950 text-slate-300">
        <div className="text-sm">Bejelentkezés ellenőrzése…</div>
      </main>
    );
  }

  if (!user && pathname !== '/login') return null;
  if (user && pathname === '/login') return null;

  return (
    <>
      {user && pathname !== '/login' && (
        <button
          type="button"
          onClick={() => void signOut(auth)}
          className="fixed right-4 top-4 z-[100] rounded-lg border border-slate-700 bg-slate-900/90 px-3 py-2 text-xs font-semibold text-slate-200 shadow-lg backdrop-blur transition hover:border-rose-500 hover:text-rose-300"
        >
          Kilépés
        </button>
      )}
      {children}
    </>
  );
}
