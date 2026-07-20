"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";

export function ProtectedArea({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { user, profile, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  if (loading || (!user && !loading)) {
    return <main className="centered-page">Betöltés…</main>;
  }

  if (!profile) {
    return (
      <main className="centered-page">
        <section className="auth-card">
          <h1>Nincs CRM-profil</h1>
          <p>A Firebase-fiók létezik, de a Firestore users dokumentum hiányzik.</p>
        </section>
      </main>
    );
  }

  if (!profile.active) {
    return (
      <main className="centered-page">
        <section className="auth-card">
          <h1>Inaktív felhasználó</h1>
          <p>A hozzáférést egy adminisztrátornak kell újra engedélyeznie.</p>
        </section>
      </main>
    );
  }

  return children;
}
