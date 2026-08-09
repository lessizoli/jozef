type Props = {
  activeProjects: number;
  delayedProjects: number;
  calendarEvents: number;
};

export default function DashboardStats({ activeProjects, delayedProjects, calendarEvents }: Props) {
  return (
    <section className="grid gap-4 sm:grid-cols-3" aria-label="Projektstatisztika">
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Aktív projektek</p>
        <p className="mt-2 text-3xl font-bold text-slate-800">{activeProjects}</p>
      </div>
      <div className="rounded-xl border border-rose-200 bg-rose-50 p-5 shadow-sm">
        <p className="text-xs font-bold uppercase tracking-wider text-rose-400">Csúszásban</p>
        <p className="mt-2 text-3xl font-bold text-rose-600">{delayedProjects}</p>
      </div>
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Naptárbejegyzések</p>
        <p className="mt-2 text-3xl font-bold text-sky-600">{calendarEvents}</p>
      </div>
    </section>
  );
}
