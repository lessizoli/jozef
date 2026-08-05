type Props = {
  activeProjects: number;
  delayedProjects: number;
  calendarEvents: number;
};

export default function DashboardStats({ activeProjects, delayedProjects, calendarEvents }: Props) {
  return (
    <section className="grid gap-4 sm:grid-cols-3" aria-label="Projektstatisztika">
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
        <p className="text-xs uppercase tracking-wider text-slate-500">Aktív projektek</p>
        <p className="mt-2 text-3xl font-bold">{activeProjects}</p>
      </div>
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
        <p className="text-xs uppercase tracking-wider text-slate-500">Csúszásban</p>
        <p className="mt-2 text-3xl font-bold text-rose-400">{delayedProjects}</p>
      </div>
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
        <p className="text-xs uppercase tracking-wider text-slate-500">Naptárbejegyzések</p>
        <p className="mt-2 text-3xl font-bold text-sky-400">{calendarEvents}</p>
      </div>
    </section>
  );
}
