import type { ModuleKey, Project } from '@/lib/projectService';
import type { CalendarDay } from './dashboardConfig';
import { moduleLabels, todayIso, weekdayLabels } from './dashboardConfig';
import type { CalendarEvent } from './types';

type Props = {
  monthTitle: string;
  days: CalendarDay[];
  events: CalendarEvent[];
  hasActiveProject: boolean;
  onAdd: (date: string) => void;
  onMoveMonth: (offset: number) => void;
  onToday: () => void;
  onOpenModule: (project: Project, moduleKey: ModuleKey) => void;
};

export default function CalendarView({
  monthTitle,
  days,
  events,
  hasActiveProject,
  onAdd,
  onMoveMonth,
  onToday,
  onOpenModule,
}: Props) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-xl">
      <div className="flex flex-col gap-4 border-b border-slate-800 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold capitalize">{monthTitle}</h2>
          <p className="mt-1 text-sm text-slate-500">Azonos időpontra több külön projektfolyamat is felvehető.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => onAdd(todayIso())} disabled={!hasActiveProject} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold hover:bg-emerald-500 disabled:opacity-40">
            + Folyamat hozzáadása
          </button>
          <button type="button" onClick={() => onMoveMonth(-1)} className="rounded-lg border border-slate-700 px-3 py-2 hover:bg-slate-800" aria-label="Előző hónap">←</button>
          <button type="button" onClick={onToday} className="rounded-lg border border-slate-700 px-4 py-2 text-sm hover:bg-slate-800">Ma</button>
          <button type="button" onClick={() => onMoveMonth(1)} className="rounded-lg border border-slate-700 px-3 py-2 hover:bg-slate-800" aria-label="Következő hónap">→</button>
        </div>
      </div>
      <div className="grid grid-cols-7 border-b border-slate-800 bg-slate-950/40">
        {weekdayLabels.map((label) => (
          <div key={label} className="p-3 text-center text-xs font-bold uppercase text-slate-500">{label}</div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((day) => {
          const dayEvents = events.filter((event) => event.date === day.date);
          const isToday = day.date === todayIso();
          return (
            <div
              key={day.date}
              role="button"
              tabIndex={hasActiveProject ? 0 : -1}
              onClick={() => hasActiveProject && onAdd(day.date)}
              onKeyDown={(event) => {
                if (hasActiveProject && (event.key === 'Enter' || event.key === ' ')) onAdd(day.date);
              }}
              className={`group min-h-40 border-b border-r border-slate-800 p-2 transition ${hasActiveProject ? 'cursor-pointer hover:bg-slate-800/70' : ''} ${day.currentMonth ? 'bg-slate-900' : 'bg-slate-950/50 text-slate-600'}`}
            >
              <div className="mb-2 flex items-center justify-between">
                <div className={`grid h-7 w-7 place-items-center rounded-full text-xs font-semibold ${isToday ? 'bg-sky-600 text-white' : ''}`}>{day.day}</div>
                {hasActiveProject && <span className="text-sm text-slate-600 opacity-0 group-hover:opacity-100">＋</span>}
              </div>
              <div className="space-y-1.5">
                {dayEvents.map((event) => (
                  <button
                    type="button"
                    key={`${event.project.id}-${event.moduleKey}`}
                    onClick={(clickEvent) => {
                      clickEvent.stopPropagation();
                      onOpenModule(event.project, event.moduleKey);
                    }}
                    className="block w-full rounded-md border border-sky-500/30 bg-sky-500/10 px-2 py-1.5 text-left text-[11px] text-sky-200 hover:bg-sky-500/20"
                  >
                    <span className="block font-bold">{event.time || '--:--'} · {moduleLabels[event.moduleKey]}</span>
                    <span className="block truncate">{event.project.code} · {event.project.client.address || event.project.title}</span>
                    {event.assignedTo && <span className="block truncate opacity-80">{event.assignedTo}</span>}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
