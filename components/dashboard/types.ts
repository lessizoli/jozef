import type { ModuleKey, Project } from '@/lib/projectService';

export type DashboardView = 'projects' | 'calendar';

export type InquiryForm = {
  title: string;
  clientName: string;
  address: string;
  phone: string;
};

export type ProjectDetailsDraft = {
  title: string;
  clientName: string;
  email: string;
  phone: string;
  address: string;
};

export type ScheduleDraft = {
  date: string;
  time: string;
  assignedTo: string;
};

export type CalendarDraft = ScheduleDraft & {
  projectId: string;
  moduleKey: ModuleKey;
};

export type CalendarEvent = {
  project: Project;
  moduleKey: ModuleKey;
  date: string;
  time: string;
  assignedTo: string;
};
