import type { ModuleKey, Project } from '@/lib/projectService';
import type { QuoteDraft } from '@/lib/quoteService';
import type { ContractDraft } from '@/lib/contractService';

export type DashboardView = 'projects' | 'calendar' | 'team';

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
  assigneeId: string;
  assigneeType: 'member' | 'team' | '';
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

export type AssignmentOption = {
  id: string;
  type: 'member' | 'team';
  label: string;
};

export type { ContractDraft, QuoteDraft };
