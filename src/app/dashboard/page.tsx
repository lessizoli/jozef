"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { roleLabels } from "@/lib/auth/roles";

const modules = ["Felmérés", "Ajánlat", "Szerződés", "Kivitelezés", "Pénzügy"];

export default function DashboardPage() {
  const router = useRouter();
  const { profile, logout } = useAuth();

  async function handleLogout() {
    await logout();
    router.replace("/login");
  }

  return (
    <main className="shell">
      <header className="dashboard-header">
        <div>
          <span className="eyebrow">ENViSiON CRM</span>
          <h1>Üdv, {profile?.displayName || profile?.email}!</h1>
          <p>{profile ? roleLabels[profile.role] : "Felhasználó"}</p>
        </div>
        <button className="secondary-button" onClick={handleLogout}>
          Kijelentkezés
        </button>
      </header>

      <section className="panel">
        <div>
          <span className="section-label">Projektfolyamat</span>
          <h2>Főmodulok</h2>
        </div>

        <div className="module-grid">
          {modules.map((module, index) => (
            <article className="module-card" key={module}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <h3>{module}</h3>
              <p>A modul jogosultság- és előfizetéskezelése következik.</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
