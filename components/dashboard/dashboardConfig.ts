import { isProjectFinanceOverdue, isProjectModuleOverdue, type ModuleKey, type Project } from '@/lib/projectService';

export const moduleLabels: Record<ModuleKey, string> = {
  survey: 'Felmérés',
  quote: 'Ajánlat',
  contract: 'Szerződés',
  construction: 'Kivitelezés',
  completion: 'Befejezés',
  finance: 'Pénzügy',
};

export const moduleStatuses: Record<ModuleKey, string[]> = {
  survey: ['Folyamatban', 'Kész', 'Csúszás'],
  quote: ['Intézendő', 'Kiküldve', 'Elutasítva', 'Elfogadva', 'Csúszás'],
  contract: ['Intézendő', 'Kiküldve', 'Elutasítva', 'Aláírva', 'Csúszás'],
  construction: ['Intézendő', 'Folyamatban', 'Befejezve', 'Csúszás'],
  completion: ['Intézendő', 'Átadásra vár', 'Befejezve', 'Csúszás'],
  finance: ['Intézendő', 'Számlázva', 'Fizetve', 'Késedelem'],
};

export const moduleKeys = Object.keys(moduleLabels) as ModuleKey[];
export const weekdayLabels = ['H', 'K', 'Sze', 'Cs', 'P', 'Szo', 'V'];

const completedStatuses = ['Kész', 'Elfogadva', 'Aláírva', 'Befejezve', 'Fizetve'];
const delayedStatuses = ['Csúszás', 'Késedelem', 'Elutasítva'];
const activeStatuses = ['Folyamatban', 'Kiküldve', 'Átadásra vár', 'Számlázva'];

export function moduleClass(project: Project, key: ModuleKey) {
  const projectModule = project.modules[key];
  if (project.closed || !projectModule.enabled) {
    return 'border-slate-700 bg-slate-900 text-slate-600 cursor-not-allowed';
  }
  if ((key === 'finance' && isProjectFinanceOverdue(project)) || isProjectModuleOverdue(projectModule)) {
    return 'border-rose-500 bg-rose-500/20 text-rose-200';
  }
  if (completedStatuses.includes(projectModule.status)) {
    return 'border-emerald-500 bg-emerald-500/20 text-emerald-200';
  }
  if (delayedStatuses.includes(projectModule.status)) {
    return 'border-rose-500 bg-rose-500/20 text-rose-200';
  }
  if (activeStatuses.includes(projectModule.status)) {
    return 'border-amber-500 bg-amber-500/20 text-amber-100';
  }
  return 'border-slate-600 bg-slate-800 text-slate-300';
}

export function isoDate(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function todayIso() {
  const now = new Date();
  return isoDate(now.getFullYear(), now.getMonth(), now.getDate());
}

export type CalendarDay = { date: string; day: number; currentMonth: boolean };

export function getCalendarDays(month: Date): CalendarDay[] {
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const firstDay = new Date(year, monthIndex, 1);
  const lastDay = new Date(year, monthIndex + 1, 0);
  const mondayOffset = (firstDay.getDay() + 6) % 7;
  const days: CalendarDay[] = [];

  const previousMonthLastDay = new Date(year, monthIndex, 0).getDate();
  for (let index = mondayOffset - 1; index >= 0; index -= 1) {
    const day = previousMonthLastDay - index;
    const previous = new Date(year, monthIndex - 1, day);
    days.push({
      date: isoDate(previous.getFullYear(), previous.getMonth(), previous.getDate()),
      day,
      currentMonth: false,
    });
  }

  for (let day = 1; day <= lastDay.getDate(); day += 1) {
    days.push({ date: isoDate(year, monthIndex, day), day, currentMonth: true });
  }

  let nextDay = 1;
  while (days.length < 42) {
    const next = new Date(year, monthIndex + 1, nextDay);
    days.push({
      date: isoDate(next.getFullYear(), next.getMonth(), next.getDate()),
      day: nextDay,
      currentMonth: false,
    });
    nextDay += 1;
  }

  return days;
}
