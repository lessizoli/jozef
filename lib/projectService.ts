import {
  addDoc,
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';
import { auth, db } from './firebase';

export type ModuleKey = 'survey' | 'quote' | 'contract' | 'construction' | 'completion' | 'finance';

export type ProjectModule = {
  enabled: boolean;
  status: string;
  scheduledAt?: string | null;
  scheduledTime?: string | null;
  assignedTo?: string | null;
  assigneeId?: string | null;
  assigneeType?: 'member' | 'team' | null;
  completedAt?: unknown;
  statusChangedAt?: unknown;
  delayed?: boolean;
};

export type QuoteItemCategory = 'material' | 'labor' | 'other';

export type QuoteItem = {
  id: string;
  category: QuoteItemCategory;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  vatRate: number;
};

export type QuoteData = {
  quoteNumber: string;
  issueDate: string;
  validUntil: string;
  items: QuoteItem[];
  note: string;
  netTotal: number;
  vatTotal: number;
  grossTotal: number;
  updatedAt?: unknown;
  sentAt?: unknown;
};

export type SignedContractDocument = {
  fileName: string;
  storagePath: string;
  downloadURL?: string;
  contentType: string;
  size: number;
  uploadedAt?: unknown;
  uploadedBy?: string;
};

export type ContractData = {
  contractNumber: string;
  issueDate: string;
  contractorName: string;
  contractorAddress: string;
  contractorTaxNumber: string;
  contractorRepresentative: string;
  clientTaxNumber: string;
  clientRepresentative: string;
  workDescription: string;
  grossAmount: number;
  depositAmount: number;
  paymentTerms: string;
  startDate: string;
  completionDate: string;
  warrantyMonths: number;
  additionalTerms: string;
  updatedAt?: unknown;
  sentAt?: unknown;
  signedAt?: unknown;
  signedByUid?: string;
  signedByName?: string;
  signedDocument?: SignedContractDocument;
};

export type InvoiceDocument = {
  fileName: string;
  storagePath: string;
  contentType: string;
  size: number;
  uploadedAt?: unknown;
  uploadedBy?: string;
};

export type FinanceData = {
  invoiceNumber: string;
  grossAmount: number;
  invoiceDate: string;
  dueDate: string;
  paidAt: string;
  note: string;
  invoiceDocument?: InvoiceDocument;
  updatedAt?: unknown;
};

export interface Project {
  id: string;
  companyId: string;
  code: string;
  title: string;
  status: string;
  lastAction?: string;
  closed?: boolean;
  teamId?: string | null;
  client: {
    name: string;
    email: string;
    phone: string;
    address: string;
  };
  surveyData?: {
    customerNeeds: string;
    siteConditions: string;
    measurements: string;
    notes: string;
    updatedAt?: unknown;
  };
  quoteData?: QuoteData;
  contractData?: ContractData;
  constructionData?: { phases: import('./constructionService').ConstructionPhase[]; startedAt?: unknown; finishedAt?: unknown };
  completionData?: import('./completionService').CompletionData;
  financeData?: FinanceData;
  moduleAccessSnapshot?: {
    plan: string;
    enabledModules: string[];
    capturedAt?: unknown;
  };
  modules: Record<ModuleKey, ProjectModule>;
  createdAt: unknown;
  updatedAt: unknown;
}

export type ProjectDetailsUpdate = {
  title: string;
  clientName: string;
  email: string;
  phone: string;
  address: string;
};

type UserProfile = {
  companyId?: string | null;
  role?: string;
  active?: boolean;
};

type CompanyModuleAccess = {
  plan: string;
  enabledModules: string[];
};

const moduleOrder: ModuleKey[] = ['survey', 'quote', 'contract', 'construction', 'completion', 'finance'];

const moduleLabels: Record<ModuleKey, string> = {
  survey: 'Felmérés',
  quote: 'Ajánlat',
  contract: 'Szerződés',
  construction: 'Kivitelezés',
  completion: 'Befejezés',
  finance: 'Pénzügy',
};

const completedStatuses = ['Kész', 'Elfogadva', 'Aláírva', 'Befejezve', 'Fizetve'];
const delayedStatuses = ['Csúszás', 'Késedelem', 'Elutasítva'];

const completedStatusByModule: Record<ModuleKey, string> = {
  survey: 'Kész',
  quote: 'Elfogadva',
  contract: 'Aláírva',
  construction: 'Befejezve',
  completion: 'Befejezve',
  finance: 'Fizetve',
};

const startingStatuses: Record<ModuleKey, string> = {
  survey: 'Folyamatban',
  quote: 'Kiküldve',
  contract: 'Kiküldve',
  construction: 'Folyamatban',
  completion: 'Átadásra vár',
  finance: 'Számlázva',
};

async function getAuthenticatedProfile(): Promise<UserProfile> {
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error('Nincs bejelentkezett felhasználó.');

  const profileSnapshot = await getDoc(doc(db, 'users', currentUser.uid));
  if (!profileSnapshot.exists()) {
    throw new Error('A felhasználói profil nem található a Firestore-ban.');
  }

  const profile = profileSnapshot.data() as UserProfile;
  if (profile.active === false) throw new Error('A felhasználói fiók inaktív.');
  return profile;
}

async function getAuthenticatedCompanyId(): Promise<string> {
  const profile = await getAuthenticatedProfile();
  if (!profile.companyId) throw new Error('A felhasználóhoz nincs companyId rendelve.');
  return profile.companyId;
}

async function getCompanyModuleAccess(companyId: string): Promise<CompanyModuleAccess> {
  const snapshot = await getDoc(doc(db, 'companies', companyId));
  if (!snapshot.exists()) throw new Error('A cég adatai nem találhatók.');
  const data = snapshot.data();
  const configuredModules = Array.isArray(data.enabledModules)
    ? data.enabledModules.filter((item): item is string => typeof item === 'string')
    : null;

  // A beállítás nélküli, korábban létrehozott cégeknél megőrizzük a régi működést.
  return {
    plan: typeof data.plan === 'string' ? data.plan : 'legacy',
    enabledModules: configuredModules ?? [...moduleOrder],
  };
}

function companyProjectsCollection(companyId: string) {
  return collection(db, 'companies', companyId, 'projects');
}

function companyProjectDocument(companyId: string, projectId: string) {
  return doc(db, 'companies', companyId, 'projects', projectId);
}

function withModuleDefaults(module: ProjectModule | undefined, status: string, enabledDefault = true): ProjectModule {
  return {
    enabled: module?.enabled ?? enabledDefault,
    status: module?.status ?? status,
    scheduledAt: module?.scheduledAt ?? null,
    scheduledTime: module?.scheduledTime ?? null,
    assignedTo: module?.assignedTo ?? null,
    assigneeId: module?.assigneeId ?? null,
    assigneeType: module?.assigneeType ?? null,
    completedAt: module?.completedAt,
    statusChangedAt: module?.statusChangedAt,
    delayed: module?.delayed ?? false,
  };
}

function numberOrZero(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function normalizeQuoteData(value: unknown, projectCode: string): QuoteData | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const data = value as Record<string, unknown>;
  const rawItems = Array.isArray(data.items) ? data.items : [];
  const items = rawItems.flatMap((rawItem, index) => {
    if (!rawItem || typeof rawItem !== 'object') return [];
    const item = rawItem as Record<string, unknown>;
    const category = ['material', 'labor', 'other'].includes(String(item.category))
      ? item.category as QuoteItemCategory
      : 'other';
    return [{
      id: typeof item.id === 'string' ? item.id : `item-${index + 1}`,
      category,
      description: typeof item.description === 'string' ? item.description : '',
      quantity: numberOrZero(item.quantity),
      unit: typeof item.unit === 'string' ? item.unit : 'db',
      unitPrice: numberOrZero(item.unitPrice),
      vatRate: numberOrZero(item.vatRate),
    }];
  });

  // A korai verzió csak két összeget tárolt. Ezeket automatikusan tételsorokká alakítjuk.
  if (items.length === 0) {
    const materialCost = numberOrZero(data.materialCost);
    const laborCost = numberOrZero(data.laborCost);
    if (materialCost > 0) items.push({ id: 'legacy-material', category: 'material', description: 'Anyagköltség', quantity: 1, unit: 'tétel', unitPrice: materialCost, vatRate: 0 });
    if (laborCost > 0) items.push({ id: 'legacy-labor', category: 'labor', description: 'Munkadíj', quantity: 1, unit: 'tétel', unitPrice: laborCost, vatRate: 0 });
  }

  return {
    quoteNumber: typeof data.quoteNumber === 'string' ? data.quoteNumber : `AJ-${projectCode}`,
    issueDate: typeof data.issueDate === 'string' ? data.issueDate : '',
    validUntil: typeof data.validUntil === 'string' ? data.validUntil : '',
    items,
    note: typeof data.note === 'string' ? data.note : '',
    netTotal: numberOrZero(data.netTotal ?? data.totalCost),
    vatTotal: numberOrZero(data.vatTotal),
    grossTotal: numberOrZero(data.grossTotal ?? data.totalCost),
    updatedAt: data.updatedAt,
    sentAt: data.sentAt,
  };
}

function stringValue(value: unknown) {
  return typeof value === 'string' ? value : '';
}

function normalizeSignedDocument(value: unknown): SignedContractDocument | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const data = value as Record<string, unknown>;
  if (!data.storagePath) return undefined;
  return {
    fileName: stringValue(data.fileName),
    storagePath: String(data.storagePath),
    downloadURL: stringValue(data.downloadURL) || undefined,
    contentType: stringValue(data.contentType),
    size: numberOrZero(data.size),
    uploadedAt: data.uploadedAt,
    uploadedBy: stringValue(data.uploadedBy),
  };
}

function normalizeContractData(value: unknown, projectCode: string): ContractData | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const data = value as Record<string, unknown>;
  return {
    contractNumber: stringValue(data.contractNumber) || `SZ-${projectCode}`,
    issueDate: stringValue(data.issueDate),
    contractorName: stringValue(data.contractorName),
    contractorAddress: stringValue(data.contractorAddress),
    contractorTaxNumber: stringValue(data.contractorTaxNumber),
    contractorRepresentative: stringValue(data.contractorRepresentative),
    clientTaxNumber: stringValue(data.clientTaxNumber),
    clientRepresentative: stringValue(data.clientRepresentative),
    workDescription: stringValue(data.workDescription),
    grossAmount: numberOrZero(data.grossAmount),
    depositAmount: numberOrZero(data.depositAmount),
    paymentTerms: stringValue(data.paymentTerms),
    startDate: stringValue(data.startDate),
    completionDate: stringValue(data.completionDate),
    warrantyMonths: numberOrZero(data.warrantyMonths),
    additionalTerms: stringValue(data.additionalTerms),
    updatedAt: data.updatedAt,
    sentAt: data.sentAt,
    signedAt: data.signedAt,
    signedByUid: stringValue(data.signedByUid),
    signedByName: stringValue(data.signedByName),
    signedDocument: normalizeSignedDocument(data.signedDocument),
  };
}

function normalizeFinanceData(value: unknown): FinanceData | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const data = value as Record<string, unknown>;
  const rawDocument = data.invoiceDocument && typeof data.invoiceDocument === 'object'
    ? data.invoiceDocument as Record<string, unknown>
    : null;
  return {
    invoiceNumber: stringValue(data.invoiceNumber),
    grossAmount: numberOrZero(data.grossAmount),
    invoiceDate: stringValue(data.invoiceDate),
    dueDate: stringValue(data.dueDate),
    paidAt: stringValue(data.paidAt),
    note: stringValue(data.note),
    invoiceDocument: rawDocument?.storagePath ? {
      fileName: stringValue(rawDocument.fileName),
      storagePath: String(rawDocument.storagePath),
      contentType: stringValue(rawDocument.contentType),
      size: numberOrZero(rawDocument.size),
      uploadedAt: rawDocument.uploadedAt,
      uploadedBy: stringValue(rawDocument.uploadedBy),
    } : undefined,
    updatedAt: data.updatedAt,
  };
}

function normalizeProject(id: string, companyId: string, data: Record<string, unknown>): Project {
  const modules = (data.modules ?? {}) as Partial<Record<ModuleKey, ProjectModule>>;
  const code = typeof data.code === 'string' ? data.code : `PRJ-${id.slice(0, 6).toUpperCase()}`;

  return {
    id,
    companyId,
    code,
    title: typeof data.title === 'string' ? data.title : 'Névtelen projekt',
    status: typeof data.status === 'string' ? data.status : 'Folyamatban',
    lastAction: typeof data.lastAction === 'string' ? data.lastAction : 'Projekt létrehozva',
    closed: data.closed === true,
    teamId: typeof data.teamId === 'string' ? data.teamId : null,
    client: (data.client as Project['client']) ?? {
      name: '',
      email: '',
      phone: '',
      address: '',
    },
    surveyData: data.surveyData && typeof data.surveyData === 'object' ? {
      customerNeeds: stringValue((data.surveyData as Record<string, unknown>).customerNeeds),
      siteConditions: stringValue((data.surveyData as Record<string, unknown>).siteConditions),
      measurements: stringValue((data.surveyData as Record<string, unknown>).measurements),
      notes: stringValue((data.surveyData as Record<string, unknown>).notes),
      updatedAt: (data.surveyData as Record<string, unknown>).updatedAt,
    } : undefined,
    quoteData: normalizeQuoteData(data.quoteData, code),
    contractData: normalizeContractData(data.contractData, code),
    constructionData: data.constructionData && typeof data.constructionData === 'object' ? {
      phases: Array.isArray((data.constructionData as { phases?: unknown }).phases) ? (data.constructionData as { phases: import('./constructionService').ConstructionPhase[] }).phases : [],
      startedAt: (data.constructionData as { startedAt?: unknown }).startedAt,
      finishedAt: (data.constructionData as { finishedAt?: unknown }).finishedAt,
    } : { phases: [] },
    completionData: data.completionData && typeof data.completionData === 'object'
      ? data.completionData as import('./completionService').CompletionData
      : undefined,
    financeData: normalizeFinanceData(data.financeData),
    moduleAccessSnapshot: data.moduleAccessSnapshot && typeof data.moduleAccessSnapshot === 'object' ? {
      plan: stringValue((data.moduleAccessSnapshot as { plan?: unknown }).plan),
      enabledModules: Array.isArray((data.moduleAccessSnapshot as { enabledModules?: unknown }).enabledModules)
        ? (data.moduleAccessSnapshot as { enabledModules: unknown[] }).enabledModules.filter((item): item is string => typeof item === 'string')
        : [],
      capturedAt: (data.moduleAccessSnapshot as { capturedAt?: unknown }).capturedAt,
    } : undefined,
    modules: {
      survey: withModuleDefaults(modules.survey, 'Folyamatban'),
      quote: withModuleDefaults(modules.quote, 'Intézendő'),
      contract: withModuleDefaults(modules.contract, 'Intézendő'),
      construction: withModuleDefaults(modules.construction, 'Intézendő'),
      completion: withModuleDefaults(modules.completion, 'Intézendő', false),
      finance: withModuleDefaults(modules.finance, 'Intézendő'),
    },
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  };
}

export function isProjectFinanceOverdue(project: Project, today = new Date()): boolean {
  const dueDate = project.financeData?.dueDate;
  if (!dueDate || project.modules.finance.status === 'Fizetve' || project.financeData?.paidAt) return false;
  const localToday = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  return dueDate < localToday;
}

function localIsoDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function isProjectModuleOverdue(projectModule: ProjectModule, today = new Date()): boolean {
  if (!projectModule.enabled || !projectModule.scheduledAt || completedStatuses.includes(projectModule.status)) return false;
  return projectModule.scheduledAt < localIsoDate(today);
}

export function getProjectModuleDisplayStatus(project: Project, moduleKey: ModuleKey, today = new Date()): string {
  const projectModule = project.modules[moduleKey];
  if (moduleKey === 'finance' && isProjectFinanceOverdue(project, today)) return 'Késedelem';
  if (projectModule.delayed === true || isProjectModuleOverdue(projectModule, today)) return 'Csúszás';
  return projectModule.status;
}

export function isProjectDelayed(project: Project, today = new Date()): boolean {
  if (project.closed) return false;
  return project.status === 'Csúszás'
    || isProjectFinanceOverdue(project, today)
    || moduleOrder.some((key) => {
      const projectModule = project.modules[key];
      return projectModule.delayed === true
        || delayedStatuses.includes(projectModule.status)
        || isProjectModuleOverdue(projectModule, today);
    });
}

export function subscribeToCompanyProjects(
  _legacyCompanyId: string,
  callback: (projects: Project[]) => void,
) {
  let unsubscribeProjects: (() => void) | undefined;
  let cancelled = false;

  void getAuthenticatedCompanyId()
    .then((companyId) => {
      if (cancelled) return;
      const projectsQuery = query(companyProjectsCollection(companyId));

      unsubscribeProjects = onSnapshot(
        projectsQuery,
        (snapshot) => {
          callback(
            snapshot.docs.map((projectDocument) =>
              normalizeProject(projectDocument.id, companyId, projectDocument.data()),
            ),
          );
        },
        (error) => console.error('Hiba a projektek valós idejű betöltésekor:', error),
      );
    })
    .catch((error) => console.error('A projektlista nem indítható el:', error));

  return () => {
    cancelled = true;
    unsubscribeProjects?.();
  };
}

export async function createNewInquiry(
  _legacyCompanyId: string,
  title: string,
  clientName: string,
  clientAddress: string,
  clientPhone: string,
) {
  const companyId = await getAuthenticatedCompanyId();
  const moduleAccess = await getCompanyModuleAccess(companyId);
  const code = `PRJ-${Date.now().toString().slice(-6)}`;
  const emptySchedule = { scheduledAt: null, scheduledTime: null, assignedTo: null, assigneeId: null, assigneeType: null };
  const moduleEnabled = (moduleKey: ModuleKey) => moduleAccess.enabledModules.includes(moduleKey);

  const documentReference = await addDoc(companyProjectsCollection(companyId), {
    companyId,
    code,
    title,
    status: 'Folyamatban',
    lastAction: 'Felmérés elindítva',
    closed: false,
    teamId: null,
    client: {
      name: clientName,
      address: clientAddress,
      phone: clientPhone,
      email: '',
    },
    modules: {
      survey: { enabled: true, status: 'Folyamatban', ...emptySchedule },
      quote: { enabled: moduleEnabled('quote'), status: 'Intézendő', ...emptySchedule },
      contract: { enabled: moduleEnabled('contract'), status: 'Intézendő', ...emptySchedule },
      construction: { enabled: true, status: 'Intézendő', ...emptySchedule },
      completion: { enabled: true, status: 'Intézendő', ...emptySchedule },
      finance: { enabled: moduleEnabled('finance'), status: 'Intézendő', ...emptySchedule },
    },
    moduleAccessSnapshot: {
      plan: moduleAccess.plan,
      enabledModules: moduleAccess.enabledModules,
      capturedAt: serverTimestamp(),
    },
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return { success: true, id: documentReference.id };
}

export async function updateProjectModuleStatus(
  projectId: string,
  moduleKey: ModuleKey,
  status: string,
) {
  const companyId = await getAuthenticatedCompanyId();
  const projectReference = companyProjectDocument(companyId, projectId);
  const projectSnapshot = await getDoc(projectReference);

  if (!projectSnapshot.exists()) throw new Error('A projekt nem található.');

  const project = normalizeProject(projectId, companyId, projectSnapshot.data());
  if (!project.modules[moduleKey].enabled) {
    throw new Error('Ez a modul ennél a projektnél nem elérhető.');
  }

  const completed = completedStatuses.includes(status);
  const delayed = delayedStatuses.includes(status);
  const selectedIndex = moduleOrder.indexOf(moduleKey);
  const updates: Record<string, unknown> = {
    [`modules.${moduleKey}.status`]: status,
    [`modules.${moduleKey}.delayed`]: delayed,
    [`modules.${moduleKey}.completedAt`]: completed ? serverTimestamp() : null,
    [`modules.${moduleKey}.statusChangedAt`]: serverTimestamp(),
    status: delayed ? 'Csúszás' : 'Folyamatban',
    closed: false,
    lastAction: `${moduleLabels[moduleKey]}: ${status}`,
    updatedAt: serverTimestamp(),
  };

  if (moduleKey === 'contract' && status === 'Aláírva') {
    if (!project.contractData?.contractNumber) {
      throw new Error('Az Aláírva jelölés előtt mentsd el a szerződést.');
    }
    updates['contractData.signedAt'] = serverTimestamp();
    updates['contractData.signedByUid'] = auth.currentUser?.uid ?? '';
    updates['contractData.signedByName'] = auth.currentUser?.displayName ?? auth.currentUser?.email ?? 'Munkatárs';
  }

  if (status !== 'Intézendő') {
    moduleOrder.slice(0, selectedIndex).forEach((key) => {
      if (!project.modules[key].enabled) return;
      updates[`modules.${key}.status`] = completedStatusByModule[key];
      updates[`modules.${key}.delayed`] = false;
      updates[`modules.${key}.completedAt`] = serverTimestamp();
    });
  }

  if (!completed) {
    moduleOrder.slice(selectedIndex + 1).forEach((key) => {
      if (!project.modules[key].enabled) return;
      updates[`modules.${key}.status`] = 'Intézendő';
      updates[`modules.${key}.delayed`] = false;
      updates[`modules.${key}.completedAt`] = null;
    });
    updates.lastAction = `Projekt visszaállítva: ${moduleLabels[moduleKey]} – ${status}`;
  }

  if (completed) {
    const nextModuleKey = moduleOrder
      .slice(selectedIndex + 1)
      .find((key) => project.modules[key].enabled);

    if (nextModuleKey) {
      updates[`modules.${nextModuleKey}.status`] = startingStatuses[nextModuleKey];
      updates[`modules.${nextModuleKey}.delayed`] = false;
      updates[`modules.${nextModuleKey}.completedAt`] = null;
      updates.lastAction = `${moduleLabels[moduleKey]} elkészült, ${moduleLabels[nextModuleKey]} elindítva`;
    } else {
      updates.status = 'Lezárható';
      updates.lastAction = `${moduleLabels[moduleKey]} elkészült, a projekt lezárható`;
    }
  }

  await updateDoc(projectReference, updates);
}

export async function saveProjectSurvey(
  projectId: string,
  survey: { customerNeeds: string; siteConditions: string; measurements: string; notes: string },
) {
  const companyId = await getAuthenticatedCompanyId();
  const projectReference = companyProjectDocument(companyId, projectId);
  const projectSnapshot = await getDoc(projectReference);
  if (!projectSnapshot.exists()) throw new Error('A projekt nem található.');

  const project = normalizeProject(projectId, companyId, projectSnapshot.data());
  if (!project.modules.survey.enabled) throw new Error('A Felmérés modul ennél a projektnél nem elérhető.');

  const nextModuleKey = moduleOrder.slice(1).find((key) => project.modules[key].enabled);
  const updates: Record<string, unknown> = {
    surveyData: { ...survey, updatedAt: serverTimestamp() },
    'modules.survey.status': 'Kész',
    'modules.survey.delayed': false,
    'modules.survey.completedAt': serverTimestamp(),
    'modules.survey.statusChangedAt': serverTimestamp(),
    status: nextModuleKey ? 'Folyamatban' : 'Lezárható',
    closed: false,
    lastAction: nextModuleKey
      ? `Felmérés elkészült, ${moduleLabels[nextModuleKey]} elindítva`
      : 'Felmérés elkészült, a projekt lezárható',
    updatedAt: serverTimestamp(),
  };

  if (nextModuleKey) {
    updates[`modules.${nextModuleKey}.status`] = startingStatuses[nextModuleKey];
    updates[`modules.${nextModuleKey}.delayed`] = false;
    updates[`modules.${nextModuleKey}.completedAt`] = null;
  }

  // Egyetlen dokumentumfrissítés: a felmérési eredmény és a folyamatváltás nem válhat szét.
  await updateDoc(projectReference, updates);
}

export async function updateProjectModuleSchedule(
  projectId: string,
  moduleKey: ModuleKey,
  schedule: {
    date: string | null;
    time: string | null;
    assignedTo: string | null;
    assigneeId: string | null;
    assigneeType: 'member' | 'team' | null;
  },
) {
  const companyId = await getAuthenticatedCompanyId();
  const projectReference = companyProjectDocument(companyId, projectId);
  const readableSchedule = schedule.date
    ? `${schedule.date}${schedule.time ? ` ${schedule.time}` : ''}`
    : null;

  await updateDoc(projectReference, {
    [`modules.${moduleKey}.scheduledAt`]: schedule.date,
    [`modules.${moduleKey}.scheduledTime`]: schedule.time,
    [`modules.${moduleKey}.assignedTo`]: schedule.assignedTo,
    [`modules.${moduleKey}.assigneeId`]: schedule.assigneeId,
    [`modules.${moduleKey}.assigneeType`]: schedule.assigneeType,
    lastAction: readableSchedule
      ? `${moduleLabels[moduleKey]} időpont: ${readableSchedule}`
      : `${moduleLabels[moduleKey]} időpont törölve`,
    updatedAt: serverTimestamp(),
  });
}

export async function updateProjectModuleDate(
  projectId: string,
  moduleKey: ModuleKey,
  scheduledAt: string | null,
) {
  await updateProjectModuleSchedule(projectId, moduleKey, {
    date: scheduledAt,
    time: null,
    assignedTo: null,
    assigneeId: null,
    assigneeType: null,
  });
}

export async function assignProjectTeam(projectId: string, teamId: string | null) {
  const companyId = await getAuthenticatedCompanyId();
  await updateDoc(companyProjectDocument(companyId, projectId), {
    teamId,
    lastAction: teamId ? 'Kivitelező csapat hozzárendelve' : 'Csapat-hozzárendelés törölve',
    updatedAt: serverTimestamp(),
  });
}

export async function updateProjectDetails(projectId: string, details: ProjectDetailsUpdate) {
  const companyId = await getAuthenticatedCompanyId();
  const projectReference = companyProjectDocument(companyId, projectId);
  const projectSnapshot = await getDoc(projectReference);

  if (!projectSnapshot.exists()) throw new Error('A projekt nem található.');
  if (projectSnapshot.data().closed === true) throw new Error('Lezárt projekt adatai nem módosíthatók.');

  const title = details.title.trim();
  const clientName = details.clientName.trim();
  if (!title || !clientName) throw new Error('A projekt megnevezése és az ügyfél neve kötelező.');

  await updateDoc(projectReference, {
    title,
    'client.name': clientName,
    'client.email': details.email.trim(),
    'client.phone': details.phone.trim(),
    'client.address': details.address.trim(),
    lastAction: 'Projektadatok módosítva',
    updatedAt: serverTimestamp(),
  });
}

export async function closeProject(projectId: string) {
  const companyId = await getAuthenticatedCompanyId();
  const projectReference = companyProjectDocument(companyId, projectId);
  const projectSnapshot = await getDoc(projectReference);

  if (!projectSnapshot.exists()) throw new Error('A projekt nem található.');
  if (projectSnapshot.data().closed === true) return;

  await updateDoc(projectReference, {
    closed: true,
    status: 'Lezárt',
    lastAction: 'Projekt lezárva',
    closedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}
