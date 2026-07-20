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
  closed?: boolean;
  teamId?: string | null;
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

const moduleOrder: ModuleKey[] = ['survey', 'quote', 'contract', 'construction', 'finance'];

const moduleLabels: Record<ModuleKey, string> = {
  survey: 'Felmérés',
  quote: 'Ajánlat',
  contract: 'Szerződés',
  construction: 'Kivitelezés',
  finance: 'Pénzügy',
};

const completedStatuses = ['Kész', 'Elfogadva', 'Aláírva', 'Befejezve', 'Fizetve'];
const delayedStatuses = ['Csúszás', 'Késedelem'];

const completedStatusByModule: Record<ModuleKey, string> = {
  survey: 'Kész',
  quote: 'Elfogadva',
  contract: 'Aláírva',
  construction: 'Befejezve',
  finance: 'Fizetve',
};

const startingStatuses: Record<ModuleKey, string> = {
  survey: 'Folyamatban',
  quote: 'Kiküldve',
  contract: 'Kiküldve',
  construction: 'Folyamatban',
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
    closed: data.closed === true,
    teamId: typeof data.teamId === 'string' ? data.teamId : null,
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
    closed: false,
    teamId: null,
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
  const projectSnapshot = await getDoc(projectReference);

  if (!projectSnapshot.exists()) {
    throw new Error('A projekt nem található.');
  }

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
    status: delayed ? 'Csúszás' : 'Folyamatban',
    closed: false,
    lastAction: `${moduleLabels[moduleKey]}: ${status}`,
    updatedAt: serverTimestamp(),
  };

  // Kézi előrelépés: az előző, elérhető modulokat készre állítjuk.
  if (status !== 'Intézendő') {
    moduleOrder.slice(0, selectedIndex).forEach((key) => {
      if (!project.modules[key].enabled) return;
      updates[`modules.${key}.status`] = completedStatusByModule[key];
      updates[`modules.${key}.delayed`] = false;
      updates[`modules.${key}.completedAt`] = serverTimestamp();
    });
  }

  // Kézi visszalépés: ha egy korábbi szakasz újra aktív, az utána lévők visszaállnak.
  if (!completed) {
    moduleOrder.slice(selectedIndex + 1).forEach((key) => {
      if (!project.modules[key].enabled) return;
      updates[`modules.${key}.status`] = 'Intézendő';
      updates[`modules.${key}.delayed`] = false;
      updates[`modules.${key}.completedAt`] = null;
    });
    updates.lastAction = `Projekt visszaállítva: ${moduleLabels[moduleKey]} – ${status}`;
  }

  // Normál automatikus továbbhaladás befejezett szakasznál.
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
      ? `${moduleLabels[moduleKey]} időpont: ${scheduledAt}`
      : `${moduleLabels[moduleKey]} időpont törölve`,
    updatedAt: serverTimestamp(),
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

export async function closeProject(projectId: string) {
  const companyId = await getAuthenticatedCompanyId();
  await updateDoc(companyProjectDocument(companyId, projectId), {
    closed: true,
    status: 'Lezárt',
    lastAction: 'Projekt lezárva',
    closedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}
