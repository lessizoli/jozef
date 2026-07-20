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
import { getFunctions, httpsCallable } from 'firebase/functions';
import { auth, db } from './firebase';

export interface Project {
  id: string;
  companyId: string;
  title: string;
  status: string;
  client: {
    name: string;
    email: string;
    phone: string;
    address: string;
  };
  surveyData?: {
    areaSize: number;
    damageType: string;
    notes: string;
    surveyedAt?: unknown;
  };
  quoteData?: {
    materialCost: number;
    laborCost: number;
    totalCost: number;
    generatedAt?: unknown;
  };
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

  if (!currentUser) {
    throw new Error('Nincs bejelentkezett felhasználó.');
  }

  const profileSnapshot = await getDoc(doc(db, 'users', currentUser.uid));

  if (!profileSnapshot.exists()) {
    throw new Error('A felhasználói profil nem található a Firestore-ban.');
  }

  const profile = profileSnapshot.data() as UserProfile;

  if (profile.active === false) {
    throw new Error('A felhasználói fiók inaktív.');
  }

  return profile;
}

async function getAuthenticatedCompanyId(): Promise<string> {
  const profile = await getAuthenticatedProfile();

  if (!profile.companyId) {
    throw new Error('A felhasználóhoz nincs companyId rendelve.');
  }

  return profile.companyId;
}

function companyProjectsCollection(companyId: string) {
  return collection(db, 'companies', companyId, 'projects');
}

function companyProjectDocument(companyId: string, projectId: string) {
  return doc(db, 'companies', companyId, 'projects', projectId);
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
          const projects = snapshot.docs.map((projectDocument) => ({
            id: projectDocument.id,
            companyId,
            ...projectDocument.data(),
          })) as Project[];

          callback(projects);
        },
        (error) => {
          console.error('Hiba a projektek valós idejű betöltésekor:', error);
        },
      );
    })
    .catch((error) => {
      console.error('A projektlista nem indítható el:', error);
    });

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

  const documentReference = await addDoc(companyProjectsCollection(companyId), {
    companyId,
    title,
    status: 'Érdeklődés',
    client: {
      name: clientName,
      address: clientAddress,
      phone: clientPhone,
      email: '',
    },
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return { success: true, id: documentReference.id };
}

export async function updateProjectStatus(projectId: string, newStatus: string) {
  const companyId = await getAuthenticatedCompanyId();
  const projectReference = companyProjectDocument(companyId, projectId);

  await updateDoc(projectReference, {
    status: newStatus,
    updatedAt: serverTimestamp(),
  });

  return { success: true };
}

export async function saveSurveyData(
  projectId: string,
  areaSize: number,
  damageType: string,
  notes: string,
) {
  const companyId = await getAuthenticatedCompanyId();
  const projectReference = companyProjectDocument(companyId, projectId);

  await updateDoc(projectReference, {
    status: 'Árajánlat készítés',
    surveyData: {
      areaSize,
      damageType,
      notes,
      surveyedAt: serverTimestamp(),
    },
    updatedAt: serverTimestamp(),
  });

  return { success: true };
}

export async function saveQuoteData(
  projectId: string,
  materialCost: number,
  laborCost: number,
) {
  const companyId = await getAuthenticatedCompanyId();
  const projectReference = companyProjectDocument(companyId, projectId);
  const totalCost = materialCost + laborCost;

  await updateDoc(projectReference, {
    status: 'Árajánlat kész',
    quoteData: {
      materialCost,
      laborCost,
      totalCost,
      generatedAt: serverTimestamp(),
    },
    updatedAt: serverTimestamp(),
  });

  return { success: true };
}

export async function triggerQuoteEmail(projectId: string) {
  const companyId = await getAuthenticatedCompanyId();
  const functionsInstance = getFunctions(undefined, 'europe-west1');
  const sendQuoteCallable = httpsCallable<
    { companyId: string; projectId: string },
    { success: boolean }
  >(functionsInstance, 'sendQuoteWithBuffer');

  const result = await sendQuoteCallable({ companyId, projectId });
  return result.data;
}
