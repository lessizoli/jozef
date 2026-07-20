const modules = [
  "Felmérés",
  "Ajánlat",
  "Szerződés",
  "Kivitelezés",
  "Pénzügy",
];

export default function HomePage() {
  return (
    <main className="shell">
      <section className="hero">
        <span className="eyebrow">ENViSiON CRM</span>
        <h1>Az új projektmenedzsment rendszer alapjai elkészültek.</h1>
        <p>
          Tiszta Next.js és Firebase alap, amelyre fokozatosan felépítjük a
          többcéges jogosultságkezelést, a projektfolyamatot és az előfizetési
          modulokat.
        </p>
      </section>

      <section className="panel" aria-labelledby="modules-heading">
        <div>
          <span className="section-label">Projektfolyamat</span>
          <h2 id="modules-heading">Az öt végleges főmodul</h2>
        </div>

        <div className="module-grid">
          {modules.map((module, index) => (
            <article className="module-card" key={module}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <h3>{module}</h3>
              <p>Funkciók és jogosultságok specifikálása folyamatban.</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
