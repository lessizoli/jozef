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

export type ModuleKey = 'survey' | 'quote' | 'contract' | 'construction' | 'finance';

export type ProjectModule = {
  enabled: boolean;
  status: string;
  scheduledAt?: string | null;
  completedAt?: unknown;
  delayed?: boolean;
};

export interface Project {
  id: string;
  companyId: string;
  code: string;
  title: string;
  status: string;
  lastAction?: string;
  client: {
    name: string;
    email: string;
    phone: string;
    address: string;
  };
  modules: Record<ModuleKey, ProjectModule>;
  createdAt: unknown;
  updatedAt: unknown;
}

type UserProfile = {
  companyId?: string | null;
  role?: string;
  active?: boolean;
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

function companyProjectsCollection(companyId: string) {
  return collection(db, 'companies', companyId, 'projects');
}

function companyProjectDocument(companyId: string, projectId: string) {
  return doc(db, 'companies', companyId, 'projects', projectId);
}

function normalizeProject(id: string, companyId: string, data: Record<string, unknown>): Project {
  const modules = (data.modules ?? {}) as Partial<Record<ModuleKey, ProjectModule>>;

  return {
    id,
    companyId,
    code: typeof data.code === 'string' ? data.code : `PRJ-${id.slice(0, 6).toUpperCase()}`,
    title: typeof data.title === 'string' ? data.title : 'Névtelen projekt',
    status: typeof data.status === 'string' ? data.status : 'Folyamatban',
    lastAction: typeof data.lastAction === 'string' ? data.lastAction : 'Projekt létrehozva',
    client: (data.client as Project['client']) ?? {
      name: '',
      email: '',
      phone: '',
      address: '',
    },
    modules: {
      survey: modules.survey ?? { enabled: true, status: 'Folyamatban', scheduledAt: null },
      quote: modules.quote ?? { enabled: true, status: 'Intézendő', scheduledAt: null },
      contract: modules.contract ?? { enabled: true, status: 'Intézendő', scheduledAt: null },
      construction: modules.construction ?? { enabled: true, status: 'Intézendő', scheduledAt: null },
      finance: modules.finance ?? { enabled: true, status: 'Intézendő', scheduledAt: null },
    },
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  };
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
  const code = `PRJ-${Date.now().toString().slice(-6)}`;

  const documentReference = await addDoc(companyProjectsCollection(companyId), {
    companyId,
    code,
    title,
    status: 'Folyamatban',
    lastAction: 'Felmérés elindítva',
    client: {
      name: clientName,
      address: clientAddress,
      phone: clientPhone,
      email: '',
    },
    modules: {
      survey: { enabled: true, status: 'Folyamatban', scheduledAt: null },
      quote: { enabled: true, status: 'Intézendő', scheduledAt: null },
      contract: { enabled: true, status: 'Intézendő', scheduledAt: null },
      construction: { enabled: true, status: 'Intézendő', scheduledAt: null },
      finance: { enabled: true, status: 'Intézendő', scheduledAt: null },
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
  const completedStatuses = ['Kész', 'Elfogadva', 'Aláírva', 'Befejezve', 'Fizetve'];
  const delayedStatuses = ['Csúszás', 'Késedelem'];

  await updateDoc(projectReference, {
    [`modules.${moduleKey}.status`]: status,
    [`modules.${moduleKey}.delayed`]: delayedStatuses.includes(status),
    [`modules.${moduleKey}.completedAt`]: completedStatuses.includes(status)
      ? serverTimestamp()
      : null,
    status: delayedStatuses.includes(status) ? 'Csúszás' : 'Folyamatban',
    lastAction: `${moduleKey}: ${status}`,
    updatedAt: serverTimestamp(),
  });
}

export async function updateProjectModuleDate(
  projectId: string,
  moduleKey: ModuleKey,
  scheduledAt: string | null,
) {
  const companyId = await getAuthenticatedCompanyId();
  const projectReference = companyProjectDocument(companyId, projectId);

  await updateDoc(projectReference, {
    [`modules.${moduleKey}.scheduledAt`]: scheduledAt,
    lastAction: scheduledAt
      ? `${moduleKey} időpont: ${scheduledAt}`
      : `${moduleKey} időpont törölve`,
    updatedAt: serverTimestamp(),
  });
}
